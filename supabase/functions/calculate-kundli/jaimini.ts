/**
 * Jaimini Astrology Engine.
 *
 * Implements:
 * - Chara Karakas (8-planet scheme including Rahu)
 * - Karakamsa (AK's Navamsa sign)
 * - Arudha Padas (AL, UL, A2, A7)
 * - Chara Dasha (sign-based dasha — STUBBED pending parity validation)
 */

import { SIGN_NAMES } from "./constants.ts";
import { getSignLord, wholeSignHouse } from "./vedic.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Jaimini sign lordship (handles dual-lord signs) ────────────────────────

/**
 * Jaimini sign lordship — follows KN Rao convention:
 * - Scorpio (8): Mars (primary). Ketu is co-lord; use Mars by default.
 * - Aquarius (11): Saturn (primary). Rahu is co-lord; use Saturn by default.
 * - Pisces (12): Jupiter (primary). Ketu is co-lord; use Jupiter by default.
 *
 * Convention: Use the traditional lord as default. Dual lordship is documented
 * but not dynamically toggled.
 */
export function getJaiminiLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
    9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

// ─── Chara Karakas ──────────────────────────────────────────────────────────

const KARAKA_LABELS = ['AK', 'AmK', 'BK', 'MK', 'PK', 'GK', 'DK', 'Karaka8'] as const;

const CHARA_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu'];

export interface CharaKaraka {
  planet: string;
  degreeInSign: number;
  karaka: string;
}

/**
 * Rank 8 planets by degree within sign to assign Chara Karakas.
 * For Rahu: use 30 - signDegree (reverse convention per standard Jaimini practice).
 * Highest degree = Atmakaraka (AK), next = Amatyakaraka (AmK), etc.
 */
export function computeCharaKarakas(d1Planets: PlanetPos[]): CharaKaraka[] {
  const candidates = d1Planets
    .filter(p => CHARA_PLANETS.includes(p.planet))
    .map(p => {
      const deg = p.planet === 'rahu' ? 30 - p.signDegree : p.signDegree;
      return { planet: p.planet, degreeInSign: deg };
    });

  // Sort descending by degree (highest = AK)
  // Tiebreaker: higher minutes wins. Since signDegree includes fractional part,
  // we compare the fractional minute component. If still tied, use natural order.
  const naturalOrder = CHARA_PLANETS;
  candidates.sort((a, b) => {
    const diff = b.degreeInSign - a.degreeInSign;
    if (Math.abs(diff) > 1e-6) return diff;
    // Tie: planet earlier in natural order wins higher rank
    return naturalOrder.indexOf(a.planet) - naturalOrder.indexOf(b.planet);
  });

  return candidates.map((c, i) => ({
    planet: c.planet,
    degreeInSign: c.degreeInSign,
    karaka: KARAKA_LABELS[i] ?? 'Karaka8',
  }));
}

// ─── Karakamsa ──────────────────────────────────────────────────────────────

/**
 * Karakamsa = the Navamsa sign of the Atmakaraka.
 * Find the AK planet in D9 chart and return its sign.
 */
export function karakamsa(
  akPlanet: string,
  d9Planets: PlanetPos[],
): { sign: number; signName: string } {
  const akInD9 = d9Planets.find(p => p.planet === akPlanet);
  if (!akInD9) return { sign: 0, signName: 'Unknown' };
  return { sign: akInD9.signNumber, signName: akInD9.signName };
}

// ─── Arudha Padas ───────────────────────────────────────────────────────────

export interface ArudhaPada {
  house: number;
  label: string;
  sign: number;
  signName: string;
}

const ARUDHA_LABELS: Record<number, string> = {
  1: 'Arudha Lagna (AL)',
  2: 'Dhana Pada (A2)',
  7: 'Darapada (A7)',
  12: 'Upapada (UL)',
};

/**
 * Compute Arudha Padas for houses 1, 2, 7, 12.
 *
 * Formula for Arudha of house H:
 * 1. Find the lord of the sign in house H
 * 2. Count houses from H to the lord's position = N
 * 3. Arudha = N houses from the lord's position (i.e., 2N-1 houses from H)
 * 4. Exception 1: If Arudha falls in house H itself, move to house 10 from H
 * 5. Exception 2: If Arudha falls in house 7 from H, move to house 4 from H
 */
export function computeArudhaPadas(d1Planets: PlanetPos[], ascSign: number): ArudhaPada[] {
  const housesOfInterest = [1, 2, 7, 12];
  const results: ArudhaPada[] = [];

  for (const h of housesOfInterest) {
    // Sign in house H (whole sign)
    const houseSign = ((ascSign - 1 + h - 1) % 12) + 1;
    // Lord of that sign
    const lord = getJaiminiLord(houseSign);

    // Find lord's house position
    const lordPlanet = d1Planets.find(p => p.planet === lord);
    if (!lordPlanet) {
      results.push({
        house: h,
        label: ARUDHA_LABELS[h] ?? `A${h}`,
        sign: 0,
        signName: 'Unknown',
      });
      continue;
    }

    const lordHouse = wholeSignHouse(lordPlanet.signNumber, ascSign);

    // Count from H to lord's house
    const n = ((lordHouse - h + 12) % 12) || 12;

    // Arudha house = N houses from lord's house = 2N-1 houses from H
    let arudhaHouse = ((lordHouse - 1 + n) % 12) + 1;

    // Exception 1: if Arudha falls in house H itself → move to 10 from H
    if (arudhaHouse === h) {
      arudhaHouse = ((h - 1 + 9) % 12) + 1; // 10th from H (0-indexed shift)
    }

    // Exception 2: if Arudha falls in 7th from H → move to 4th from H
    const seventhFromH = ((h - 1 + 6) % 12) + 1;
    if (arudhaHouse === seventhFromH) {
      arudhaHouse = ((h - 1 + 3) % 12) + 1; // 4th from H
    }

    // Convert house to sign
    const arudhaSign = ((ascSign - 1 + arudhaHouse - 1) % 12) + 1;

    results.push({
      house: h,
      label: ARUDHA_LABELS[h] ?? `A${h}`,
      sign: arudhaSign,
      signName: SIGN_NAMES[(arudhaSign - 1) % 12],
    });
  }

  return results;
}

// ─── Chara Dasha ────────────────────────────────────────────────────────────

export interface CharaDashaAntarPeriod {
  sign: number;
  signName: string;
  startDate: string;
  endDate: string;
  durationYears: number;
}

export interface CharaDashaPeriod {
  sign: number;
  signName: string;
  startDate: string;
  endDate: string;
  durationYears: number;
  children: CharaDashaAntarPeriod[];
}

/**
 * Sign lord for Chara Dasha (KN Rao dual-lord convention):
 * Scorpio (8) → Ketu, Aquarius (11) → Rahu.
 * All other signs use the standard Parashari lord.
 */
function charaDashaLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'ketu',
    9: 'jupiter', 10: 'saturn', 11: 'rahu', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

/** Odd signs: Aries, Gemini, Leo, Libra, Sagittarius, Aquarius. */
function isOddSign(sign: number): boolean {
  return [1, 3, 5, 7, 9, 11].includes(sign);
}

/**
 * Chara Dasha — KN Rao method.
 *
 * Rules:
 * 1. 12 sign-dashas starting from the Lagna sign.
 * 2. Sequence: forward (zodiacal) if Lagna is odd, reverse if even.
 * 3. Duration: count from the sign to its lord's sign — forward for odd
 *    signs, backward for even. Count is inclusive (sign itself = 1),
 *    years = count − 1. If lord is in the sign itself, years = 12.
 *    Clamp 1–12.
 * 4. Dual lords: Scorpio → Ketu, Aquarius → Rahu.
 */
/**
 * Sidereal year in days (used by PyJHora for proportional sub-period dating).
 */
const SIDEREAL_YEAR_DAYS = 365.242198781;

/**
 * Add fractional years to a Date using sidereal-year days.
 * This matches PyJHora's JD-based arithmetic more closely than
 * calendar-year addition.
 */
function addSiderealYears(base: Date, years: number): Date {
  const ms = years * SIDEREAL_YEAR_DAYS * 86_400_000;
  return new Date(base.getTime() + ms);
}

export function computeCharaDasha(
  d1Planets: PlanetPos[],
  ascSign: number,
  birthDate: Date,
): CharaDashaPeriod[] | null {
  // Build a map from planet name → sign number
  const planetSign: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
    }
  }

  const forward = isOddSign(ascSign);

  // Step 1: build the maha progression (12 signs in order)
  const progression: number[] = [];
  for (let i = 0; i < 12; i++) {
    let sign: number;
    if (forward) {
      sign = ((ascSign - 1 + i) % 12) + 1;
    } else {
      sign = ((ascSign - 1 - i + 120) % 12) + 1;
    }
    progression.push(sign);
  }

  // Step 2: compute maha durations
  const mahaDurations: number[] = [];
  for (const sign of progression) {
    const lord = charaDashaLord(sign);
    const lordSign = planetSign[lord];
    if (lordSign === undefined) return null;

    let years: number;
    if (lordSign === sign) {
      years = 12;
    } else if (isOddSign(sign)) {
      years = ((lordSign - sign + 12) % 12);
    } else {
      years = ((sign - lordSign + 12) % 12);
    }
    years = Math.max(1, Math.min(12, years));
    mahaDurations.push(years);
  }

  // Step 3: antardasha order — KN Rao rule (PyJHora _antardhasa method=1):
  // rotate the maha progression by 1 (skip first, put at end).
  // Applied as a per-parent rotation: for maha at index i, antardashas
  // run progression[(i+1)%12] … progression[i].
  const timeline: CharaDashaPeriod[] = [];
  let cursor = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const sign = progression[i];
    const years = mahaDurations[i];
    const mahaStart = new Date(cursor);
    const mahaEnd = addSiderealYears(mahaStart, years);

    // Build antardasha children
    const antarDuration = years / 12;
    const children: CharaDashaAntarPeriod[] = [];
    let antarCursor = new Date(mahaStart);

    for (let j = 1; j <= 12; j++) {
      const antarSign = progression[(i + j) % 12];
      const antarStart = new Date(antarCursor);
      const antarEnd = addSiderealYears(antarStart, antarDuration);

      children.push({
        sign: antarSign,
        signName: SIGN_NAMES[(antarSign - 1) % 12],
        startDate: antarStart.toISOString(),
        endDate: antarEnd.toISOString(),
        durationYears: Math.round(antarDuration * 10000) / 10000,
      });

      antarCursor = antarEnd;
    }

    timeline.push({
      sign,
      signName: SIGN_NAMES[(sign - 1) % 12],
      startDate: mahaStart.toISOString(),
      endDate: mahaEnd.toISOString(),
      durationYears: years,
      children,
    });

    cursor = mahaEnd;
  }

  return timeline;
}
