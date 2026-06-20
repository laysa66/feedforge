"use client";

import { useEffect, useState } from "react";
import { KeyRound, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { MODELS } from "@/lib/models";
import {
  getApiKey,
  setApiKey,
  getModelId,
  setModelId,
  getBrandVoice,
  setBrandVoice,
} from "@/lib/storage";

export default function SettingsPage() {
  const [apiKey, setKey] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [brand, setBrand] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getApiKey());
    setModel(getModelId());
    setBrand(getBrandVoice());
  }, []);

  function save() {
    setApiKey(apiKey);
    setModelId(model);
    setBrandVoice(brand);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
        <p className="mt-1 text-muted">
          Configurez votre clé API et le modèle utilisé pour la génération.
        </p>
      </div>

      <div className="glass flex items-start gap-3 rounded-xl p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-success" size={18} />
        <p className="text-muted">
          Votre clé est stockée <strong className="text-foreground">uniquement dans votre navigateur</strong>{" "}
          et n&apos;est envoyée à nos serveurs que le temps d&apos;une génération,
          jamais conservée. C&apos;est vous qui réglez votre consommation IA
          directement auprès d&apos;Anthropic.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Clé API Anthropic</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-10 font-mono text-sm outline-none focus:border-brand-2"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
              aria-label="Afficher/masquer"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">
          Obtenez une clé sur{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="text-brand-2 underline"
          >
            console.anthropic.com
          </a>
          .
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Modèle</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.inputPerMTok}$/{m.outputPerMTok}$ par M tokens
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          {MODELS.find((m) => m.id === model)?.note}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Ton de marque <span className="text-muted">(optionnel)</span>
        </label>
        <textarea
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          rows={3}
          placeholder="Ex : chaleureux et premium, tutoiement, vocabulaire éco-responsable…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        />
      </div>

      <button
        onClick={save}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-2.5 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90"
      >
        {saved ? <Check size={18} /> : null}
        {saved ? "Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}
