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

/**
 * Even-footed signs (samapada): Cancer, Leo, Virgo, Capricorn, Aquarius, Pisces.
 * Used for both the Savya/Apasavya direction rule and the duration counting
 * direction — matching PyJHora's `even_footed_signs` constant.
 */
const EVEN_FOOTED_SIGNS = new Set([4, 5, 6, 10, 11, 12]);

// ─── Stronger co-lord determination (PyJHora `stronger_planet_from_planet_positions`) ──

/** Traditional (Parashari) sign dispositors, 1-indexed. */
const DISPOSITOR: Record<number, string> = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
  5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
  9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

/** Rasi modality: Dual(3) > Fixed(2) > Movable(1).  1-indexed signs. */
const FIXED_SIGNS = new Set([2, 5, 8, 11]);
const DUAL_SIGNS  = new Set([3, 6, 9, 12]);
function rasiModality(sign: number): number {
  if (DUAL_SIGNS.has(sign))  return 3;
  if (FIXED_SIGNS.has(sign)) return 2;
  return 1;
}

/** Exaltation signs per planet (1-indexed). */
const EXALTED_IN: Record<string, Set<number>> = {
  mars:    new Set([10]),
  saturn:  new Set([7]),
  rahu:    new Set([2, 3]),
  ketu:    new Set([8, 9]),
};

/**
 * Jaimini rasi drishti table (1-indexed).
 * Movable → 3 fixed signs (skip adjacent).
 * Fixed → 3 movable signs (skip adjacent).
 * Dual → all other duals.
 */
const RASI_DRISHTI: Record<number, number[]> = {
  1: [5, 8, 11],   2: [4, 7, 10],   3: [6, 9, 12],
  4: [2, 8, 11],   5: [1, 7, 10],   6: [3, 9, 12],
  7: [2, 5, 11],   8: [1, 4, 10],   9: [3, 6, 12],
  10: [2, 5, 8],  11: [1, 4, 7],   12: [3, 6, 9],
};

/**
 * Determine the stronger co-lord for a dual-lord sign when neither
 * co-lord occupies the sign.  Implements PyJHora's `_stronger_planet_new`
 * + Rule 5b fallback (longitude tiebreaker).
 *
 * @returns planet name of the stronger co-lord
 */
function strongerCoLord(
  planet1: string,             // e.g. 'mars' or 'saturn'
  planet2: string,             // e.g. 'ketu' or 'rahu'
  planetSign: Record<string, number>,
  planetDeg: Record<string, number>,
): string {
  const h1 = planetSign[planet1];
  const h2 = planetSign[planet2];
  if (h1 === undefined || h2 === undefined) return planet1;

  // Build house→planet count
  const houseCount: Record<number, number> = {};
  for (const s of Object.values(planetSign)) {
    houseCount[s] = (houseCount[s] ?? 0) + 1;
  }

  // Rule 1: planet joined by more planets
  const conj1 = (houseCount[h1] ?? 1) - 1;
  const conj2 = (houseCount[h2] ?? 1) - 1;
  if (conj1 > conj2) return planet1;
  if (conj2 > conj1) return planet2;

  // Rule 2: how many of {Jupiter, Mercury, dispositor} conjoin or aspect
  function rule2Score(pSign: number): number {
    let count = 0;
    const disp = DISPOSITOR[pSign];
    const checklist = new Set(['jupiter', 'mercury']);
    if (disp) checklist.add(disp);

    for (const target of checklist) {
      const ts = planetSign[target];
      if (ts === undefined) continue;
      // Conjoin
      if (ts === pSign) { count++; continue; }
      // Rasi drishti: does 'target' (in sign ts) aspect pSign?
      const aspects = RASI_DRISHTI[ts];
      if (aspects && aspects.includes(pSign)) count++;
    }
    return count;
  }
  const r2a = rule2Score(h1);
  const r2b = rule2Score(h2);
  if (r2a > r2b) return planet1;
  if (r2b > r2a) return planet2;

  // Rule 3: exalted planet is stronger
  const ex1 = EXALTED_IN[planet1]?.has(h1) ?? false;
  const ex2 = EXALTED_IN[planet2]?.has(h2) ?? false;
  if (ex1 && !ex2) return planet1;
  if (ex2 && !ex1) return planet2;

  // Rule 4: rasi modality (Dual > Fixed > Movable)
  const m1 = rasiModality(h1);
  const m2 = rasiModality(h2);
  if (m1 > m2) return planet1;
  if (m2 > m1) return planet2;

  // Rule 5b: more advanced longitude in sign
  const deg1 = planetDeg[planet1] ?? 0;
  const deg2 = planetDeg[planet2] ?? 0;
  return deg1 >= deg2 ? planet1 : planet2;
}

/**
 * Chara Dasha — KN Rao method (Savya/Apasavya direction + even-footed counting).
 *
 * Rules (aligned with PyJHora `_dhasa_progression_knrao_method` +
 * `_dhasa_duration_pvnrao_method`):
 * 1. Seed = Lagna sign.  12 Maha-sign periods.
 * 2. Direction: compute the 9th sign from the Lagna.  If it is an
 *    even-footed sign → REVERSE (apasavya); else FORWARD (savya).
 * 3. Duration: if the dasha sign is even-footed, count forward from the
 *    lord's sign to the dasha sign; else count forward from the dasha
 *    sign to the lord's sign.  Years = count (lord-in-own-sign ⇒ 12).
 *    For Scorpio / Aquarius, when one co-lord occupies the sign use the
 *    other co-lord's position (PyJHora PVN Rao special case).
 * 4. Dual lords: Scorpio → Mars / Ketu, Aquarius → Saturn / Rahu.
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
  // Build maps from planet name → sign number and planet name → degree in sign
  const planetSign: Record<string, number> = {};
  const planetDeg: Record<string, number> = {};
  for (const p of d1Planets) {
    if (p.planet !== 'ascendant') {
      planetSign[p.planet] = p.signNumber;
      planetDeg[p.planet]  = p.signDegree;
    }
  }

  // Direction: 9th sign from Lagna; reverse if even-footed (PyJHora rule)
  const ninth = ((ascSign - 1 + 8) % 12) + 1;
  const forward = !EVEN_FOOTED_SIGNS.has(ninth);

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

  // Step 2: compute maha durations (even-footed counting direction)
  const mahaDurations: number[] = [];
  for (const sign of progression) {
    const lord = charaDashaLord(sign);
    let lordSign = planetSign[lord];
    if (lordSign === undefined) return null;

    // PVN Rao dual-lord handling for Scorpio / Aquarius:
    // 1. Both co-lords in the sign → 12.
    // 2. One co-lord in the sign → use the other co-lord's position.
    // 3. Neither in the sign → use the stronger co-lord (PyJHora rules).
    if (sign === 8) {
      const marsSign = planetSign['mars'];
      const ketuSign = planetSign['ketu'];
      if (marsSign !== undefined && ketuSign !== undefined) {
        if (marsSign === 8 && ketuSign === 8) { mahaDurations.push(12); continue; }
        if (marsSign === 8 && ketuSign !== 8) { lordSign = ketuSign; }
        else if (ketuSign === 8 && marsSign !== 8) { lordSign = marsSign; }
        else {
          const stronger = strongerCoLord('mars', 'ketu', planetSign, planetDeg);
          lordSign = planetSign[stronger]!;
        }
      }
    } else if (sign === 11) {
      const satSign = planetSign['saturn'];
      const rahuSign = planetSign['rahu'];
      if (satSign !== undefined && rahuSign !== undefined) {
        if (satSign === 11 && rahuSign === 11) { mahaDurations.push(12); continue; }
        if (satSign === 11 && rahuSign !== 11) { lordSign = rahuSign; }
        else if (rahuSign === 11 && satSign !== 11) { lordSign = satSign; }
        else {
          const stronger = strongerCoLord('saturn', 'rahu', planetSign, planetDeg);
          lordSign = planetSign[stronger]!;
        }
      }
    }

    let years: number;
    if (lordSign === sign) {
      years = 12;
    } else if (EVEN_FOOTED_SIGNS.has(sign)) {
      // Even-footed: count forward from lord's sign → dasha sign
      years = ((sign - lordSign + 12) % 12);
    } else {
      // Not even-footed: count forward from dasha sign → lord's sign
      years = ((lordSign - sign + 12) % 12);
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
