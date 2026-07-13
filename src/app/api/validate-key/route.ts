import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import type { ProviderId } from "@/lib/models";

// Valide une clé API BYOK sans consommer de tokens : on liste simplement les
// modèles du fournisseur. Un 200 => la clé est valide ; un 401 => invalide.
// La clé n'est jamais stockée : utilisée le temps de la requête, puis oubliée.

export const runtime = "nodejs";

type Body = { provider: ProviderId; apiKey: string };

const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { provider, apiKey } = body;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      await client.models.list({ limit: 1 });
    } else {
      const baseURL = OPENAI_COMPATIBLE_BASE[provider];
      if (!baseURL) {
        return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
      }
      const client = new OpenAI({ apiKey, baseURL });
      await client.models.list();
    }
    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    let status = 500;
    let msg = "Validation failed.";
    if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) {
      status = err.status ?? 500;
      msg = err.message;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    return NextResponse.json({ valid: false, error: msg }, { status });
  }
}
