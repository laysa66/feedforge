"use client";

// Configuration i18n de l'INTERFACE (react-i18next). À ne pas confondre avec les
// langues de SORTIE des fiches produits (gérées dans lib/languages.ts). Ici on
// traduit les libellés de l'app. Init synchrone à lng="en" pour matcher le rendu
// serveur ; la langue enregistrée est appliquée au montage (voir I18nProvider).

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export const LANG_KEY = "feedforge.lang";

export const UI_LANGS = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
] as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// Change la langue de l'UI, la persiste et met à jour <html lang="…">.
export function setLanguage(lng: string) {
  i18n.changeLanguage(lng);
  try {
    window.localStorage.setItem(LANG_KEY, lng);
  } catch {
    /* mode privé / quota : on ignore */
  }
  if (typeof document !== "undefined") document.documentElement.lang = lng;
}

export default i18n;
