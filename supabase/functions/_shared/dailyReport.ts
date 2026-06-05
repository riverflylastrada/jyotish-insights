/**
 * Assembles the deterministic daily report payload (Panchang + current dasha +
 * this-week's transits) and renders it to email-safe HTML.
 *
 * Deterministic + always-present: Panchang and the current dasha exist for every
 * chart every day, so the email is never empty. Transit events (slow movers) are
 * a bonus shown only when something notable falls in the next 7 days.
 *
 * The optional LLM "today's guidance" line is added by the caller (PR 2); this
 * module stays zero-cost and pure.
 */

import { detectUpcomingEvents } from "../calculate-kundli/transit_events.ts";
import type { PanchangData } from "../calculate-kundli/panchang.ts";

// ─── Current dasha (ported from voice-tools/index.ts:66-77) ───────────────────
export function currentDasha(chart: any) {
  const system = chart?.dashas?.[0];
  const maha = system?.currentMahaDasha;
  if (!maha) return null;
  const now = Date.now();
  const within = (p: any) =>
    new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now;
  const antar = maha.children?.find(within) ?? null;
  const pratyantar = antar?.children?.find(within) ?? null;
  const fmt = (p: any) =>
    p && { planet: p.planet, start: p.startDate?.slice(0, 10), end: p.endDate?.slice(0, 10) };
  return { maha: fmt(maha), antar: fmt(antar), pratyantar: fmt(pratyantar) };
}

// ─── Payload ──────────────────────────────────────────────────────────────────
export interface DailyTransit {
  title: string;
  date: string;       // 'YYYY-MM-DD'
  description: string;
  severity: string;
}

export interface ReportPayload {
  name: string;
  dateLabel: string;  // e.g. "Friday, 6 June 2026"
  panchang: PanchangData;
  dasha: ReturnType<typeof currentDasha>;
  transits: DailyTransit[];
  guidance?: string;  // optional LLM line (PR 2); omitted in PR 1
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Build the next-7-day transit list for a chart snapshot (must have `.id`). */
export function summarizeTransits(snapshot: any): DailyTransit[] {
  let events: any[] = [];
  try {
    // 7-day window over a single chart — detectUpcomingEvents already memoizes the
    // ephemeris per call (#130), which is ample at this scale. No shared ctx needed.
    events = detectUpcomingEvents(snapshot, 7);
  } catch {
    return [];
  }
  return events.slice(0, 5).map((e) => ({
    title: e.title,
    date: String(e.starts).slice(0, 10),
    description: e.description,
    severity: e.severity,
  }));
}

export function assembleReport(opts: {
  name: string;
  dateLabel: string;
  panchang: PanchangData;
  snapshot: any;
}): ReportPayload {
  return {
    name: opts.name,
    dateLabel: opts.dateLabel,
    panchang: opts.panchang,
    dasha: currentDasha(opts.snapshot),
    transits: summarizeTransits(opts.snapshot),
  };
}

/** Compact prompt input for the daily LLM guidance line (~120 tokens). */
export function buildGuidanceInput(p: ReportPayload, snapshot: any): string {
  const asc = snapshot?.ascendant?.signName ?? "unknown";
  const d1 = snapshot?.divisionalCharts?.find((d: any) => d.varga === "D1");
  const moon = d1?.planets?.find((pl: any) => pl.planet === "moon");
  const moonStr = moon ? `${moon.signName} (${moon.nakshatra})` : "unknown";
  const d = p.dasha;
  const dashaStr = d?.maha
    ? `Mahadasha ${cap(d.maha.planet)}${d.maha.end ? ` to ${d.maha.end}` : ""}` +
      (d.antar ? `, Antardasha ${cap(d.antar.planet)}${d.antar.end ? ` to ${d.antar.end}` : ""}` : "")
    : "unknown";
  const transitStr = p.transits.length ? p.transits.map((t) => t.title).join("; ") : "none";
  return [
    `Lagna: ${asc}. Moon: ${moonStr}.`,
    `Today (${p.dateLabel}): ${p.panchang.tithi}, ${p.panchang.vara}, Nakshatra ${p.panchang.nakshatra}, Yoga ${p.panchang.yoga}.`,
    `Current dasha: ${dashaStr}.`,
    `Notable transits in the next 7 days: ${transitStr}.`,
  ].join("\n");
}

// ─── Rendering ─────────────────────────────────────────────────────────────────
const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function buildSubject(p: ReportPayload): string {
  return `Your morning reading — ${p.panchang.nakshatra} nakshatra, ${p.panchang.tithi}`;
}

const BG = "#FAF8F4", INK = "#1A1614", MUTE = "#6B635C", ACCENT = "#C8782C", LINE = "#E7E0D6";

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:${MUTE};font-size:13px;width:42%;">${esc(label)}</td>
    <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600;">${esc(value)}</td>
  </tr>`;
}

function card(title: string, inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${LINE};border-radius:12px;margin:0 0 16px;">
    <tr><td style="padding:18px 20px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};font-weight:600;margin:0 0 10px;">${esc(title)}</div>
      ${inner}
    </td></tr>
  </table>`;
}

export function buildEmailHtml(p: ReportPayload): string {
  const pan = p.panchang;
  // NOTE: sunrise/sunset intentionally omitted — the engine's sunriseSunset has a
  // longitude-convention bug (returns wrong UT); the five limbs below are correct
  // (they derive from sun/moon longitudes). Accurate timings are a follow-up.
  const panchangCard = card("Today's Panchang", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Tithi", pan.tithi)}
    ${row("Vara", pan.vara)}
    ${row("Nakshatra", pan.nakshatra)}
    ${row("Yoga", pan.yoga)}
    ${row("Karana", pan.karana)}
  </table>`);

  let dashaCard = "";
  if (p.dasha?.maha) {
    const lines: string[] = [];
    lines.push(row("Mahadasha", `${cap(p.dasha.maha.planet)}${p.dasha.maha.end ? ` · to ${p.dasha.maha.end}` : ""}`));
    if (p.dasha.antar) lines.push(row("Antardasha", `${cap(p.dasha.antar.planet)}${p.dasha.antar.end ? ` · to ${p.dasha.antar.end}` : ""}`));
    if (p.dasha.pratyantar) lines.push(row("Pratyantar", `${cap(p.dasha.pratyantar.planet)}${p.dasha.pratyantar.end ? ` · to ${p.dasha.pratyantar.end}` : ""}`));
    dashaCard = card("Your Current Dasha", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines.join("")}</table>`);
  }

  let transitInner: string;
  if (p.transits.length === 0) {
    transitInner = `<div style="color:${MUTE};font-size:14px;">No major transits this week — a calm, steady window.</div>`;
  } else {
    transitInner = p.transits.map((t) => `<div style="margin:0 0 12px;">
      <div style="color:${INK};font-size:14px;font-weight:600;">${esc(t.title)} <span style="color:${MUTE};font-weight:400;font-size:12px;">· ${esc(t.date)}</span></div>
      <div style="color:${MUTE};font-size:13px;line-height:1.5;margin-top:2px;">${esc(t.description)}</div>
    </div>`).join("");
  }
  const transitCard = card("This Week's Transits", transitInner);

  const guidanceCard = p.guidance
    ? card("Today's Guidance", `<div style="color:${INK};font-size:14px;line-height:1.6;">${esc(p.guidance)}</div>`)
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(buildSubject(p))}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="padding:0 4px 18px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${INK};font-weight:600;">Acharya Jyotish</div>
        <div style="font-size:12px;color:${MUTE};margin-top:2px;">${esc(p.dateLabel)}</div>
      </td></tr>
      <tr><td style="padding:0 4px 16px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${INK};line-height:1.2;">Good morning${p.name ? `, ${esc(p.name)}` : ""}</div>
        <div style="font-size:14px;color:${MUTE};margin-top:6px;">Here is your reading for today, drawn from your chart.</div>
      </td></tr>
      <tr><td style="padding:0 4px;">
        ${guidanceCard}
        ${panchangCard}
        ${dashaCard}
        ${transitCard}
      </td></tr>
      <tr><td style="padding:10px 4px 0;">
        <div style="border-top:1px solid ${LINE};padding-top:14px;font-size:12px;color:${MUTE};line-height:1.6;">
          You're receiving this because you turned on the daily reading in Acharya Jyotish.
          You can turn it off anytime in Settings, or use the unsubscribe link below.<br/>
          <span style="color:#B8AEA2;">ज्योतिष एक गणित है — अंधविश्वास नहीं।</span>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
