/**
 * Supabase Edge Function: voice-session
 *
 * Backs the Voice AI Guru. Three POST modes:
 *  - get-signed-url : mint an ElevenLabs conversation token (WebRTC) or signed
 *                     URL (WebSocket fallback) for the SINGLE base agent, and
 *                     build the per-session override (persona + grounding +
 *                     authoritative chart dossier + voice). The browser applies
 *                     the override via startSession({ ..., overrides }).
 *  - log-session    : record a completed conversation in voice_sessions (RLS-scoped).
 *  - get-usage      : report this month's minutes vs a soft cap from app_settings.
 *
 * verify_jwt = false (house style). Modes that touch user data verify the
 * caller's JWT explicitly and use a JWT-scoped client so RLS applies.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildChartDossier } from "../guru-debate/dossier.ts";
import { GROUNDING_INSTRUCTION } from "../guru-debate/grounding.ts";
import { calculateKundli, calculateTransits } from "../calculate-kundli/engine.ts";
import {
  VOICE_PERSONAS,
  VOICE_DELIVERY_RULES,
  DOSSIER_HEADER,
  NO_CHART_NOTICE,
  NO_CHART_GREETING,
} from "./personas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EL_BASE = "https://api.elevenlabs.io/v1/convai/conversation";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/** Fire-and-forget INSERT into ai_usage via service-role. Never throws. */
function logAiUsage(row: Record<string, unknown>): void {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    admin.from("ai_usage").insert(row).then(({ error }) => {
      if (error) console.warn("ai_usage log failed:", error.message);
    });
  } catch (e) {
    console.warn("ai_usage log error:", e);
  }
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

/** Build a client scoped to the caller's JWT so RLS + auth.uid() apply. */
function userClient(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY || SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

/**
 * Read a secret from app_settings (admin-managed, e.g. via the API Keys page),
 * falling back to a Deno env var of the same name. Mirrors guru-debate's
 * getLlmConfig precedence: app_settings first, env fallback.
 */
async function getSecret(key: string): Promise<string> {
  try {
    const { data } = await adminClient().from("app_settings").select("value").eq("key", key).maybeSingle();
    if (data?.value) return data.value as string;
  } catch (e) {
    console.warn("getSecret failed for", key, e);
  }
  return Deno.env.get(key) ?? "";
}

/** Read voice config rows (category 'voice') as a key→value map. */
async function getVoiceConfig(): Promise<Record<string, string>> {
  const admin = adminClient();
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .eq("category", "voice");
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.key) map[row.key] = row.value ?? "";
  return map;
}

// ───────────────────────────── get-signed-url ─────────────────────────────

async function handleGetSignedUrl(req: Request, body: any): Promise<Response> {
  const xiKey = await getSecret("ELEVENLABS_API_KEY");
  if (!xiKey) return json({ error: "Voice is not configured (set the ElevenLabs API key in Admin → API Keys)." }, 503);

  const guruId: string = body.guru ?? "parashara";
  const persona = VOICE_PERSONAS[guruId];
  if (!persona) return json({ error: `Unknown guru "${guruId}".` }, 400);
  if (!persona.available) return json({ error: `Guru "${guruId}" is not available yet.` }, 403);

  const cfg = await getVoiceConfig();
  const agentId = cfg["elevenlabs_agent_id"];
  if (!agentId) return json({ error: "Voice agent is not configured (missing agent id)." }, 503);
  const voiceId = cfg[`elevenlabs_voice_id_${guruId}`] || "";
  const language = body.language || cfg["elevenlabs_default_language"] || "hi";

  // Resolve the chart. Primary: caller passes the full KundliData (works for
  // demo / unsaved / shared charts, mirrors guru-debate). Fallback: load by
  // chartId via service role with an ownership check, recomputing if stale.
  let chart: any = body.chart ?? null;
  if (!chart && typeof body.chartId === "string" && UUID_RE.test(body.chartId)) {
    const { data: { user } } = await userClient(req).auth.getUser();
    if (!user) return json({ error: "Authentication required to load a saved chart." }, 401);
    const { data: row } = await adminClient()
      .from("charts")
      .select("birth_details, snapshot, user_id")
      .eq("id", body.chartId)
      .maybeSingle();
    if (!row || row.user_id !== user.id) return json({ error: "Chart not found." }, 404);
    chart = row.snapshot;
    if (!chart && row.birth_details) {
      // snapshot missing/stale → recompute from authoritative birth details
      chart = await calculateKundli(row.birth_details);
    }
  }

  // Build the dossier (only when we have a chart). transits mirror guru-debate.
  const hasDossier = !!chart?.birthDetails;
  let dossierBlock = NO_CHART_NOTICE;
  if (hasDossier) {
    let transits: any[] = [];
    try { transits = calculateTransits(chart.birthDetails); } catch (e) { console.warn("transits failed", e); }
    if ((!transits || transits.length === 0) && Array.isArray(body.transits)) transits = body.transits;
    const dossier = buildChartDossier(chart, transits, new Date(), body.clientTimeZone);
    dossierBlock = `${DOSSIER_HEADER}\n\n${dossier}`;
  }

  // First message must match reality: only claim "I've seen your chart" when a
  // dossier was actually built; otherwise greet honestly and ask for details.
  const firstMessage = hasDossier
    ? persona.greeting
    : (persona.noChartGreeting ?? NO_CHART_GREETING);

  const systemPrompt = [
    persona.systemPrompt,
    GROUNDING_INSTRUCTION,
    VOICE_DELIVERY_RULES,
    dossierBlock,
  ].join("\n\n");

  // overrides shape per @elevenlabs SDK: tts is TOP-LEVEL (sibling of agent).
  // Per-guru speed/stability/similarity are admin-tunable (app_settings, category
  // 'voice'); fall back to the persona defaults when a row is blank/unset.
  const num = (v: string | undefined, dflt: number) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== undefined && v !== "" ? n : dflt;
  };
  const tts: Record<string, unknown> = {
    speed: num(cfg[`elevenlabs_voice_speed_${guruId}`], persona.speed),
    stability: num(cfg[`elevenlabs_voice_stability_${guruId}`], persona.stability),
    similarityBoost: num(cfg[`elevenlabs_voice_similarity_${guruId}`], persona.similarity),
  };
  if (voiceId) tts.voiceId = voiceId;

  const overrides = {
    agent: {
      prompt: { prompt: systemPrompt },
      firstMessage,
      language,
    },
    tts,
  };

  // Prefer a conversation token (WebRTC, current default for voice); fall back
  // to a signed URL (WebSocket) if the token endpoint is unavailable.
  try {
    const tokenRes = await fetch(`${EL_BASE}/token?agent_id=${encodeURIComponent(agentId)}`, {
      method: "GET",
      headers: { "xi-api-key": xiKey },
    });
    if (tokenRes.ok) {
      const tok = await tokenRes.json();
      const conversationToken = tok.token ?? tok.conversation_token;
      if (conversationToken) {
        return json({ connectionType: "webrtc", conversationToken, agentId, overrides });
      }
    } else {
      console.warn("token endpoint returned", tokenRes.status);
    }
  } catch (e) {
    console.warn("token fetch failed, falling back to signed url", e);
  }

  const urlRes = await fetch(`${EL_BASE}/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    method: "GET",
    headers: { "xi-api-key": xiKey },
  });
  if (!urlRes.ok) {
    const detail = await urlRes.text().catch(() => "");
    return json({ error: "Could not reach the voice service.", detail }, 502);
  }
  const { signed_url } = await urlRes.json();
  return json({ connectionType: "websocket", signedUrl: signed_url, agentId, overrides });
}

// ───────────────────────────── log-session ─────────────────────────────

async function handleLogSession(req: Request, body: any): Promise<Response> {
  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Authentication required." }, 401);

  const guru = typeof body.guru === "string" && VOICE_PERSONAS[body.guru] ? body.guru : "parashara";
  const chartId = typeof body.chartId === "string" && UUID_RE.test(body.chartId) ? body.chartId : null;
  const durationSeconds = Math.max(0, Math.round(Number(body.durationSeconds) || 0));

  const lang = typeof body.language === "string" ? body.language : "hi";
  const { error } = await supabase.from("voice_sessions").insert({
    user_id: user.id,
    chart_id: chartId,
    guru_persona: guru,
    language: lang,
    duration_seconds: durationSeconds,
    conversation_id: typeof body.conversationId === "string" ? body.conversationId : null,
    transcript: body.transcript ?? null,
    ended_at: new Date().toISOString(),
  });
  if (error) return json({ error: error.message }, 400);

  // Best-effort: log an ai_usage row for the voice session
  const tokensUsed = Math.max(0, Math.round(Number(body.tokensUsed) || 0));
  logAiUsage({
    user_id: user.id,
    function: "voice-session",
    mode: "voice",
    guru,
    chart_id: chartId,
    question: null,
    model: null,
    provider: "elevenlabs",
    prompt_tokens: tokensUsed,
    completion_tokens: 0,
    total_tokens: tokensUsed,
    cost_usd: 0,
    language: lang,
    success: true,
    error: null,
    latency_ms: durationSeconds * 1000,
  });

  return json({ ok: true });
}

// ───────────────────────────── get-usage ─────────────────────────────

async function handleGetUsage(req: Request): Promise<Response> {
  const supabase = userClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Authentication required." }, 401);

  const now = new Date();
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data } = await supabase
    .from("voice_sessions")
    .select("duration_seconds")
    .gte("created_at", firstOfMonth);
  const usedSeconds = (data ?? []).reduce((s, r: any) => s + (r.duration_seconds || 0), 0);
  const usedMinutes = Math.round(usedSeconds / 60);

  const cfg = await getVoiceConfig();
  const capMinutes = Number(cfg["voice_monthly_minutes_cap"] || "30");

  return json({
    usedMinutes,
    capMinutes,
    remainingMinutes: Math.max(0, capMinutes - usedMinutes),
    period: "month",
    soft: true,
  });
}

// ───────────────────────────── entry ─────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    switch (body.mode) {
      case "get-signed-url": return await handleGetSignedUrl(req, body);
      case "log-session":    return await handleLogSession(req, body);
      case "get-usage":      return await handleGetUsage(req);
      default:               return json({ error: `Unknown mode "${body.mode}".` }, 400);
    }
  } catch (e) {
    console.error("voice-session error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
