/**
 * Supabase Edge Function: voice-tools
 *
 * Webhook called by the ElevenLabs agent (server tools) during a voice
 * conversation. Routes a `tool` to our authoritative VSOP87 engine so the Guru
 * computes real data instead of hallucinating.
 *
 * Called by ElevenLabs servers (no Supabase JWT) → verify_jwt = false, secured
 * by a shared secret header `X-Webhook-Secret` (configured on each EL tool).
 *
 * Request:  { tool, birthDetails?, chart?, ...toolArgs }
 * Response: HTTP 200 { ok, summary, data? }  (200 even on tool error so the
 *           agent can speak the message instead of dropping the turn).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildChartDossier } from "../guru-debate/dossier.ts";
import { calculateKundli, calculateTransits, type BirthDetails } from "../calculate-kundli/engine.ts";
import { computeGunMilan, type GunMilanResult } from "../calculate-kundli/gun_milan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Read a secret from app_settings (admin-managed via the API Keys page),
 * falling back to a Deno env var of the same name.
 */
async function getSecret(key: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (url && serviceRole) {
    try {
      const { data } = await createClient(url, serviceRole)
        .from("app_settings").select("value").eq("key", key).maybeSingle();
      if (data?.value) return data.value as string;
    } catch (e) {
      console.warn("getSecret failed for", key, e);
    }
  }
  return Deno.env.get(key) ?? "";
}

/** Constant-time-ish comparison to avoid trivial timing oracles. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Use the passed chart if present, else compute one from birthDetails. */
async function resolveChart(body: any): Promise<any | null> {
  if (body.chart?.birthDetails) return body.chart;
  if (body.birthDetails) return await calculateKundli(body.birthDetails as BirthDetails);
  return null;
}

/** Extract the active Maha → Antar → Pratyantar from a computed chart. */
function currentDasha(chart: any) {
  const system = chart?.dashas?.[0];
  const maha = system?.currentMahaDasha;
  if (!maha) return null;
  const now = Date.now();
  const within = (p: any) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now;
  const antar = maha.children?.find(within) ?? null;
  const pratyantar = antar?.children?.find(within) ?? null;
  const fmt = (p: any) => p && { planet: p.planet, start: p.startDate?.slice(0, 10), end: p.endDate?.slice(0, 10) };
  return { maha: fmt(maha), antar: fmt(antar), pratyantar: fmt(pratyantar) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, summary: "Method not allowed." }, 405);

  // ── Auth: shared secret (from app_settings → Admin API Keys, env fallback) ──
  const expected = await getSecret("ELEVENLABS_WEBHOOK_SECRET");
  const got = req.headers.get("x-webhook-secret") ?? "";
  if (!expected || !safeEqual(got, expected)) {
    return json({ ok: false, summary: "Unauthorized." }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, summary: "Invalid request body." }, 400); }
  const tool: string = body.tool ?? body.tool_name ?? "";

  try {
    switch (tool) {
      case "compute_kundli": {
        const chart = await resolveChart(body);
        if (!chart) return json({ ok: false, summary: "I need the birth date, time, and place to compute the chart." });
        let transits: any[] = [];
        try { transits = calculateTransits(chart.birthDetails); } catch { /* best-effort */ }
        const dossier = buildChartDossier(chart, transits, new Date(), body.clientTimeZone);
        return json({ ok: true, summary: "Chart computed.", data: { dossier } });
      }

      case "get_current_dasha": {
        const chart = await resolveChart(body);
        if (!chart) return json({ ok: false, summary: "I need the birth details first." });
        const dasha = currentDasha(chart);
        if (!dasha) return json({ ok: false, summary: "Dasha data is unavailable for this chart." });
        return json({ ok: true, summary: "Current dasha periods.", data: dasha });
      }

      case "check_transits": {
        const details = body.birthDetails ?? body.chart?.birthDetails;
        if (!details) return json({ ok: false, summary: "I need the birth details to compute transits." });
        const positions = calculateTransits(details as BirthDetails);
        return json({ ok: true, summary: "Current transit positions.", data: { transits: positions } });
      }

      case "detect_yogas": {
        const chart = await resolveChart(body);
        if (!chart) return json({ ok: false, summary: "I need the birth details first." });
        const active = (chart.yogas ?? []).filter((y: any) => y.isPresent).map((y: any) => ({
          name: y.name, category: y.category, strength: y.strength, explanation: y.explanation,
        }));
        return json({ ok: true, summary: `${active.length} active yoga(s).`, data: { yogas: active } });
      }

      case "get_panchang": {
        const chart = await resolveChart(body);
        if (!chart) return json({ ok: false, summary: "I need the date, time, and place." });
        const panchang = chart.panchang ?? null;
        if (!panchang) return json({ ok: false, summary: "Panchang is unavailable for this chart." });
        return json({ ok: true, summary: "Panchang details.", data: { panchang } });
      }

      case "check_compatibility": {
        // Compute 36-point Ashtakoota (Guna Milan) for two partners.
        const boyDetails: BirthDetails | undefined = body.boyBirthDetails ?? body.partnerA;
        const girlDetails: BirthDetails | undefined = body.girlBirthDetails ?? body.partnerB;
        if (!boyDetails || !girlDetails) {
          return json({
            ok: false,
            summary: "I need the birth details (date, time, place) for both partners to compute compatibility.",
          });
        }
        const boyChart = await calculateKundli(boyDetails as BirthDetails);
        const girlChart = await calculateKundli(girlDetails as BirthDetails);

        const moonOf = (chart: any) => {
          const d1 = chart.divisionalCharts?.find((c: any) => c.varga === "D1");
          return d1?.planets?.find((p: any) => p.planet === "moon");
        };
        const boyMoon = moonOf(boyChart);
        const girlMoon = moonOf(girlChart);
        if (!boyMoon?.nakshatra || !girlMoon?.nakshatra) {
          return json({
            ok: false,
            summary: "Could not determine the Moon nakshatra for one or both partners. Please check the birth details.",
          });
        }

        const result: GunMilanResult = computeGunMilan(
          boyMoon.nakshatra, boyMoon.signNumber,
          girlMoon.nakshatra, girlMoon.signNumber,
        );

        const lowKootas = result.kootas
          .filter(k => k.scored === 0 && k.max >= 5)
          .map(k => k.name);
        const concern = lowKootas.length > 0
          ? ` ${lowKootas.join(" and ")} ${lowKootas.length === 1 ? "is" : "are"} the main concern${lowKootas.length === 1 ? "" : "s"}.`
          : "";

        const summary =
          `${result.total} out of 36 gunas match — ${result.verdict.toLowerCase()}.${concern}`;

        return json({ ok: true, summary, data: result });
      }

      default:
        return json({ ok: false, summary: `Unknown tool "${tool}".` }, 400);
    }
  } catch (e) {
    console.error("voice-tools error:", tool, e);
    return json({ ok: false, summary: "Something went wrong computing that. Please try again." });
  }
});
