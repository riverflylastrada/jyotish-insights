/**
 * Narayana (Padakrama) Dasha — Sanjay Rath method.
 *
 * Rasi-based maha-dasha starting from the Lagna sign.
 * Direction: ZODIACAL for odd signs, ANTI-ZODIACAL for even signs
 * (per Maharishi Jaimini).
 *
 * Duration: distance (in signs) from dasha rasi to its lord's placement,
 * counted in the rasi's natural direction. Lord-in-own-sign → 12.
 * Exception for the 7th sign from the starting sign is applied.
 *
 * Cite: Sanjay Rath, "Jaimini Maharishi's Upadesa Sutras" + Jaimini Sutra 2.3.
 */

import { SIGN_NAMES } from "./constants.ts";
import { getSignLord } from "./vedic.ts";
import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const SIDEREAL_YEAR_DAYS = 365.242198781;

/** Odd signs (1-indexed): Mesha, Mithuna, Simha, Tula, Dhanu, Kumbha. */
function isOddSign(sign: number): boolean {
  return sign % 2 === 1;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addSiderealYears(base: Date, years: number): Date {
  return new Date(base.getTime() + years * SIDEREAL_YEAR_DAYS * 86_400_000);
}

/**
 * Narayana sign lord — standard Parashari lords.
 * Scorpio→Mars, Aquarius→Saturn, Pisces→Jupiter (no Rahu/Ketu).
 */
function narayanaLord(sign: number): string {
  return getSignLord(sign);
}

/**
 * Count the distance in signs from `from` to `to`, in the given direction.
 * zodiacal=true → count forward (1→2→3…); zodiacal=false → count backward (1→12→11…).
 * Returns 1..12 (both endpoints inclusive of the start at 1).
 */
function signDistance(from: number, to: number, zodiacal: boolean): number {
  if (from === to) return 1; // same sign = 1 (lord in own sign handled separately)
  if (zodiacal) {
    return ((to - from + 12) % 12) || 12;
  }
  return ((from - to + 12) % 12) || 12;
}

// ─── Core: build Narayana Dasha ─────────────────────────────────────────────

export function buildNarayanaDasha(
  d1Planets: PlanetPos[],
  ascSign: number,
  birthDate: Date,
): DashaSystem {
  // Build planet → sign lookup
  const planetSign: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
    }
  }

  // Direction: odd starting sign → zodiacal, even → anti-zodiacal
  const zodiacal = isOddSign(ascSign);

  // Build 12-sign maha progression starting from ascSign
  const progression: number[] = [];
  for (let i = 0; i < 12; i++) {
    const sign = zodiacal
      ? ((ascSign - 1 + i) % 12) + 1
      : ((ascSign - 1 - i + 120) % 12) + 1;
    progression.push(sign);
  }

  // The 7th sign from the starting sign (for exception handling)
  const seventhFromStart = zodiacal
    ? ((ascSign - 1 + 6) % 12) + 1
    : ((ascSign - 1 - 6 + 120) % 12) + 1;

  // Compute durations
  const durations: number[] = [];
  for (const sign of progression) {
    const lord = narayanaLord(sign);
    const lordSign = planetSign[lord];
    if (lordSign === undefined) {
      durations.push(1);
      continue;
    }

    let years: number;
    if (lordSign === sign) {
      // Lord in own sign → 12 years
      years = 12;
    } else {
      // Count from dasha sign to lord's sign in the sign's natural direction
      const dir = isOddSign(sign);
      years = signDistance(sign, lordSign, dir);
    }

    // Exception: if the sign is the 7th from the starting sign,
    // and years > 6, then years = 12 - years (cap rule)
    if (sign === seventhFromStart && years !== 12) {
      // Sanjay Rath exception: for the 7th sign, if the computed
      // duration exceeds 6, subtract from 12.
      if (years > 6) {
        years = 12 - years;
      }
    }

    // Lord-in-sign exception: subtract 1 if lord is in that sign
    // (already handled by the lordSign===sign → 12 check above;
    // the "subtract 1" rule in some texts means distance becomes 0→12).
    // Clamp to valid range.
    years = Math.max(1, Math.min(12, years));
    durations.push(years);
  }

  // Build timeline
  const timeline: DashaPeriod[] = [];
  let cursor = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const sign = progression[i];
    const years = durations[i];
    const start = new Date(cursor);
    const end = addSiderealYears(start, years);

    // Antar dashas: same 12-sign progression rotated
    // (starting from the next sign after the maha sign)
    const antarDuration = years / 12;
    const children: DashaPeriod[] = [];
    let antarCursor = new Date(start);

    for (let j = 0; j < 12; j++) {
      // Antar sequence: start from the maha sign itself, then proceed
      // in the same direction as the maha
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
    system: 'narayana',
    currentMahaDasha: current,
    timeline,
  };
}
