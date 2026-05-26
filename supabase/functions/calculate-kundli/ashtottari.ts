/**
 * Ashtottari Dasha calculation (108-year cycle).
 *
 * 8 planets with durations totalling 108 years:
 *   Sun (6), Moon (15), Mars (8), Mercury (17),
 *   Saturn (10), Jupiter (19), Rahu (12), Venus (21).
 *
 * Nakshatra ranges (seed_star=6, default PyJHora):
 *   Sun:     nakshatras 6–9   (Ardra – Ashlesha)
 *   Moon:    nakshatras 10–12 (Magha – U.Phalguni)
 *   Mars:    nakshatras 13–16 (Hasta – Vishakha)
 *   Mercury: nakshatras 17–19 (Anuradha – Mula)
 *   Saturn:  nakshatras 20–22 (P.Ashadha – Shravana)
 *   Jupiter: nakshatras 23–25 (Dhanishtha – P.Bhadrapada)
 *   Rahu:    nakshatras 26–2  (U.Bhadrapada – Krittika, wraps)
 *   Venus:   nakshatras 3–5   (Rohini – Mrigashira)
 *
 * Validated against PyJHora v4.8.5 (Lahiri ayanamsa).
 */

import type { DashaPeriod, DashaSystem } from "./dashas.ts";

// ─── Ashtottari sequence ────────────────────────────────────────────────────

interface AshtottariLord {
  planet: string;
  years: number;
  nakStart: number; // 1-based nakshatra start
  nakEnd: number;   // 1-based nakshatra end (may wrap past 27)
}

const ASHTOTTARI_SEQUENCE: AshtottariLord[] = [
  { planet: 'Sun',     years: 6,  nakStart: 6,  nakEnd: 9 },
  { planet: 'Moon',    years: 15, nakStart: 10, nakEnd: 12 },
  { planet: 'Mars',    years: 8,  nakStart: 13, nakEnd: 16 },
  { planet: 'Mercury', years: 17, nakStart: 17, nakEnd: 19 },
  { planet: 'Saturn',  years: 10, nakStart: 20, nakEnd: 22 },
  { planet: 'Jupiter', years: 19, nakStart: 23, nakEnd: 25 },
  { planet: 'Rahu',    years: 12, nakStart: 26, nakEnd: 2 },  // wraps
  { planet: 'Venus',   years: 21, nakStart: 3,  nakEnd: 5 },
];

const ASHTOTTARI_TOTAL = 108;

// ─── Sidereal year in days (matches PyJHora const.sidereal_year) ────────────
const SIDEREAL_YEAR_DAYS = 365.256364;

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}

function nakSpanCount(start: number, end: number): number {
  if (end < start) return (end + 27) - start + 1;
  return end - start + 1;
}

function reorderAshtottari(startIdx: number): AshtottariLord[] {
  const out: AshtottariLord[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(ASHTOTTARI_SEQUENCE[(startIdx + i) % 8]);
  }
  return out;
}

/**
 * Find which Ashtottari lord owns the given 1-based nakshatra.
 * Returns the index into ASHTOTTARI_SEQUENCE.
 */
function findAshtottariLord(nak1: number): number {
  for (let i = 0; i < ASHTOTTARI_SEQUENCE.length; i++) {
    const { nakStart, nakEnd } = ASHTOTTARI_SEQUENCE[i];
    let n = nak1;
    let start = nakStart;
    let end = nakEnd;
    if (end < start) {
      end += 27;
      if (n < start) n += 27;
    }
    if (n >= start && n <= end) return i;
  }
  return 0;
}

// ─── Build Ashtottari Dasha ─────────────────────────────────────────────────

export function buildAshtottariDasha(
  moonSiderealLon: number,
  birthDate: Date,
): DashaSystem {
  const oneNak = 360 / 27;
  const nakIdx = Math.floor(moonSiderealLon / oneNak); // 0-based
  const nak1 = nakIdx + 1; // 1-based

  const lordIdx = findAshtottariLord(nak1);
  const lord = ASHTOTTARI_SEQUENCE[lordIdx];

  // Compute fraction elapsed within this lord's nakshatra range
  const startNakLon = (lord.nakStart - 1) * oneNak;
  const naks = nakSpanCount(lord.nakStart, lord.nakEnd);
  const rangeLon = naks * oneNak;
  let elapsed = moonSiderealLon - startNakLon;
  if (elapsed < 0) elapsed += 360;
  const fractionElapsed = elapsed / rangeLon;
  const periodElapsedDays = fractionElapsed * lord.years * SIDEREAL_YEAR_DAYS;

  // Dasha start = birth - elapsed
  const dashaStartDate = addDays(birthDate, -periodElapsedDays);

  // Build timeline (1 complete cycle = 8 entries; extend past 108 yrs)
  const seq = reorderAshtottari(lordIdx);
  let cursor = new Date(dashaStartDate);
  const timeline: DashaPeriod[] = [];

  for (const entry of seq) {
    const durationDays = entry.years * SIDEREAL_YEAR_DAYS;
    const start = new Date(cursor);
    const end = addDays(start, durationDays);
    timeline.push({
      level: 'maha',
      planet: entry.planet,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: entry.years,
    });
    cursor = end;
  }

  // Find current Maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  // Build Antar dashas inside current Maha
  // Proportional to each lord's years / 108
  const antarSeq = reorderAshtottari(
    ASHTOTTARI_SEQUENCE.findIndex(a => a.planet === current.planet),
  );
  let antarCursor = new Date(current.startDate).getTime();

  current.children = antarSeq.map(entry => {
    const antarYears = current.durationYears * entry.years / ASHTOTTARI_TOTAL;
    const antarDays = antarYears * SIDEREAL_YEAR_DAYS;
    const start = antarCursor;
    const end = start + antarDays * 24 * 3600 * 1000;
    antarCursor = end;
    return {
      level: 'antar' as const,
      planet: entry.planet,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      durationYears: antarYears,
    };
  });

  return { system: 'ashtottari', currentMahaDasha: current, timeline };
}
