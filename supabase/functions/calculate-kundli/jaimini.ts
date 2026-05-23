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

export interface CharaDashaPeriod {
  sign: number;
  signName: string;
  startDate: string;
  endDate: string;
  durationYears: number;
}

/**
 * Chara Dasha — STUBBED.
 *
 * Jaimini's sign-based dasha requires:
 * - Odd/even lagna determination for direction
 * - Duration based on lord's distance with special rules for dual-lord signs
 * - Exception handling for signs whose lord is in the sign itself
 *
 * Parity with AstroSage/JHora could not be validated for 3 reference charts
 * within this pass. Returns null to indicate the dasha is not yet computed.
 * The dossier will state "Chara Dasha not yet validated — use with caution".
 */
export function computeCharaDasha(
  _d1Planets: PlanetPos[],
  _ascSign: number,
  _birthDate: Date,
): CharaDashaPeriod[] | null {
  // Stubbed — parity validation pending.
  return null;
}
