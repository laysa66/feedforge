// Fournisseurs d'IA supportés (BYOK) + leurs modèles et tarifs indicatifs
// (USD par million de tokens). Sert au dashboard d'estimation de coût.
// Les tarifs évoluent côté fournisseurs : ce sont des estimations.

export type ProviderId = "anthropic" | "openai" | "gemini" | "openrouter";

export type ModelInfo = {
  id: string; // identifiant envoyé à l'API
  label: string;
  inputPerMTok: number;
  outputPerMTok: number;
};

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  keysUrl: string;
  keyHint: string; // format attendu de la clé
  models: ModelInfo[];
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keysUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-...",
    models: [
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — cheapest", inputPerMTok: 1, outputPerMTok: 5 },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — balanced", inputPerMTok: 3, outputPerMTok: 15 },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 — most powerful", inputPerMTok: 5, outputPerMTok: 25 },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keysUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-...",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini — cheapest", inputPerMTok: 0.15, outputPerMTok: 0.6 },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini — balanced", inputPerMTok: 0.4, outputPerMTok: 1.6 },
      { id: "gpt-4o", label: "GPT-4o — premium", inputPerMTok: 2.5, outputPerMTok: 10 },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keysUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza...",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash — cheapest", inputPerMTok: 0.075, outputPerMTok: 0.3 },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash — balanced", inputPerMTok: 0.1, outputPerMTok: 0.4 },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro — premium", inputPerMTok: 1.25, outputPerMTok: 5 },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keysUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-...",
    models: [
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", inputPerMTok: 0.1, outputPerMTok: 0.4 },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", inputPerMTok: 0.15, outputPerMTok: 0.6 },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", inputPerMTok: 0.8, outputPerMTok: 4 },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", inputPerMTok: 0.12, outputPerMTok: 0.3 },
    ],
  },
];

export const DEFAULT_PROVIDER: ProviderId = "anthropic";

export function getProviderInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function defaultModelFor(provider: ProviderId): string {
  return getProviderInfo(provider).models[0].id;
}

// Retrouve un modèle (et son fournisseur) par identifiant, tous fournisseurs confondus.
export function findModel(
  modelId: string,
): { provider: ProviderInfo; model: ModelInfo } | null {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return { provider, model };
  }
  return null;
}

// Coût estimé en USD pour un nombre de tokens donné.
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const found = findModel(modelId);
  if (!found) return 0;
  return (
    (inputTokens / 1_000_000) * found.model.inputPerMTok +
    (outputTokens / 1_000_000) * found.model.outputPerMTok
  );
}
