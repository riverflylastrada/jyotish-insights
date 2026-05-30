/**
 * Drigdasa — aspect-based rasi dasha (Jaimini).
 *
 * The rasi sequence is determined by the aspects (rasi-drishtis) each sign
 * casts on / receives from the Atmakaraka's sign. Signs aspecting AK's sign
 * come first (ordered by aspect strength / zodiacal proximity), then the rest.
 *
 * Duration: same signs-to-lord Padakrama formula as Narayana — distance (in
 * signs) from the dasha rasi to its lord's placement, counted in the rasi's
 * natural direction. Lord-in-own-sign → 12.
 *
 * Cite: Jaimini Sutra Pada 4 + Sanjay Rath, "Jaimini Maharishi's Upadesa
 * Sutras."
 */

import { SIGN_NAMES } from "./constants.ts";
import { getSignLord } from "./vedic.ts";
import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const SIDEREAL_YEAR_DAYS = 365.242198781;

function isOddSign(sign: number): boolean {
  return sign % 2 === 1;
}

function addSiderealYears(base: Date, years: number): Date {
  return new Date(base.getTime() + years * SIDEREAL_YEAR_DAYS * 86_400_000);
}

// ─── Jaimini rasi drishti table (1-indexed) ─────────────────────────────────

const RASI_DRISHTI: Record<number, number[]> = {
  1: [5, 8, 11],   2: [4, 7, 10],   3: [6, 9, 12],
  4: [2, 8, 11],   5: [1, 7, 10],   6: [3, 9, 12],
  7: [2, 5, 11],   8: [1, 4, 10],   9: [3, 6, 12],
  10: [2, 5, 8],  11: [1, 4, 7],   12: [3, 6, 9],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function signDistance(from: number, to: number, zodiacal: boolean): number {
  if (from === to) return 1;
  if (zodiacal) {
    return ((to - from + 12) % 12) || 12;
  }
  return ((from - to + 12) % 12) || 12;
}

function computeDuration(
  sign: number,
  planetSign: Record<string, number>,
): number {
  const lord = getSignLord(sign);
  const lordSign = planetSign[lord];
  if (lordSign === undefined) return 1;

  if (lordSign === sign) return 12;

  const dir = isOddSign(sign);
  const years = signDistance(sign, lordSign, dir);
  return Math.max(1, Math.min(12, years));
}

// ─── Core: build Drigdasa ───────────────────────────────────────────────────

export function buildDrigdasa(
  d1Planets: PlanetPos[],
  ascSign: number,
  birthDate: Date,
  atmakarakaSign: number,
): DashaSystem {
  const planetSign: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
    }
  }

  const akSign = atmakarakaSign;

  // Signs aspecting AK's sign via rasi drishti
  const aspectingAk: number[] = [];
  const notAspectingAk: number[] = [];

  for (let s = 1; s <= 12; s++) {
    if (s === akSign) continue; // AK's own sign handled separately
    const aspects = RASI_DRISHTI[s] ?? [];
    if (aspects.includes(akSign)) {
      aspectingAk.push(s);
    } else {
      notAspectingAk.push(s);
    }
  }

  // Direction: odd AK sign → zodiacal ordering within groups, even → anti-zodiacal
  const zodiacal = isOddSign(akSign);

  // Sort groups by zodiacal distance from AK sign
  const sortByDistance = (signs: number[]) => {
    return signs.sort((a, b) => {
      const distA = zodiacal
        ? ((a - akSign + 12) % 12) || 12
        : ((akSign - a + 12) % 12) || 12;
      const distB = zodiacal
        ? ((b - akSign + 12) % 12) || 12
        : ((akSign - b + 12) % 12) || 12;
      return distA - distB;
    });
  };

  sortByDistance(aspectingAk);
  sortByDistance(notAspectingAk);

  // Full progression: AK sign first, then signs aspecting AK, then remaining
  const progression = [akSign, ...aspectingAk, ...notAspectingAk];

  // Compute durations (Padakrama formula)
  const durations = progression.map(sign => computeDuration(sign, planetSign));

  // Build timeline
  const timeline: DashaPeriod[] = [];
  let cursor = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const sign = progression[i];
    const years = durations[i];
    const start = new Date(cursor);
    const end = addSiderealYears(start, years);

    // Antar dashas: 12-sign sub-periods
    const antarDuration = years / 12;
    const children: DashaPeriod[] = [];
    let antarCursor = new Date(start);

    for (let j = 0; j < 12; j++) {
      const antarSign = zodiacal
        ? ((sign - 1 + j) % 12) + 1
        : ((sign - 1 - j + 120) % 12) + 1;
      const antarStart = new Date(antarCursor);
      const antarEnd = addSiderealYears(antarStart, antarDuration);

      children.push({
        level: 'antar',
        planet: SIGN_NAMES[(antarSign - 1) % 12],
        startDate: antarStart.toISOString(),
        endDate: antarEnd.toISOString(),
        durationYears: Math.round(antarDuration * 10000) / 10000,
      });

      antarCursor = antarEnd;
    }

    timeline.push({
      level: 'maha',
      planet: SIGN_NAMES[(sign - 1) % 12],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: years,
      children,
    });

    cursor = end;
  }

  // Current maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  return {
    system: 'drigdasa',
    currentMahaDasha: current,
    timeline,
  };
}
