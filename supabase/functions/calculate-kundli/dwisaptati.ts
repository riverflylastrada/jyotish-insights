/**
 * Dwisaptati-sama Dasha — 72-year conditional Vimshottari variant.
 *
 * Applicability condition: Lagna lord in 7th house OR 7th lord in Lagna
 * (interchange between Lagna and 7th house lords).
 *
 * Cycle: 72 years total, 8 mahadasha lords each running 9 years.
 * Order: Sun → Moon → Mars → Mercury → Jupiter → Venus → Saturn → Rahu.
 *
 * Balance at birth computed from Moon's nakshatra position, same as
 * standard Vimshottari — the starting lord is the nakshatra lord of
 * the Moon, and the balance is the fraction of nakshatra remaining.
 *
 * Cite: BPHS Ch. 47 (Conditional Nakshatra Dashas).
 */

import { nakshatraIndex } from "./vedic.ts";
import { getSignLord } from "./vedic.ts";
import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const DWISAPTATI_SEQUENCE: Array<[string, number]> = [
  ['Sun', 9], ['Moon', 9], ['Mars', 9], ['Mercury', 9],
  ['Jupiter', 9], ['Venus', 9], ['Saturn', 9], ['Rahu', 9],
];

const DWISAPTATI_TOTAL = 72;

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

/** Reorder the Dwisaptati sequence starting from a given lord. */
function reorder(startLord: string): Array<[string, number]> {
  const idx = DWISAPTATI_SEQUENCE.findIndex(
    ([p]) => p.toLowerCase() === startLord.toLowerCase(),
  );
  if (idx === -1) return [...DWISAPTATI_SEQUENCE];
  return [...DWISAPTATI_SEQUENCE.slice(idx), ...DWISAPTATI_SEQUENCE.slice(0, idx)];
}

// ─── Applicability check ────────────────────────────────────────────────────

/**
 * Check if Dwisaptati-sama Dasha is applicable.
 * Condition: Lagna lord is in the 7th house OR 7th lord is in the 1st house.
 */
function isDwisaptatiApplicable(
  d1Planets: PlanetPos[],
  ascSign: number,
): boolean {
  const lagnaLord = getSignLord(ascSign);
  const seventhSign = ((ascSign - 1 + 6) % 12) + 1;
  const seventhLord = getSignLord(seventhSign);

  // Build planet → house lookup
  const planetHouse: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetHouse[p.planet] = p.houseNumber;
    }
  }

  // Lagna lord in 7th house
  if (planetHouse[lagnaLord] === 7) return true;

  // 7th lord in 1st house (Lagna)
  if (planetHouse[seventhLord] === 1) return true;

  return false;
}

// ─── Core: build Dwisaptati-sama Dasha ──────────────────────────────────────

export function buildDwisaptatiDasha(
  d1Planets: PlanetPos[],
  ascSign: number,
  moonSiderealLon: number,
  birthDate: Date,
): DashaSystem | null {
  // Check applicability
  if (!isDwisaptatiApplicable(d1Planets, ascSign)) {
    return null;
  }

  const nIdx = nakshatraIndex(moonSiderealLon);
  const lordName = nakshatraLordName(nIdx);

  // Map the nakshatra lord to the Dwisaptati sequence
  // If the nakshatra lord (e.g. Ketu) is not in the Dwisaptati sequence,
  // use Sun as default starting lord (Ketu is not in this dasha)
  const inSequence = DWISAPTATI_SEQUENCE.some(
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
      const antarDur = years * 9 / DWISAPTATI_TOTAL; // each antar = maha * (9/72)
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
  while (timeline.length < 16) {
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
    system: 'dwisaptati',
    currentMahaDasha: current,
    timeline,
  };
}
