"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import {
  Upload,
  Plus,
  Trash2,
  Download,
  TriangleAlert,
  Loader2,
  ImagePlus,
  X,
} from "lucide-react";
import {
  getApiKey,
  getModelId,
  getBrandVoice,
  getProvider,
  getLanguages,
  addUsage,
} from "@/lib/storage";
import { estimateCost } from "@/lib/models";

// Nombre de générations lancées en parallèle (compromis vitesse / rate limit).
const CONCURRENCY = 4;
// Estimation grossière de la sortie par fiche (pour le coût prévisionnel).
const EST_OUTPUT_TOKENS = 320;
const SYSTEM_OVERHEAD_CHARS = 320;

type CellStatus = "idle" | "loading" | "done" | "error";
type Cell = { text: string; status: CellStatus; error?: string };
type ProductImage = { mediaType: string; data: string }; // data = base64 sans préfixe
type Row = {
  id: number;
  name: string;
  attributes: string;
  image?: ProductImage;
  outputs: Record<string, Cell>; // une cellule par langue
};

let nextId = 1;
const newRow = (name = "", attributes = ""): Row => ({
  id: nextId++,
  name,
  attributes,
  outputs: {},
});

function fmtCost(usd: number) {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

// Lit un fichier image en base64 (sans le préfixe data:).
function fileToImage(file: File): Promise<ProductImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:<mime>;base64,<data>
      const comma = result.indexOf(",");
      const mediaType = result.slice(5, result.indexOf(";"));
      resolve({ mediaType, data: result.slice(comma + 1) });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Exécute `worker` sur tous les items avec une limite de parallélisme.
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  let cursor = 0;
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        await worker(item);
      }
    },
  );
  await Promise.all(lanes);
}

type Unit = {
  rowId: number;
  name: string;
  attributes: string;
  lang: string;
  image?: ProductImage;
};

export default function GeneratePage() {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [hasKey, setHasKey] = useState(true);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [model, setModel] = useState("");
  const [brandLen, setBrandLen] = useState(0);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasKey(!!getApiKey());
    setModel(getModelId());
    setBrandLen(getBrandVoice().length);
    setLanguages(getLanguages());
  }, []);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateCell(rowId: number, lang: string, patch: Partial<Cell>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== rowId) return r;
        const prev = r.outputs[lang] ?? { text: "", status: "idle" as CellStatus };
        return { ...r, outputs: { ...r.outputs, [lang]: { ...prev, ...patch } } };
      }),
    );
  }

  function importCsv(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const imported: Row[] = res.data
          .map((line) => {
            const keys = Object.keys(line);
            const nameKey =
              keys.find((k) => /nom|name|titre|title|produit|product/i.test(k)) ??
              keys[0];
            const name = (line[nameKey] ?? "").trim();
            const attributes = keys
              .filter((k) => k !== nameKey)
              .map((k) => `${k}: ${line[k]}`)
              .join(", ");
            return name ? newRow(name, attributes) : null;
          })
          .filter((r): r is Row => r !== null);
        if (imported.length) setRows(imported);
      },
    });
  }

  async function generateUnit(unit: Unit) {
    updateCell(unit.rowId, unit.lang, { status: "loading", error: undefined });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: getProvider(),
          apiKey: getApiKey(),
          model: getModelId(),
          brandVoice: getBrandVoice(),
          language: unit.lang,
          product: { name: unit.name, attributes: unit.attributes },
          image: unit.image,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      updateCell(unit.rowId, unit.lang, {
        text: data.description,
        status: "done",
      });
      const { inputTokens, outputTokens } = data.usage;
      const m = getModelId();
      addUsage({
        at: Date.now(),
        provider: getProvider(),
        model: m,
        count: 1,
        inputTokens,
        outputTokens,
        costUsd: estimateCost(m, inputTokens, outputTokens),
      });
    } catch (e) {
      updateCell(unit.rowId, unit.lang, {
        status: "error",
        error: e instanceof Error ? e.message : "Error",
      });
    }
  }

  async function generateAll() {
    if (!getApiKey()) {
      setHasKey(false);
      return;
    }
    const units: Unit[] = [];
    for (const row of rows) {
      if (!row.name.trim()) continue;
      for (const lang of languages) {
        if (row.outputs[lang]?.status === "done") continue;
        units.push({
          rowId: row.id,
          name: row.name,
          attributes: row.attributes,
          lang,
          image: row.image,
        });
      }
    }
    if (!units.length) return;
    setRunning(true);
    await runPool(units, CONCURRENCY, generateUnit);
    setRunning(false);
  }

  function exportCsv() {
    const rich = languages.length > 1;
    const data = rows
      .filter((r) => languages.some((l) => r.outputs[l]?.text))
      .map((r) => {
        const base: Record<string, string> = {
          product: r.name,
          attributes: r.attributes,
        };
        for (const lang of languages) {
          const key = rich ? `description_${lang.toLowerCase()}` : "description";
          base[key] = r.outputs[lang]?.text ?? "";
        }
        return base;
      });
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedforge-descriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const eligible = rows.filter((r) => r.name.trim());
  const total = eligible.length * languages.length;
  const doneCount = eligible.reduce(
    (acc, r) =>
      acc + languages.filter((l) => r.outputs[l]?.status === "done").length,
    0,
  );
  const estTokens = eligible.reduce(
    (acc, r) => {
      const perUnit = Math.ceil(
        (SYSTEM_OVERHEAD_CHARS + r.name.length + r.attributes.length + brandLen) /
          4,
      );
      acc.input += perUnit * languages.length;
      acc.output += EST_OUTPUT_TOKENS * languages.length;
      return acc;
    },
    { input: 0, output: 0 },
  );
  const estCost = model
    ? estimateCost(model, estTokens.input, estTokens.output)
    : 0;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Generate descriptions
          </h1>
          <p className="mt-1 text-muted">
            Import a CSV or add your products manually.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => setRows((rs) => [...rs, newRow()])}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            <Plus size={16} /> Row
          </button>
          <button
            onClick={exportCsv}
            disabled={doneCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition hover:bg-surface-2 disabled:opacity-40"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {!hasKey && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <TriangleAlert className="shrink-0 text-danger" size={18} />
          <span>
            No API key configured.{" "}
            <Link href="/settings" className="font-medium text-brand-2 underline">
              Add it in Settings
            </Link>{" "}
            to generate.
          </span>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && /\.csv$/i.test(f.name)) importCsv(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl p-5 text-center text-sm transition ${
          dragging
            ? "marching-ants bg-brand-2/5 text-foreground"
            : "glass text-muted hover:border-[color:var(--border-glow)]"
        }`}
      >
        <Upload
          size={18}
          className={`mx-auto mb-1.5 ${dragging ? "text-brand-2" : ""}`}
        />
        {dragging
          ? "Drop the file to import it"
          : "Drag & drop a CSV here, or click to browse"}
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2 text-left text-muted">
            <tr>
              <th className="w-1/4 px-4 py-3 font-medium">Product</th>
              <th className="w-1/4 px-4 py-3 font-medium">Attributes</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowLoading = languages.some(
                (l) => row.outputs[l]?.status === "loading",
              );
              return (
                <tr
                  key={row.id}
                  className={`border-t border-border align-top ${
                    rowLoading ? "forge-loading" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      placeholder="Ceramic mug"
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 outline-none focus:border-brand-2"
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      {row.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:${row.image.mediaType};base64,${row.image.data}`}
                            alt="product"
                            className="h-9 w-9 rounded border border-border object-cover"
                          />
                          <button
                            onClick={() => updateRow(row.id, { image: undefined })}
                            className="rounded p-1 text-muted hover:text-danger"
                            aria-label="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition hover:text-foreground">
                          <ImagePlus size={14} /> Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) updateRow(row.id, { image: await fileToImage(f) });
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.attributes}
                      onChange={(e) =>
                        updateRow(row.id, { attributes: e.target.value })
                      }
                      placeholder="color: blue, 350ml"
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 outline-none focus:border-brand-2"
                    />
                  </td>
                  <td className="space-y-3 px-4 py-3">
                    {languages.map((lang) => {
                      const cell = row.outputs[lang];
                      const status = cell?.status ?? "idle";
                      return (
                        <div key={lang} className="space-y-1">
                          {languages.length > 1 && (
                            <span className="inline-block rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-2">
                              {lang}
                            </span>
                          )}
                          {status === "loading" ? (
                            <span className="flex items-center gap-2 text-brand-2">
                              <Loader2 className="animate-spin" size={14} /> Forging…
                            </span>
                          ) : status === "error" ? (
                            <span className="text-danger">{cell?.error}</span>
                          ) : (
                            <textarea
                              value={cell?.text ?? ""}
                              onChange={(e) =>
                                updateCell(row.id, lang, {
                                  text: e.target.value,
                                  status: "done",
                                })
                              }
                              rows={cell?.text ? 4 : 1}
                              placeholder="—"
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 outline-none focus:border-brand-2"
                            />
                          )}
                        </div>
                      );
                    })}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() =>
                        setRows((rs) =>
                          rs.length > 1 ? rs.filter((r) => r.id !== row.id) : rs,
                        )
                      }
                      className="rounded p-1 text-muted hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[12rem] flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {doneCount} / {total} generated
            </span>
            <span>
              Est. cost{" "}
              <span className="font-medium text-foreground">
                ~{fmtCost(estCost)}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={generateAll}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-2.5 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90 disabled:opacity-60"
        >
          {running && <Loader2 className="animate-spin" size={18} />}
          {running ? "Generating…" : "Generate all"}
        </button>
      </div>
    </div>
  );
}
