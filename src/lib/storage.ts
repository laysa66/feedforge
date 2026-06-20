"use client";

// Stockage local (navigateur du client). Rien n'est envoyé chez nous :
// les clés API et l'historique de consommation restent sur la machine du client.
// C'est le cœur du modèle "Bring Your Own Key".

import {
  DEFAULT_PROVIDER,
  defaultModelFor,
  type ProviderId,
} from "./models";

const KEY_PROVIDER = "feedforge.provider";
const KEY_KEYS = "feedforge.keys"; // map { provider: clé }
const KEY_MODEL = "feedforge.model";
const KEY_USAGE = "feedforge.usage";
const KEY_BRAND = "feedforge.brandVoice";

export type UsageRecord = {
  at: number;
  provider: ProviderId;
  model: string;
  count: number;
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

// --- Fournisseur sélectionné ---
export function getProvider(): ProviderId {
  return (safeGet(KEY_PROVIDER) as ProviderId) || DEFAULT_PROVIDER;
}
export function setProvider(p: ProviderId) {
  safeSet(KEY_PROVIDER, p);
}

// --- Clés API (une par fournisseur) ---
function readKeys(): Record<string, string> {
  const raw = safeGet(KEY_KEYS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getKeyFor(provider: ProviderId): string {
  return readKeys()[provider] ?? "";
}
export function setKeyFor(provider: ProviderId, value: string) {
  const keys = readKeys();
  keys[provider] = value.trim();
  safeSet(KEY_KEYS, JSON.stringify(keys));
}

// Clé du fournisseur actuellement sélectionné (utilisée à la génération).
export const getApiKey = () => getKeyFor(getProvider());

// --- Modèle sélectionné ---
export function getModelId(): string {
  return safeGet(KEY_MODEL) || defaultModelFor(getProvider());
}
export function setModelId(v: string) {
  safeSet(KEY_MODEL, v);
}

// --- Ton de marque ---
export const getBrandVoice = () => safeGet(KEY_BRAND) ?? "";
export const setBrandVoice = (v: string) => safeSet(KEY_BRAND, v);

// --- Historique de consommation ---
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
  safeSet(KEY_USAGE, JSON.stringify(all.slice(-500)));
}

export function clearUsage() {
  safeSet(KEY_USAGE, JSON.stringify([]));
}
