import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { ProviderId } from "@/lib/models";
import {
  FIELD_DEFS,
  LENGTH_MAX_TOKENS,
  NICHE_PRESETS,
  TONE_PRESETS,
  normalizeOutputConfig,
  type OutputConfig,
} from "@/lib/output";

// Route de génération d'UNE fiche produit, multi-fournisseurs (BYOK).
// Le client envoie SA propre clé : on l'utilise le temps de la requête,
// jamais stockée côté serveur. C'est le client qui paie sa consommation.

export const runtime = "nodejs";

type ProductInput = { name: string; attributes?: string };
type ImageInput = { mediaType: string; data: string }; // data = base64 sans préfixe
type Body = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  brandVoice?: string;
  language?: string;
  keyword?: string; // mot-clé SEO cible à intégrer naturellement
  output?: OutputConfig; // longueur, ton, niche, champs à générer
  product: ProductInput;
  image?: ImageInput;
};

// Pack SEO structuré renvoyé pour chaque fiche produit.
type SeoContent = {
  title: string;
  description: string;
  bullets: string[];
  metaDescription: string;
  keywords: string[];
};

// URL de base pour les fournisseurs compatibles OpenAI.
const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

function buildPrompts(
  product: ProductInput,
  cfg: OutputConfig,
  brandVoice?: string,
  language?: string,
  hasImage?: boolean,
  keyword?: string,
) {
  const lang = language?.trim() || "English";
  // Seuls les champs cochés sont demandés → moins de tokens, sortie ciblée.
  const requested = FIELD_DEFS.filter((f) => cfg.fields[f.key]);
  const tonePrompt = TONE_PRESETS.find((t) => t.id === cfg.tone)?.prompt ?? "";
  const nichePrompt = NICHE_PRESETS.find((n) => n.id === cfg.niche)?.prompt ?? "";

  const system = [
    "You are an expert e-commerce copywriter specialized in SEO-optimized product content.",
    `Write every text field in ${lang}. Be persuasive and natural, no empty superlatives.`,
    "Return ONLY a valid JSON object (no markdown, no code fences, no preamble) with exactly these keys:",
    ...requested.map((f) => `- ${f.prompt(cfg.length)}`),
    "Include no other keys.",
    nichePrompt,
    tonePrompt,
    keyword?.trim()
      ? `Naturally rank for this target keyword without stuffing: "${keyword.trim()}".`
      : "",
    hasImage
      ? "A product image is attached — use what you see in it (materials, colors, style, details) to enrich the content."
      : "",
    brandVoice?.trim() ? `Follow this brand voice: ${brandVoice.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Product: ${product.name.trim()}`,
    product.attributes?.trim() ? `Attributes: ${product.attributes.trim()}` : "",
    "Generate the SEO content pack as JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

// Réessaie un appel fournisseur sur erreurs transitoires (429 rate-limit, 5xx)
// avec un backoff exponentiel. Les autres erreurs (401, 400…) échouent tout de suite.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status =
        err instanceof Anthropic.APIError || err instanceof OpenAI.APIError
          ? err.status
          : undefined;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || i === attempts - 1) throw err;
      // 0.5s, 1s, 2s… (+ un petit jitter pour éviter les rafales synchrones).
      const delay = 500 * 2 ** i + i * 150;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// Extrait un objet JSON d'une réponse LLM, tolérant aux code fences et au texte
// parasite autour (on isole du premier { au dernier }).
function parseSeoContent(raw: string): SeoContent {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter(Boolean)
      : typeof v === "string" && v.trim()
        ? [v.trim()]
        : [];

  try {
    const obj = JSON.parse(candidate) as Record<string, unknown>;
    return {
      title: typeof obj.title === "string" ? obj.title.trim() : "",
      description: typeof obj.description === "string" ? obj.description.trim() : "",
      bullets: toStringArray(obj.bullets),
      metaDescription:
        typeof obj.metaDescription === "string" ? obj.metaDescription.trim() : "",
      keywords: toStringArray(obj.keywords),
    };
  } catch {
    // Parsing impossible : on ne perd rien, tout part dans la description.
    return {
      title: "",
      description: raw.trim(),
      bullets: [],
      metaDescription: "",
      keywords: [],
    };
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { provider, apiKey, model, brandVoice, language, keyword, product, image } =
    body;
  const cfg = normalizeOutputConfig(body.output);
  const maxTokens = LENGTH_MAX_TOKENS[cfg.length];

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

  const { system, user } = buildPrompts(
    product,
    cfg,
    brandVoice,
    language,
    !!image,
    keyword,
  );

  try {
    // --- Anthropic (Claude) : SDK dédié ---
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const content: Anthropic.ContentBlockParam[] = image
        ? [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType as "image/png",
                data: image.data,
              },
            },
            { type: "text", text: user },
          ]
        : [{ type: "text", text: user }];
      const message = await withRetry(() =>
        client.messages.create({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content }],
        }),
      );
      const raw = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim();
      return NextResponse.json({
        content: parseSeoContent(raw),
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
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: user },
    ];
    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${image.mediaType};base64,${image.data}` },
      });
    }
    const completion = await withRetry(() =>
      client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    );
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({
      content: parseSeoContent(raw),
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
