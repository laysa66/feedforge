"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANG_KEY } from "@/lib/i18n";

// Applique la langue enregistrée (ou celle du navigateur) après le montage.
// On ne le fait pas au 1er rendu pour que serveur et client rendent tous deux
// "en" et éviter un mismatch d'hydratation ; la bascule se fait juste après.
export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch {
      /* ignore */
    }
    const lng =
      saved || (navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en");
    if (lng !== i18n.language) i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
