/**
 * Yogini Dasha calculation (36-year cycle).
 *
 * 8 Yoginis, each ruled by a planet, with durations 1–8 yrs:
 *   Mangala (Moon, 1), Pingala (Sun, 2), Dhanya (Jupiter, 3),
 *   Bhramari (Mars, 4), Bhadrika (Mercury, 5), Ulka (Saturn, 6),
 *   Siddha (Venus, 7), Sankata (Rahu, 8).
 *
 * Seed: Moon's nakshatra, counted from Ashwini (1-based),
 * mapped to the Yogini lord via the standard nakshatra assignment.
 *
 * Validated against PyJHora v4.8.5 (Lahiri ayanamsa).
 */

import type { DashaPeriod, DashaSystem } from "./dashas.ts";

// ─── Yogini sequence ────────────────────────────────────────────────────────

export interface YoginiInfo {
  yogini: string;
  planet: string;
  years: number;
}

const YOGINI_SEQUENCE: YoginiInfo[] = [
  { yogini: 'Mangala',  planet: 'Moon',    years: 1 },
  { yogini: 'Pingala',  planet: 'Sun',     years: 2 },
  { yogini: 'Dhanya',   planet: 'Jupiter', years: 3 },
  { yogini: 'Bhramari', planet: 'Mars',    years: 4 },
  { yogini: 'Bhadrika', planet: 'Mercury', years: 5 },
  { yogini: 'Ulka',     planet: 'Saturn',  years: 6 },
  { yogini: 'Siddha',   planet: 'Venus',   years: 7 },
  { yogini: 'Sankata',  planet: 'Rahu',    years: 8 },
];

const YOGINI_TOTAL = 36; // sum of 1+2+...+8

/**
 * Nakshatra-to-Yogini mapping (PyJHora convention, seed_star=1).
 * Key = ((nak_0based - 1) % 27) + 1 i.e. 1-based offset from Bharani.
 * Each Yogini "owns" specific nakshatra offsets:
 *   Moon/Mangala:  [6,14,22]
 *   Sun/Pingala:   [7,15,23]
 *   Jupiter/Dhanya:[8,16,24]
 *   Mars/Bhramari: [1,9,17,25]
 *   Mercury/Bhadrika:[2,10,18,26]
 *   Saturn/Ulka:   [3,11,19,27]
 *   Venus/Siddha:  [4,12,20]
 *   Rahu/Sankata:  [5,13,21]
 */
const NAK_TO_YOGINI_IDX: Record<number, number> = {};
const YOGINI_NAK_GROUPS: number[][] = [
  [6, 14, 22],          // 0: Mangala (Moon)
  [7, 15, 23],          // 1: Pingala (Sun)
  [8, 16, 24],          // 2: Dhanya (Jupiter)
  [1, 9, 17, 25],       // 3: Bhramari (Mars)
  [2, 10, 18, 26],      // 4: Bhadrika (Mercury)
  [3, 11, 19, 27],      // 5: Ulka (Saturn)
  [4, 12, 20],          // 6: Siddha (Venus)
  [5, 13, 21],          // 7: Sankata (Rahu)
];
for (let yi = 0; yi < YOGINI_NAK_GROUPS.length; yi++) {
  for (const nk of YOGINI_NAK_GROUPS[yi]) {
    NAK_TO_YOGINI_IDX[nk] = yi;
  }
}

// ─── Sidereal year in days (matches PyJHora const.sidereal_year) ────────────
const SIDEREAL_YEAR_DAYS = 365.256364;

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}

function reorderYogini(startIdx: number): YoginiInfo[] {
  const out: YoginiInfo[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(YOGINI_SEQUENCE[(startIdx + i) % 8]);
  }
  return out;
}

// ─── Build Yogini Dasha ─────────────────────────────────────────────────────

export function buildYoginiDasha(
  moonSiderealLon: number,
  birthDate: Date,
): DashaSystem {
  const nakSpan = 360 / 27;
  const nakIdx = Math.floor(moonSiderealLon / nakSpan); // 0-based

  // PyJHora: nak = int(planet_long / one_star) → 0-based, passes nak+1 to _maha_dhasa
  // _maha_dhasa(nak_1, seed=1): offset = ((nak_1 - 1) % 27) + 1 = (nakIdx % 27) + 1
  const offset = nakIdx % 27 + 1;
  const yoginiIdx = NAK_TO_YOGINI_IDX[offset];
  const firstYogini = YOGINI_SEQUENCE[yoginiIdx];

  // Fraction of nakshatra elapsed → balance of first dasha
  const posInNak = moonSiderealLon - nakIdx * nakSpan;
  const fractionElapsed = posInNak / nakSpan;
  const periodElapsedDays = fractionElapsed * firstYogini.years * SIDEREAL_YEAR_DAYS;

  // Dasha start date = birth - elapsed portion
  const dashaStartDate = addDays(birthDate, -periodElapsedDays);

  // Build Maha dasha timeline (3 complete cycles = 24 entries)
  const seq = reorderYogini(yoginiIdx);
  let cursor = new Date(dashaStartDate);
  const timeline: DashaPeriod[] = [];

  for (let cycle = 0; cycle < 3; cycle++) {
    for (const yi of seq) {
      const durationDays = yi.years * SIDEREAL_YEAR_DAYS;
      const start = new Date(cursor);
      const end = addDays(start, durationDays);
      timeline.push({
        level: 'maha',
        planet: yi.planet,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationYears: yi.years,
      });
      cursor = end;
    }
  }

  // Find current Maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  // Build Antar dashas inside current Maha
  // In Yogini, each Maha has 8 equal-length antardashas
  const antarSeq = reorderYogini(YOGINI_SEQUENCE.findIndex(y => y.planet === current.planet));
  const antarDurDays = current.durationYears * SIDEREAL_YEAR_DAYS / 8;
  let antarCursor = new Date(current.startDate).getTime();

  current.children = antarSeq.map(yi => {
    const start = antarCursor;
    const end = start + antarDurDays * 24 * 3600 * 1000;
    antarCursor = end;
    return {
      level: 'antar' as const,
      planet: yi.planet,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      durationYears: current.durationYears / 8,
    };
  });

  return { system: 'yogini', currentMahaDasha: current, timeline };
}
