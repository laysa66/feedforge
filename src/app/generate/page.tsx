"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import {
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Download,
  TriangleAlert,
  Loader2,
} from "lucide-react";
import {
  getApiKey,
  getModelId,
  getBrandVoice,
  getProvider,
  addUsage,
} from "@/lib/storage";
import { estimateCost } from "@/lib/models";

type Row = {
  id: number;
  name: string;
  attributes: string;
  description: string;
  status: "idle" | "loading" | "done" | "error";
  error?: string;
};

let nextId = 1;
const newRow = (name = "", attributes = ""): Row => ({
  id: nextId++,
  name,
  attributes,
  description: "",
  status: "idle",
});

export default function GeneratePage() {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [hasKey, setHasKey] = useState(true);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
              keys.find((k) => /nom|name|titre|title|produit/i.test(k)) ?? keys[0];
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

  async function generateOne(row: Row) {
    updateRow(row.id, { status: "loading", error: undefined });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: getProvider(),
          apiKey: getApiKey(),
          model: getModelId(),
          brandVoice: getBrandVoice(),
          product: { name: row.name, attributes: row.attributes },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      updateRow(row.id, { description: data.description, status: "done" });
      const { inputTokens, outputTokens } = data.usage;
      const model = getModelId();
      addUsage({
        at: Date.now(),
        provider: getProvider(),
        model,
        count: 1,
        inputTokens,
        outputTokens,
        costUsd: estimateCost(model, inputTokens, outputTokens),
      });
    } catch (e) {
      updateRow(row.id, {
        status: "error",
        error: e instanceof Error ? e.message : "Erreur",
      });
    }
  }

  async function generateAll() {
    if (!getApiKey()) {
      setHasKey(false);
      return;
    }
    setRunning(true);
    // On séquence pour éviter de saturer le rate limit du client.
    for (const row of rows) {
      if (row.name.trim() && row.status !== "done") {
        // eslint-disable-next-line no-await-in-loop
        await generateOne(row);
      }
    }
    setRunning(false);
  }

  function exportCsv() {
    const csv = Papa.unparse(
      rows
        .filter((r) => r.description)
        .map((r) => ({
          product: r.name,
          attributes: r.attributes,
          description: r.description,
        })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedforge-descriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const doneCount = rows.filter((r) => r.status === "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate descriptions</h1>
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
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-border align-top ${
                  row.status === "loading" ? "forge-loading" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Ceramic mug"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 outline-none focus:border-brand-2"
                  />
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
                <td className="px-4 py-3">
                  {row.status === "loading" ? (
                    <span className="flex items-center gap-2 text-brand-2">
                      <Loader2 className="animate-spin" size={14} /> Forging…
                    </span>
                  ) : row.status === "error" ? (
                    <span className="text-danger">{row.error}</span>
                  ) : (
                    <textarea
                      value={row.description}
                      onChange={(e) =>
                        updateRow(row.id, { description: e.target.value })
                      }
                      rows={row.description ? 4 : 1}
                      placeholder="—"
                      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 outline-none focus:border-brand-2"
                    />
                  )}
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          {doneCount} / {rows.filter((r) => r.name.trim()).length} generated
        </span>
        <button
          onClick={generateAll}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-2.5 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90 disabled:opacity-60"
        >
          {running && (
            <Loader2 className="animate-spin" size={18} />
          )}
          {running ? "Generating…" : "Generate all"}
        </button>
      </div>
    </div>
  );
}
