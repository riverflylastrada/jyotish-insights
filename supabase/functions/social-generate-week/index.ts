/**
 * Edge Function: social-generate-week (admin-only; verify_jwt = true)
 *
 * The "Generate Week" button. Inserts 7 days of `pending` rows on the
 * engagement-first cadence (all times IST):
 *   panchang        06:00 daily
 *   rashifal        08:00 daily — hook, except Mon & Fri → 12-sign thread
 *   muhurat         13:00 daily (panchang/muhurat variant)
 *   transit         per detected sign-ingress / station (event time)
 *   rashi_effect    follows each MAJOR ingress (12-sign thread)
 *   proof_flex      Sunday 18:00 (the brand differentiator)
 *
 * Idempotent: existing auto rows for the same (type, variant, exact time, rashi)
 * are skipped; past slots are not scheduled. Deterministic copy from the engine.
 */

import { corsHeaders, json, serviceClient, requireAdmin, loadSettings, placeFromSettings, logRun } from "../_shared/social/http.ts";
import { localDate, addDaysISO, instantForLocalTime, weekdayOf } from "../_shared/social/time.ts";
import { buildSlotContent, type ContentType } from "../_shared/social/generate.ts";
import { detectTransits } from "../_shared/social/astro.ts";
import type { Locale } from "../_shared/social/rashifal.ts";

interface RowSpec {
  scheduled_at: string;
  content_type: ContentType;
  variant: string;
  rashi: string | null;
  language: string;
  body: string | null;
  thread: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = serviceClient();
  if (!sb) return json({ error: "server not configured" }, 500);
  const gate = await requireAdmin(sb, req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const settings = await loadSettings(sb);
  const now = new Date();
  const place = placeFromSettings(settings, now);
  const locale: Locale = settings.languages[0] === "en" ? "en" : "hi";
  const tz = place.tz;
  const today = localDate(tz, now);

  const specs: RowSpec[] = [];
  const add = (scheduled_at: string, content_type: ContentType, variant: string, opts: { rashi?: string | null; transit?: import("../_shared/social/astro.ts").TransitEvent | null; dateISO: string }) => {
    const c = buildSlotContent({
      content_type, variant, dateISO: opts.dateISO, rashi: opts.rashi ?? null,
      locale, includeLink: settings.include_link, transit: opts.transit ?? null, ...place,
    });
    const thread = c.thread && c.thread.length ? c.thread : null;
    const body = thread ? thread[0] : (c.body ?? null);
    specs.push({ scheduled_at, content_type, variant, rashi: opts.rashi ?? null, language: locale, body, thread });
  };

  // ── Daily cadence over the next 7 days ───────────────────────────────────
  for (let d = 0; d < 7; d++) {
    const dayISO = addDaysISO(today, d);
    const wd = weekdayOf(dayISO);
    add(instantForLocalTime(dayISO, 6, 0, tz).toISOString(), "panchang", "panchang", { dateISO: dayISO });
    add(instantForLocalTime(dayISO, 8, 0, tz).toISOString(), "rashifal", wd === 1 || wd === 5 ? "rashifal_thread" : "rashifal_hook", { dateISO: dayISO });
    add(instantForLocalTime(dayISO, 13, 0, tz).toISOString(), "panchang", "muhurat", { dateISO: dayISO });
    if (wd === 0) add(instantForLocalTime(dayISO, 18, 0, tz).toISOString(), "rashi_effect", "proof_flex", { dateISO: dayISO });
  }

  // ── Event-driven transits over the next 7 days ───────────────────────────
  const events = detectTransits(today, addDaysISO(today, 7), place.lat, place.lon, place.tzOffsetHours, tz);
  for (const ev of events) {
    add(ev.exactAtISO, "transit", ev.type, { dateISO: ev.dateISO, transit: ev });
    if (ev.major && ev.type === "ingress") {
      const follow = new Date(new Date(ev.exactAtISO).getTime() + 30 * 60_000).toISOString();
      add(follow, "rashi_effect", "rashi_effect", { dateISO: ev.dateISO, transit: ev });
    }
  }

  // ── Drop past slots; dedup against existing auto rows ─────────────────────
  const future = specs.filter((s) => new Date(s.scheduled_at).getTime() > now.getTime());

  const windowEnd = addDaysISO(today, 9);
  const { data: existing } = await sb
    .from("scheduled_tweets")
    .select("content_type, variant, scheduled_at, rashi")
    .eq("generated_by", "auto")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", instantForLocalTime(windowEnd, 23, 59, tz).toISOString());

  const key = (ct: string, v: string | null, at: string, r: string | null) => `${ct}|${v ?? ""}|${new Date(at).getTime()}|${r ?? ""}`;
  const seen = new Set((existing ?? []).map((e) => key((e as RowSpec).content_type, (e as RowSpec).variant, (e as RowSpec).scheduled_at, (e as RowSpec).rashi)));

  const toInsert = future.filter((s) => {
    const k = key(s.content_type, s.variant, s.scheduled_at, s.rashi);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let inserted = 0;
  if (toInsert.length) {
    const { error, count } = await sb
      .from("scheduled_tweets")
      .insert(toInsert.map((s) => ({ ...s, status: "pending", generated_by: "auto" })), { count: "exact" });
    if (error) {
      await logRun(sb, "generate_week", "error", { error: error.message, planned: future.length });
      return json({ error: error.message }, 500);
    }
    inserted = count ?? toInsert.length;
  }

  await logRun(sb, "generate_week", "ok", { planned: future.length, inserted, skipped: future.length - toInsert.length, events: events.length });
  return json({ ok: true, planned: future.length, inserted, skipped: future.length - toInsert.length });
});
