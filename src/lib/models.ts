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
      { id: "claude-sonnet-5", label: "Claude Sonnet 5 — balanced", inputPerMTok: 3, outputPerMTok: 15 },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 — most powerful", inputPerMTok: 5, outputPerMTok: 25 },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keysUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-...",
    models: [
      { id: "gpt-5-nano", label: "GPT-5 nano — cheapest", inputPerMTok: 0.05, outputPerMTok: 0.4 },
      { id: "gpt-5-mini", label: "GPT-5 mini — balanced", inputPerMTok: 0.25, outputPerMTok: 2 },
      { id: "gpt-5", label: "GPT-5 — premium", inputPerMTok: 1.25, outputPerMTok: 10 },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keysUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza...",
    models: [
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite — cheapest", inputPerMTok: 0.1, outputPerMTok: 0.4 },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — balanced", inputPerMTok: 0.3, outputPerMTok: 2.5 },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro — premium", inputPerMTok: 1.25, outputPerMTok: 10 },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keysUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-...",
    // Fallback list only — the live list (with current pricing) is fetched from
    // OpenRouter's /models API at runtime; see loadOpenRouterModels().
    models: [
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", inputPerMTok: 0.3, outputPerMTok: 2.5 },
      { id: "openai/gpt-5-mini", label: "GPT-5 mini", inputPerMTok: 0.25, outputPerMTok: 2 },
      { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", inputPerMTok: 1, outputPerMTok: 5 },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", inputPerMTok: 0.12, outputPerMTok: 0.3 },
    ],
  },
];

// Modèles chargés dynamiquement (OpenRouter) : ils vivent dans le runtime du
// navigateur, en plus des modèles statiques ci-dessus. On les enregistre ici
// pour que findModel/estimateCost trouvent leur tarif réel et à jour.
let DYNAMIC_MODELS: ModelInfo[] = [];

export function registerDynamicModels(models: ModelInfo[]) {
  DYNAMIC_MODELS = models;
}

export function getDynamicModels(): ModelInfo[] {
  return DYNAMIC_MODELS;
}

export const DEFAULT_PROVIDER: ProviderId = "anthropic";

export function getProviderInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function defaultModelFor(provider: ProviderId): string {
  return getProviderInfo(provider).models[0].id;
}

// Retrouve un modèle (et son fournisseur) par identifiant, tous fournisseurs
// confondus — modèles statiques puis modèles dynamiques (OpenRouter).
export function findModel(
  modelId: string,
): { provider: ProviderInfo; model: ModelInfo } | null {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return { provider, model };
  }
  const dyn = DYNAMIC_MODELS.find((m) => m.id === modelId);
  if (dyn) return { provider: getProviderInfo("openrouter"), model: dyn };
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
