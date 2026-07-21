"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyRound,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  CircleCheck,
  CircleX,
  RefreshCw,
} from "lucide-react";
import {
  PROVIDERS,
  getProviderInfo,
  defaultModelFor,
  type ModelInfo,
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
  getLanguages,
  setLanguages,
  hydrateDynamicModels,
  loadOpenRouterModels,
  getOutputConfig,
  setOutputConfig,
} from "@/lib/storage";
import { LANGUAGES } from "@/lib/languages";
import {
  DEFAULT_OUTPUT_CONFIG,
  FIELD_DEFS,
  LENGTH_PRESETS,
  NICHE_PRESETS,
  TONE_PRESETS,
  type OutputConfig,
  type SeoFieldKey,
} from "@/lib/output";

// Tarif $/M tokens : plus de décimales pour les tout petits prix, moins sinon.
function fmtPrice(v: number): string {
  if (v === 0) return "0";
  if (v < 1) return v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [provider, setProv] = useState<ProviderId>(PROVIDERS[0].id);
  const [apiKey, setKey] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].models[0].id);
  const [brand, setBrand] = useState("");
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyCheck, setKeyCheck] = useState<
    { valid: boolean; error?: string } | null
  >(null);
  const [orModels, setOrModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [output, setOutput] = useState<OutputConfig>(DEFAULT_OUTPUT_CONFIG);

  // Chargement initial depuis le navigateur.
  useEffect(() => {
    hydrateDynamicModels();
    const p = getProvider();
    setProv(p);
    setKey(getKeyFor(p));
    setModel(getModelId());
    setBrand(getBrandVoice());
    setLangs(getLanguages());
    setOutput(getOutputConfig());
    if (p === "openrouter") fetchOrModels();
  }, []);

  function toggleField(key: SeoFieldKey) {
    setOutput((o) => {
      const fields = { ...o.fields, [key]: !o.fields[key] };
      // Toujours garder au moins un champ actif.
      if (!Object.values(fields).some(Boolean)) return o;
      return { ...o, fields };
    });
  }

  // Récupère la liste OpenRouter à jour (tarifs réels) depuis leur API.
  async function fetchOrModels() {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const models = await loadOpenRouterModels();
      setOrModels(models);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Failed to load models.");
    } finally {
      setLoadingModels(false);
    }
  }

  function toggleLang(lang: string) {
    setLangs((cur) =>
      cur.includes(lang) ? cur.filter((l) => l !== lang) : [...cur, lang],
    );
  }

  // Quand on change de fournisseur : on charge sa clé + on réinitialise le modèle.
  function changeProvider(p: ProviderId) {
    setProv(p);
    setKey(getKeyFor(p));
    setModel(defaultModelFor(p));
    setKeyCheck(null);
    if (p === "openrouter" && !orModels.length) fetchOrModels();
  }

  // Vérifie la clé auprès du fournisseur sans consommer de tokens.
  async function testKey() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setKeyCheck(null);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      setKeyCheck(
        res.ok
          ? { valid: true }
          : { valid: false, error: data.error || "Invalid key." },
      );
    } catch (e) {
      setKeyCheck({
        valid: false,
        error: e instanceof Error ? e.message : "Validation failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    setProvider(provider);
    setKeyFor(provider, apiKey);
    setModelId(model);
    setBrandVoice(brand);
    setLanguages(langs);
    setOutputConfig(output);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const info = getProviderInfo(provider);
  // Pour OpenRouter, on affiche la liste live (avec tarifs réels) si on l'a,
  // sinon la liste statique de secours.
  const modelList =
    provider === "openrouter" && orModels.length ? orModels : info.models;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-muted">{t("settings.subtitle")}</p>
      </div>

      <div className="glass flex items-start gap-3 rounded-xl p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-success" size={18} />
        <p className="text-muted">
          {t("settings.privacyPre")}{" "}
          <strong className="text-foreground">
            {t("settings.privacyBold")}
          </strong>{" "}
          {t("settings.privacyPost")}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("settings.provider")}</label>
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
        <label className="text-sm font-medium">
          {t("settings.apiKey", { provider: info.label })}
        </label>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setKey(e.target.value);
              setKeyCheck(null);
            }}
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={testKey}
            disabled={testing || !apiKey.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm transition hover:bg-surface-2 disabled:opacity-40"
          >
            {testing ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <ShieldCheck size={15} />
            )}
            {testing ? t("settings.testing") : t("settings.testKey")}
          </button>
          {keyCheck?.valid && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CircleCheck size={15} /> {t("settings.keyValid")}
            </span>
          )}
          {keyCheck && !keyCheck.valid && (
            <span className="inline-flex items-center gap-1.5 text-sm text-danger">
              <CircleX size={15} /> {keyCheck.error}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          {t("settings.getKeyAt")}{" "}
          <a
            href={info.keysUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-2 underline"
          >
            {new URL(info.keysUrl).hostname}
          </a>
          {t("settings.noTokens")}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t("settings.model")}</label>
          {provider === "openrouter" && (
            <button
              type="button"
              onClick={fetchOrModels}
              disabled={loadingModels}
              className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
            >
              {loadingModels ? (
                <Loader2 className="animate-spin" size={13} />
              ) : (
                <RefreshCw size={13} />
              )}
              {loadingModels
                ? t("settings.loadingModels")
                : t("settings.refreshModels")}
            </button>
          )}
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        >
          {modelList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — ${fmtPrice(m.inputPerMTok)}/${fmtPrice(m.outputPerMTok)}{" "}
              {t("settings.perMTokens")}
            </option>
          ))}
        </select>
        {modelsError && (
          <p className="text-xs text-danger">
            {t("settings.modelsError", { error: modelsError })}
          </p>
        )}
        <p className="text-xs text-muted">
          {provider === "openrouter"
            ? t("settings.livePricing")
            : t("settings.indicativePricing")}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface/40 p-4">
        <div>
          <h2 className="text-sm font-medium">{t("settings.genOutput")}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {t("settings.genOutputSub")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">
            {t("settings.length")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_PRESETS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setOutput((o) => ({ ...o, length: l.id }))}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  output.length === l.id
                    ? "border-brand-2 bg-brand-2/10 text-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {t(`settings.lengths.${l.id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              {t("settings.tone")}
            </label>
            <select
              value={output.tone}
              onChange={(e) =>
                setOutput((o) => ({ ...o, tone: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-2"
            >
              {TONE_PRESETS.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {t(`settings.tones.${tp.id || "default"}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              {t("settings.niche")}
            </label>
            <select
              value={output.niche}
              onChange={(e) =>
                setOutput((o) => ({ ...o, niche: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-2"
            >
              {NICHE_PRESETS.map((n) => (
                <option key={n.id} value={n.id}>
                  {t(`settings.niches.${n.id || "none"}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">
            {t("settings.fields")}
          </label>
          <div className="flex flex-wrap gap-2">
            {FIELD_DEFS.map((f) => {
              const active = output.fields[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleField(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-brand-2 bg-brand-2/10 text-foreground"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {active ? <Check size={14} /> : null}
                  {t(`settings.fieldNames.${f.key}`)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">{t("settings.fewerFields")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("settings.outputLanguages")}
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const active = langs.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLang(lang)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-brand-2 bg-brand-2/10 text-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">{t("settings.eachLanguage")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("settings.brandVoice")}{" "}
          <span className="text-muted">{t("settings.optional")}</span>
        </label>
        <textarea
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          rows={3}
          placeholder={t("settings.brandPlaceholder")}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-2"
        />
      </div>

      <button
        onClick={save}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-amber px-5 py-2.5 font-medium text-white shadow-[0_8px_30px_-8px_rgba(249,115,22,0.7)] transition hover:opacity-90"
      >
        {saved ? <Check size={18} /> : null}
        {saved ? t("settings.saved") : t("settings.save")}
      </button>
    </div>
  );
}
