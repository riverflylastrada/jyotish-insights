/**
 * Supabase Edge Function: transit-scan
 *
 * Scheduled daily (02:00 UTC). For every user with transit_alerts_enabled = true,
 * loads their saved charts, runs detectUpcomingEvents, and upserts results into
 * transit_alerts (deduplicating via chart_id + event_key).
 *
 * Schedule via Supabase cron: daily at 02:00 UTC
 *   select cron.schedule('transit-scan', '0 2 * * *',
 *     $$select net.http_post(url := '<SUPABASE_URL>/functions/v1/transit-scan',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb) $$);
 *
 * Can also be invoked manually via POST for testing.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectUpcomingEvents } from "../calculate-kundli/transit_events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ── TEMP diagnostic: POST {diagnose:true} returns a per-user breakdown
    //    (charts / snapshots / existing alerts / what the detector finds) so we
    //    can see why a user's feed is empty. Does not scan or insert. Remove
    //    once the cause is identified.
    let reqBody: Record<string, unknown> = {};
    try { reqBody = await req.json(); } catch { /* no / invalid body */ }
    if (reqBody?.diagnose) {
      const { data: profs } = await sb
        .from("profiles")
        .select("user_id, display_name, transit_alerts_enabled, transit_alerts_categories");
      const rows: unknown[] = [];
      for (const p of profs ?? []) {
        const { data: charts } = await sb.from("charts").select("id, snapshot").eq("user_id", p.user_id);
        const list = charts ?? [];
        const first = list.find((c) => !!c.snapshot);
        let detected: unknown = null;
        if (first) {
          try {
            const snap = typeof first.snapshot === "string" ? JSON.parse(first.snapshot) : first.snapshot;
            snap.id = first.id;
            const evs = detectUpcomingEvents(snap, 365);
            detected = { count: evs.length, sample: evs.slice(0, 3).map((e) => e.title) };
          } catch (e) { detected = { error: e instanceof Error ? e.message : String(e) }; }
        }
        const { count } = await sb
          .from("transit_alerts").select("id", { count: "exact", head: true }).eq("user_id", p.user_id);
        rows.push({
          name: p.display_name ?? null,
          uid8: String(p.user_id ?? "").slice(0, 8),
          enabled: p.transit_alerts_enabled,
          categories: p.transit_alerts_categories,
          charts: list.length,
          withSnapshot: list.filter((c) => !!c.snapshot).length,
          alerts: count ?? 0,
          detected,
        });
      }
      return new Response(JSON.stringify({ diagnose: rows }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch users with alerts enabled
    const { data: profiles, error: profErr } = await sb
      .from("profiles")
      .select("user_id, transit_alerts_categories")
      .eq("transit_alerts_enabled", true);
    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, scanned: 0, inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalScanned = 0;
    let totalInserted = 0;
    let totalErrors = 0;

    for (const profile of profiles) {
      const { data: charts, error: chartErr } = await sb
        .from("charts")
        .select("id, snapshot, birth_details")
        .eq("user_id", profile.user_id);
      if (chartErr) { totalErrors++; continue; }
      if (!charts || charts.length === 0) continue;

      const categories: string[] = profile.transit_alerts_categories ?? ['all'];

      for (const chart of charts) {
        if (!chart.snapshot) continue;
        totalScanned++;

        try {
          const snapshot = typeof chart.snapshot === 'string'
            ? JSON.parse(chart.snapshot)
            : chart.snapshot;

          // Inject chart id if not present
          snapshot.id = chart.id;

          // Look ahead a full year. The detectors track only slow movers
          // (Saturn/Jupiter/Rahu/Ketu sign changes, Sade Sati, eclipses) plus
          // dasha transitions — events that are months apart — so a 30-day
          // window left almost every chart with nothing. A 365-day horizon
          // guarantees a meaningful feed (e.g. Jupiter changes sign within any
          // year); the upsert dedupes on (chart_id, event_key) so re-runs don't
          // duplicate. The Notifications page already sorts/groups by date.
          const events = detectUpcomingEvents(snapshot, 365);

          // Filter by category preferences
          const filtered = categories.includes('all')
            ? events
            : events.filter(e => categories.includes(e.type));

          if (filtered.length === 0) continue;

          // Upsert — ignore conflicts on (chart_id, event_key)
          const rows = filtered.map(e => ({
            chart_id: chart.id,
            user_id: profile.user_id,
            event_key: e.eventKey,
            type: e.type,
            severity: e.severity,
            starts: e.starts,
            ends: e.ends ?? null,
            title: e.title,
            description: e.description,
            citation: e.citation,
            affected_houses: e.affectedHouses ?? null,
          }));

          const { error: upsertErr } = await sb
            .from("transit_alerts")
            .upsert(rows, { onConflict: "chart_id,event_key", ignoreDuplicates: true });
          if (upsertErr) {
            console.error(`Upsert error for chart ${chart.id}:`, upsertErr);
            totalErrors++;
          } else {
            totalInserted += rows.length;
          }
        } catch (e) {
          console.error(`Detection error for chart ${chart.id}:`, e);
          totalErrors++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: totalScanned, inserted: totalInserted, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transit-scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
