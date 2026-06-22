import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeedForge — AI product descriptions for e-commerce",
  description:
    "Generate SEO-optimized product descriptions in bulk with your own API key. Track your usage and cost in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted">
          FeedForge · Your keys and data never leave your browser.
        </footer>
      </body>
    </html>
  );
}
