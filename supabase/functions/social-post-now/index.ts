/**
 * Edge Function: social-post-now (admin-only; verify_jwt = true)
 *
 * POST { id } — the ✈ send-now icon. Posts one queued row immediately, bypassing
 * the schedule but still respecting the enable flags + daily/hourly caps.
 */

import { corsHeaders, json, serviceClient, requireAdmin, loadSettings, isFlagEnabled, logRun } from "../_shared/social/http.ts";
import { safeTz, localDate, instantForLocalTime } from "../_shared/social/time.ts";
import { loadXCreds, makeClient, postTweet, postThread, MissingCredentialsError } from "../_shared/social/x-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = serviceClient();
  if (!sb) return json({ error: "server not configured" }, 500);
  const gate = await requireAdmin(sb, req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ error: "id is required" }, 400);

  const { data: row, error: rowErr } = await sb.from("scheduled_tweets").select("id, body, thread, status").eq("id", id).maybeSingle();
  if (rowErr) return json({ error: rowErr.message }, 500);
  if (!row) return json({ error: "tweet not found" }, 404);
  if ((row as { status: string }).status === "posted") return json({ error: "already posted" }, 400);

  // Flags / enable gate
  const settings = await loadSettings(sb);
  const twitterOn = await isFlagEnabled(sb, "SOCIAL_BOT_TWITTER_ENABLED");
  if (!twitterOn || !settings.twitter_enabled) return json({ error: "Twitter posting is disabled — enable it on the Social Bot page." }, 409);

  // Caps
  const now = new Date();
  const tz = safeTz(settings.default_tz);
  const dayStart = instantForLocalTime(localDate(tz, now), 0, 0, tz).toISOString();
  const hourStart = new Date(now.getTime() - 60 * 60_000).toISOString();
  const postedSince = async (iso: string) => {
    const { count } = await sb.from("scheduled_tweets").select("id", { count: "exact", head: true }).eq("status", "posted").gte("posted_at", iso);
    return count ?? 0;
  };
  if (await postedSince(dayStart) >= settings.max_per_day) return json({ error: "Daily cap reached." }, 429);
  if (await postedSince(hourStart) >= settings.max_per_hour) return json({ error: "Hourly cap reached." }, 429);

  // Post
  let client;
  try {
    client = makeClient(await loadXCreds(sb));
  } catch (e) {
    const reason = e instanceof MissingCredentialsError ? e.message : (e instanceof Error ? e.message : String(e));
    return json({ error: reason }, 409);
  }

  const r = row as { id: string; body: string | null; thread: string[] | null };
  const parts = Array.isArray(r.thread) ? r.thread.filter((p) => typeof p === "string" && p.trim()) : [];
  const text = (r.body ?? "").trim();
  if (!parts.length && !text) return json({ error: "empty tweet body" }, 400);

  try {
    const res = parts.length ? await postThread(client, parts) : await postTweet(client, text);
    const tweetId = "ids" in res ? res.ids[0] : res.id;
    await sb.from("scheduled_tweets").update({ status: "posted", tweet_id: tweetId, posted_at: new Date().toISOString(), error: null }).eq("id", id);
    await logRun(sb, "post_now", "ok", { id, tweet_id: tweetId });
    return json({ ok: true, tweet_id: tweetId });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await sb.from("scheduled_tweets").update({ status: "failed", error: msg }).eq("id", id);
    await logRun(sb, "post_now", "error", { id, error: msg });
    return json({ error: msg }, 502);
  }
});
