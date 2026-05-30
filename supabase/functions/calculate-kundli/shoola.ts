/**
 * Shoola Dasha — death/health timing rasi dasha.
 *
 * Order: starts from the 7th house from Atmakaraka's sign, then proceeds in
 * zodiacal direction for odd starting signs, anti-zodiacal for even starting
 * signs. Used primarily in longevity (ayurdaya) analysis.
 *
 * Duration: same signs-to-lord Padakrama formula as Narayana — distance (in
 * signs) from the dasha rasi to its lord's placement, counted in the rasi's
 * natural direction. Lord-in-own-sign → 12.
 *
 * Cite: Phaladeepika Ch. 8 + KN Rao, "Predicting Longevity."
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

// ─── Core: build Shoola Dasha ───────────────────────────────────────────────

export function buildShoolaDasha(
  d1Planets: PlanetPos[],
  _ascSign: number,
  birthDate: Date,
  atmakarakaSign: number,
): DashaSystem {
  const planetSign: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
    }
  }

  // Starting sign: 7th from AK's sign
  const startSign = ((atmakarakaSign - 1 + 6) % 12) + 1;

  // Direction: odd starting sign → zodiacal, even → anti-zodiacal
  const zodiacal = isOddSign(startSign);

  // Build 12-sign progression from the starting sign
  const progression: number[] = [];
  for (let i = 0; i < 12; i++) {
    const sign = zodiacal
      ? ((startSign - 1 + i) % 12) + 1
      : ((startSign - 1 - i + 120) % 12) + 1;
    progression.push(sign);
  }

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
    system: 'shoola',
    currentMahaDasha: current,
    timeline,
  };
}
