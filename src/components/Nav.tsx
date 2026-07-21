"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Settings, Boxes, Languages } from "lucide-react";
import logo from "@/app/icon.png";
import { UI_LANGS, setLanguage } from "@/lib/i18n";

const links = [
  { href: "/generate", key: "nav.generate", icon: Boxes },
  { href: "/dashboard", key: "nav.usage", icon: LayoutDashboard },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[color:var(--background)]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <Image
            src={logo}
            alt="FeedForge"
            width={40}
            height={40}
            priority
            className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.45)]"
          />
          <span className="font-display text-lg tracking-tight">
            Feed<span className="text-brand-2">Forge</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "border border-border bg-surface text-foreground"
                    : "border border-transparent text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{t(key)}</span>
              </Link>
            );
          })}
          <div
            className="ml-1 flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5"
            role="group"
            aria-label={t("nav.language")}
          >
            <Languages size={15} className="mx-1 text-muted" />
            {UI_LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  i18n.language === l.code
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
