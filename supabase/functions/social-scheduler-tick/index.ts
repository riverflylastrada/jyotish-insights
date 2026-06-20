/**
 * Edge Function: social-scheduler-tick (verify_jwt = false)
 *
 * Invoked every 15 min by .github/workflows/social-scheduler-tick.yml and by the
 * admin "Run Scheduler Now" button. Self-guards via flags + caps (like daily-email,
 * a plain POST triggers it; no token travels in the request).
 *
 * 1. If TWEET_SCHEDULER_ENABLED / SOCIAL_BOT_TWITTER_ENABLED is off OR
 *    twitter_enabled is false → log skipped, return (the built-in safe state).
 * 2. Stop if max_per_day / max_per_hour already reached.
 * 3. Post due pending rows (thread or single), respecting remaining caps.
 * 4. Update last_poll_at; summarise to social_runs.
 */

import { corsHeaders, json, serviceClient, loadSettings, isFlagEnabled, logRun } from "../_shared/social/http.ts";
import { safeTz, localDate, instantForLocalTime } from "../_shared/social/time.ts";
import { loadXCreds, makeClient, postTweet, postThread, MissingCredentialsError } from "../_shared/social/x-client.ts";

interface TweetRow { id: string; body: string | null; thread: string[] | null }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = serviceClient();
  if (!sb) return json({ error: "server not configured" }, 500);

  const now = new Date();
  const touchPoll = () => sb.from("social_settings").update({ last_poll_at: now.toISOString() }).eq("id", 1);

  // ── 1. Flags / enable gate ───────────────────────────────────────────────
  const settings = await loadSettings(sb);
  const schedulerOn = await isFlagEnabled(sb, "TWEET_SCHEDULER_ENABLED");
  const twitterOn = await isFlagEnabled(sb, "SOCIAL_BOT_TWITTER_ENABLED");
  if (!schedulerOn || !twitterOn || !settings.twitter_enabled) {
    const reason = !schedulerOn ? "scheduler flag off" : !twitterOn ? "twitter flag off" : "twitter disabled";
    await touchPoll();
    await logRun(sb, "scheduler_tick", "skipped", { reason });
    return json({ ok: true, skipped: true, reason });
  }

  // ── 2. Caps (day = IST calendar day; hour = rolling 60 min) ──────────────
  const tz = safeTz(settings.default_tz);
  const dayStart = instantForLocalTime(localDate(tz, now), 0, 0, tz).toISOString();
  const hourStart = new Date(now.getTime() - 60 * 60_000).toISOString();
  const postedSince = async (iso: string) => {
    const { count } = await sb.from("scheduled_tweets").select("id", { count: "exact", head: true }).eq("status", "posted").gte("posted_at", iso);
    return count ?? 0;
  };
  const dayCount = await postedSince(dayStart);
  const hourCount = await postedSince(hourStart);
  let remaining = Math.min(settings.max_per_day - dayCount, settings.max_per_hour - hourCount);
  if (remaining <= 0) {
    await touchPoll();
    await logRun(sb, "scheduler_tick", "skipped", { reason: "cap reached", dayCount, hourCount });
    return json({ ok: true, skipped: true, reason: "cap reached", dayCount, hourCount });
  }

  // ── 3. Due rows ──────────────────────────────────────────────────────────
  const { data: due } = await sb
    .from("scheduled_tweets").select("id, body, thread")
    .eq("status", "pending").lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true }).limit(remaining);
  if (!due || due.length === 0) {
    await touchPoll();
    await logRun(sb, "scheduler_tick", "ok", { due: 0, posted: 0, dayCount, hourCount });
    return json({ ok: true, due: 0, posted: 0 });
  }

  // ── 4. Post ──────────────────────────────────────────────────────────────
  let client;
  try {
    client = makeClient(await loadXCreds(sb));
  } catch (e) {
    const reason = e instanceof MissingCredentialsError ? e.message : (e instanceof Error ? e.message : String(e));
    await touchPoll();
    await logRun(sb, "scheduler_tick", "skipped", { reason, due: due.length });
    return json({ ok: true, skipped: true, reason });
  }

  let posted = 0, failed = 0;
  for (const row of due as TweetRow[]) {
    if (remaining <= 0) break;
    try {
      const parts = Array.isArray(row.thread) ? row.thread.filter((p) => typeof p === "string" && p.trim()) : [];
      const text = (row.body ?? "").trim();
      if (!parts.length && !text) throw new Error("empty tweet body");
      const res = parts.length ? await postThread(client, parts) : await postTweet(client, text);
      const tweetId = "ids" in res ? res.ids[0] : res.id;
      await sb.from("scheduled_tweets").update({ status: "posted", tweet_id: tweetId, posted_at: new Date().toISOString(), error: null }).eq("id", row.id);
      posted++; remaining--;
    } catch (e) {
      await sb.from("scheduled_tweets").update({ status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) }).eq("id", row.id);
      failed++;
    }
  }

  await touchPoll();
  const result = posted === 0 && failed > 0 ? "error" : "ok";
  await logRun(sb, "scheduler_tick", result, { due: due.length, posted, failed, dayCount, hourCount });
  return json({ ok: true, due: due.length, posted, failed });
});
