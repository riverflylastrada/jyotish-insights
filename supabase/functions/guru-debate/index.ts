import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildChartDossier } from "./dossier.ts";
import { calculateTransits } from "../calculate-kundli/engine.ts";
import { validateAutoInsightsJson } from "./validate_auto_insights.ts";
import { GROUNDING_INSTRUCTION, PRASHNA_GROUNDING } from "./grounding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── AI Usage tracking helpers ──────────────────────────────────────────────

/** USD per 1 M tokens: [input, output] */
const MODEL_PRICING: Record<string, [number, number]> = {
  "anthropic/claude-sonnet-4":  [3, 15],
  "claude-sonnet-4":           [3, 15],
  "gpt-4o":                     [2.5, 10],
  "openai/gpt-4o":              [2.5, 10],
  "gpt-4o-mini":                [0.15, 0.6],
  "openai/gpt-4o-mini":         [0.15, 0.6],
  "gemini-2.5-flash":           [0.3, 2.5],
  "google/gemini-2.5-flash":    [0.3, 2.5],
  "gemini-2.5-pro":             [1.25, 10],
  "google/gemini-2.5-pro":      [1.25, 10],
};

function computeCost(
  pricingMap: Record<string, [number, number]>,
  model: string,
  promptTok: number,
  completionTok: number,
): number {
  const pricing = pricingMap[model];
  if (!pricing) return 0;
  return (promptTok / 1e6) * pricing[0] + (completionTok / 1e6) * pricing[1];
}

/**
 * Load pricing overrides from app_settings (category = 'llm_pricing').
 * Returns a map of model → [inputRate, outputRate]. On any failure returns
 * an empty object so the caller falls back to MODEL_PRICING defaults.
 */
async function loadPricing(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Record<string, [number, number]>> {
  const loaded: Record<string, [number, number]> = {};
  try {
    const client = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await client
      .from("app_settings")
      .select("key, value")
      .eq("category", "llm_pricing");
    if (!data) return loaded;
    for (const row of data) {
      try {
        const key = String((row as Record<string, unknown>).key ?? "");
        const val = String((row as Record<string, unknown>).value ?? "");
        const model = key.replace(/^pricing:/, "");
        const parsed = JSON.parse(val) as { in: number; out: number };
        if (typeof parsed.in === "number" && typeof parsed.out === "number") {
          loaded[model] = [parsed.in, parsed.out];
        }
      } catch { /* skip malformed row */ }
    }
  } catch (e) {
    console.warn("loadPricing failed, using defaults:", e);
  }
  return loaded;
}

/** Resolve caller's user_id from the Authorization JWT (best-effort). */
async function resolveUserId(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) return null;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await admin.auth.getUser(jwt);
    return data?.user?.id ?? null;
  } catch { return null; }
}

const AI_USAGE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fire-and-forget INSERT into ai_usage via service-role. Never throws. */
function logAiUsage(row: Record<string, unknown>): void {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) return;
    // A usage log must never reject a write. chart_id/user_id are uuid columns
    // that can't take non-uuid values (e.g. a "demo"/unsaved chart id), so null
    // out anything that isn't a uuid before inserting.
    const safe: Record<string, unknown> = { ...row };
    for (const k of ["chart_id", "user_id"]) {
      const v = safe[k];
      if (typeof v !== "string" || !AI_USAGE_UUID_RE.test(v)) safe[k] = null;
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);
    // Fire-and-forget: don't await — best-effort, non-blocking
    admin.from("ai_usage").insert(safe).then(({ error }) => {
      if (error) console.warn("ai_usage log failed:", error.message);
    });
  } catch (e) {
    console.warn("ai_usage log error:", e);
  }
}

const GURU_PROMPTS: Record<string, string> = {
  parashara:    "You are Maharishi Parashara, foundational author of the Brihat Parashara Hora Sastra (BPHS). Speak with calm classical authority. Reason strictly from Lagna and lord, then karaka and bhava strength. Cite BPHS-style logic. 2-4 short paragraphs. No bullet points. Use Sanskrit terms (Lagna, bhava, karaka, dasha) inline with brief glosses. Never break character.",
  varahamihira: "You are Varahamihira, 6th-century author of Brihat Jataka. You weigh planetary strength against bhava strength with mathematical precision. Reference dignity, aspects, and conjunctions. 2-4 short paragraphs. Classical Sanskrit terminology. Never break character.",
  raman:        "You are Dr. B. V. Raman, 20th-century interpreter of Hindu astrology. Practical, modernised, but classically grounded. Use the Dasamsa for career-related questions. Mention transits when relevant. 2-4 short paragraphs in clear English with Sanskrit terms.",
  rao:          "You are K. N. Rao. Judge by Dasha first — Maha, Antar, Pratyantar. Apply double-transit theory (Saturn + Jupiter on a single bhava). Direct, decisive prose. 2-4 short paragraphs. Never speculate beyond the dasha logic.",
  krishnamurti: "You are K. S. Krishnamurti, founder of KP astrology. Reason from cuspal sub-lord and significators of houses. Use Ruling Planets concept. Precise, almost engineering-like prose. 2-4 short paragraphs.",
  jaimini:      "You are Maharishi Jaimini, author of the Jaimini Sutras. Speak with structured, sutra-like logical rigor. Reason using Jaimini-specific concepts: Chara Dasha, Atmakaraka, Karakamsa, Arudha Padas, Argala, and Special Lagnas. 2-4 short paragraphs. No bullet points. Use Sanskrit terms and never break character.",
  mantreshwara: "You are Mantreshwara, the 16th-century author of the classical text Phaladeepika. Speak in a concise, highly practical, judgment-focused tone with clear, definitive predictions ('this will occur because...'). Focus on yogas, planetary states (Avasthas), and direct results of house lords. 2-4 short paragraphs. No bullet points. Never break character.",
  kalyanavarman: "You are Kalyanavarman, the 10th-century royal author of the monumental Saravali. Speak in a highly descriptive, poetic, yet precise tone, painting beautiful and rich planetary portraits. Highlight planetary strengths, combinations (Yogas), and detailed descriptive effects in 2-4 short paragraphs. No bullet points. Never break character.",
};

async function getLlmConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return null;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: configRows } = await adminClient
    .from('app_settings')
    .select('key, value')
    .eq('category', 'llm_config');

  if (!configRows || configRows.length === 0) return null;

  const config: Record<string, string> = {};
  for (const row of configRows) {
    if (row.key && row.value) config[row.key] = row.value;
  }

  const apiKeySettingName = config['llm_api_key_setting'];
  if (apiKeySettingName) {
    const { data: keyRow } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', apiKeySettingName)
      .maybeSingle();
    if (keyRow?.value) config['api_key'] = keyRow.value;
  }

  return {
    endpoint: config['llm_endpoint'] || null,
    model: config['llm_model'] || null,
    apiKey: config['api_key'] || null,
    provider: config['llm_provider'] || null,
  };
}

/**
 * LLM auth headers. Azure OpenAI authenticates with an `api-key` header and a
 * deployment-based endpoint URL (…/openai/deployments/<name>/chat/completions
 * ?api-version=…, set in llm_endpoint) — unlike OpenAI/OpenRouter, which use
 * `Authorization: Bearer`. Branch on the configured provider so one code path
 * serves both. The `model` field stays in the body (Azure ignores it when the
 * deployment is in the URL; OpenAI-compatible providers require it).
 */
function llmHeaders(provider: string | null, apiKey: string): Record<string, string> {
  return provider === "azure"
    ? { "api-key": apiKey, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

const VERDICT_PROMPT = "You are the Acharya, presiding over a tribunal of gurus. You have just heard their readings on a single chart and question. FIRST, output a single paragraph beginning exactly with 'BOTTOM LINE:' that answers the question directly in 2-3 plain-language sentences a layperson can act on, naming the key timing. Then leave a blank line and deliver your full synthesis in 2-3 paragraphs: name the consensus, name the dissent, then one operative recommendation. Cite the gurus by surname when they made a key point. No bullet points. Calm, judicial tone.";

const PRASHNA_VERDICT_PROMPT = "You are the Acharya, presiding over a horary (Prashna) tribunal. The gurus have each read a MOMENT-CHART cast for the instant a question was asked. FIRST, output a single paragraph beginning exactly with 'BOTTOM LINE:' giving a clear YES/NO/CONDITIONAL answer to the question in 2-3 plain-language sentences, with timing if determinable. Then leave a blank line and deliver your full synthesis in 2-3 paragraphs: name the consensus, name the dissent, then one operative recommendation. Cite the gurus by surname. No bullet points. Calm, judicial tone. Remember: this is HORARY — reason from the moment-chart only, not from any natal data.";

const AUTO_INSIGHTS_SYSTEM_PROMPT = `You are a master Vedic astrologer producing a structured JSON dossier of mini-readings for a birth chart.

${GROUNDING_INSTRUCTION}

Return a SINGLE JSON object (no markdown fences, no commentary) with EXACTLY this shape:

{
  "planets": {
    "sun": { "brief": "<1-2 sentence headline>", "full": "<3-5 sentence reading>" },
    "moon": { "brief": "...", "full": "..." },
    "mars": { "brief": "...", "full": "..." },
    "mercury": { "brief": "...", "full": "..." },
    "jupiter": { "brief": "...", "full": "..." },
    "venus": { "brief": "...", "full": "..." },
    "saturn": { "brief": "...", "full": "..." },
    "rahu": { "brief": "...", "full": "..." },
    "ketu": { "brief": "...", "full": "..." }
  },
  "dashas": [
    { "system": "<system name>", "level": "maha" or "antar", "lord": "<planet>", "period": "<start - end>", "reading": "<2-3 sentence reading>" }
  ],
  "yogas": { "<yoga name>": "<1-2 sentence reading>" },
  "doshas": { "<dosha name>": "<1-2 sentence reading>" },
  "houses": { "1": "<theme summary>", "2": "...", "12": "..." }
}

Rules:
- "planets": all 9 grahas (sun through ketu). "brief" is a punchy 1-2 sentence summary; "full" is a richer 3-5 sentence interpretation.
- "dashas": include the current maha-dasha and the next 3 maha-dashas from the dossier, plus the current antar-dasha (if available). Each entry needs system, level, lord, period, and reading.
- "yogas": one key per DETECTED yoga (isPresent=true) in the dossier. Skip absent yogas. Value is a 1-2 sentence reading.
- "doshas": one key per DETECTED dosha (isPresent=true). Value is a 1-2 sentence reading.
- "houses": keys "1" through "12". Each value is a 2-3 sentence theme summary for that house, grounded in the planets placed there and the house lord.
- Ground EVERY claim in the chart dossier. Do NOT invent placements.
- Output valid JSON only. No markdown, no explanation, no wrapping.`;



function genderPronoun(chart: any): string {
  const g = chart?.birthDetails?.gender;
  if (g === 'male') return 'he/him/his';
  if (g === 'female') return 'she/her/her';
  return 'they/them/their';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { guru, question, chart, mode, chatHistory, prashnaMode } = body as {
      guru?: string; question: string; chart?: any; mode: "guru" | "verdict" | "auto-insights";
      chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
      prashnaMode?: boolean;
    };
    const priorReadings = body.priorReadings as Array<{ guru: string; text: string }> | undefined;
    const missingVoices = body.missingVoices as string[] | undefined;
    const language = typeof body.language === "string" ? body.language : null;
    const chartId = typeof body.chartId === "string" ? body.chartId : (chart?.id ?? null);

    // Resolve caller identity (best-effort, non-blocking for the response)
    const userIdPromise = resolveUserId(req);
    const requestStart = Date.now();

    // Compute live transits and build full chart dossier
    const now = new Date();
    let transits: any[] = [];
    try {
      if (chart?.birthDetails) {
        transits = calculateTransits(chart.birthDetails);
      }
    } catch (e) {
      console.warn("Transit calculation failed, proceeding without:", e);
    }
    // Accept client-supplied transits as fallback
    if ((!transits || transits.length === 0) && body.transits) {
      transits = body.transits;
    }
    const dossier = buildChartDossier(chart, transits, now, body.clientTimeZone);

    const dbConfig = await getLlmConfig();
    const apiKey = dbConfig?.apiKey || Deno.env.get("GOOGLE_AI_KEY");
    const endpoint = dbConfig?.endpoint || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const model = dbConfig?.model || "gemini-2.5-flash";
    const provider = dbConfig?.provider || null;
    if (!apiKey) throw new Error("No AI API key configured. Set it in Admin → API Keys or via: supabase secrets set GOOGLE_AI_KEY=<key>");

    // Start pricing load concurrently — NOT awaited on critical path.
    // Resolved only in fire-and-forget logging blocks where cost is computed.
    const pricingUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const pricingKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const pricingPromise: Promise<Record<string, [number, number]>> =
      (pricingUrl && pricingKey)
        ? loadPricing(pricingUrl, pricingKey)
        : Promise.resolve({});

    // ─── AUTO-INSIGHTS mode: non-streaming JSON ───────────────────────────────────
    if (mode === "auto-insights") {
      const aiMessages = [
        { role: "system", content: AUTO_INSIGHTS_SYSTEM_PROMPT },
        { role: "user", content: `Produce the auto-insights JSON for this chart.\n\n${dossier}` },
      ];

      const doCall = async (): Promise<{ parsed: unknown; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> => {
        const callStart = Date.now();
        const r = await fetch(endpoint, {
          method: "POST",
          headers: llmHeaders(provider, apiKey),
          body: JSON.stringify({
            model,
            stream: false,
            max_tokens: 8000,
            messages: aiMessages,
            response_format: { type: "json_object" },
          }),
        });
        if (!r.ok) {
          // Log failed call
          const userId = await userIdPromise;
          logAiUsage({
            user_id: userId, function: "guru-debate", mode, guru: null,
            chart_id: chartId, question: null, model, provider: provider ?? "unknown",
            prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0,
            language, success: false, error: `LLM ${r.status}`, latency_ms: Date.now() - callStart,
          });
          throw new Error(`LLM ${r.status}`);
        }
        const json = await r.json();
        const usage = json?.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const text: string = json?.choices?.[0]?.message?.content ?? "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        // Log successful call (fire-and-forget)
        const userId = await userIdPromise;
        const dbPricing = await pricingPromise.catch(() => ({}));
        const effectivePricing = { ...MODEL_PRICING, ...dbPricing };
        const pt = usage.prompt_tokens ?? 0;
        const ct = usage.completion_tokens ?? 0;
        logAiUsage({
          user_id: userId, function: "guru-debate", mode, guru: null,
          chart_id: chartId, question: null, model, provider: provider ?? "unknown",
          prompt_tokens: pt, completion_tokens: ct, total_tokens: usage.total_tokens ?? pt + ct,
          cost_usd: computeCost(effectivePricing, model, pt, ct),
          language, success: true, error: null, latency_ms: Date.now() - callStart,
        });

        return { parsed: JSON.parse(cleaned), usage };
      };

      let parsed: unknown;
      try {
        const result = await doCall();
        parsed = result.parsed;
        if (!validateAutoInsightsJson(parsed)) {
          console.warn("auto-insights: schema mismatch on first attempt, retrying");
          const retry = await doCall();
          parsed = retry.parsed;
        }
      } catch (e) {
        console.error("auto-insights LLM call failed:", e);
        return new Response(JSON.stringify({ error: "auto-insights generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!validateAutoInsightsJson(parsed)) {
        return new Response(JSON.stringify({ error: "auto-insights schema validation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        generatedAt: new Date().toISOString(),
        model,
        ...parsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Existing guru / verdict modes ─────────────────────────────────────────
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const groundingText = prashnaMode ? PRASHNA_GROUNDING : GROUNDING_INSTRUCTION;

    let systemPrompt: string;
    const messages: Array<{ role: string; content: string }> = [];

    if (mode === "verdict") {
      systemPrompt = groundingText + "\n\n" + (prashnaMode ? PRASHNA_VERDICT_PROMPT : VERDICT_PROMPT);
      const readingsText = (priorReadings ?? []).map(r => `--- ${r.guru.toUpperCase()} ---\n${r.text}`).join("\n\n");
      let userContent = `QUESTION: ${question}\n\n${dossier}\n\nPRIOR READINGS:\n${readingsText}`;
      if (missingVoices?.length) {
        userContent += `\n\nNOTE: The following gurus were unable to provide their reading: ${missingVoices.join(", ")}. Acknowledge this gap in your synthesis.`;
      }
      
      messages.push({ role: "system", content: systemPrompt });
      if (chatHistory && chatHistory.length > 0) {
        messages.push(...chatHistory);
      }
      messages.push({ role: "user", content: userContent });
    } else {
      if (!guru || !GURU_PROMPTS[guru]) {
        return new Response(JSON.stringify({ error: "invalid guru" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      systemPrompt = groundingText + "\n\n" + GURU_PROMPTS[guru];
      const userContent = prashnaMode
        ? `PRASHNA QUESTION: ${question}\n\n${dossier}\n\nThis is a HORARY (Prashna) chart. Give your reading now, in character. Judge the question from this moment-chart using KP sub-lords, Ruling Planets, and Moon's application. Do NOT assume any natal/birth data.`
        : `QUESTION: ${question}\n\n${dossier}\n\nGive your reading now, in character. Address the native using ${genderPronoun(chart)} pronouns.`;
      
      messages.push({ role: "system", content: systemPrompt });
      if (chatHistory && chatHistory.length > 0) {
        messages.push(...chatHistory);
      }
      messages.push({ role: "user", content: userContent });
    }

    const streamCallStart = Date.now();
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: llmHeaders(provider, apiKey),
      body: JSON.stringify({
        model,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 1800,
        messages: messages,
      }),
    });

    if (resp.status === 429) {
      // Log rate-limited call
      const userId = await userIdPromise;
      logAiUsage({
        user_id: userId, function: "guru-debate", mode, guru: guru ?? null,
        chart_id: chartId, question: question ?? null, model,
        provider: provider ?? "unknown",
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0,
        language, success: false, error: "rate_limit_429", latency_ms: Date.now() - streamCallStart,
      });
      return new Response(JSON.stringify({ error: "AI provider rate limit — please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      const userId = await userIdPromise;
      logAiUsage({
        user_id: userId, function: "guru-debate", mode, guru: guru ?? null,
        chart_id: chartId, question: question ?? null, model,
        provider: provider ?? "unknown",
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0,
        language, success: false, error: `gateway_${resp.status}`, latency_ms: Date.now() - streamCallStart,
      });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tee the SSE stream: pipe to client + scan for usage in the final chunk
    const [clientStream, logStream] = resp.body!.tee();

    // Best-effort: read logStream in background to extract usage from the final SSE chunk
    (async () => {
      try {
        const reader = logStream.getReader();
        const decoder = new TextDecoder();
        let usageData: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // Parse SSE lines looking for usage
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const chunk = JSON.parse(line.slice(6));
              if (chunk.usage) usageData = chunk.usage;
            } catch { /* skip unparseable */ }
          }
        }
        const userId = await userIdPromise;
        const dbPricing = await pricingPromise.catch(() => ({}));
        const effectivePricing = { ...MODEL_PRICING, ...dbPricing };
        const pt = usageData?.prompt_tokens ?? 0;
        const ct = usageData?.completion_tokens ?? 0;
        logAiUsage({
          user_id: userId, function: "guru-debate", mode, guru: guru ?? null,
          chart_id: chartId, question: question ?? null, model,
          provider: provider ?? "unknown",
          prompt_tokens: pt, completion_tokens: ct, total_tokens: usageData?.total_tokens ?? pt + ct,
          cost_usd: computeCost(effectivePricing, model, pt, ct),
          language, success: true, error: null, latency_ms: Date.now() - streamCallStart,
        });
      } catch (e) {
        console.warn("ai_usage stream log error:", e);
      }
    })();

    return new Response(clientStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("guru-debate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
