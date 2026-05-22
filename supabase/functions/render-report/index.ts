import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const escape = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function buildHtml(chart: any): string {
  const bd = chart.birthDetails ?? {};
  const place = bd.placeOfBirth ?? {};
  const d1 = chart.divisionalCharts?.find((c: any) => c.varga === "D1");
  const planets = (d1?.planets ?? []).filter((p: any) => p.planet !== "ascendant");
  const md = chart.dashas?.[0]?.currentMahaDasha;
  const yogas = (chart.yogas ?? []).filter((y: any) => y.isPresent);
  const doshas = (chart.doshas ?? []).filter((d: any) => d.isPresent);
  const sarva = chart.ashtakavarga?.sarva ?? [];
  const signs = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrischika","Dhanu","Makara","Kumbha","Meena"];

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escape(bd.fullName ?? "Kundli")} — Jyotish Sage Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #FAF8F4; color: #1A1614; font-family: "Inter Tight", system-ui, sans-serif; font-size: 11pt; line-height: 1.55; }
  h1, h2, h3 { font-family: "Fraunces", Georgia, serif; font-weight: 500; color: #1A1614; margin: 0; }
  h1 { font-size: 32pt; line-height: 1.05; letter-spacing: -0.02em; }
  h2 { font-size: 16pt; margin-bottom: 8px; }
  h3 { font-size: 12pt; }
  .mono { font-family: "JetBrains Mono", monospace; }
  .eyebrow { font-size: 8pt; letter-spacing: 0.12em; text-transform: uppercase; color: #C8782C; font-weight: 500; }
  .muted { color: #807469; }
  .secondary { color: #4A4239; }
  .gold-rule { height: 1px; background: linear-gradient(to right, transparent, rgba(184, 146, 61, 0.6), transparent); margin: 16px 0; }
  .page { page-break-after: always; padding-bottom: 8mm; }
  .page:last-of-type { page-break-after: auto; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .tile { border: 1px solid #E8E2D5; border-radius: 4px; padding: 12px; background: #fff; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #807469; font-weight: 500; border-bottom: 1px solid #E8E2D5; padding: 6px 4px; }
  td { padding: 6px 4px; border-bottom: 1px solid #E8E2D5; }
  .card { border: 1px solid #E8E2D5; border-radius: 4px; padding: 14px; background: #fff; margin-bottom: 10px; page-break-inside: avoid; }
  .badge { display: inline-block; font-size: 8pt; padding: 2px 6px; border: 1px solid; border-radius: 3px; }
  .badge.maroon { color: #6B1F2B; border-color: rgba(107,31,43,0.4); }
  .footer { margin-top: 24mm; padding-top: 8px; border-top: 1px solid #E8E2D5; font-size: 8pt; color: #B8AE9F; }
</style></head>
<body>

<section class="page">
  <div class="eyebrow">Jyotish Sage · Vedic Research Report</div>
  <h1 style="margin-top:8px;">${escape(bd.fullName ?? "Untitled Chart")}</h1>
  <div class="gold-rule"></div>
  <div class="grid-2" style="margin-top:24px;">
    <div><div class="eyebrow muted">Date of birth</div><div>${escape(fmtDate(bd.dateOfBirth))}</div></div>
    <div><div class="eyebrow muted">Time of birth</div><div>${escape(bd.timeOfBirth ?? "—")}</div></div>
    <div><div class="eyebrow muted">Place of birth</div><div>${escape(place.name ?? "—")}</div></div>
    <div><div class="eyebrow muted">Coordinates</div><div class="mono">${escape((place.latitude ?? 0).toFixed(4))}°, ${escape((place.longitude ?? 0).toFixed(4))}°</div></div>
    <div><div class="eyebrow muted">Ayanamsa</div><div style="text-transform:capitalize;">${escape(bd.ayanamsa ?? "—")}</div></div>
    <div><div class="eyebrow muted">House system</div><div style="text-transform:capitalize;">${escape((bd.houseSystem ?? "").replace("_", " "))}</div></div>
  </div>
  <div class="grid-3" style="margin-top:32px;">
    <div class="tile"><div class="eyebrow muted">Lagna</div><h2 style="margin-top:6px;">${escape(chart.ascendant?.signName ?? "—")}</h2><div class="mono muted">${escape((chart.ascendant?.signDegree ?? 0).toFixed(2))}°</div></div>
    <div class="tile"><div class="eyebrow muted">Moon</div><h2 style="margin-top:6px;">${escape(planets.find((p:any)=>p.planet==="moon")?.signName ?? "—")}</h2><div class="mono muted">${escape(planets.find((p:any)=>p.planet==="moon")?.nakshatra ?? "")}</div></div>
    <div class="tile"><div class="eyebrow muted">Sun</div><h2 style="margin-top:6px;">${escape(planets.find((p:any)=>p.planet==="sun")?.signName ?? "—")}</h2><div class="mono muted">${escape(planets.find((p:any)=>p.planet==="sun")?.nakshatra ?? "")}</div></div>
  </div>
  <p class="secondary" style="margin-top:32px;">This document distils the natal configuration into a single, archival-quality reading. Each section follows the order of judgment used in classical Jyotish — Lagna and lord, planetary disposition, divisional confirmation, dasha unfoldment, doshas with remedies, and yogas as the operative architecture of the lifetime.</p>
  <div class="muted mono" style="margin-top:48px;font-size:8pt;">Generated ${escape(fmtDate(chart.generatedAt))} · Reference ${escape(String(chart.id ?? "").toUpperCase())}</div>
</section>

<section class="page">
  <div class="eyebrow">Section ॥१॥</div>
  <h2>Birth Panchang</h2>
  <div class="gold-rule"></div>
  <div class="grid-3">
    ${Object.entries(chart.panchang ?? {}).map(([k, v]) => `
      <div class="tile"><div class="eyebrow muted" style="text-transform:capitalize;">${escape(k)}</div><div style="margin-top:4px;">${escape(v as string)}</div></div>
    `).join("")}
  </div>
</section>

<section class="page">
  <div class="eyebrow">Section ॥२॥</div>
  <h2>Rasi Chakra · D1</h2>
  <p class="muted" style="margin-top:4px;">Planetary disposition in the natal chart.</p>
  <div class="gold-rule"></div>
  <table>
    <thead><tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Nakshatra · Pada</th><th>Status</th></tr></thead>
    <tbody>
    ${planets.map((p: any) => `
      <tr>
        <td class="mono" style="text-transform:capitalize;">${escape(p.planet)}</td>
        <td>${escape(p.signName)}</td>
        <td class="mono muted">${escape((p.signDegree ?? 0).toFixed(2))}°</td>
        <td class="mono muted">H${escape(p.houseNumber)}</td>
        <td class="muted">${escape(p.nakshatra)} · ${escape(p.nakshatraPada)}</td>
        <td class="muted">${p.isRetrograde ? "Retrograde " : ""}${p.dignity ? escape(String(p.dignity).replace("_", " ")) : ""}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>
</section>

${md ? `
<section class="page">
  <div class="eyebrow">Section ॥३॥</div>
  <h2>Dasha Unfoldment · Vimshottari</h2>
  <p class="secondary" style="margin-top:4px;">Currently running <strong>${escape(md.planet)} Mahadasha</strong> until ${escape(fmtDate(md.endDate))}.</p>
  <div class="gold-rule"></div>
  <table>
    <thead><tr><th>Maha</th><th>Begin</th><th>End</th><th style="text-align:right;">Years</th></tr></thead>
    <tbody>
    ${(chart.dashas?.[0]?.timeline ?? []).slice(0, 9).map((p: any) => `
      <tr${p.planet === md.planet ? ' style="background:#F5F2EC;"' : ''}>
        <td class="mono" style="text-transform:capitalize;">${escape(p.planet)}</td>
        <td>${escape(fmtDate(p.startDate))}</td>
        <td>${escape(fmtDate(p.endDate))}</td>
        <td class="mono" style="text-align:right;">${escape(p.durationYears)}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>
</section>
` : ""}

${yogas.length ? `
<section class="page">
  <div class="eyebrow">Section ॥४॥</div>
  <h2>Active Yogas</h2>
  <div class="gold-rule"></div>
  ${yogas.slice(0, 25).map((y: any) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <h3>${escape(y.name)}</h3>
        <span class="mono muted" style="font-size:8pt;text-transform:capitalize;">${escape(y.category)} · ${escape(y.strength)}</span>
      </div>
      <p class="secondary" style="margin:8px 0 0;">${escape(y.explanation)}</p>
    </div>
  `).join("")}
</section>
` : ""}

${doshas.length ? `
<section class="page">
  <div class="eyebrow">Section ॥५॥</div>
  <h2>Doshas &amp; Remedies</h2>
  <div class="gold-rule"></div>
  ${doshas.map((d: any) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <h3 style="text-transform:capitalize;">${escape(String(d.name).replace("_", " "))} Dosha</h3>
        <span class="badge maroon" style="text-transform:uppercase;">${escape(d.severity ?? "present")}</span>
      </div>
      <p class="secondary" style="margin:8px 0;">${escape(d.explanation)}</p>
      ${(d.remedies ?? []).length ? `<div class="eyebrow muted" style="margin-top:8px;">Remedies</div>
        <ul style="margin:6px 0 0;padding-left:18px;font-size:10pt;">
          ${d.remedies.map((r: any) => `<li><span class="mono muted" style="font-size:8pt;text-transform:uppercase;">${escape(r.type)}</span> — <strong>${escape(r.title)}</strong> <span class="muted">${escape(r.description)}</span></li>`).join("")}
        </ul>` : ""}
    </div>
  `).join("")}
</section>
` : ""}

${sarva.length ? `
<section class="page">
  <div class="eyebrow">Section ॥६॥</div>
  <h2>Bhava Strength · Sarvashtakavarga</h2>
  <p class="secondary" style="margin-top:4px;">Total ${sarva.reduce((a:number,b:number)=>a+b,0)} bindus across the zodiac.</p>
  <div class="gold-rule"></div>
  <table>
    <thead><tr><th>House</th><th>Sign</th><th style="text-align:right;">Bindus</th></tr></thead>
    <tbody>
    ${sarva.map((b: number, i: number) => `
      <tr><td class="mono">H${i+1}</td><td>${escape(signs[i])}</td><td class="mono" style="text-align:right;">${escape(b)}</td></tr>
    `).join("")}
    </tbody>
  </table>
</section>
` : ""}

<div class="footer">
  Jyotish Sage · This report is generated for reflection and study. Vedic astrology is a classical Indian contemplative tradition; treat all judgments as guidance, not determinism. Decisions about health, finance, or relationships should not rely solely on astrological readings.
</div>

</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Try reading PDFSHIFT_API_KEY from app_settings, fall back to env
    let PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY") ?? "";
    if (SUPABASE_URL && SERVICE_ROLE) {
      try {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: keyRow } = await adminClient
          .from('app_settings')
          .select('value')
          .eq('key', 'PDFSHIFT_API_KEY')
          .maybeSingle();
        if (keyRow?.value) PDFSHIFT_API_KEY = keyRow.value;
      } catch { /* fall back to env */ }
    }
    if (!PDFSHIFT_API_KEY) throw new Error("PDFSHIFT_API_KEY not configured. Set it in Admin → API Keys or via: supabase secrets set PDFSHIFT_API_KEY=<key>");

    const { chartId, shareToken, snapshot } = await req.json() as { chartId?: string; shareToken?: string; snapshot?: any };

    let chart: any = null;

    if (snapshot && typeof snapshot === "object") {
      // Caller passed a fresh snapshot (e.g. unsaved demo chart) — render directly.
      chart = snapshot;
    } else if (shareToken) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data, error } = await admin.from("charts").select("snapshot,birth_details").eq("share_token", shareToken).maybeSingle();
      if (error || !data) throw new Error("Shared chart not found");
      chart = data.snapshot ?? { birthDetails: data.birth_details };
    } else if (chartId) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await userClient.from("charts").select("snapshot,birth_details").eq("id", chartId).maybeSingle();
      if (error || !data) throw new Error("Chart not found or access denied");
      chart = data.snapshot ?? { birthDetails: data.birth_details };
    } else {
      return new Response(JSON.stringify({ error: "chartId, shareToken, or snapshot required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = buildHtml(chart);

    const pdfResp = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "X-API-Key": PDFSHIFT_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        format: "A4",
        sandbox: false,
        use_print: false,
      }),
    });

    if (!pdfResp.ok) {
      const t = await pdfResp.text();
      console.error("PDFShift error:", pdfResp.status, t);
      return new Response(JSON.stringify({ error: `PDF render failed (${pdfResp.status})` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pdf = await pdfResp.arrayBuffer();
    const filename = `jyotish-sage-${escape(chart.birthDetails?.fullName ?? "report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("render-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});