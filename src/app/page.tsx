import Link from "next/link";
import { Boxes, KeyRound, LineChart, FileSpreadsheet, ArrowRight } from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Import CSV en masse",
    desc: "Importez votre catalogue et générez des centaines de descriptions d'un coup.",
  },
  {
    icon: KeyRound,
    title: "Votre propre clé (BYOK)",
    desc: "Vous utilisez votre clé API. Aucune donnée, aucune clé ne transite par nos serveurs.",
  },
  {
    icon: LineChart,
    title: "Consommation en temps réel",
    desc: "Suivez vos tokens et votre coût estimé à chaque génération.",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          Pour les boutiques en ligne · Modèle BYOK
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Des fiches produits qui vendent,{" "}
          <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
            générées en masse
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted">
          FeedForge rédige des descriptions produits optimisées SEO pour votre
          catalogue e-commerce. Importez un CSV, générez, exportez. Vous payez
          uniquement votre consommation IA via votre propre clé.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            <Boxes size={18} /> Commencer à générer
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 font-medium transition hover:bg-surface-2"
          >
            Configurer ma clé <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-brand-2">
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
