"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Boxes, KeyRound, LineChart, FileSpreadsheet, ArrowRight } from "lucide-react";
import logo from "@/app/icon.png";

export default function Home() {
  const { t } = useTranslation();
  const features = [
    {
      icon: FileSpreadsheet,
      title: t("home.features.bulkTitle"),
      desc: t("home.features.bulkDesc"),
    },
    {
      icon: KeyRound,
      title: t("home.features.byokTitle"),
      desc: t("home.features.byokDesc"),
    },
    {
      icon: LineChart,
      title: t("home.features.usageTitle"),
      desc: t("home.features.usageDesc"),
    },
  ];

  return (
    <div className="space-y-16">
      <section className="text-center">
        <Image
          src={logo}
          alt="FeedForge"
          width={112}
          height={112}
          priority
          className="mx-auto mb-6 h-28 w-28 object-contain drop-shadow-[0_0_28px_rgba(6,182,212,0.4)]"
        />
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px_var(--brand-2)]" />
          {t("home.badge")}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {t("home.titlePre")}{" "}
          <span className="bg-gradient-to-r from-brand via-brand-amber to-brand-2 bg-clip-text text-transparent">
            {t("home.titleHighlight")}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted">
          {t("home.subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-3 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90"
          >
            <Boxes size={18} /> {t("home.ctaStart")}
          </Link>
          <Link
            href="/settings"
            className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition hover:border-[color:var(--border-glow)]"
          >
            {t("home.ctaKey")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="glass group rounded-2xl p-6 transition hover:border-[color:var(--border-glow)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2 text-brand-2 transition group-hover:shadow-[0_0_16px_-4px_var(--brand-2)]">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
