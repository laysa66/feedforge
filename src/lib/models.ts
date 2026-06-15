// Modèles Claude disponibles + tarifs (USD par million de tokens).
// Source : tarification API Anthropic. Sert au dashboard d'estimation de coût.
export type ModelInfo = {
  id: string;
  label: string;
  inputPerMTok: number; // $ / 1M tokens en entrée
  outputPerMTok: number; // $ / 1M tokens en sortie
  note: string;
};

export const MODELS: ModelInfo[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5 — le moins cher",
    inputPerMTok: 1,
    outputPerMTok: 5,
    note: "Idéal pour les fiches produits : rapide et économique.",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6 — équilibré",
    inputPerMTok: 3,
    outputPerMTok: 15,
    note: "Plus de finesse rédactionnelle pour un coût modéré.",
  },
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8 — le plus puissant",
    inputPerMTok: 5,
    outputPerMTok: 25,
    note: "Qualité maximale, pour les marques premium.",
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

export function getModel(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

// Coût estimé en USD pour un nombre de tokens donné.
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const m = getModel(modelId);
  return (
    (inputTokens / 1_000_000) * m.inputPerMTok +
    (outputTokens / 1_000_000) * m.outputPerMTok
  );
}
