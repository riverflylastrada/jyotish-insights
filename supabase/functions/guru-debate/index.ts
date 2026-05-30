import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildChartDossier } from "./dossier.ts";
import { calculateTransits } from "../calculate-kundli/engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  };
}

const VERDICT_PROMPT = "You are the Acharya, presiding over a tribunal of gurus. You have just heard their readings on a single chart and question. FIRST, output a single paragraph beginning exactly with 'BOTTOM LINE:' that answers the question directly in 2-3 plain-language sentences a layperson can act on, naming the key timing. Then leave a blank line and deliver your full synthesis in 2-3 paragraphs: name the consensus, name the dissent, then one operative recommendation. Cite the gurus by surname when they made a key point. No bullet points. Calm, judicial tone.";

const PRASHNA_GROUNDING = `IMPORTANT: This is a PRASHNA (horary) chart — a chart cast for the exact moment a question was asked, NOT a natal birth chart. There is NO native/person whose life you are reading. Reason ONLY from the moment-chart provided: the Lagna (ascendant) of the moment, the Moon's position and application (separating/applying aspects), KP sub-lords, cuspal sub-lords, Ruling Planets, and house significators. In KP horary, the sub-lord of the relevant house cusp is the primary determinant of whether the matter will fructify. Pay special attention to: (1) the sub-lord of the cusp governing the question, (2) Ruling Planets at the moment of the question, (3) Moon's last and next aspect (separating and applying), (4) whether significators connect the relevant houses. Do NOT assume any natal data, birth details, dasha periods from a person's life, or long-term transits. The querent's identity is irrelevant — only the moment-chart speaks. Give a clear YES/NO/CONDITIONAL answer with timing if possible. Method: Krishnamurti Paddhati (KP).`;

const PRASHNA_VERDICT_PROMPT = "You are the Acharya, presiding over a horary (Prashna) tribunal. The gurus have each read a MOMENT-CHART cast for the instant a question was asked. FIRST, output a single paragraph beginning exactly with 'BOTTOM LINE:' giving a clear YES/NO/CONDITIONAL answer to the question in 2-3 plain-language sentences, with timing if determinable. Then leave a blank line and deliver your full synthesis in 2-3 paragraphs: name the consensus, name the dissent, then one operative recommendation. Cite the gurus by surname. No bullet points. Calm, judicial tone. Remember: this is HORARY — reason from the moment-chart only, not from any natal data.";

const GROUNDING_INSTRUCTION = `IMPORTANT: Reason ONLY from the CHART DOSSIER and CURRENT TRANSITS provided below. Never invent or assume planetary positions, the current date, dasha periods, or divisional placements. Today's date is provided in the dossier; use the provided CURRENT TRANSITS section for all gochara/Sade Sati/timing reasoning. When the dossier provides a SADE SATI / SATURN TRANSIT STATUS, state that exact phase number and trend (intensifying vs. waning) — do NOT recompute, renumber, or relabel the phase, and do not contradict whether it is weakening or peaking. NEVER invent, estimate, or guess a transit, sign-change, or Sade Sati end date: cite ONLY the dasha dates and the ephemeris-computed end dates given in the dossier. Vedic timing is gradual and probabilistic — phrase relief/onset as "easing around <month/year>", not as an exact calendar day. Distinguish the SIZE of relief: a sub-period change (e.g. a new Pratyantardasha) brings only gradual, partial easing — rank it explicitly BELOW the major turning point of a larger cycle ending (e.g. Sade Sati completing), and say which is the minor vs. the decisive shift. When you cite Ashtakavarga, reference BOTH the strongest and the weakest houses given (do not cherry-pick only the weak one). If your method requires data that is not provided (e.g. KP cuspal sub-lords, Jaimini Arudha padas), state briefly that it is unavailable rather than fabricating it.`;

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

// Auto-insights JSON shape validation

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const HOUSE_KEYS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

export function validateAutoInsightsJson(obj: unknown): obj is {
  planets: Record<string, { brief: string; full: string }>;
  dashas: Array<{ system: string; level: string; lord: string; period: string; reading: string }>;
  yogas: Record<string, string>;
  doshas: Record<string, string>;
  houses: Record<string, string>;
} {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;

  // planets
  if (!o.planets || typeof o.planets !== 'object') return false;
  for (const k of PLANET_KEYS) {
    const p = (o.planets as Record<string, unknown>)[k];
    if (!p || typeof p !== 'object') return false;
    const pp = p as Record<string, unknown>;
    if (typeof pp.brief !== 'string' || typeof pp.full !== 'string') return false;
  }

  // dashas
  if (!Array.isArray(o.dashas)) return false;
  for (const d of o.dashas) {
    if (!d || typeof d !== 'object') return false;
    const dd = d as Record<string, unknown>;
    if (typeof dd.system !== 'string' || typeof dd.level !== 'string' ||
        typeof dd.lord !== 'string' || typeof dd.period !== 'string' ||
        typeof dd.reading !== 'string') return false;
  }

  // yogas
  if (!o.yogas || typeof o.yogas !== 'object') return false;
  for (const v of Object.values(o.yogas as Record<string, unknown>)) {
    if (typeof v !== 'string') return false;
  }

  // doshas
  if (!o.doshas || typeof o.doshas !== 'object') return false;
  for (const v of Object.values(o.doshas as Record<string, unknown>)) {
    if (typeof v !== 'string') return false;
  }

  // houses
  if (!o.houses || typeof o.houses !== 'object') return false;
  for (const k of HOUSE_KEYS) {
    if (typeof (o.houses as Record<string, unknown>)[k] !== 'string') return false;
  }

  return true;
}

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
    if (!apiKey) throw new Error("No AI API key configured. Set it in Admin → API Keys or via: supabase secrets set GOOGLE_AI_KEY=<key>");

    // ─── AUTO-INSIGHTS mode: non-streaming JSON ───────────────────────────────────
    if (mode === "auto-insights") {
      const aiMessages = [
        { role: "system", content: AUTO_INSIGHTS_SYSTEM_PROMPT },
        { role: "user", content: `Produce the auto-insights JSON for this chart.\n\n${dossier}` },
      ];

      const doCall = async (): Promise<unknown> => {
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            max_tokens: 8000,
            messages: aiMessages,
            response_format: { type: "json_object" },
          }),
        });
        if (!r.ok) throw new Error(`LLM ${r.status}`);
        const json = await r.json();
        const text: string = json?.choices?.[0]?.message?.content ?? "";
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        return JSON.parse(cleaned);
      };

      let parsed: unknown;
      try {
        parsed = await doCall();
        if (!validateAutoInsightsJson(parsed)) {
          console.warn("auto-insights: schema mismatch on first attempt, retrying");
          parsed = await doCall();
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

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 1800,
        messages: messages,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "AI provider rate limit — please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("guru-debate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
