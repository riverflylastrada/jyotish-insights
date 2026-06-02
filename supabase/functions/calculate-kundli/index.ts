/**
 * Supabase Edge Function: calculate-kundli
 *
 * Swiss-Ephemeris-grade Vedic astrology engine.
 * Accepts POST with { birthDetails, mode } and returns full KundliData.
 */

import { calculateKundli, calculateTransits } from "./engine.ts";
import { computeEclipses } from "./eclipse.ts";
import { julianDay } from "./astronomy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { birthDetails, mode } = body;

    if (mode === "health") {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "transits") {
      const positions = calculateTransits(birthDetails);
      return new Response(
        JSON.stringify(positions),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "eclipses") {
      const { fromDate, lat, lon, ayanamsa, maxEclipses } = body;
      const dateMatch = typeof fromDate === "string"
        ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromDate)
        : null;
      const y = dateMatch ? Number(dateMatch[1]) : NaN;
      const m = dateMatch ? Number(dateMatch[2]) : NaN;
      const d = dateMatch ? Number(dateMatch[3]) : NaN;
      // Reject impossible dates (e.g. 2026-99-99, 2026-02-30): a real calendar
      // date round-trips through Date.UTC unchanged. A bad date would otherwise
      // feed garbage into julianDay and the eclipse search.
      const probe = dateMatch ? new Date(Date.UTC(y, m - 1, d)) : null;
      const validDate = probe !== null &&
        probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 &&
        probe.getUTCDate() === d;
      if (!validDate) {
        return new Response(
          JSON.stringify({ error: "eclipses mode requires fromDate as a valid YYYY-MM-DD date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const jd = julianDay(y, m, d, 0, 0, 0);
      const eclipses = computeEclipses(jd, lat ?? 0, lon ?? 0, ayanamsa ?? "lahiri", maxEclipses ?? 6);
      return new Response(
        JSON.stringify(eclipses),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Full kundli calculation
    const kundli = await calculateKundli(birthDetails);
    return new Response(
      JSON.stringify(kundli),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("calculate-kundli error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
