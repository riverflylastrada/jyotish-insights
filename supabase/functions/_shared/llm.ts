/**
 * Minimal LLM helper for the daily-email guidance line. Mirrors the config /
 * pricing / cost / ai_usage-logging conventions of guru-debate/index.ts (model &
 * provider resolved from app_settings `llm_config`, pricing overridable via
 * `llm_pricing`, cost logged to `ai_usage`). Self-contained so it can be shared
 * without refactoring the guru-debate critical path; a later PR may collapse the
 * duplicated copies into this module.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** USD per 1 M tokens: [input, output] — same table as guru-debate. */
const MODEL_PRICING: Record<string, [number, number]> = {
  "anthropic/claude-sonnet-4": [3, 15],
  "claude-sonnet-4": [3, 15],
  "gpt-4o": [2.5, 10],
  "openai/gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "openai/gpt-4o-mini": [0.15, 0.6],
  "gemini-2.5-flash": [0.3, 2.5],
  "google/gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-pro": [1.25, 10],
  "google/gemini-2.5-pro": [1.25, 10],
};

function computeCost(map: Record<string, [number, number]>, model: string, pt: number, ct: number): number {
  const p = map[model];
  if (!p) return 0;
  return (pt / 1e6) * p[0] + (ct / 1e6) * p[1];
}

async function loadPricing(url: string, key: string): Promise<Record<string, [number, number]>> {
  const loaded: Record<string, [number, number]> = {};
  try {
    const { data } = await createClient(url, key).from("app_settings").select("key, value").eq("category", "llm_pricing");
    for (const row of data ?? []) {
      try {
        const k = String((row as Record<string, unknown>).key ?? "").replace(/^pricing:/, "");
        const parsed = JSON.parse(String((row as Record<string, unknown>).value ?? "")) as { in: number; out: number };
        if (typeof parsed.in === "number" && typeof parsed.out === "number") loaded[k] = [parsed.in, parsed.out];
      } catch { /* skip malformed */ }
    }
  } catch (e) { console.warn("loadPricing failed, using defaults:", e); }
  return loaded;
}

async function getLlmConfig() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return null;
  const admin = createClient(url, key);
  const { data: rows } = await admin.from("app_settings").select("key, value").eq("category", "llm_config");
  if (!rows || rows.length === 0) return null;
  const config: Record<string, string> = {};
  for (const r of rows) if (r.key && r.value) config[r.key as string] = r.value as string;
  const apiKeySetting = config["llm_api_key_setting"];
  if (apiKeySetting) {
    const { data: keyRow } = await admin.from("app_settings").select("value").eq("key", apiKeySetting).maybeSingle();
    if (keyRow?.value) config["api_key"] = keyRow.value as string;
  }
  return {
    endpoint: config["llm_endpoint"] || null,
    model: config["llm_model"] || null,
    apiKey: config["api_key"] || null,
    provider: config["llm_provider"] || null,
  };
}

function llmHeaders(provider: string | null, apiKey: string): Record<string, string> {
  return provider === "azure"
    ? { "api-key": apiKey, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

const AI_USAGE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fire-and-forget INSERT into ai_usage via service-role. Never throws. */
export function logAiUsage(row: Record<string, unknown>): void {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !key) return;
    const safe: Record<string, unknown> = { ...row };
    for (const k of ["chart_id", "user_id"]) {
      const v = safe[k];
      if (typeof v !== "string" || !AI_USAGE_UUID_RE.test(v)) safe[k] = null;
    }
    createClient(url, key).from("ai_usage").insert(safe).then(({ error }) => {
      if (error) console.warn("ai_usage log failed:", error.message);
    });
  } catch (e) { console.warn("ai_usage log error:", e); }
}

const SYSTEM_PROMPT =
  "You are a Vedic astrologer writing a brief daily note for one person, grounded ONLY in the chart data you are given. " +
  "Do not invent placements, dashas, or events, and do not contradict the data. Write 2-3 warm, practical sentences about " +
  "the day ahead — what to lean into and what to be mindful of. Plain prose only: no greeting, no markdown, no lists, no headings.";

export interface GuidanceResult {
  text: string | null;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model?: string;
  provider?: string;
  cost?: number;
  error?: string;
}

/**
 * One non-streaming chat completion against the app's configured LLM
 * (provider/endpoint/key from `llm_config`). Best-effort: returns text|null plus
 * token usage and computed cost. `opts.model` overrides the configured model —
 * e.g. a stronger model for long-form content than the cheap daily-email default.
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; temperature?: number; model?: string; timeoutMs?: number } = {},
): Promise<GuidanceResult> {
  const cfg = await getLlmConfig();
  if (!cfg?.endpoint || !cfg?.apiKey) return { text: null, error: "llm not configured" };
  const model = opts.model || cfg.model;
  if (!model) return { text: null, error: "llm not configured" };
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const dbPricing = url && key ? await loadPricing(url, key).catch(() => ({})) : {};
  const pricing = { ...MODEL_PRICING, ...dbPricing };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  try {
    const r = await fetch(cfg.endpoint, {
      method: "POST",
      headers: llmHeaders(cfg.provider, cfg.apiKey),
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return { text: null, error: `LLM ${r.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`, model, provider: cfg.provider ?? "unknown" };
    }
    const json = await r.json();
    const usage = json?.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const pt = usage.prompt_tokens ?? 0;
    const ct = usage.completion_tokens ?? 0;
    return { text: raw.trim() || null, usage, model, provider: cfg.provider ?? "unknown", cost: computeCost(pricing, model, pt, ct) };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e), model, provider: cfg.provider ?? "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

/** Compact daily guidance line — thin wrapper over generateText. */
export function generateDailyGuidance(userContent: string): Promise<GuidanceResult> {
  return generateText(SYSTEM_PROMPT, userContent, { maxTokens: 200, temperature: 0.7, timeoutMs: 15_000 });
}
