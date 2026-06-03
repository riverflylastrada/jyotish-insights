/**
 * Client-side Muhurta Finder — scores days in a date range using the
 * data-driven rules from muhurtaRules.ts and lightweight panchang from panchangLite.ts.
 */

import {
  computeDayPanchang,
  computeAbhijitMuhurta,
  minutesToTime,
  type DayPanchang,
} from './panchangLite';
import { type ActivityRule, getActivityRule } from './muhurtaRules';

export interface DayScore {
  date: string;
  panchang: DayPanchang;
  score: number;
  reasons: string[];
  abhijit: { from: string; to: string } | null;
}

/**
 * Score a single day against an activity rule.
 */
export function scoreDay(panchang: DayPanchang, rule: ActivityRule): DayScore {
  let score = 0;
  const reasons: string[] = [];

  // Tithi
  if (rule.favourTithis.includes(panchang.tithiFull)) {
    score += 4;
    reasons.push(`Favourable tithi · शुभ तिथि: ${panchang.tithiFull}`);
  } else if (rule.avoidTithis.includes(panchang.tithiFull)) {
    score -= 4;
    reasons.push(`Avoid tithi · अशुभ तिथि: ${panchang.tithiFull}`);
  }

  // Nakshatra
  if (rule.favourNakshatras.includes(panchang.nakshatra)) {
    score += 4;
    reasons.push(`Favourable nakshatra · शुभ नक्षत्र: ${panchang.nakshatra} (${panchang.nakshatraHi})`);
  } else if (rule.avoidNakshatras.includes(panchang.nakshatra)) {
    score -= 4;
    reasons.push(`Avoid nakshatra · अशुभ नक्षत्र: ${panchang.nakshatra} (${panchang.nakshatraHi})`);
  }

  // Vara
  if (rule.favourVaras.includes(panchang.varaIndex)) {
    score += 3;
    reasons.push(`Favourable vara · शुभ वार: ${panchang.vara} (${panchang.varaHi})`);
  } else if (rule.avoidVaras.includes(panchang.varaIndex)) {
    score -= 3;
    reasons.push(`Avoid vara · अशुभ वार: ${panchang.vara} (${panchang.varaHi})`);
  }

  // Karana
  if (rule.avoidKaranas.includes(panchang.karana)) {
    score -= 3;
    reasons.push(`Bhadra (Vishti) karana · विष्टि करण — avoid`);
  }

  // Abhijit
  const abhijit = computeAbhijitMuhurta(
    panchang.sunriseMin, panchang.sunsetMin, panchang.varaIndex,
  );
  let abhijitDisplay: { from: string; to: string } | null = null;
  if (abhijit.active) {
    score += 1;
    abhijitDisplay = {
      from: minutesToTime(abhijit.startMin),
      to: minutesToTime(abhijit.endMin),
    };
    reasons.push(`Abhijit Muhurta · अभिजित मुहूर्त: ${abhijitDisplay.from}–${abhijitDisplay.to}`);
  }

  return { date: panchang.date, panchang, score, reasons, abhijit: abhijitDisplay };
}

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
  scored: DayScore[];
}

/**
 * Find auspicious days in [startDate, endDate] for a given activity key.
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
  const scored = dates.map((dateStr) => {
    const panchang = computeDayPanchang(dateStr, lat, lon, tzOffsetHours);
    return scoreDay(panchang, rule);
  });

  scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return { activity: rule, scored };
}
