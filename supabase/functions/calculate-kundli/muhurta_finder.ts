/**
 * Muhurta Finder engine — scores days in a date range for a given activity.
 *
 * Computes Tithi / Nakshatra / Vara / Karana for each day at sunrise,
 * then applies the data-driven rules from muhurta_rules.ts.
 *
 * Also exports computeAbhijitMuhurta (the 8th of 15 daytime muhurtas).
 */

import { julianDay, julianCenturies, norm360 } from "./astronomy.ts";
import { vsop87SunLongitude } from "./vsop87.ts";
import { elp82MoonLongitude } from "./elp82.ts";
import { ayanamsa, toSidereal } from "./vedic.ts";
import { nakshatraIndex } from "./vedic.ts";
import {
  TITHI_NAMES, NAKSHATRA_NAMES, PANCHANG_YOGA_NAMES,
  KARANA_NAMES, WEEKDAYS,
} from "./constants.ts";
import { type ActivityRule, ACTIVITY_RULES, getActivityRule } from "./muhurta_rules.ts";

// ── Abhijit Muhurta ─────────────────────────────────────────────────

/**
 * Compute the Abhijit Muhurta window (the 8th of 15 equal daytime muhurtas).
 *
 * Classical definition: divide daytime (sunrise → sunset) into 15 equal parts;
 * the 8th part (index 7) is Abhijit — the "victorious" muhurta centred on
 * solar noon. On Wednesday (Budhavara), Abhijit is not considered auspicious.
 *
 * @param sunriseMin  sunrise in minutes from midnight
 * @param sunsetMin   sunset in minutes from midnight
 * @param weekday     JS weekday (0=Sun … 6=Sat); 3=Wednesday → skip
 * @returns  { startMin, endMin, active } or null if Wednesday
 */
export function computeAbhijitMuhurta(
  sunriseMin: number,
  sunsetMin: number,
  weekday: number,
): { startMin: number; endMin: number; active: boolean } {
  const dayLen = sunsetMin - sunriseMin;
  const muhurtaLen = dayLen / 15;
  const startMin = sunriseMin + 7 * muhurtaLen; // 8th muhurta (0-indexed: 7)
  const endMin = startMin + muhurtaLen;
  return { startMin, endMin, active: weekday !== 3 };
}

// ── Lightweight panchang for a single day ───────────────────────────

export interface DayPanchang {
  date: string;             // YYYY-MM-DD
  tithi: string;            // full e.g. "Shukla Panchami"
  tithiIndex: number;       // 0–29
  nakshatra: string;        // e.g. "Rohini"
  nakshatraIndex: number;   // 0–26
  vara: string;             // e.g. "Ravivara (Sunday)"
  varaIndex: number;        // JS weekday 0–6
  yoga: string;             // panchang yoga name
  karana: string;           // karana name
  sunriseMin: number;       // minutes from midnight (local)
  sunsetMin: number;        // minutes from midnight (local)
}

/**
 * Compute a lightweight panchang for a given date + location.
 * Uses noon (local time) for planetary positions (standard panchang convention).
 */
export function computeDayPanchang(
  dateStr: string,
  lat: number,
  lon: number,
  tzOffsetHours: number,
): DayPanchang {
  const [y, m, d] = dateStr.split('-').map(Number);

  // JD at noon local time (converted to UT)
  const jdNoonLocal = julianDay(y, m, d, 12 - tzOffsetHours, 0, 0);
  const T = julianCenturies(jdNoonLocal);

  // Sun tropical longitude (vsop87 takes JD, not T)
  const sunTrop = vsop87SunLongitude(jdNoonLocal);
  // Moon tropical longitude (elp82 takes T)
  const moonTrop = elp82MoonLongitude(T);
  // Moon sidereal
  const aya = ayanamsa('lahiri', jdNoonLocal);
  const moonSid = toSidereal(moonTrop, aya);

  // Tithi
  const elong = norm360(moonTrop - sunTrop);
  const tithiIdx = Math.floor(elong / 12);
  const paksha = tithiIdx < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
  const tithiFull = `${paksha} ${TITHI_NAMES[tithiIdx % 30]}`;

  // Vara (weekday) — use Date for reliable civil-date weekday
  const jsDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = jsDate.getUTCDay(); // 0=Sun … 6=Sat — matches WEEKDAYS
  const vara = WEEKDAYS[dayOfWeek];

  // Nakshatra
  const nIdx = nakshatraIndex(moonSid);
  const nak = NAKSHATRA_NAMES[nIdx];

  // Yoga
  const yogaAngle = norm360(sunTrop + moonTrop);
  const yogaIdx = Math.floor(yogaAngle / (360 / 27));
  const yoga = PANCHANG_YOGA_NAMES[yogaIdx % 27];

  // Karana
  const karanaIdx = Math.floor(elong / 6);
  let karana: string;
  if (karanaIdx === 0) karana = 'Kimstughna';
  else if (karanaIdx >= 57) {
    const fixed = ['Shakuni', 'Chatushpada', 'Naga'];
    karana = fixed[karanaIdx - 57] ?? 'Kimstughna';
  } else {
    karana = KARANA_NAMES[(karanaIdx - 1) % 7];
  }

  // Sunrise / sunset — compute in UT then convert to local civil time.
  // Uses the same NOAA simplified algorithm as astronomy.ts sunriseSunset,
  // but converts the result to local-minute-of-day via the tz offset.
  const RAD = Math.PI / 180;
  const jdNoonUT = julianDay(y, m, d, 12, 0, 0); // noon UT
  const Tsr = julianCenturies(jdNoonUT);
  const Msr = norm360(357.5291 + 35999.0503 * Tsr);
  const Csr = 1.9148 * Math.sin(RAD * Msr) + 0.02 * Math.sin(RAD * 2 * Msr) + 0.0003 * Math.sin(RAD * 3 * Msr);
  const lambdaSr = norm360(Msr + Csr + 180 + 102.9372);
  const declSr = Math.asin(Math.sin(RAD * 23.44) * Math.sin(RAD * lambdaSr)) / RAD;
  const cosHsr = (Math.sin(RAD * -0.833) - Math.sin(RAD * lat) * Math.sin(RAD * declSr))
               / (Math.cos(RAD * lat) * Math.cos(RAD * declSr));
  const Hsr = Math.acos(Math.max(-1, Math.min(1, cosHsr))) / RAD;

  const n = Math.round(jdNoonUT - 2451545.0009 + lon / 360);
  const Jstar = 2451545.0009 + n - lon / 360;
  const Jtransit = Jstar + 0.0053 * Math.sin(RAD * Msr) - 0.0069 * Math.sin(RAD * 2 * lambdaSr);
  const Jrise = Jtransit - Hsr / 360;
  const Jset  = Jtransit + Hsr / 360;

  const jdToLocalMin = (j: number) => {
    // Extract UT hour fraction and convert to local civil minutes
    const utFrac = (j + 0.5) % 1;
    const utMin = utFrac * 1440;
    return Math.round(utMin + tzOffsetHours * 60);
  };
  const sunriseMin = jdToLocalMin(Jrise);
  const sunsetMin = jdToLocalMin(Jset);

  return {
    date: dateStr,
    tithi: tithiFull,
    tithiIndex: tithiIdx,
    nakshatra: nak,
    nakshatraIndex: nIdx,
    vara,
    varaIndex: dayOfWeek,
    yoga,
    karana,
    sunriseMin,
    sunsetMin,
  };
}

// ── Scoring engine ──────────────────────────────────────────────────

export interface DayScore {
  date: string;
  panchang: DayPanchang;
  score: number;           // higher is better; range roughly −20 to +20
  reasons: string[];       // human-readable rule citations
  abhijit: { startMin: number; endMin: number; active: boolean } | null;
}

/** Position constants for inauspicious periods (1-based, of 8 daytime slices). */
const RAHU_KALAM_POS: Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
const GULIKA_KALAM_POS: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

/**
 * Score a single day against an activity rule set.
 */
export function scoreDay(panchang: DayPanchang, rule: ActivityRule): DayScore {
  let score = 0;
  const reasons: string[] = [];

  // Strip "Shukla Paksha " / "Krishna Paksha " prefix for matching
  const tithiForMatch = panchang.tithi
    .replace('Shukla Paksha ', 'Shukla ')
    .replace('Krishna Paksha ', 'Krishna ');

  // Tithi scoring
  if (rule.favourTithis.includes(tithiForMatch)) {
    score += 4;
    reasons.push(`Favourable tithi: ${panchang.tithi}`);
  } else if (rule.avoidTithis.includes(tithiForMatch)) {
    score -= 4;
    reasons.push(`Avoid tithi: ${panchang.tithi}`);
  }

  // Nakshatra scoring
  if (rule.favourNakshatras.includes(panchang.nakshatra)) {
    score += 4;
    reasons.push(`Favourable nakshatra: ${panchang.nakshatra}`);
  } else if (rule.avoidNakshatras.includes(panchang.nakshatra)) {
    score -= 4;
    reasons.push(`Avoid nakshatra: ${panchang.nakshatra}`);
  }

  // Vara scoring
  if (rule.favourVaras.includes(panchang.varaIndex)) {
    score += 3;
    reasons.push(`Favourable vara: ${panchang.vara}`);
  } else if (rule.avoidVaras.includes(panchang.varaIndex)) {
    score -= 3;
    reasons.push(`Avoid vara: ${panchang.vara}`);
  }

  // Karana scoring
  if (rule.avoidKaranas.includes(panchang.karana)) {
    score -= 3;
    reasons.push(`Bhadra/Vishti karana: ${panchang.karana} — avoid`);
  }

  // Abhijit muhurta bonus (not Wednesday)
  const abhijit = computeAbhijitMuhurta(
    panchang.sunriseMin, panchang.sunsetMin, panchang.varaIndex,
  );
  if (abhijit.active) {
    score += 1;
    reasons.push('Abhijit Muhurta available (not Wednesday)');
  }

  // Rahu Kaal / Gulika overlap with prime daytime is already implicit
  // in the daily view — we note it as a minor negative for awareness
  const daySlice = (panchang.sunsetMin - panchang.sunriseMin) / 8;
  const rahuPos = RAHU_KALAM_POS[panchang.varaIndex] ?? 1;
  const gulikaPos = GULIKA_KALAM_POS[panchang.varaIndex] ?? 1;
  // If Rahu Kalam falls in the middle of the day (positions 4-5), add a note
  if (rahuPos >= 4 && rahuPos <= 5) {
    score -= 1;
    reasons.push('Rahu Kalam falls mid-day — plan around it');
  }

  return {
    date: panchang.date,
    panchang,
    score,
    reasons,
    abhijit: abhijit.active ? abhijit : null,
  };
}

// ── Date range finder ───────────────────────────────────────────────

function dateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export interface FinderResult {
  activity: ActivityRule;
  scored: DayScore[];       // sorted best-first
}

/**
 * Find auspicious days in [startDate, endDate] for a given activity.
 * Returns scored days sorted descending by score.
 */
export function findAuspiciousDays(
  activityKey: string,
  startDate: string,
  endDate: string,
  lat: number,
  lon: number,
  tzOffsetHours: number,
): FinderResult {
  const rule = getActivityRule(activityKey);
  if (!rule) throw new Error(`Unknown activity: ${activityKey}`);

  const dates = dateRange(startDate, endDate);
  const scored: DayScore[] = dates.map((dateStr) => {
    const panchang = computeDayPanchang(dateStr, lat, lon, tzOffsetHours);
    return scoreDay(panchang, rule);
  });

  // Sort descending by score, then by date
  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));

  return { activity: rule, scored };
}
