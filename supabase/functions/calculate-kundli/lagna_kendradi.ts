/**
 * Lagna Kendradi Dasha — strength-ordered rasi dasha.
 *
 * Standard order: Lagna's sign first, then its kendras (4th/7th/10th from Lagna)
 * in strength order (using Padakrama / Narayana strength), then panaphara houses
 * (2nd/5th/8th/11th), then apoklima houses (3rd/6th/9th/12th).
 * Within each group, strongest first.
 *
 * Duration: same as Narayana — distance in signs from dasha rasi to its lord,
 * counted in the rasi's natural direction. Lord-in-own-sign → 12.
 *
 * Cite: Jaimini Sutra + KN Rao "Predicting Through Jaimini's Chara Dasha."
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

// ─── Padakrama Strength (simplified) ────────────────────────────────────────

/**
 * Compute Padakrama strength for a sign. Higher = stronger.
 *
 * Factors (simplified Jaimini rasi strength):
 * 1. Number of planets in the sign (more = stronger).
 * 2. Exalted planets add +2; own-sign planets add +1.
 * 3. Aspected by Jupiter or benefics adds +1.
 * 4. Odd sign gets +0.5 tiebreaker (natural strength bias).
 */
function padakramaStrength(
  sign: number,
  d1Planets: PlanetPos[],
): number {
  let score = 0;

  // Count of planets in this sign (excl. ascendant)
  const planetsInSign = d1Planets.filter(
    p => p.planet !== 'ascendant' && p.signNumber === sign,
  );
  score += planetsInSign.length * 2;

  // Exaltation / own-sign bonus
  for (const p of planetsInSign) {
    if (p.dignity === 'exalted') score += 2;
    else if (p.dignity === 'own_sign' || p.dignity === 'mooltrikona') score += 1;
  }

  // Jupiter aspect bonus
  const jupiter = d1Planets.find(p => p.planet === 'jupiter');
  if (jupiter) {
    const jupHouse = jupiter.signNumber;
    // Jupiter aspects 5th, 7th, 9th from its position
    const jupAspects = [5, 7, 9].map(off => ((jupHouse - 1 + off - 1) % 12) + 1);
    if (jupAspects.includes(sign) || jupHouse === sign) score += 1;
  }

  // Odd sign tiebreaker
  if (isOddSign(sign)) score += 0.5;

  // Lord placement: lord in kendra/trikona from this sign = stronger
  const lord = getSignLord(sign);
  const lordPlanet = d1Planets.find(p => p.planet === lord);
  if (lordPlanet) {
    const dist = ((lordPlanet.signNumber - sign + 12) % 12) + 1;
    if ([1, 4, 5, 7, 9, 10].includes(dist)) score += 1;
  }

  return score;
}

// ─── Sign distance (same as Narayana) ───────────────────────────────────────

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

// ─── Core: build Lagna Kendradi Dasha ───────────────────────────────────────

export function buildLagnaKendradiDasha(
  d1Planets: PlanetPos[],
  ascSign: number,
  birthDate: Date,
): DashaSystem {
  const planetSign: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
    }
  }

  // Group signs by house type from Lagna
  // Kendra: houses 1, 4, 7, 10
  // Panaphara: houses 2, 5, 8, 11
  // Apoklima: houses 3, 6, 9, 12
  const kendraHouses = [1, 4, 7, 10];
  const panapharaHouses = [2, 5, 8, 11];
  const apoklimaHouses = [3, 6, 9, 12];

  const houseToSign = (h: number) => ((ascSign - 1 + h - 1) % 12) + 1;

  const kendraSigns = kendraHouses.map(houseToSign);
  const panapharaSigns = panapharaHouses.map(houseToSign);
  const apoklimaSigns = apoklimaHouses.map(houseToSign);

  // Sort each group by Padakrama strength (strongest first)
  const sortByStrength = (signs: number[]) =>
    signs.sort((a, b) => padakramaStrength(b, d1Planets) - padakramaStrength(a, d1Planets));

  sortByStrength(kendraSigns);
  sortByStrength(panapharaSigns);
  sortByStrength(apoklimaSigns);

  // Lagna sign is always first; remove it from kendras and prepend
  const lagnaSign = houseToSign(1);
  const kendraWithoutLagna = kendraSigns.filter(s => s !== lagnaSign);

  // Full progression: Lagna, then remaining kendras, panaphara, apoklima
  const progression = [lagnaSign, ...kendraWithoutLagna, ...panapharaSigns, ...apoklimaSigns];

  // Compute durations
  const durationMap = progression.map(sign => computeDuration(sign, planetSign));

  // Build timeline
  const timeline: DashaPeriod[] = [];
  let cursor = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const sign = progression[i];
    const years = durationMap[i];
    const start = new Date(cursor);
    const end = addSiderealYears(start, years);

    // Antar dashas: same 12 signs in the same order, proportionally distributed
    const antarDuration = years / 12;
    const children: DashaPeriod[] = [];
    let antarCursor = new Date(start);

    for (let j = 0; j < 12; j++) {
      const antarSign = progression[(i + j) % 12];
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
    system: 'lagna_kendradi',
    currentMahaDasha: current,
    timeline,
  };
}
