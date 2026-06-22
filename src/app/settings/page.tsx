"use client";

import { useEffect, useState } from "react";
import { KeyRound, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  PROVIDERS,
  getProviderInfo,
  defaultModelFor,
  type ProviderId,
} from "@/lib/models";
import {
  getProvider,
  setProvider,
  getKeyFor,
  setKeyFor,
  getModelId,
  setModelId,
  getBrandVoice,
  setBrandVoice,
} from "@/lib/storage";

export default function SettingsPage() {
  const [provider, setProv] = useState<ProviderId>(PROVIDERS[0].id);
  const [apiKey, setKey] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].models[0].id);
  const [brand, setBrand] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  // Chargement initial depuis le navigateur.
  useEffect(() => {
    const p = getProvider();
    setProv(p);
    setKey(getKeyFor(p));
    setModel(getModelId());
    setBrand(getBrandVoice());
  }, []);

  // Quand on change de fournisseur : on charge sa clé + on réinitialise le modèle.
  function changeProvider(p: ProviderId) {
    setProv(p);
    setKey(getKeyFor(p));
    setModel(defaultModelFor(p));
  }

  function save() {
    setProvider(provider);
    setKeyFor(provider, apiKey);
    setModelId(model);
    setBrandVoice(brand);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const info = getProviderInfo(provider);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">
          Choose your AI provider and configure your key.
        </p>
      </div>

      <div className="glass flex items-start gap-3 rounded-xl p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-success" size={18} />
        <p className="text-muted">
          Your keys are stored{" "}
          <strong className="text-foreground">only in your browser</strong> and
          are sent to our servers only for the duration of a generation — never
          retained. You pay for your usage directly with the provider.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">AI provider</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => changeProvider(p.id)}
              className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                provider === p.id
                  ? "border-brand-2 bg-brand-2/10 text-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {p.label.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">API key — {info.label}</label>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder={info.keyHint}
            className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-10 font-mono text-sm outline-none focus:border-brand-2"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
            aria-label="Show/hide"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-muted">
          Get a key at{" "}
          <a
            href={info.keysUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-2 underline"
          >
            {new URL(info.keysUrl).hostname}
          </a>
          .
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        >
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — ${m.inputPerMTok}/${m.outputPerMTok} per M tokens
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Indicative pricing — actual billing depends on the provider.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Brand voice <span className="text-muted">(optional)</span>
        </label>
        <textarea
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          rows={3}
          placeholder="e.g. warm and premium, casual tone, eco-friendly vocabulary…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        />
      </div>

      <button
        onClick={save}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-2.5 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90"
      >
        {saved ? <Check size={18} /> : null}
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
