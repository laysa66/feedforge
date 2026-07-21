"use client";

import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted">
      {t("footer.text")}
    </footer>
  );
}
