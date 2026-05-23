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
import { rad, deg, norm360 } from "./astronomy.ts";
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

// ─── Placidus Cusps ─────────────────────────────────────────────────────────

/**
 * Compute Placidus house cusps (tropical longitudes).
 *
 * Algorithm (Meeus, Astronomical Algorithms):
 * 1. MC = atan(tan(RAMC) / cos(ε))
 * 2. ASC from RAMC, ε, φ (standard formula)
 * 3. Intermediate cusps (11, 12, 2, 3) via iterative Placidus semi-arc method
 * 4. Opposite cusps = +180°
 *
 * Returns 12 tropical longitudes [cusp1..cusp12]. Caller subtracts ayanamsa
 * for sidereal output.
 */
export function computePlacidusCusps(
  _jd: number,
  latDeg: number,
  obliquityDeg: number,
  ramcDeg: number,
): number[] {
  const eps = rad(obliquityDeg);
  const phi = rad(latDeg);
  const RAMC = ramcDeg;

  // MC (cusp 10): tropical longitude of the midheaven
  const mcRad = Math.atan2(Math.sin(rad(RAMC)), Math.cos(rad(RAMC)) * Math.cos(eps));
  let mc = norm360(deg(mcRad));
  if (RAMC > 90 && RAMC <= 270) {
    if (mc < 90 || mc > 270) mc = norm360(mc + 180);
  } else {
    if (mc >= 90 && mc <= 270) mc = norm360(mc + 180);
  }

  // ASC (cusp 1)
  const ascRad = Math.atan2(
    Math.cos(rad(RAMC)),
    -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(rad(RAMC))),
  );
  const asc = norm360(deg(ascRad));

  // Convert RA to ecliptic longitude with quadrant correction:
  // λ and α must be in the same quadrant.
  function raToLon(raDeg: number): number {
    const r = rad(raDeg);
    const lonRad = Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(eps));
    let lon = norm360(deg(lonRad));
    // atan2 gives −180..180 mapped to 0..360; but we need the quadrant of λ
    // to match RA. Both should be in the same 180° half.
    const raQ = norm360(raDeg);
    if (raQ > 90 && raQ <= 270) {
      if (lon < 90 || lon > 270) lon = norm360(lon + 180);
    } else {
      if (lon >= 90 && lon <= 270) lon = norm360(lon + 180);
    }
    return lon;
  }

  // Iterative Placidus intermediate cusp.
  //   above=true  → cusps between MC and ASC (11, 12): RA = RAMC + f·DSA
  //   above=false → cusps between IC and ASC (3, 2):   RA = RAMC + 180 − f·NNA
  // f = fraction of semi-arc (1/3 or 2/3).
  function placidusIntermediate(f: number, above: boolean): number {
    // Initial guess
    let cusp = above
      ? norm360(RAMC + f * 90)
      : norm360(RAMC + 180 - f * 90);

    for (let iter = 0; iter < 50; iter++) {
      // Declination of the ecliptic point at longitude λ = cusp
      const decl = Math.asin(Math.sin(eps) * Math.sin(rad(cusp)));
      // Semi-diurnal arc
      const tanProd = Math.tan(phi) * Math.tan(decl);
      let dsa: number;
      if (tanProd >= 1) dsa = 180;
      else if (tanProd <= -1) dsa = 0;
      else dsa = deg(Math.acos(-tanProd));

      let raCusp: number;
      if (above) {
        // Above horizon: RA = RAMC + f·DSA  (eastward from MC toward ASC)
        raCusp = RAMC + f * dsa;
      } else {
        // Below horizon: RA = RAMC + 180 − f·NNA (eastward from IC toward ASC)
        const nna = 180 - dsa;
        raCusp = RAMC + 180 - f * nna;
      }
      raCusp = norm360(raCusp);

      const newCusp = raToLon(raCusp);
      const diff = Math.abs(newCusp - cusp);
      if (diff < 0.0001 || diff > 359.999) break;
      cusp = newCusp;
    }
    return cusp;
  }

  // Above-horizon intermediate cusps (MC → ASC)
  const cusp11 = placidusIntermediate(1 / 3, true);
  const cusp12 = placidusIntermediate(2 / 3, true);

  // Below-horizon intermediate cusps (IC → ASC)
  // f=1/3 → cusp 3 (closer to IC); f=2/3 → cusp 2 (closer to ASC)
  const cusp3 = placidusIntermediate(1 / 3, false);
  const cusp2 = placidusIntermediate(2 / 3, false);

  // Build all 12 cusps; opposite cusps = +180°
  const cusps = new Array<number>(12);
  cusps[0] = asc;                         // Cusp 1  (ASC)
  cusps[1] = cusp2;                       // Cusp 2
  cusps[2] = cusp3;                       // Cusp 3
  cusps[3] = norm360(mc + 180);           // Cusp 4  (IC)
  cusps[4] = norm360(cusp11 + 180);       // Cusp 5
  cusps[5] = norm360(cusp12 + 180);       // Cusp 6
  cusps[6] = norm360(asc + 180);          // Cusp 7  (DSC)
  cusps[7] = norm360(cusp2 + 180);        // Cusp 8
  cusps[8] = norm360(cusp3 + 180);        // Cusp 9
  cusps[9] = mc;                          // Cusp 10 (MC)
  cusps[10] = cusp11;                     // Cusp 11
  cusps[11] = cusp12;                     // Cusp 12

  return cusps;
}

/**
 * Compute cuspal sub-lords: for each Placidus cusp, compute the KP
 * sign-lord, star-lord, and sub-lord of the sidereal cusp longitude.
 */
export function computeCuspalSubLords(
  tropicalCusps: number[],
  ayaValue: number,
): Array<{
  cusp: number;
  longitude: number;
  signLord: string;
  starLord: string;
  subLord: string;
}> {
  return tropicalCusps.map((tropLon, i) => {
    const sidLon = norm360(tropLon - ayaValue);
    const lords = kpLords(sidLon);
    return {
      cusp: i + 1,
      longitude: sidLon,
      signLord: lords.signLord,
      starLord: lords.starLord,
      subLord: lords.subLord,
    };
  });
}
