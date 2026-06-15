import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Route de génération d'UNE fiche produit.
// Le client envoie SA propre clé API (BYOK) : on l'utilise le temps de la requête,
// on ne la stocke jamais côté serveur. C'est le client qui paie sa consommation.

export const runtime = "nodejs";

type ProductInput = {
  name: string;
  attributes?: string; // attributs libres : couleur, matière, etc.
};

type Body = {
  apiKey: string;
  model: string;
  brandVoice?: string;
  product: ProductInput;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { apiKey, model, brandVoice, product } = body;

  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Clé API manquante ou invalide. Renseignez-la dans Réglages." },
      { status: 401 },
    );
  }
  if (!product?.name?.trim()) {
    return NextResponse.json(
      { error: "Le nom du produit est requis." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

  const system = [
    "Tu es un rédacteur e-commerce expert en fiches produits optimisées SEO.",
    "Rédige une description de produit en français : 2 paragraphes courts, vendeuse, naturelle, sans superlatifs creux.",
    "Intègre subtilement des mots-clés pertinents. Pas de titre, pas de listes à puces, pas de préambule — uniquement la description.",
    brandVoice?.trim()
      ? `Respecte ce ton de marque : ${brandVoice.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = [
    `Produit : ${product.name.trim()}`,
    product.attributes?.trim() ? `Attributs : ${product.attributes.trim()}` : "",
    "Rédige la description.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();

    return NextResponse.json({
      description: text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (err: unknown) {
    // On renvoie un message lisible au client (clé invalide, quota, etc.)
    const status =
      err instanceof Anthropic.APIError && err.status ? err.status : 500;
    const msg =
      err instanceof Anthropic.APIError
        ? err.message
        : "Erreur lors de la génération.";
    return NextResponse.json({ error: msg }, { status });
  }
}
