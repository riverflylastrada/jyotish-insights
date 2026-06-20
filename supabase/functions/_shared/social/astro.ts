/**
 * Social-bot astronomy facade — the single source of truth for tweet content.
 *
 * Calls the EXISTING in-house sidereal engine (calculate-kundli/*) and the shared
 * Panchang helper; adds only the bits the templates need that aren't already
 * exposed as functions (Rahu Kaal time-slice, moon-sign, natal-independent
 * gochar/ingress detection). No astronomy is re-implemented here.
 */

import { julianDay, julianCenturies, tropicalPositions, isRetrograde } from "../../calculate-kundli/astronomy.ts";
import { ayanamsa, toSidereal, nakshatraIndex, type AyanamsaKey } from "../../calculate-kundli/vedic.ts";
import { computeAbhijitMuhurta } from "../../calculate-kundli/muhurta_finder.ts";
import { computeDayPanchang } from "../dailyPanchang.ts";
import { weekdayOf, instantForLocalTime, addDaysISO } from "./time.ts";
import { RASHIS, relativeHouse, getReading, getAllReadings, type Locale, type RashifalReading } from "./rashifal.ts";

// Rahu Kaal position (1-based, of 8 equal daytime slices) by JS weekday 0=Sun…6=Sat.
// Ported from calculate-kundli/muhurta_finder.ts:173 (module-private there).
const RAHU_KALAM_POS: Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };

const NAKSHATRA_EN = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const NAKSHATRA_HI = [
  "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा",
  "मघा", "पूर्वा फाल्गुनी", "उत्तरा फाल्गुनी", "हस्त", "चित्रा", "स्वाति", "विशाखा", "अनुराधा",
  "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
  "पूर्वा भाद्रपद", "उत्तरा भाद्रपद", "रेवती",
];

// Hindi maps for the engine's EN tithi/yoga/karana strings (panchang HI copy).
const TITHI_HI: Record<string, string> = {
  Pratipada: "प्रतिपदा", Dwitiya: "द्वितीया", Tritiya: "तृतीया", Chaturthi: "चतुर्थी", Panchami: "पंचमी",
  Shashthi: "षष्ठी", Saptami: "सप्तमी", Ashtami: "अष्टमी", Navami: "नवमी", Dashami: "दशमी",
  Ekadashi: "एकादशी", Dwadashi: "द्वादशी", Trayodashi: "त्रयोदशी", Chaturdashi: "चतुर्दशी",
  Purnima: "पूर्णिमा", Amavasya: "अमावस्या",
};
const YOGA_HI: Record<string, string> = {
  Vishkambha: "विष्कम्भ", Priti: "प्रीति", Ayushman: "आयुष्मान", Saubhagya: "सौभाग्य", Shobhana: "शोभन",
  Atiganda: "अतिगण्ड", Sukarma: "सुकर्मा", Dhriti: "धृति", Shula: "शूल", Ganda: "गण्ड", Vriddhi: "वृद्धि",
  Dhruva: "ध्रुव", Vyaghata: "व्याघात", Harshana: "हर्षण", Vajra: "वज्र", Siddhi: "सिद्धि", Vyatipata: "व्यतीपात",
  Variyana: "वरीयान", Parigha: "परिघ", Shiva: "शिव", Siddha: "सिद्ध", Sadhya: "साध्य", Shubha: "शुभ",
  Shukla: "शुक्ल", Brahma: "ब्रह्म", Indra: "इन्द्र", Vaidhriti: "वैधृति",
};
const KARANA_HI: Record<string, string> = {
  Bava: "बव", Balava: "बालव", Kaulava: "कौलव", Taitila: "तैतिल", Garaja: "गरज", Vanija: "वणिज",
  Vishti: "विष्टि (भद्रा)", Shakuni: "शकुनि", Chatushpada: "चतुष्पाद", Naga: "नाग", Kimstughna: "किंस्तुघ्न",
};

/** Localize the engine's "Shukla Paksha Shashthi" → "शुक्ल षष्ठी". */
function tithiHi(en: string): string {
  const krishna = en.startsWith("Krishna");
  const name = en.replace(/^(Shukla|Krishna) Paksha\s+/, "");
  return `${krishna ? "कृष्ण" : "शुक्ल"} ${TITHI_HI[name] ?? name}`;
}

// Grahas tracked for gochar. EN key matches engine planet strings.
interface GrahaMeta { key: string; en: string; hi: string; ingress: boolean; station: boolean; major: boolean }
const GRAHAS: GrahaMeta[] = [
  { key: "sun",     en: "Sun",     hi: "सूर्य", ingress: true,  station: false, major: false },
  { key: "mars",    en: "Mars",    hi: "मंगल", ingress: true,  station: true,  major: false },
  { key: "mercury", en: "Mercury", hi: "बुध",  ingress: false, station: true,  major: false },
  { key: "venus",   en: "Venus",   hi: "शुक्र", ingress: false, station: true,  major: false },
  { key: "jupiter", en: "Jupiter", hi: "गुरु", ingress: true,  station: true,  major: true },
  { key: "saturn",  en: "Saturn",  hi: "शनि",  ingress: true,  station: true,  major: true },
  { key: "rahu",    en: "Rahu",    hi: "राहु", ingress: true,  station: false, major: true },
  { key: "ketu",    en: "Ketu",    hi: "केतु", ingress: true,  station: false, major: true },
];

const AYA: AyanamsaKey = "lahiri";

/**
 * Local sunrise/sunset (minutes from midnight) via the standard sunrise equation.
 *
 * NOT the engine's astronomy.ts:sunriseSunset — that one takes Meeus west-positive
 * longitude (`+ lon/360`) while the app stores east-positive lon, so it mis-times
 * by ~2·lon/15 hours and wraps past midnight. Here longitude is east-positive
 * (lonWest = -lon), and the result is converted to the local clock via tzOffset —
 * giving a correct daytime span for the Rahu Kaal / Abhijit slices.
 */
function localSunriseSunset(dateISO: string, lat: number, lon: number, tzOffsetHours: number): { sunriseMin: number; sunsetMin: number; dayLenMin: number } {
  const D = Math.PI / 180;
  const [y, m, d] = dateISO.split("-").map(Number);
  const jdNoon = julianDay(y, m, d, 12 - tzOffsetHours, 0, 0);
  const lonWest = -lon;
  const Jstar = 2451545.0 + 0.0009 + lonWest / 360 + Math.round(jdNoon - 2451545.0);
  const M = (((357.5291 + 0.98560028 * (Jstar - 2451545.0)) % 360) + 360) % 360;
  const C = 1.9148 * Math.sin(M * D) + 0.02 * Math.sin(2 * M * D) + 0.0003 * Math.sin(3 * M * D);
  const lambda = (((M + C + 180 + 102.9372) % 360) + 360) % 360;
  const Jtransit = Jstar + 0.0053 * Math.sin(M * D) - 0.0069 * Math.sin(2 * lambda * D);
  const sinDecl = Math.sin(lambda * D) * Math.sin(23.44 * D);
  const decl = Math.asin(sinDecl);
  const cosw = (Math.sin(-0.833 * D) - Math.sin(lat * D) * sinDecl) / (Math.cos(lat * D) * Math.cos(decl));
  const w0 = Math.acos(Math.max(-1, Math.min(1, cosw))) / D; // degrees
  const toLocalMin = (J: number) => {
    const utFrac = (((J + 0.5) % 1) + 1) % 1;
    let min = utFrac * 1440 + tzOffsetHours * 60;
    min = ((min % 1440) + 1440) % 1440;
    return min;
  };
  const sunriseMin = toLocalMin(Jtransit - w0 / 360);
  const sunsetMin = toLocalMin(Jtransit + w0 / 360);
  let dayLenMin = sunsetMin - sunriseMin;
  if (dayLenMin < 0) dayLenMin += 1440;
  return { sunriseMin, sunsetMin, dayLenMin };
}

/** Sidereal longitude (0-360) of every tracked graha at local noon of dateISO. */
function siderealAtNoon(dateISO: string, lat: number, lon: number, tzOffsetHours: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const jd = julianDay(y, m, d, 12 - tzOffsetHours, 0, 0);
  const T = julianCenturies(jd);
  const trop = tropicalPositions(jd, lat, lon, "mean");
  const aya = ayanamsa(AYA, jd);
  const sid: Record<string, number> = {};
  const tropMap = trop as unknown as Record<string, number>;
  for (const g of GRAHAS) sid[g.key] = toSidereal(tropMap[g.key], aya);
  const moonSid = toSidereal(trop.moon, aya);
  const sunSid = toSidereal(trop.sun, aya);
  return { jd, T, sid, moonSid, sunSid };
}

export interface PanchangBundle {
  dateISO: string;
  tithi: string;
  tithiHi: string;
  vara: string;
  nakshatra: string;
  nakshatraHi: string;
  yoga: string;
  yogaHi: string;
  karana: string;
  karanaHi: string;
  sunrise: string;
  sunset: string;
  rahuKaal: { start: string; end: string };
  abhijit: { start: string; end: string; active: boolean };
  moonRashiIndex: number;
  sunRashiIndex: number;
}

/** Today's Panchang for a place, enriched with Rahu Kaal + Abhijit + moon-sign. */
export function getPanchang(dateISO: string, lat: number, lon: number, tzOffsetHours: number): PanchangBundle {
  const p = computeDayPanchang(dateISO, lat, lon, tzOffsetHours, AYA);
  const { moonSid, sunSid } = siderealAtNoon(dateISO, lat, lon, tzOffsetHours);
  const weekday = weekdayOf(dateISO);

  // Use the corrected local sunrise/sunset (the engine's wraps past midnight here).
  const { sunriseMin: sr, sunsetMin: ss, dayLenMin } = localSunriseSunset(dateISO, lat, lon, tzOffsetHours);
  const slice = dayLenMin / 8;
  const rahuPos = RAHU_KALAM_POS[weekday] ?? 1;
  const rahuStart = sr + slice * (rahuPos - 1);
  const rahu = { start: minToHHMM(rahuStart), end: minToHHMM(rahuStart + slice) };

  const ab = computeAbhijitMuhurta(sr, sr + dayLenMin, weekday);
  const nakIdx = nakshatraIndex(moonSid);

  return {
    dateISO,
    tithi: p.tithi,
    tithiHi: tithiHi(p.tithi),
    vara: p.vara,
    nakshatra: NAKSHATRA_EN[nakIdx] ?? p.nakshatra,
    nakshatraHi: NAKSHATRA_HI[nakIdx] ?? p.nakshatra,
    yoga: p.yoga,
    yogaHi: YOGA_HI[p.yoga] ?? p.yoga,
    karana: p.karana,
    karanaHi: KARANA_HI[p.karana] ?? p.karana,
    sunrise: minToHHMM(sr),
    sunset: minToHHMM(ss),
    rahuKaal: rahu,
    abhijit: { start: minToHHMM(ab.startMin), end: minToHHMM(ab.endMin), active: ab.active },
    moonRashiIndex: Math.floor(((moonSid % 360) + 360) % 360 / 30),
    sunRashiIndex: Math.floor(((sunSid % 360) + 360) % 360 / 30),
  };
}

function minToHHMM(min: number): string {
  let t = Math.round(min);
  t = ((t % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** One rashi's daily reading (Chandra gochar) for the given date. */
export function getRashifal(dateISO: string, lat: number, lon: number, tzOffsetHours: number, rashiIndex: number, locale: Locale): RashifalReading {
  const { moonRashiIndex } = getPanchang(dateISO, lat, lon, tzOffsetHours);
  return getReading("daily", rashiIndex, moonRashiIndex, locale);
}

/** All 12 rashis' daily readings (for the Mon/Fri thread). */
export function getAllRashifal(dateISO: string, lat: number, lon: number, tzOffsetHours: number, locale: Locale): RashifalReading[] {
  const { moonRashiIndex } = getPanchang(dateISO, lat, lon, tzOffsetHours);
  return getAllReadings("daily", moonRashiIndex, locale);
}

export interface TransitEvent {
  graha: string;       // EN name (display)
  grahaHi: string;
  grahaKey: string;    // engine key
  type: "ingress" | "retro" | "direct";
  fromSign: number;    // 0-based; -1 if n/a
  toSign: number;      // 0-based
  major: boolean;      // drives rashi_effect / proof_flex
  dateISO: string;     // day the event is observed
  exactAtISO: string;  // scheduled instant (07:00 IST that day)
}

/**
 * Natal-independent gochar detection over [fromISO, toISO] (inclusive), sampled
 * once per day at local noon. Emits sign ingresses (all tracked grahas) and
 * retrograde/direct stations (mercury…saturn). Day-granularity is sufficient —
 * events are scheduled at 07:00 local time, per spec.
 */
export function detectTransits(fromISO: string, toISO: string, lat: number, lon: number, tzOffsetHours: number, tz: string): TransitEvent[] {
  const events: TransitEvent[] = [];
  let prev: { sign: Record<string, number>; retro: Record<string, boolean> } | null = null;

  for (let day = fromISO; day <= toISO; day = addDaysISO(day, 1)) {
    const { T, sid } = siderealAtNoon(day, lat, lon, tzOffsetHours);
    const sign: Record<string, number> = {};
    const retro: Record<string, boolean> = {};
    for (const g of GRAHAS) {
      sign[g.key] = Math.floor((((sid[g.key] % 360) + 360) % 360) / 30);
      retro[g.key] = g.station ? isRetrograde(g.key, T) : false;
    }

    if (prev) {
      for (const g of GRAHAS) {
        const exactAtISO = instantForLocalTime(day, 7, 0, tz).toISOString();
        if (g.ingress && sign[g.key] !== prev.sign[g.key]) {
          events.push({ graha: g.en, grahaHi: g.hi, grahaKey: g.key, type: "ingress", fromSign: prev.sign[g.key], toSign: sign[g.key], major: g.major, dateISO: day, exactAtISO });
        }
        if (g.station && retro[g.key] !== prev.retro[g.key]) {
          events.push({ graha: g.en, grahaHi: g.hi, grahaKey: g.key, type: retro[g.key] ? "retro" : "direct", fromSign: sign[g.key], toSign: sign[g.key], major: g.major, dateISO: day, exactAtISO });
        }
      }
    }
    prev = { sign, retro };
  }
  return events;
}

// ── Rashi-effect: which bhava the transiting graha occupies from each Moon sign,
//    plus the classical gochar result of a SLOW planet in that bhava (paraphrased
//    from BPHS / Phaladeepika / Saravali gochar). Generic across slow grahas. ──
interface BhavaEffect { en: string; hi: string }
const SLOW_TRANSIT_EFFECTS: Record<number, BhavaEffect> = {
  1: { en: "1st house — body, mood, fresh starts; pace yourself and guard health.", hi: "प्रथम भाव — शरीर, मन व नई शुरुआत; गति संयमित रखें, स्वास्थ्य का ध्यान दें।" },
  2: { en: "2nd house — wealth, speech, family; consolidate finances, speak with care.", hi: "द्वितीय भाव — धन, वाणी, परिवार; संचय करें, सोच-समझकर बोलें।" },
  3: { en: "3rd house — courage, effort, siblings; a supportive transit, push forward.", hi: "तृतीय भाव — साहस, पराक्रम, भाई-बहन; अनुकूल गोचर, आगे बढ़ें।" },
  4: { en: "4th house — home, mother, peace of mind; tend domestic matters patiently.", hi: "चतुर्थ भाव — घर, माता, मानसिक शांति; घरेलू मामलों में धैर्य रखें।" },
  5: { en: "5th house — children, learning, romance; steady effort over speculation.", hi: "पंचम भाव — संतान, विद्या, प्रेम; सट्टे से दूर रहकर स्थिर प्रयास करें।" },
  6: { en: "6th house — rivals, debts, health routines; a strong transit to overcome obstacles.", hi: "षष्ठ भाव — शत्रु, ऋण, स्वास्थ्य; बाधाओं पर विजय का बलवान गोचर।" },
  7: { en: "7th house — partner, marriage, deals; practise patience in relationships.", hi: "सप्तम भाव — जीवनसाथी, विवाह, सौदे; संबंधों में धैर्य बरतें।" },
  8: { en: "8th house — change, health, hidden matters; caution and rest serve best.", hi: "अष्टम भाव — परिवर्तन, स्वास्थ्य, गुप्त विषय; सावधानी व विश्राम हितकर।" },
  9: { en: "9th house — fortune, dharma, mentors; faith and learning are favoured.", hi: "नवम भाव — भाग्य, धर्म, गुरु; आस्था व अध्ययन शुभ रहेंगे।" },
  10: { en: "10th house — career, status, action; decisive steps lift your standing.", hi: "दशम भाव — करियर, प्रतिष्ठा, कर्म; निर्णायक कदम स्थिति सुधारेंगे।" },
  11: { en: "11th house — gains, income, networks; one of the best transits for growth.", hi: "एकादश भाव — लाभ, आय, संपर्क; वृद्धि के लिए श्रेष्ठ गोचर।" },
  12: { en: "12th house — expenses, travel, letting-go; conserve energy and funds.", hi: "द्वादश भाव — व्यय, यात्रा, त्याग; ऊर्जा व धन की बचत करें।" },
};

export interface RashiEffect {
  rashi: typeof RASHIS[number];
  bhava: number;
  text: string;
}

/** Effect of a transit on one Moon sign: bhava-from-Moon + paraphrased gochar phala. */
export function getRashiEffect(toSign: number, rashiIndex: number, locale: Locale): RashiEffect {
  const bhava = relativeHouse(rashiIndex, toSign);
  const e = SLOW_TRANSIT_EFFECTS[bhava];
  return { rashi: RASHIS[rashiIndex], bhava, text: locale === "hi" ? e.hi : e.en };
}

export function getAllRashiEffects(toSign: number, locale: Locale): RashiEffect[] {
  return RASHIS.map((r) => getRashiEffect(toSign, r.index, locale));
}

export { RASHIS };
export type { Locale, RashifalReading };
