/**
 * Tweet copy builders — deterministic, ≤270 chars, EN + HI, no URL in routine
 * posts (only proof_flex may carry a link, gated by include_link). All facts
 * come from astro.ts; nothing here invents astronomical data.
 */

import { dateLabel } from "./time.ts";
import { RASHIS, type Locale, type PanchangBundle, type TransitEvent, type RashiEffect, type RashifalReading } from "./astro.ts";

const MAX = 270;

export interface TweetContent { body?: string; thread?: string[] }

/** Defensive cap — templates are short by design, but never exceed the limit. */
function cap(s: string): string {
  const t = s.trim();
  return t.length <= MAX ? t : t.slice(0, MAX - 1).trimEnd() + "…";
}

function signName(sign: number, locale: Locale): string {
  const r = RASHIS[((sign % 12) + 12) % 12];
  return locale === "hi" ? r.devanagari : r.western;
}

// ── 1. Panchang (daily, single) ─────────────────────────────────────────────
export function buildPanchang(p: PanchangBundle, locale: Locale): TweetContent {
  const label = dateLabel(p.dateISO, locale);
  const body = locale === "hi"
    ? `🕉 आज का पंचांग — ${label}
तिथि: ${p.tithiHi}
नक्षत्र: ${p.nakshatraHi}
योग: ${p.yogaHi} · करण: ${p.karanaHi}
राहुकाल: ${p.rahuKaal.start}–${p.rahuKaal.end}${p.abhijit.active ? ` · अभिजित: ${p.abhijit.start}–${p.abhijit.end}` : ""}`
    : `🕉 Today's Panchang — ${label}
Tithi: ${p.tithi}
Nakshatra: ${p.nakshatra}
Yoga: ${p.yoga} · Karana: ${p.karana}
Rahu Kaal: ${p.rahuKaal.start}–${p.rahuKaal.end}${p.abhijit.active ? ` · Abhijit: ${p.abhijit.start}–${p.abhijit.end}` : ""}`;
  return { body: cap(body) };
}

// ── 2a. Rashifal hook (daily default, single — invites the reply loop) ──────
export function buildRashifalHook(p: PanchangBundle, locale: Locale): TweetContent {
  const body = locale === "hi"
    ? `🌙 आज चंद्रमा ${p.nakshatraHi} नक्षत्र में — मन की ऊर्जा के अनुसार दिन।
अपनी राशि नीचे reply करें 👇 — आपके लिए आज की एक-पंक्ति बताऊँगा।
#राशिफल #Panchang`
    : `🌙 The Moon is in ${p.nakshatra} today — the day flows with its energy.
Reply with your 🌙 Rashi below 👇 and I'll give you your one-line read.
#Rashifal #Panchang`;
  return { body: cap(body) };
}

// ── 2b. Rashifal thread (Mon & Fri — hook + 12 sign lines) ──────────────────
export function buildRashifalThread(p: PanchangBundle, readings: RashifalReading[], locale: Locale): TweetContent {
  const label = dateLabel(p.dateISO, locale);
  const head = locale === "hi"
    ? `[1/13] ♈–♓ आज का राशिफल · ${label}
चंद्रमा ${p.nakshatraHi} नक्षत्र में। अपनी राशि देखें 👇 🧵`
    : `[1/13] ♈–♓ Today's Rashifal · ${label}
Moon in ${p.nakshatra}. Find your sign below 👇 🧵`;
  const parts = [cap(head)];
  readings.forEach((r, i) => {
    const name = locale === "hi" ? r.rashi.devanagari : r.rashi.western;
    parts.push(cap(`[${i + 2}/13] ${r.rashi.symbol} ${name}: ${r.transitNote} — ${r.text}`));
  });
  return { thread: parts };
}

// ── 3. Transit alert (event-driven, single) ─────────────────────────────────
export function buildTransit(ev: TransitEvent, locale: Locale): TweetContent {
  const graha = locale === "hi" ? ev.grahaHi : ev.graha;
  let body: string;
  if (ev.type === "ingress") {
    const to = signName(ev.toSign, locale);
    body = locale === "hi"
      ? `🪐 गोचर अलर्ट: ${graha} आज ${to} राशि में प्रवेश।
यह गोचर सभी चंद्र-राशियों को प्रभावित करता है।
किस राशि पर क्या असर — विवरण थ्रेड में नीचे 👇`
      : `🪐 Transit alert: ${graha} enters ${to} today.
This gochar shifts the ground for every Moon sign.
What it means for your sign — thread below 👇`;
  } else {
    const at = signName(ev.toSign, locale);
    const dirHi = ev.type === "retro" ? "वक्री" : "मार्गी";
    const dirEn = ev.type === "retro" ? "retrograde" : "direct";
    body = locale === "hi"
      ? `🪐 गोचर अलर्ट: ${graha} आज ${at} राशि में ${dirHi} हुआ।
${ev.type === "retro" ? "इस अवधि में संबंधित कार्यों की समीक्षा करें।" : "रुके कार्य अब गति पकड़ेंगे।"}`
      : `🪐 Transit alert: ${graha} turns ${dirEn} in ${at} today.
${ev.type === "retro" ? "A time to review and revisit, not to rush new starts." : "Stalled matters begin to move forward again."}`;
  }
  return { body: cap(body) };
}

// ── 4. Rashi effect (thread off a transit, all 12 signs) ────────────────────
export function buildRashiEffect(ev: TransitEvent, effects: RashiEffect[], locale: Locale): TweetContent {
  const graha = locale === "hi" ? ev.grahaHi : ev.graha;
  const to = signName(ev.toSign, locale);
  const head = locale === "hi"
    ? `[1/13] ${graha} ${to} में — किस राशि पर क्या असर? 🧵`
    : `[1/13] ${graha} in ${to} — what it means for your sign 🧵`;
  const parts = [cap(head)];
  effects.forEach((e, i) => {
    const name = locale === "hi" ? e.rashi.devanagari : e.rashi.western;
    parts.push(cap(`[${i + 2}/13] ${e.rashi.symbol} ${name}: ${e.text}`));
  });
  return { thread: parts };
}

// ── 5. Muhurat micro (daily @ 13:00, single) ────────────────────────────────
export function buildMuhurat(p: PanchangBundle, locale: Locale): TweetContent {
  const body = locale === "hi"
    ? `⏳ आज का राहुकाल: ${p.rahuKaal.start}–${p.rahuKaal.end}
इस दौरान कोई नया/शुभ कार्य शुरू करने से बचें।${p.abhijit.active ? ` अभिजित मुहूर्त: ${p.abhijit.start}–${p.abhijit.end} ✅` : ""}`
    : `⏳ Today's Rahu Kaal: ${p.rahuKaal.start}–${p.rahuKaal.end}
Avoid starting anything new or auspicious during this window.${p.abhijit.active ? ` Abhijit Muhurat: ${p.abhijit.start}–${p.abhijit.end} ✅` : ""}`;
  return { body: cap(body) };
}

// ── 6. Proof flex (Sunday @ 18:00, short thread — the brand differentiator) ──
export function buildProofFlex(ev: TransitEvent | null, sample: RashiEffect | null, includeLink: boolean, locale: Locale): TweetContent {
  const graha = ev ? (locale === "hi" ? ev.grahaHi : ev.graha) : (locale === "hi" ? "शनि" : "Saturn");
  const to = ev ? signName(ev.toSign, locale) : (locale === "hi" ? "मीन" : "Pisces");
  const bhava = sample?.bhava ?? 8;
  const link = includeLink ? (locale === "hi" ? "\nपूरी गणना देखें — link in bio." : "\nSee the full math — link in bio.") : "";
  const thread = locale === "hi"
    ? [
        `[1/4] ज़्यादातर ऐप कहते हैं "${graha} भारी है।" हम दिखाते हैं — क्यों। 🧵`,
        `[2/4] ${graha} इस समय ${to} राशि में → आपकी चंद्र-राशि से ${bhava}वाँ भाव।`,
        `[3/4] शास्त्रों (फलदीपिका/बृहत् जातक) के अनुसार ${bhava}वें भाव में धीमे ग्रह का गोचर — संयमित फल देता है।`,
        `[4/4] हर दावे के पीछे की गणना — डिग्री → भाव → सूत्र — हम दिखाते हैं।${link}`,
      ]
    : [
        `[1/4] Most apps just say "${graha} is heavy." We show you why. 🧵`,
        `[2/4] ${graha} is in ${to} now → the ${bhava}th house from your Moon sign.`,
        `[3/4] Per the classics (Phaladeepika / Brihat Jataka), a slow planet transiting the ${bhava}th gives a measured, not catastrophic, result.`,
        `[4/4] Every claim, traced: exact degree → bhava → classical sutra.${link}`,
      ];
  return { thread: thread.map(cap) };
}
