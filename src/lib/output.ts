// Contrôles de génération : longueur, ton, niche et choix des champs.
// Ce module est partagé client (UI Settings) ET serveur (construction du prompt),
// donc pas de code spécifique au navigateur ici.

export type OutputLength = "short" | "medium" | "long";
export type SeoFieldKey =
  | "title"
  | "description"
  | "bullets"
  | "metaDescription"
  | "keywords";

export type OutputConfig = {
  length: OutputLength;
  tone: string; // id dans TONE_PRESETS, ou "" (aucun)
  niche: string; // id dans NICHE_PRESETS, ou "" (aucun)
  fields: Record<SeoFieldKey, boolean>; // quels champs générer
};

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  length: "medium",
  tone: "",
  niche: "",
  fields: {
    title: true,
    description: true,
    bullets: true,
    metaDescription: true,
    keywords: true,
  },
};

// Champs du pack SEO, dans l'ordre d'affichage, avec la consigne envoyée à l'IA.
export const FIELD_DEFS: {
  key: SeoFieldKey;
  label: string;
  prompt: (length: OutputLength) => string;
}[] = [
  {
    key: "title",
    label: "Title",
    prompt: () => '"title": a concise SEO product title (max ~60 characters).',
  },
  {
    key: "description",
    label: "Description",
    prompt: (length) =>
      `"description": the main body — ${LENGTH_BODY[length]}, keywords woven in subtly.`,
  },
  {
    key: "bullets",
    label: "Bullets",
    prompt: () =>
      '"bullets": an array of 3 to 5 short key selling points (strings, no leading dash).',
  },
  {
    key: "metaDescription",
    label: "Meta description",
    prompt: () =>
      '"metaDescription": a compelling meta description of about 155 characters.',
  },
  {
    key: "keywords",
    label: "Keywords",
    prompt: () =>
      '"keywords": an array of 5 to 8 relevant SEO keywords or tags (strings).',
  },
];

// Longueur du corps de la description.
const LENGTH_BODY: Record<OutputLength, string> = {
  short: "1 tight paragraph (~40 words)",
  medium: "2 short paragraphs",
  long: "3 rich, detailed paragraphs",
};

export const LENGTH_PRESETS: { id: OutputLength; label: string }[] = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
];

// Plafond de tokens de sortie selon la longueur (le pack JSON reste compact).
export const LENGTH_MAX_TOKENS: Record<OutputLength, number> = {
  short: 900,
  medium: 1500,
  long: 2200,
};

export const TONE_PRESETS: { id: string; label: string; prompt: string }[] = [
  { id: "", label: "Default", prompt: "" },
  {
    id: "professional",
    label: "Professional",
    prompt: "Tone: professional, clear and trustworthy.",
  },
  {
    id: "luxury",
    label: "Luxury",
    prompt: "Tone: luxury and premium — evocative, aspirational, refined.",
  },
  {
    id: "playful",
    label: "Playful",
    prompt: "Tone: playful, fun and energetic, with light personality.",
  },
  {
    id: "friendly",
    label: "Friendly",
    prompt: "Tone: warm, friendly and conversational.",
  },
  {
    id: "technical",
    label: "Technical",
    prompt: "Tone: precise and technical — factual, spec-driven, no fluff.",
  },
  {
    id: "minimal",
    label: "Minimal",
    prompt: "Tone: minimal and understated — short, calm, essential.",
  },
];

export const NICHE_PRESETS: { id: string; label: string; prompt: string }[] = [
  { id: "", label: "None", prompt: "" },
  {
    id: "jewelry",
    label: "Jewelry",
    prompt:
      "This is a jewelry product. Emphasize materials (gold, silver, gemstones), craftsmanship, occasion, and emotional value. Use elegant, refined language.",
  },
  {
    id: "wine",
    label: "Wine & spirits",
    prompt:
      "This is a wine or spirit. Evoke tasting notes, aromas, origin/terroir, and food pairings. Respect that alcohol is age-restricted; no health claims.",
  },
  {
    id: "cosmetics",
    label: "Cosmetics & skincare",
    prompt:
      "This is a cosmetics/skincare product. Highlight key ingredients, benefits, skin type/usage. Avoid medical or unverifiable claims.",
  },
  {
    id: "fashion",
    label: "Fashion & apparel",
    prompt:
      "This is a fashion/apparel item. Emphasize fabric, fit, styling, and the occasions it suits.",
  },
  {
    id: "food",
    label: "Food & gourmet",
    prompt:
      "This is a food/gourmet product. Evoke flavor, texture, ingredients, origin, and serving ideas. No unverified health claims.",
  },
  {
    id: "home",
    label: "Home & decor",
    prompt:
      "This is a home/decor product. Emphasize materials, dimensions, style, and how it elevates a space.",
  },
  {
    id: "tech",
    label: "Electronics & tech",
    prompt:
      "This is an electronics/tech product. Lead with key specs, compatibility, and real-world benefits. Be accurate, avoid hype.",
  },
  {
    id: "wellness",
    label: "Supplements & wellness",
    prompt:
      "This is a supplement/wellness product. Describe purpose and usage clearly. Avoid medical claims; add no disease or cure language.",
  },
];

// Ramène une config potentiellement partielle/inconnue à une config valide.
export function normalizeOutputConfig(raw: unknown): OutputConfig {
  const d = DEFAULT_OUTPUT_CONFIG;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<OutputConfig>;
  const length: OutputLength =
    r.length === "short" || r.length === "long" ? r.length : "medium";
  const fields = { ...d.fields, ...(r.fields ?? {}) } as Record<
    SeoFieldKey,
    boolean
  >;
  // Au moins un champ doit rester actif.
  if (!Object.values(fields).some(Boolean)) fields.description = true;
  return {
    length,
    tone: typeof r.tone === "string" ? r.tone : "",
    niche: typeof r.niche === "string" ? r.niche : "",
    fields,
  };
}
