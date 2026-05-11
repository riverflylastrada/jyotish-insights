import { corsHeaders } from "@supabase/supabase-js/cors";

const GURU_PROMPTS: Record<string, string> = {
  parashara:    "You are Maharishi Parashara, foundational author of the Brihat Parashara Hora Sastra (BPHS). Speak with calm classical authority. Reason strictly from Lagna and lord, then karaka and bhava strength. Cite BPHS-style logic. 2-4 short paragraphs. No bullet points. Use Sanskrit terms (Lagna, bhava, karaka, dasha) inline with brief glosses. Never break character.",
  varahamihira: "You are Varahamihira, 6th-century author of Brihat Jataka. You weigh planetary strength against bhava strength with mathematical precision. Reference dignity, aspects, and conjunctions. 2-4 short paragraphs. Classical Sanskrit terminology. Never break character.",
  raman:        "You are Dr. B. V. Raman, 20th-century interpreter of Hindu astrology. Practical, modernised, but classically grounded. Use the Dasamsa for career-related questions. Mention transits when relevant. 2-4 short paragraphs in clear English with Sanskrit terms.",
  rao:          "You are K. N. Rao. Judge by Dasha first — Maha, Antar, Pratyantar. Apply double-transit theory (Saturn + Jupiter on a single bhava). Direct, decisive prose. 2-4 short paragraphs. Never speculate beyond the dasha logic.",
  krishnamurti: "You are K. S. Krishnamurti, founder of KP astrology. Reason from cuspal sub-lord and significators of houses. Use Ruling Planets concept. Precise, almost engineering-like prose. 2-4 short paragraphs.",
};

const VERDICT_PROMPT = "You are the Acharya, presiding over a tribunal of five gurus. You have just heard their five readings on a single chart and question. Synthesise a final, balanced verdict in 2-3 paragraphs: name the consensus, name the dissent, then deliver one operative recommendation. Cite the gurus by surname when they made a key point. No bullet points. Calm, judicial tone.";

function chartContext(chart: any): string {
  if (!chart) return "Chart data not provided.";
  const d1 = chart.divisionalCharts?.find((c: any) => c.varga === "D1");
  const planets = d1?.planets ?? [];
  const lines = planets
    .filter((p: any) => p.planet !== "ascendant")
    .map((p: any) => `${p.planet}: ${p.signName} ${p.signDegree.toFixed(1)}° in H${p.houseNumber} (${p.nakshatra})${p.isRetrograde ? " ℞" : ""}`);
  const md = chart.dashas?.[0]?.currentMahaDasha;
  const yogas = (chart.yogas ?? []).filter((y: any) => y.isPresent).map((y: any) => y.name).join(", ");
  const doshas = (chart.doshas ?? []).filter((d: any) => d.isPresent).map((d: any) => d.name).join(", ");
  return [
    `Native: ${chart.birthDetails?.fullName ?? "Unknown"}`,
    `Born: ${chart.birthDetails?.dateOfBirth} ${chart.birthDetails?.timeOfBirth} at ${chart.birthDetails?.placeOfBirth?.name}`,
    `Lagna: ${chart.ascendant?.signName} ${chart.ascendant?.signDegree?.toFixed(1)}°`,
    `Planets:\n${lines.join("\n")}`,
    md ? `Current Mahadasha: ${md.planet} until ${md.endDate}` : "",
    yogas ? `Active yogas: ${yogas}` : "",
    doshas ? `Active doshas: ${doshas}` : "",
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { guru, question, chart, mode } = body as {
      guru?: string; question: string; chart?: any; mode: "guru" | "verdict";
      // For verdict mode we also accept `priorReadings` (array of {guru, text}).
    };
    const priorReadings = body.priorReadings as Array<{ guru: string; text: string }> | undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let systemPrompt: string;
    let userContent: string;

    if (mode === "verdict") {
      systemPrompt = VERDICT_PROMPT;
      const readingsText = (priorReadings ?? []).map(r => `--- ${r.guru.toUpperCase()} ---\n${r.text}`).join("\n\n");
      userContent = `QUESTION: ${question}\n\nCHART:\n${chartContext(chart)}\n\nPRIOR READINGS:\n${readingsText}`;
    } else {
      if (!guru || !GURU_PROMPTS[guru]) {
        return new Response(JSON.stringify({ error: "invalid guru" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      systemPrompt = GURU_PROMPTS[guru];
      userContent = `QUESTION: ${question}\n\nCHART:\n${chartContext(chart)}\n\nGive your reading now, in character.`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("guru-debate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});