/**
 * KP (Krishnamurti Paddhati) Sub-Lord Engine.
 *
 * Computes star-lord and sub-lord for any sidereal longitude
 * using the Vimshottari proportional sub-division scheme.
 *
 * Also provides KP Ruling Planets computation for transit-based analysis.
 */

import { NAKSHATRA_LORDS, VIMSHOTTARI_SEQUENCE } from "./constants.ts";
import { getSignLord, nakshatraIndex } from "./vedic.ts";
import type { PlanetPos } from "./divisional.ts";

// Total Vimshottari cycle years
const VIM_TOTAL = 120;

// Nakshatra span in degrees
const NAK_SPAN = 360 / 27; // 13.3333...°

/**
 * For any sidereal longitude, compute sign-lord, star-lord, and sub-lord
 * using the Vimshottari proportional sub-division.
 *
 * Algorithm:
 * - Nakshatra index n = floor(lon / 13.3333) (0–26)
 * - Star-lord = NAKSHATRA_LORDS[n % 9]
 * - Position within nakshatra p = lon - n * 13.3333 (0–13.3333°)
 * - Walk Vimshottari order cyclically starting from star-lord
 * - Each planet's sub spans (years/120) * 13.3333°
 * - The planet whose accumulated span contains p is the sub-lord
 */
export function kpLords(lon: number): { signLord: string; starLord: string; subLord: string } {
  // Normalize longitude to 0–360
  const normLon = ((lon % 360) + 360) % 360;

  // Sign lord
  const signNum = Math.floor(normLon / 30) + 1;
  const signLord = getSignLord(signNum);

  // Nakshatra index and star lord
  const nIdx = Math.floor(normLon / NAK_SPAN);
  const starLord = NAKSHATRA_LORDS[nIdx % 9];

  // Position within nakshatra (0 to NAK_SPAN)
  const posInNak = normLon - nIdx * NAK_SPAN;

  // Find sub-lord by walking the Vimshottari sequence starting from star lord
  const startIdx = VIMSHOTTARI_SEQUENCE.findIndex(([p]) => p === starLord);
  let accumulated = 0;
  let subLord: string = starLord as string; // default fallback

  for (let i = 0; i < 9; i++) {
    const seqIdx = (startIdx + i) % 9;
    const [planet, years] = VIMSHOTTARI_SEQUENCE[seqIdx];
    const subSpan = (years / VIM_TOTAL) * NAK_SPAN;
    accumulated += subSpan;
    if (posInNak < accumulated || i === 8) {
      subLord = planet as string;
      break;
    }
  }

  return {
    signLord: capitalize(signLord),
    starLord,
    subLord,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Compute KP sub-lords for all 9 grahas (excluding ascendant).
 */
export function computeKpPlanetSubLords(d1Planets: PlanetPos[]): Array<{
  planet: string;
  signLord: string;
  starLord: string;
  subLord: string;
}> {
  return d1Planets
    .filter(p => p.planet !== 'ascendant')
    .map(p => ({
      planet: p.planet,
      ...kpLords(p.longitude),
    }));
}

/**
 * KP Ruling Planets — the 5 ruling planets at a given moment.
 *
 * 1. Ascendant sign lord (transit ascendant)
 * 2. Ascendant star lord (transit ascendant nakshatra lord)
 * 3. Moon sign lord (transit Moon)
 * 4. Moon star lord (transit Moon nakshatra lord)
 * 5. Day lord (weekday → planet mapping)
 */
export function computeRulingPlanets(
  transitAscLon: number,
  transitMoonLon: number,
  now: Date,
): {
  ascSignLord: string;
  ascStarLord: string;
  moonSignLord: string;
  moonStarLord: string;
  dayLord: string;
} {
  const ascSignNum = Math.floor(transitAscLon / 30) + 1;
  const ascSignLord = capitalize(getSignLord(ascSignNum));

  const ascNakIdx = nakshatraIndex(transitAscLon);
  const ascStarLord = NAKSHATRA_LORDS[ascNakIdx % 9];

  const moonSignNum = Math.floor(transitMoonLon / 30) + 1;
  const moonSignLord = capitalize(getSignLord(moonSignNum));

  const moonNakIdx = nakshatraIndex(transitMoonLon);
  const moonStarLord = NAKSHATRA_LORDS[moonNakIdx % 9];

  // Weekday → planet: Sun=0(Sun), Mon=1(Moon), Tue=2(Mars), Wed=3(Mercury),
  // Thu=4(Jupiter), Fri=5(Venus), Sat=6(Saturn)
  const dayPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const dayLord = dayPlanets[now.getDay()];

  return { ascSignLord, ascStarLord, moonSignLord, moonStarLord, dayLord };
}

/**
 * Placidus house cusps — STUB.
 *
 * KP is inherently Placidus-based. A proper Placidus implementation requires
 * iterative semi-arc trisection which could not be validated against reference
 * charts (AstroSage/JHora) within this pass.
 *
 * Returns null to indicate cusps are not yet computed. The dossier will note
 * "Placidus cusps not yet computed — using Whole Sign houses".
 */
export function computePlacidusCusps(
  _jd: number,
  _lat: number,
  _obliquity: number,
  _ramc: number,
): null {
  // Stubbed — parity with AstroSage/JHora not yet achievable.
  return null;
}
