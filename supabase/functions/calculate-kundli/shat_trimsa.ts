/**
 * Shat-trimsa-sama Dasha — 36-year conditional Vimshottari variant.
 *
 * Applicability condition: Sun is in Lagna (1st house) OR Sun is the
 * Atmakaraka and occupies a kendra (1/4/7/10) from Lagna.
 *
 * Cycle: 36 years total, 7 mahadasha lords.
 * Duration per lord: 36/7 ≈ 5.142857 years each.
 * Order: Sun → Moon → Mars → Mercury → Jupiter → Venus → Saturn.
 *
 * Balance at birth computed from Moon's nakshatra position, same as
 * standard Vimshottari — the starting lord is the nakshatra lord of
 * the Moon, and the balance is the fraction of nakshatra remaining.
 *
 * Cite: BPHS Ch. 47 (Conditional Nakshatra Dashas).
 */

import { nakshatraIndex } from "./vedic.ts";
import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const SHAT_TRIMSA_YEARS = 36;
const LORD_YEARS = SHAT_TRIMSA_YEARS / 7; // ~5.142857

const SHAT_TRIMSA_SEQUENCE: Array<[string, number]> = [
  ['Sun', LORD_YEARS], ['Moon', LORD_YEARS], ['Mars', LORD_YEARS],
  ['Mercury', LORD_YEARS], ['Jupiter', LORD_YEARS], ['Venus', LORD_YEARS],
  ['Saturn', LORD_YEARS],
];

const NAKSHATRA_LORDS_CYCLE = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function addYears(d: Date, years: number): Date {
  return new Date(d.getTime() + years * 365.25 * 24 * 3600 * 1000);
}

function nakshatraLordName(nIdx: number): string {
  return NAKSHATRA_LORDS_CYCLE[nIdx % 9];
}

/** Reorder the Shat-trimsa sequence starting from a given lord. */
function reorder(startLord: string): Array<[string, number]> {
  const idx = SHAT_TRIMSA_SEQUENCE.findIndex(
    ([p]) => p.toLowerCase() === startLord.toLowerCase(),
  );
  if (idx === -1) return [...SHAT_TRIMSA_SEQUENCE];
  return [...SHAT_TRIMSA_SEQUENCE.slice(idx), ...SHAT_TRIMSA_SEQUENCE.slice(0, idx)];
}

// ─── Applicability check ────────────────────────────────────────────────────

/**
 * Check if Shat-trimsa-sama Dasha is applicable.
 * Condition: Sun is in the 1st house (Lagna) OR
 *            Sun is the Atmakaraka AND occupies a kendra (1/4/7/10) from Lagna.
 */
function isShatTrimsaApplicable(
  d1Planets: PlanetPos[],
  atmakarakaPlanet: string,
): boolean {
  const sun = d1Planets.find(p => p.planet === 'sun');
  if (!sun) return false;

  // Condition 1: Sun in Lagna (1st house)
  if (sun.houseNumber === 1) return true;

  // Condition 2: Sun is AK and in kendra (1/4/7/10) from Lagna
  if (atmakarakaPlanet === 'sun' && [1, 4, 7, 10].includes(sun.houseNumber)) {
    return true;
  }

  return false;
}

// ─── Core: build Shat-trimsa-sama Dasha ─────────────────────────────────────

export function buildShatTrimsaDasha(
  d1Planets: PlanetPos[],
  _ascSign: number,
  moonSiderealLon: number,
  birthDate: Date,
  atmakarakaPlanet: string,
): DashaSystem | null {
  // Check applicability
  if (!isShatTrimsaApplicable(d1Planets, atmakarakaPlanet)) {
    return null;
  }

  const nIdx = nakshatraIndex(moonSiderealLon);
  const lordName = nakshatraLordName(nIdx);

  // Map the nakshatra lord to the Shat-trimsa sequence
  // Ketu and Rahu are not in this 7-planet sequence; use Sun as fallback
  const inSequence = SHAT_TRIMSA_SEQUENCE.some(
    ([p]) => p.toLowerCase() === lordName.toLowerCase(),
  );
  const startLord = inSequence ? lordName : 'Sun';

  // Balance: fraction of nakshatra remaining at birth
  const nakSpan = 360 / 27;
  const posInNak = moonSiderealLon % nakSpan;
  const fractionRemaining = 1 - posInNak / nakSpan;

  const seq = reorder(startLord);
  const firstYears = seq[0][1] * fractionRemaining;

  // Build Maha-dasha timeline
  let cursor = new Date(birthDate);
  const timeline: DashaPeriod[] = [];

  for (let i = 0; i < seq.length; i++) {
    const [planet, fullYears] = seq[i];
    const years = i === 0 ? firstYears : fullYears;
    const start = new Date(cursor);
    const end = addYears(start, years);

    // Antar dashas inside each maha
    const antarSeq = reorder(planet);
    let antarCursor = new Date(start);
    const children: DashaPeriod[] = antarSeq.map(([ap, _aYears]) => {
      const antarDur = years * LORD_YEARS / SHAT_TRIMSA_YEARS;
      const antarStart = new Date(antarCursor);
      const antarEnd = addYears(antarStart, antarDur);
      antarCursor = antarEnd;
      return {
        level: 'antar' as const,
        planet: ap,
        startDate: antarStart.toISOString(),
        endDate: antarEnd.toISOString(),
        durationYears: antarDur,
      };
    });

    timeline.push({
      level: 'maha',
      planet,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: years,
      children,
    });
    cursor = end;
  }

  // Extend to cover full cycle if needed
  while (timeline.length < 14) {
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

  // Current maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  return {
    system: 'shat_trimsa',
    currentMahaDasha: current,
    timeline,
  };
}
