import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { ProviderId } from "@/lib/models";

// Route de génération d'UNE fiche produit, multi-fournisseurs (BYOK).
// Le client envoie SA propre clé : on l'utilise le temps de la requête,
// jamais stockée côté serveur. C'est le client qui paie sa consommation.

export const runtime = "nodejs";

type ProductInput = { name: string; attributes?: string };
type Body = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  brandVoice?: string;
  product: ProductInput;
};

// URL de base pour les fournisseurs compatibles OpenAI.
const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

function buildPrompts(product: ProductInput, brandVoice?: string) {
  const system = [
    "You are an expert e-commerce copywriter specialized in SEO-optimized product descriptions.",
    "Write a product description in English: 2 short paragraphs, persuasive, natural, no empty superlatives.",
    "Subtly weave in relevant keywords. No title, no bullet lists, no preamble — only the description.",
    brandVoice?.trim() ? `Follow this brand voice: ${brandVoice.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Product: ${product.name.trim()}`,
    product.attributes?.trim() ? `Attributes: ${product.attributes.trim()}` : "",
    "Write the description.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { provider, apiKey, model, brandVoice, product } = body;

  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "Missing API key. Add it in Settings." },
      { status: 401 },
    );
  }
  if (!product?.name?.trim()) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 },
    );
  }

  const { system, user } = buildPrompts(product, brandVoice);

  try {
    // --- Anthropic (Claude) : SDK dédié ---
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      });
      const description = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();
      return NextResponse.json({
        description,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      });
    }

    // --- OpenAI / OpenRouter / Gemini : API compatible OpenAI ---
    const baseURL = OPENAI_COMPATIBLE_BASE[provider];
    if (!baseURL) {
      return NextResponse.json(
        { error: "Unsupported provider." },
        { status: 400 },
      );
    }
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const description = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({
      description,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    });
  } catch (err: unknown) {
    let status = 500;
    let msg = "Generation failed.";
    if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) {
      status = err.status ?? 500;
      msg = err.message;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
