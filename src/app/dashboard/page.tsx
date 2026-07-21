"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Boxes, Coins, Cpu, Trash2 } from "lucide-react";
import {
  getUsage,
  clearUsage,
  hydrateDynamicModels,
  type UsageRecord,
} from "@/lib/storage";
import { findModel } from "@/lib/models";
import CountUp from "@/components/CountUp";

function fmtUsd(n: number) {
  if (n <= 0) return "$0.00";
  // Sous le centime : plus de décimales pour rester lisible (ex. $0.0029).
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Period = "day" | "week" | "month";
const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const pad = (n: number) => String(n).padStart(2, "0");

// Lundi de la semaine d'une date donnée.
function startOfWeek(d: Date) {
  const x = new Date(d);
  const offset = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Clé triable + libellé d'affichage pour une date selon la période.
function bucketOf(d: Date, period: Period): { key: string; label: string } {
  if (period === "month") {
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    };
  }
  const base = period === "week" ? startOfWeek(d) : d;
  return {
    key: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    label: `${pad(base.getMonth() + 1)}/${pad(base.getDate())}`,
  };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [period, setPeriod] = useState<Period>("day");

  useEffect(() => {
    hydrateDynamicModels();
    setUsage(getUsage());
  }, []);

  const totals = useMemo(() => {
    return usage.reduce(
      (acc, u) => ({
        count: acc.count + u.count,
        inputTokens: acc.inputTokens + u.inputTokens,
        outputTokens: acc.outputTokens + u.outputTokens,
        costUsd: acc.costUsd + u.costUsd,
      }),
      { count: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
    );
  }, [usage]);

  // Conso agrégée par période (jour / semaine / mois) pour le mini-graphe.
  const series = useMemo(() => {
    const buckets = new Map<string, { label: string; total: number }>();
    for (const u of usage) {
      const { key, label } = bucketOf(new Date(u.at), period);
      const cur = buckets.get(key) ?? { label, total: 0 };
      cur.total += u.costUsd;
      buckets.set(key, cur);
    }
    const sorted = [...buckets.entries()].sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    );
    const limit = period === "day" ? 14 : 12;
    return sorted.slice(-limit).map(([, v]) => v);
  }, [usage, period]);

  const maxVal = Math.max(0.0001, ...series.map((s) => s.total));

  function reset() {
    clearUsage();
    setUsage([]);
  }

  const cards = [
    {
      icon: Boxes,
      label: t("dashboard.cardDescriptions"),
      node: <CountUp value={totals.count} />,
    },
    {
      icon: Cpu,
      label: t("dashboard.cardTokens"),
      node: <CountUp value={totals.inputTokens + totals.outputTokens} />,
    },
    {
      icon: Coins,
      label: t("dashboard.cardCost"),
      node: (
        <CountUp
          value={totals.costUsd}
          decimals={totals.costUsd < 0.01 ? 4 : 2}
          prefix="$"
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-muted">{t("dashboard.subtitle")}</p>
        </div>
        {usage.length > 0 && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-danger"
          >
            <Trash2 size={16} /> {t("dashboard.reset")}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, node }) => (
          <div
            key={label}
            className="glass rounded-2xl p-5 transition hover:border-[color:var(--border-glow)]"
          >
            <div className="flex items-center gap-2 text-muted">
              <Icon size={16} className="text-brand-2" />
              <span className="text-sm">{label}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight">
              {node}
            </p>
          </div>
        ))}
      </div>

      {usage.length === 0 ? (
        <div className="glass rounded-2xl border-dashed p-10 text-center text-muted">
          {t("dashboard.empty")}
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-muted">
                {t("dashboard.chartTitle", {
                  period: t(`dashboard.periodSingular.${period}`),
                })}
              </h2>
              <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      period === p.id
                        ? "bg-surface-2 text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t(`dashboard.periods.${p.id}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex h-40 items-end gap-2">
              {series.map((s, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-16 rounded-t bg-gradient-to-t from-brand to-brand-2"
                      style={{ height: `${Math.max(2, (s.total / maxVal) * 100)}%` }}
                      title={fmtUsd(s.total)}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("dashboard.thDate")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("dashboard.thProvider")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("dashboard.thModel")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("dashboard.thTokens")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("dashboard.thCost")}</th>
                </tr>
              </thead>
              <tbody>
                {[...usage].reverse().slice(0, 50).map((u, i) => {
                  const found = findModel(u.model);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2.5">{fmtDate(u.at)}</td>
                      <td className="px-4 py-2.5">
                        {found?.provider.label.split(" (")[0] ?? u.provider ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {found?.model.label.split(" — ")[0] ?? u.model}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {u.inputTokens} / {u.outputTokens}
                      </td>
                      <td className="px-4 py-2.5">{fmtUsd(u.costUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
