/**
 * Kalachakra Chakra — directional placement of planets.
 *
 * Places each planet in one of 8 cardinal/intercardinal directions
 * based on a template of 28 nakshatras (including Abhijit), rotated
 * by the Sun's nakshatra (for birth charts).
 *
 * The template distributes 28 nakshatras across 8 directions in an
 * alternating 3-4 pattern: E(3), SE(4), S(3), SW(4), W(3), NW(4),
 * N(3), NE(4). The starting position is determined by the Sun's
 * nakshatra in the 28-nakshatra (incl. Abhijit) scheme.
 *
 * Each direction is governed by a Dikpala (directional deity):
 *   E → Indra, SE → Agni, S → Yama, SW → Nirriti,
 *   W → Varuna, NW → Vayu, N → Kubera, NE → Isana
 *
 * NOTE: This is the directional CHAKRA, distinct from the existing
 * Kalachakra DASHA in kalachakra.ts — do not conflate them.
 *
 * Classical source: Muhurta Chintamani, Narada Samhita (Ch. 5-6).
 * Validated against PyJHora 4.8.6 directional chakra display.
 */

import { nakshatraIndex } from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Direction = 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'N' | 'NE';

export interface DirectionInfo {
  direction: Direction;
  deity: string;
  deityDeva: string;
  nakshatras: string[];
  nakshatraIndices: number[];
  planets: string[];
}

export interface KalachakraDirectionData {
  directions: DirectionInfo[];
  planetPlacements: Array<{
    planet: string;
    nakshatraIdx: number;
    nakshatraName: string;
    direction: Direction;
    deity: string;
  }>;
  citation: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DIRECTION_ORDER: Direction[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

const DEITY_MAP: Record<Direction, { name: string; deva: string }> = {
  E:  { name: 'Indra',   deva: 'इन्द्र' },
  SE: { name: 'Agni',    deva: 'अग्नि' },
  S:  { name: 'Yama',    deva: 'यम' },
  SW: { name: 'Nirriti', deva: 'निरृति' },
  W:  { name: 'Varuna',  deva: 'वरुण' },
  NW: { name: 'Vayu',    deva: 'वायु' },
  N:  { name: 'Kubera',  deva: 'कुबेर' },
  NE: { name: 'Isana',   deva: 'ईशान' },
};

/**
 * 28 nakshatras in the Abhijit ordering used by JHora/PyJHora.
 * Abhijit is inserted between Uttara Ashadha (20) and Shravana (22).
 */
export const NAKSHATRAS_28 = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'P.Phalguni', 'U.Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'P.Ashadha', 'U.Ashadha', 'Abhijit', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'P.Bhadrapada', 'U.Bhadrapada', 'Revati',
] as const;

/**
 * Template: direction sizes in order E, SE, S, SW, W, NW, N, NE.
 * Alternating 3 and 4 = 28 total.
 */
const DIR_SIZES: number[] = [3, 4, 3, 4, 3, 4, 3, 4];

// ─── Core Logic ─────────────────────────────────────────────────────────────

/**
 * Map a sidereal longitude to a 28-nakshatra index (including Abhijit).
 * Abhijit spans ~276°40' to ~280°53'20'.
 */
function nakshatra28Index(siderealLon: number): number {
  const normalized = ((siderealLon % 360) + 360) % 360;
  // Abhijit: Uttara Ashadha pada 4 to first portion of Shravana
  if (normalized >= 276.6667 && normalized < 280.8889) return 21; // Abhijit

  const nk27 = nakshatraIndex(siderealLon); // 0-based index in 27-nakshatra system
  if (nk27 <= 20) return nk27;
  return nk27 + 1; // Shravana(21→22), Dhanishta(22→23), etc.
}

/**
 * Given a template position (0-27), return the direction index (0-7)
 * based on the alternating 3-4 size pattern.
 */
function templatePosToDirectionIndex(templatePos: number): number {
  let pos = 0;
  for (let d = 0; d < 8; d++) {
    if (templatePos < pos + DIR_SIZES[d]) return d;
    pos += DIR_SIZES[d];
  }
  return 7; // fallback (NE)
}

// ─── Main computation ───────────────────────────────────────────────────────

export function computeKalachakraDirection(
  natalPlanets: Array<{ planet: string; longitude: number }>,
): KalachakraDirectionData {
  // base_star: Sun's nakshatra in the 28-scheme (for birth charts per JHora convention).
  const sunPlanet = natalPlanets.find(p => p.planet === 'sun');
  const baseStar28 = sunPlanet ? nakshatra28Index(sunPlanet.longitude) : 0;

  // Initialize 8 directions
  const directions: DirectionInfo[] = DIRECTION_ORDER.map(dir => ({
    direction: dir,
    deity: DEITY_MAP[dir].name,
    deityDeva: DEITY_MAP[dir].deva,
    nakshatras: [],
    nakshatraIndices: [],
    planets: [],
  }));

  // Assign all 28 nakshatras to directions based on template rotation
  for (let nk = 0; nk < 28; nk++) {
    const templatePos = (nk - baseStar28 + 28) % 28;
    const dIdx = templatePosToDirectionIndex(templatePos);
    directions[dIdx].nakshatras.push(NAKSHATRAS_28[nk]);
    directions[dIdx].nakshatraIndices.push(nk);
  }

  // Place each planet in its nakshatra's direction
  const planetPlacements: KalachakraDirectionData['planetPlacements'] = [];

  for (const { planet, longitude } of natalPlanets) {
    if (planet === 'ascendant') continue;

    const nkIdx = nakshatra28Index(longitude);
    const templatePos = (nkIdx - baseStar28 + 28) % 28;
    const dIdx = templatePosToDirectionIndex(templatePos);
    const dir = DIRECTION_ORDER[dIdx];

    directions[dIdx].planets.push(planet);
    planetPlacements.push({
      planet,
      nakshatraIdx: nkIdx,
      nakshatraName: NAKSHATRAS_28[nkIdx],
      direction: dir,
      deity: DEITY_MAP[dir].name,
    });
  }

  return {
    directions,
    planetPlacements,
    citation:
      'Muhurta Chintamani (directional classification); ' +
      'Narada Samhita Ch. 5–6 (Kalachakra eight directions); ' +
      'Validated against PyJHora 4.8.6 directional chakra.',
  };
}
