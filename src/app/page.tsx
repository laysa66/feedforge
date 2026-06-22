import Link from "next/link";
import Image from "next/image";
import { Boxes, KeyRound, LineChart, FileSpreadsheet, ArrowRight } from "lucide-react";
import logo from "@/app/icon.png";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Bulk CSV import",
    desc: "Import your catalog and generate hundreds of descriptions in one click.",
  },
  {
    icon: KeyRound,
    title: "Your key, your AI (BYOK)",
    desc: "Claude, OpenAI, Gemini or OpenRouter — plug in your own key. Nothing is stored on our side.",
  },
  {
    icon: LineChart,
    title: "Real-time usage",
    desc: "Track your tokens and estimated cost on every generation.",
  },
];

export default function Home() {
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
          Built for online stores · BYOK model
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Product descriptions that sell,{" "}
          <span className="bg-gradient-to-r from-brand via-brand-amber to-brand-2 bg-clip-text text-transparent">
            forged by AI
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted">
          FeedForge writes SEO-optimized product descriptions for your
          e-commerce catalog. Import a CSV, generate, export. You only pay for
          your own AI usage, through your own key.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-3 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90"
          >
            <Boxes size={18} /> Start generating
          </Link>
          <Link
            href="/settings"
            className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition hover:border-[color:var(--border-glow)]"
          >
            Set up my key <ArrowRight size={16} />
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
