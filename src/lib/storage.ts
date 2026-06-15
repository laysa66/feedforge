"use client";

// Stockage local (navigateur du client). Rien n'est envoyé chez nous :
// la clé API et l'historique de consommation restent sur la machine du client.
// C'est le cœur du modèle "Bring Your Own Key" — zéro coût et zéro responsabilité pour nous.

import { DEFAULT_MODEL } from "./models";

const KEY_API = "feedforge.apiKey";
const KEY_MODEL = "feedforge.model";
const KEY_USAGE = "feedforge.usage";
const KEY_BRAND = "feedforge.brandVoice";

export type UsageRecord = {
  at: number; // timestamp
  model: string;
  count: number; // nb de fiches générées dans le lot
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota plein ou mode privé : on ignore */
  }
}

export const getApiKey = () => safeGet(KEY_API) ?? "";
export const setApiKey = (v: string) => safeSet(KEY_API, v.trim());

export const getModelId = () => safeGet(KEY_MODEL) ?? DEFAULT_MODEL;
export const setModelId = (v: string) => safeSet(KEY_MODEL, v);

export const getBrandVoice = () => safeGet(KEY_BRAND) ?? "";
export const setBrandVoice = (v: string) => safeSet(KEY_BRAND, v);

export function getUsage(): UsageRecord[] {
  const raw = safeGet(KEY_USAGE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsageRecord[]) : [];
  } catch {
    return [];
  }
}

export function addUsage(record: UsageRecord) {
  const all = getUsage();
  all.push(record);
  // On garde les 500 derniers lots pour ne pas saturer le stockage.
  safeSet(KEY_USAGE, JSON.stringify(all.slice(-500)));
}

export function clearUsage() {
  safeSet(KEY_USAGE, JSON.stringify([]));
}
