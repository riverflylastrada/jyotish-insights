/**
 * Supabase Edge Function: daily-email
 *
 * Hourly (GitHub Actions cron). For every user with email_daily_enabled = true
 * whose LOCAL clock hour matches the configured morning hour, sends a deterministic
 * "morning kundli report" (today's Panchang + current dasha + this-week's transits)
 * via listmonk. Exactly one email per user per local day, enforced by a
 * claim-before-send insert into daily_email_sends (unique user_id, local_date).
 *
 * verify_jwt = false (see supabase/config.toml); authenticates to the DB with its
 * own SUPABASE_SERVICE_ROLE_KEY. The hourly invoker carries no token.
 *
 * Test without spamming anyone:
 *   POST {"dryRun": true, "only": "you@example.com"}        → returns rendered HTML, no send
 *   POST {"dryRun": true, "only": "you@example.com", "send": true}  → also sends to that inbox
 *   POST {"hour": <0-23>}  → override the morning-hour match for a manual run
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeDayPanchang } from "../_shared/dailyPanchang.ts";
import { assembleReport, buildEmailHtml, buildSubject, buildGuidanceInput } from "../_shared/dailyReport.ts";
import { loadEmailConfig, isEmailConfigured, sendDailyEmail } from "../_shared/email.ts";
import { generateDailyGuidance, logAiUsage } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FALLBACK_TZ = "Asia/Kolkata";

// ─── Timezone helpers (Intl is available in the edge runtime; handles DST) ────
function safeTz(tz: string | null | undefined): string {
  if (!tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}
function localHour(tz: string, at: Date): number {
  return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(at), 10) % 24;
}
function localDate(tz: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}
function dateLabel(tz: string, at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(at);
}
function tzOffsetHours(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +(m.hour === "24" ? "0" : m.hour), +m.minute, +m.second);
  return (asUTC - at.getTime()) / 3_600_000;
}

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  current_timezone: string | null;
  current_lat: number | null;
  current_lon: number | null;
  default_chart_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }
  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const dryRun = body.dryRun === true;
  const only = typeof body.only === "string" ? (body.only as string).toLowerCase() : null;
  const wantSend = body.send === true;
  const forceHour = typeof body.hour === "number" ? (body.hour as number) : null;
  const scanNow = new Date();

  // ── Config (listmonk creds + morning hour) ──────────────────────────────────
  const { data: settingsRows } = await sb
    .from("app_settings").select("key, value")
    .in("key", [
      "listmonk_url", "listmonk_api_user", "listmonk_api_token",
      "listmonk_list_id", "listmonk_tx_template_id",
      "daily_email_morning_hour", "daily_email_llm_budget_usd",
    ]);
  const settings = new Map((settingsRows ?? []).map((r): [string, string] => [r.key as string, (r.value ?? "") as string]));
  const get = (k: string) => settings.get(k) ?? "";
  const emailCfg = loadEmailConfig(get);
  const morningHour = (() => { const n = parseInt(get("daily_email_morning_hour") || "7", 10); return Number.isFinite(n) ? n : 7; })();
  const llmBudget = (() => { const n = parseFloat(get("daily_email_llm_budget_usd") || "0"); return Number.isFinite(n) ? n : 0; })();

  // ── Shared helpers ───────────────────────────────────────────────────────────
  const parseSnapshot = (raw: unknown, id: string) => {
    const s = typeof raw === "string" ? JSON.parse(raw) : raw;
    (s as any).id = id;
    return s as any;
  };

  async function resolveChart(userId: string, defaultChartId: string | null) {
    if (defaultChartId) {
      const { data } = await sb.from("charts").select("id, snapshot, birth_details").eq("id", defaultChartId).maybeSingle();
      if (data?.snapshot) return data;
    }
    const { data } = await sb.from("charts").select("id, snapshot, birth_details")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    const c = data?.[0];
    return c?.snapshot ? c : null;
  }

  /** Build the deterministic report payload for a user from their resolved chart. */
  function buildPayload(p: ProfileRow, chart: any) {
    const snapshot = parseSnapshot(chart.snapshot, chart.id);
    const bd = chart.birth_details ?? snapshot.birthDetails ?? {};
    const place = bd.placeOfBirth ?? {};
    const tz = safeTz(p.current_timezone || place.timezone);
    const lat = (p.current_lat ?? place.latitude ?? 0) as number;
    const lon = (p.current_lon ?? place.longitude ?? 0) as number;
    const ayaKey = snapshot.birthDetails?.ayanamsa || "lahiri";
    const panchang = computeDayPanchang(localDate(tz, scanNow), lat, lon, tzOffsetHours(tz, scanNow), ayaKey);
    const fullName: string = snapshot.birthDetails?.fullName || p.display_name || "";
    const name = fullName.trim().split(/\s+/)[0] ?? "";
    const payload = assembleReport({ name, dateLabel: dateLabel(tz, scanNow), panchang, snapshot });
    return { payload, snapshot, name };
  }

  /**
   * Best-effort daily guidance line. On success mutates payload.guidance and logs
   * to ai_usage; returns the call cost (for the run budget tally) + whether used.
   * Any failure / not-configured leaves the email deterministic-only.
   */
  async function maybeGuidance(
    payload: ReturnType<typeof assembleReport>, snapshot: any,
    userId: string, chartId: string, allow: boolean,
  ): Promise<{ cost: number; used: boolean }> {
    if (!allow) return { cost: 0, used: false };
    const started = Date.now();
    const g = await generateDailyGuidance(buildGuidanceInput(payload, snapshot));
    if (g.text) {
      payload.guidance = g.text;
      logAiUsage({
        function: "daily-email", mode: "daily", user_id: userId, chart_id: chartId,
        model: g.model, provider: g.provider,
        prompt_tokens: g.usage?.prompt_tokens ?? 0, completion_tokens: g.usage?.completion_tokens ?? 0,
        total_tokens: g.usage?.total_tokens ?? 0, cost_usd: g.cost ?? 0,
        language: "en", success: true, latency_ms: Date.now() - started,
      });
      return { cost: g.cost ?? 0, used: true };
    }
    if (g.error && g.error !== "llm not configured") {
      logAiUsage({
        function: "daily-email", mode: "daily", user_id: userId, chart_id: chartId,
        model: g.model, provider: g.provider, cost_usd: 0,
        success: false, error: g.error.slice(0, 300), latency_ms: Date.now() - started,
      });
    }
    return { cost: 0, used: false };
  }

  const cols = "user_id, display_name, current_timezone, current_lat, current_lon, default_chart_id";

  // ── Dry run: render (and optionally send) for a single email; no claim/log ──
  if (dryRun) {
    if (!only) return json({ error: "dryRun requires { only: '<email>' }" }, 400);
    // Find the user_id by email via the admin API (bounded pagination).
    let target: { id: string; email: string } | null = null;
    for (let page = 1; page <= 20 && !target; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      const u = data.users.find((x) => (x.email ?? "").toLowerCase() === only);
      if (u?.email) target = { id: u.id, email: u.email };
      if (data.users.length < 1000) break;
    }
    if (!target) return json({ error: `No user with email ${only}` }, 404);
    const { data: p } = await sb.from("profiles").select(cols).eq("user_id", target.id).maybeSingle();
    if (!p) return json({ error: "User has no profile row" }, 404);
    const chart = await resolveChart(target.id, (p as ProfileRow).default_chart_id);
    if (!chart) return json({ error: "User has no chart with a snapshot" }, 404);

    const { payload, snapshot, name } = buildPayload(p as ProfileRow, chart);
    // Preview always attempts the guidance line (ignores budget) so you can see it.
    const g = await maybeGuidance(payload, snapshot, target.id, chart.id, true);
    const html = buildEmailHtml(payload);
    const subject = buildSubject(payload);
    let sent: unknown = null;
    if (wantSend && isEmailConfigured(emailCfg)) {
      sent = await sendDailyEmail(emailCfg, { email: target.email, name, subject, html });
    }
    return json({ dryRun: true, email: target.email, subject, llmUsed: g.used, sent, emailConfigured: isEmailConfigured(emailCfg), html });
  }

  // ── Normal hourly run ────────────────────────────────────────────────────────
  const { data: profiles, error: profErr } = await sb.from("profiles").select(cols).eq("email_daily_enabled", true);
  if (profErr) return json({ error: profErr.message }, 500);

  const targetHour = forceHour ?? morningHour;
  let due = 0, sent = 0, skipped = 0, failed = 0, noChart = 0, llmSent = 0;

  // Global daily LLM budget: sum today's daily-email spend once, then tally this
  // run's spend as we go so we stop calling the model when the cap is reached.
  let runSpend = 0;
  if (llmBudget > 0) {
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const { data: spendRows } = await sb.from("ai_usage").select("cost_usd")
      .eq("function", "daily-email").gte("created_at", dayStart.toISOString());
    runSpend = (spendRows ?? []).reduce((s, r) => s + Number((r as any).cost_usd ?? 0), 0);
  }

  for (const p of (profiles ?? []) as ProfileRow[]) {
    // Cheap due-check on current_timezone (or IST). Birth-tz fallback for users
    // without a current timezone only affects send TIMING, not correctness.
    const tz = safeTz(p.current_timezone);
    if (localHour(tz, scanNow) !== targetHour) continue;
    due++;

    // Claim-before-send: one row per (user, local_date). 0 rows back ⇒ already done.
    const ld = localDate(tz, scanNow);
    const { data: claim, error: claimErr } = await sb
      .from("daily_email_sends")
      .upsert({ user_id: p.user_id, local_date: ld, status: "pending" },
        { onConflict: "user_id,local_date", ignoreDuplicates: true })
      .select("id");
    if (claimErr) { failed++; continue; }
    if (!claim || claim.length === 0) { skipped++; continue; }
    const claimId = (claim[0] as { id: string }).id;

    const mark = (fields: Record<string, unknown>) =>
      sb.from("daily_email_sends").update(fields).eq("id", claimId);

    try {
      const chart = await resolveChart(p.user_id, p.default_chart_id);
      if (!chart) { await mark({ status: "failed", error: "no chart with snapshot" }); noChart++; failed++; continue; }

      const { data: userRes } = await sb.auth.admin.getUserById(p.user_id);
      const email = userRes?.user?.email;
      if (!email) { await mark({ status: "failed", error: "no email on auth user" }); failed++; continue; }

      const { payload, snapshot, name } = buildPayload(p, chart);
      const allowLlm = llmBudget > 0 && runSpend < llmBudget;
      const g = await maybeGuidance(payload, snapshot, p.user_id, chart.id, allowLlm);
      runSpend += g.cost;
      if (g.used) llmSent++;
      const html = buildEmailHtml(payload);
      const subject = buildSubject(payload);

      if (!isEmailConfigured(emailCfg)) {
        await mark({ status: "failed", error: "listmonk not configured", llm_used: g.used }); failed++; continue;
      }
      const r = await sendDailyEmail(emailCfg, { email, name, subject, html });
      if (r.ok) {
        await mark({ status: "sent", sent_at: new Date().toISOString(), listmonk_message_id: r.messageId ?? null, llm_used: g.used });
        sent++;
      } else {
        await mark({ status: "failed", error: (r.error ?? "send failed").slice(0, 500), llm_used: g.used });
        failed++;
      }
    } catch (e) {
      await mark({ status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) });
      failed++;
    }
  }

  return json({ ok: true, hour: targetHour, due, sent, skipped, failed, noChart, llmSent });
});
