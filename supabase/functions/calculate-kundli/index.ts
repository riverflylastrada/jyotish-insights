/**
 * Supabase Edge Function: calculate-kundli
 *
 * Swiss-Ephemeris-grade Vedic astrology engine.
 * Accepts POST with { birthDetails, mode } and returns full KundliData.
 */

import { calculateKundli, calculateTransits } from "./engine.ts";

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
    const { birthDetails, mode } = await req.json();

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

    // Full kundli calculation
    const kundli = calculateKundli(birthDetails);
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
