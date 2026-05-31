/**
 * Vimshottari Dasha calculation.
 */

import { VIMSHOTTARI_SEQUENCE, VIMSHOTTARI_TOTAL } from "./constants.ts";
import { nakshatraIndex } from "./vedic.ts";

export interface DashaPeriod {
  // Only three levels are computed today: Maha → Antar → Pratyantar.
  // (Sookshma/Prana are not produced by buildVimshottari.)
  level: 'maha' | 'antar' | 'pratyantar';
  planet: string;
  startDate: string;
  endDate: string;
  durationYears: number;
  children?: DashaPeriod[];
}

export interface DashaSystem {
  system: string;
  currentMahaDasha: DashaPeriod;
  timeline: DashaPeriod[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addYears(d: Date, years: number): Date {
  const ms = years * 365.25 * 24 * 3600 * 1000;
  return new Date(d.getTime() + ms);
}

/** Reorder the Vimshottari sequence starting from a given lord. */
function reorder(startLord: string): Array<[string, number]> {
  const idx = VIMSHOTTARI_SEQUENCE.findIndex(([p]) => p.toLowerCase() === startLord.toLowerCase());
  if (idx === -1) return [...VIMSHOTTARI_SEQUENCE];
  return [...VIMSHOTTARI_SEQUENCE.slice(idx), ...VIMSHOTTARI_SEQUENCE.slice(0, idx)];
}

// ─── Nakshatra lord → dasha balance ─────────────────────────────────────────

const NAKSHATRA_LORDS_CYCLE = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

function nakshatraLordName(nIdx: number): string {
  return NAKSHATRA_LORDS_CYCLE[nIdx % 9];
}

// ─── Build Vimshottari Dasha ────────────────────────────────────────────────

export function buildVimshottari(
  moonSiderealLon: number,
  birthDate: Date,
): DashaSystem {
  const nIdx = nakshatraIndex(moonSiderealLon);
  const lordName = nakshatraLordName(nIdx);

  // Fraction of nakshatra already elapsed at birth → balance of first dasha
  const nakSpan = 360 / 27;
  const posInNak = moonSiderealLon % nakSpan;
  const fractionRemaining = 1 - posInNak / nakSpan;

  const seq = reorder(lordName);
  const firstYears = seq[0][1] * fractionRemaining;

  // Build Maha-dasha timeline
  let cursor = new Date(birthDate);
  const timeline: DashaPeriod[] = [];

  for (let i = 0; i < seq.length; i++) {
    const [planet, fullYears] = seq[i];
    const years = i === 0 ? firstYears : fullYears;
    const start = new Date(cursor);
    const end = addYears(start, years);
    timeline.push({
      level: 'maha',
      planet,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: years,
    });
    cursor = end;
  }

  // Extend timeline to cover 120 years (wrap around)
  while (timeline.length < 12) {
    for (const [planet, fullYears] of seq) {
      const start = new Date(cursor);
      const end = addYears(start, fullYears);
      timeline.push({
        level: 'maha',
        planet,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationYears: fullYears,
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
  const cStart = new Date(current.startDate).getTime();
  const cDur = current.durationYears;
  const antarSeq = reorder(current.planet);
  let antarCursor = cStart;

  current.children = antarSeq.map(([ap, aYears]) => {
    const antarDur = cDur * aYears / VIMSHOTTARI_TOTAL;
    const antarStart = antarCursor;
    const antarEnd = antarStart + antarDur * 365.25 * 24 * 3600 * 1000;
    antarCursor = antarEnd;

    // Pratyantar inside antar
    const pratSeq = reorder(ap);
    let pratCursor = antarStart;
    const pratChildren: DashaPeriod[] = pratSeq.map(([pp, pYears]) => {
      const pratDur = antarDur * pYears / VIMSHOTTARI_TOTAL;
      const pratStart = pratCursor;
      const pratEnd = pratStart + pratDur * 365.25 * 24 * 3600 * 1000;
      pratCursor = pratEnd;
      return {
        level: 'pratyantar' as const,
        planet: pp,
        startDate: new Date(pratStart).toISOString(),
        endDate: new Date(pratEnd).toISOString(),
        durationYears: pratDur,
      };
    });

    return {
      level: 'antar' as const,
      planet: ap,
      startDate: new Date(antarStart).toISOString(),
      endDate: new Date(antarEnd).toISOString(),
      durationYears: antarDur,
      children: pratChildren,
    };
  });

  return { system: 'vimshottari', currentMahaDasha: current, timeline };
}
