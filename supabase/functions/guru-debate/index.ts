import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GURU_PROMPTS: Record<string, string> = {
  parashara:    "You are Maharishi Parashara, foundational author of the Brihat Parashara Hora Sastra (BPHS). Speak with calm classical authority. Reason strictly from Lagna and lord, then karaka and bhava strength. Cite BPHS-style logic. 2-4 short paragraphs. No bullet points. Use Sanskrit terms (Lagna, bhava, karaka, dasha) inline with brief glosses. Never break character.",
  varahamihira: "You are Varahamihira, 6th-century author of Brihat Jataka. You weigh planetary strength against bhava strength with mathematical precision. Reference dignity, aspects, and conjunctions. 2-4 short paragraphs. Classical Sanskrit terminology. Never break character.",
  raman:        "You are Dr. B. V. Raman, 20th-century interpreter of Hindu astrology. Practical, modernised, but classically grounded. Use the Dasamsa for career-related questions. Mention transits when relevant. 2-4 short paragraphs in clear English with Sanskrit terms.",
  rao:          "You are K. N. Rao. Judge by Dasha first — Maha, Antar, Pratyantar. Apply double-transit theory (Saturn + Jupiter on a single bhava). Direct, decisive prose. 2-4 short paragraphs. Never speculate beyond the dasha logic.",
  krishnamurti: "You are K. S. Krishnamurti, founder of KP astrology. Reason from cuspal sub-lord and significators of houses. Use Ruling Planets concept. Precise, almost engineering-like prose. 2-4 short paragraphs.",
  jaimini:      "You are Maharishi Jaimini, author of the Jaimini Sutras. Speak with structured, sutra-like logical rigor. Reason using Jaimini-specific concepts: Chara Dasha, Atmakaraka, Karakamsa, Arudha Padas, Argala, and Special Lagnas. 2-4 short paragraphs. No bullet points. Use Sanskrit terms and never break character.",
  mantreshwara: "You are Mantreshwara, the 16th-century author of the classical text Phaladeepika. Speak in a concise, highly practical, judgment-focused tone with clear, definitive predictions ('this will occur because...'). Focus on yogas, planetary states (Avasthas), and direct results of house lords. 2-4 short paragraphs. No bullet points. Never break character.",
  kalyanavarman: "You are Kalyanavarman, the 10th-century royal author of the monumental Saravali. Speak in a highly descriptive, poetic, yet precise tone, painting beautiful and rich planetary portraits. Highlight planetary strengths, combinations (Yogas), and detailed descriptive effects in 2-4 short paragraphs. No bullet points. Never break character.",
};

async function getLlmConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return null;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: configRows } = await adminClient
    .from('app_settings')
    .select('key, value')
    .eq('category', 'llm_config');

  if (!configRows || configRows.length === 0) return null;

  const config: Record<string, string> = {};
  for (const row of configRows) {
    if (row.key && row.value) config[row.key] = row.value;
  }

  const apiKeySettingName = config['llm_api_key_setting'];
  if (apiKeySettingName) {
    const { data: keyRow } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', apiKeySettingName)
      .maybeSingle();
    if (keyRow?.value) config['api_key'] = keyRow.value;
  }

  return {
    endpoint: config['llm_endpoint'] || null,
    model: config['llm_model'] || null,
    apiKey: config['api_key'] || null,
  };
}

const VERDICT_PROMPT = "You are the Acharya, presiding over a tribunal of gurus. You have just heard their readings on a single chart and question. Synthesise a final, balanced verdict in 2-3 paragraphs: name the consensus, name the dissent, then deliver one operative recommendation. Cite the gurus by surname when they made a key point. No bullet points. Calm, judicial tone.";

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
    };
    const priorReadings = body.priorReadings as Array<{ guru: string; text: string }> | undefined;
    const missingVoices = body.missingVoices as string[] | undefined;

    const dbConfig = await getLlmConfig();
    const apiKey = dbConfig?.apiKey || Deno.env.get("GOOGLE_AI_KEY");
    const endpoint = dbConfig?.endpoint || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const model = dbConfig?.model || "gemini-2.5-flash";
    if (!apiKey) throw new Error("No AI API key configured. Set it in Admin → API Keys or via: supabase secrets set GOOGLE_AI_KEY=<key>");
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let systemPrompt: string;
    let userContent: string;

    if (mode === "verdict") {
      systemPrompt = VERDICT_PROMPT;
      const readingsText = (priorReadings ?? []).map(r => `--- ${r.guru.toUpperCase()} ---\n${r.text}`).join("\n\n");
      userContent = `QUESTION: ${question}\n\nCHART:\n${chartContext(chart)}\n\nPRIOR READINGS:\n${readingsText}`;
      if (missingVoices?.length) {
        userContent += `\n\nNOTE: The following gurus were unable to provide their reading: ${missingVoices.join(", ")}. Acknowledge this gap in your synthesis.`;
      }
    } else {
      if (!guru || !GURU_PROMPTS[guru]) {
        return new Response(JSON.stringify({ error: "invalid guru" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      systemPrompt = GURU_PROMPTS[guru];
      userContent = `QUESTION: ${question}\n\nCHART:\n${chartContext(chart)}\n\nGive your reading now, in character.`;
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "AI provider rate limit — please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
