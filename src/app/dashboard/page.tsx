"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Coins, Cpu, Trash2 } from "lucide-react";
import { getUsage, clearUsage, type UsageRecord } from "@/lib/storage";
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

export default function DashboardPage() {
  const [usage, setUsage] = useState<UsageRecord[]>([]);

  useEffect(() => {
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

  // Conso par jour pour le mini-graphe.
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of usage) {
      const d = new Date(u.at).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
      });
      map.set(d, (map.get(d) ?? 0) + u.costUsd);
    }
    return Array.from(map.entries()).slice(-14);
  }, [usage]);

  const maxDay = Math.max(0.0001, ...byDay.map(([, v]) => v));

  function reset() {
    clearUsage();
    setUsage([]);
  }

  const cards = [
    {
      icon: Boxes,
      label: "Descriptions generated",
      node: <CountUp value={totals.count} />,
    },
    {
      icon: Cpu,
      label: "Tokens used",
      node: <CountUp value={totals.inputTokens + totals.outputTokens} />,
    },
    {
      icon: Coins,
      label: "Estimated total cost",
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
          <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
          <p className="mt-1 text-muted">
            Track your generations and estimated AI cost (based on your key).
          </p>
        </div>
        {usage.length > 0 && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-danger"
          >
            <Trash2 size={16} /> Reset
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
          No generations yet. Create your first description in the “Generate”
          tab.
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-medium text-muted">
              Estimated cost per day
            </h2>
            <div className="flex h-40 items-end gap-2">
              {byDay.map(([day, val]) => (
                <div
                  key={day}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-16 rounded-t bg-gradient-to-t from-brand to-brand-2"
                      style={{ height: `${Math.max(2, (val / maxDay) * 100)}%` }}
                      title={fmtUsd(val)}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-2 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Tokens (in / out)</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
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
