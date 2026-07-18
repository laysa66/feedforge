import { NextResponse } from "next/server";
import type { ModelInfo } from "@/lib/models";

// Liste des modèles OpenRouter, tirée en direct de leur API publique /models
// (pas de clé requise). On la sert côté serveur pour éviter les soucis CORS et
// on la met en cache 1h. Renvoie des tarifs réels et à jour, en USD / million
// de tokens — fini les prix statiques qui mentent.

export const runtime = "nodejs";
export const revalidate = 3600;

type OpenRouterModel = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
};

export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter responded ${res.status}` },
        { status: 502 },
      );
    }
    const json = (await res.json()) as { data?: OpenRouterModel[] };
    const models: ModelInfo[] = (json.data ?? [])
      .map((m) => {
        // Les tarifs OpenRouter sont en USD par token → ×1e6 pour /million.
        const inPerM = parseFloat(m.pricing?.prompt ?? "") * 1_000_000;
        const outPerM = parseFloat(m.pricing?.completion ?? "") * 1_000_000;
        return {
          id: m.id,
          label: m.name?.trim() || m.id,
          inputPerMTok: Number.isFinite(inPerM) && inPerM >= 0 ? inPerM : 0,
          outputPerMTok: Number.isFinite(outPerM) && outPerM >= 0 ? outPerM : 0,
        };
      })
      .filter((m) => m.id)
      // Modèles payants d'abord (du moins cher au plus cher), puis les modèles
      // à 0 $ (gratuits / tarif variable) rangés à la fin, par nom.
      .sort((a, b) => {
        const az = a.inputPerMTok === 0;
        const bz = b.inputPerMTok === 0;
        if (az !== bz) return az ? 1 : -1;
        if (az && bz) return a.label.localeCompare(b.label);
        return a.inputPerMTok - b.inputPerMTok;
      });

    return NextResponse.json({ models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
