/**
 * Edge Function: social-fetch-metrics (admin-only; verify_jwt = true)
 *
 * Refresh impressions/likes for recently posted rows — ONLY when
 * social_settings.fetch_metrics is true (reads cost money on the pay-per-use X
 * API, so this is off by default). Backs the optional "Refresh metrics" action.
 */

import { corsHeaders, json, serviceClient, requireAdmin, loadSettings, logRun } from "../_shared/social/http.ts";
import { loadXCreds, makeClient, getMetrics, MissingCredentialsError } from "../_shared/social/x-client.ts";

interface PostedRow { id: string; tweet_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = serviceClient();
  if (!sb) return json({ error: "server not configured" }, 500);
  const gate = await requireAdmin(sb, req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const settings = await loadSettings(sb);
  if (!settings.fetch_metrics) {
    await logRun(sb, "fetch_metrics", "skipped", { reason: "fetch_metrics disabled" });
    return json({ ok: true, skipped: true, reason: "fetch_metrics disabled" });
  }

  // Last 2 days of posted tweets with an id.
  const since = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
  const { data: rows } = await sb
    .from("scheduled_tweets").select("id, tweet_id")
    .eq("status", "posted").not("tweet_id", "is", null)
    .gte("posted_at", since).order("posted_at", { ascending: false }).limit(50);
  if (!rows || rows.length === 0) {
    await logRun(sb, "fetch_metrics", "ok", { updated: 0 });
    return json({ ok: true, updated: 0 });
  }

  let client;
  try {
    client = makeClient(await loadXCreds(sb));
  } catch (e) {
    const reason = e instanceof MissingCredentialsError ? e.message : (e instanceof Error ? e.message : String(e));
    await logRun(sb, "fetch_metrics", "skipped", { reason });
    return json({ ok: true, skipped: true, reason });
  }

  let updated = 0, failed = 0;
  for (const row of rows as PostedRow[]) {
    try {
      const m = await getMetrics(client, row.tweet_id);
      await sb.from("scheduled_tweets").update({ impressions: m.impressions, likes: m.likes }).eq("id", row.id);
      updated++;
    } catch {
      failed++;
    }
  }

  await logRun(sb, "fetch_metrics", "ok", { updated, failed });
  return json({ ok: true, updated, failed });
});
