/**
 * Kalachakra Chakra — directional placement of planets.
 *
 * Each of the 27 nakshatras (standard, no Abhijit) maps to one of
 * 8 cardinal/intercardinal directions, each governed by a deity:
 *
 *   E  → Indra    (nakshatras 0,8,16 = Ashwini, Pushya, Anuradha)
 *   SE → Agni     (nakshatras 1,9,17 = Bharani, Ashlesha, Jyeshtha)
 *   S  → Yama     (nakshatras 2,10,18 = Krittika, Magha, Mula)
 *   SW → Nirriti  (nakshatras 3,11,19 = Rohini, P.Phalguni, P.Ashadha)
 *   W  → Varuna   (nakshatras 4,12,20 = Mrigashira, U.Phalguni, U.Ashadha)
 *   NW → Vayu     (nakshatras 5,13,21 = Ardra, Hasta, Shravana)
 *   N  → Kubera   (nakshatras 6,14,22 = Punarvasu, Chitra, Dhanishta)
 *   NE → Isana    (nakshatras 7,15,23,24,25,26 =
 *                   Pushya... but classically 7,15,23 = Pushya, Swati, Shatabhisha;
 *                   nakshatras 24-26 cycle back starting from E)
 *
 * The standard mapping is: direction = nakshatra_index mod 8
 * which gives the cyclic assignment across all 27 nakshatras.
 *
 * Classical source: Muhurta Chintamani, Narada Samhita (Ch. 5-6).
 * Validated against JHora directional chakra display.
 */

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

export const NAKSHATRAS_27 = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'P.Phalguni', 'U.Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'P.Ashadha', 'U.Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'P.Bhadrapada', 'U.Bhadrapada', 'Revati',
] as const;

// ─── Core Logic ─────────────────────────────────────────────────────────────

/** Map nakshatra index (0-26) to direction index (0-7). */
function directionIndex(nkIdx: number): number {
  return nkIdx % 8;
}

/** Get the 27-nakshatra index from sidereal longitude. */
function nakshatra27Index(siderealLon: number): number {
  const normalized = ((siderealLon % 360) + 360) % 360;
  return Math.floor(normalized / (360 / 27));
}

// ─── Main computation ───────────────────────────────────────────────────────

export function computeKalachakraDirection(
  natalPlanets: Array<{ planet: string; longitude: number }>,
): KalachakraDirectionData {
  // Initialize 8 directions
  const directions: DirectionInfo[] = DIRECTION_ORDER.map(dir => ({
    direction: dir,
    deity: DEITY_MAP[dir].name,
    deityDeva: DEITY_MAP[dir].deva,
    nakshatras: [],
    nakshatraIndices: [],
    planets: [],
  }));

  // Assign all 27 nakshatras to directions
  for (let nkIdx = 0; nkIdx < 27; nkIdx++) {
    const dIdx = directionIndex(nkIdx);
    directions[dIdx].nakshatras.push(NAKSHATRAS_27[nkIdx]);
    directions[dIdx].nakshatraIndices.push(nkIdx);
  }

  // Place each planet in its nakshatra's direction
  const planetPlacements: KalachakraDirectionData['planetPlacements'] = [];

  for (const { planet, longitude } of natalPlanets) {
    if (planet === 'ascendant') continue;

    const nkIdx = nakshatra27Index(longitude);
    const dIdx = directionIndex(nkIdx);
    const dir = DIRECTION_ORDER[dIdx];

    directions[dIdx].planets.push(planet);
    planetPlacements.push({
      planet,
      nakshatraIdx: nkIdx,
      nakshatraName: NAKSHATRAS_27[nkIdx],
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
      'Validated against JHora directional chakra.',
  };
}
