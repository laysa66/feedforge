"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Boxes } from "lucide-react";
import logo from "@/app/icon.png";

const links = [
  { href: "/generate", label: "Générer", icon: Boxes },
  { href: "/dashboard", label: "Consommation", icon: LayoutDashboard },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
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
          {links.map(({ href, label, icon: Icon }) => {
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
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
