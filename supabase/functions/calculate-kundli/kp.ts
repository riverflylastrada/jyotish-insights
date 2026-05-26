/**
 * KP (Krishnamurti Paddhati) Sub-Lord Engine.
 *
 * Computes star-lord and sub-lord for any sidereal longitude
 * using the Vimshottari proportional sub-division scheme.
 *
 * Also provides KP Ruling Planets computation for transit-based analysis,
 * and the KP 4-fold house significators for predictive work.
 */

import { NAKSHATRA_LORDS, VIMSHOTTARI_SEQUENCE } from "./constants.ts";
import { getSignLord, nakshatraIndex, wholeSignHouse } from "./vedic.ts";
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

// ─── KP 4-Fold House Significators ──────────────────────────────────────────

export interface HouseSignificatorData {
  house: number;
  levelA: string[];
  levelB: string[];
  levelC: string[];
  levelD: string[];
  nodesActingFor: string[];
  ordered: string[];
}

const PLANETS_FOR_SIG = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const NODES = ['rahu', 'ketu'];

/** Vedic graha-drishti: houses aspected from a planet's position (offsets from the planet's house). */
function vedicAspectOffsets(planet: string): number[] {
  switch (planet) {
    case 'mars': return [4, 7, 8];
    case 'jupiter': return [5, 7, 9];
    case 'saturn': return [3, 7, 10];
    default: return [7];
  }
}

/**
 * Compute the KP 4-fold significators for all 12 houses.
 *
 * Rules (descending strength):
 *   Level A — planets in the star of occupant(s) of H
 *   Level B — occupant(s) of H
 *   Level C — planets in the star of the owner (sign lord) of H
 *   Level D — the owner (sign lord) of H
 *
 * Node rules: Rahu/Ketu also signify the houses signified by their
 * (a) sign-lord (dispositor), (b) star-lord, (c) conjoined planets,
 * (d) aspecting planets. They are treated as strong primary significators.
 */
export function computeHouseSignificators(
  d1Planets: PlanetPos[],
  ascSign: number,
): HouseSignificatorData[] {
  const grahas = d1Planets.filter(p => p.planet !== 'ascendant');

  // Pre-compute star-lord for every graha
  const starLordMap: Record<string, string> = {};
  for (const g of grahas) {
    const nIdx = nakshatraIndex(g.longitude);
    starLordMap[g.planet] = NAKSHATRA_LORDS[nIdx % 9];
  }

  // House number for each graha (Whole Sign)
  const houseOf: Record<string, number> = {};
  for (const g of grahas) {
    houseOf[g.planet] = wholeSignHouse(g.signNumber, ascSign);
  }

  // Occupants per house (1–12)
  const occupants: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) occupants[h] = [];
  for (const g of grahas) {
    occupants[houseOf[g.planet]].push(g.planet);
  }

  // Owner (sign lord) per house
  const houseOwner: Record<number, string> = {};
  for (let h = 1; h <= 12; h++) {
    const houseSign = ((ascSign - 1 + (h - 1)) % 12) + 1;
    houseOwner[h] = getSignLord(houseSign);
  }

  // Build reverse map: for a given planet, which planets have it as their star-lord?
  const planetsInStarOf: Record<string, string[]> = {};
  for (const name of PLANETS_FOR_SIG) planetsInStarOf[name] = [];
  for (const g of grahas) {
    const sl = starLordMap[g.planet];
    const slLower = sl.toLowerCase();
    if (planetsInStarOf[slLower]) {
      planetsInStarOf[slLower].push(g.planet);
    }
  }

  // Node agency: compute which houses each node "acts for" via its dispositor,
  // star-lord, conjoined planets, and aspecting planets.
  const nodeActsForHouses: Record<string, Set<number>> = { rahu: new Set(), ketu: new Set() };

  for (const node of NODES) {
    const nodeGraha = grahas.find(g => g.planet === node);
    if (!nodeGraha) continue;

    // Collect planets whose significators the node inherits
    const agencyPlanets = new Set<string>();

    // (a) Sign-lord (dispositor)
    const dispositor = getSignLord(nodeGraha.signNumber);
    agencyPlanets.add(dispositor);

    // (b) Star-lord
    const nodeStar = starLordMap[node].toLowerCase();
    agencyPlanets.add(nodeStar);

    // (c) Conjoined planets (same sign)
    for (const g of grahas) {
      if (g.planet === node) continue;
      if (g.signNumber === nodeGraha.signNumber) agencyPlanets.add(g.planet);
    }

    // (d) Aspecting planets (planets whose Vedic drishti falls on node's house)
    const nodeHouse = houseOf[node];
    for (const g of grahas) {
      if (g.planet === node) continue;
      if (NODES.includes(g.planet)) continue; // nodes don't cast graha-drishti
      const offsets = vedicAspectOffsets(g.planet);
      for (const off of offsets) {
        const aspectedHouse = ((houseOf[g.planet] - 1 + off) % 12) + 1;
        if (aspectedHouse === nodeHouse) {
          agencyPlanets.add(g.planet);
        }
      }
    }

    // Collect all houses that the agency planets signify (as occupant or owner)
    for (const ap of agencyPlanets) {
      // Houses occupied by the agency planet
      if (houseOf[ap] !== undefined) {
        nodeActsForHouses[node].add(houseOf[ap]);
      }
      // Houses owned by the agency planet
      for (let h = 1; h <= 12; h++) {
        if (houseOwner[h] === ap) nodeActsForHouses[node].add(h);
      }
    }
  }

  const result: HouseSignificatorData[] = [];

  for (let h = 1; h <= 12; h++) {
    const levelA: string[] = [];
    const levelB: string[] = [];
    const levelC: string[] = [];
    const levelD: string[] = [];
    const nodesActingFor: string[] = [];

    // Level B: occupants of H
    for (const occ of occupants[h]) {
      levelB.push(occ);
    }

    // Level A: planets in the star of occupant(s) of H
    for (const occ of occupants[h]) {
      const inStar = planetsInStarOf[occ] ?? [];
      for (const p of inStar) {
        if (!levelA.includes(p)) levelA.push(p);
      }
    }

    // Level D: owner (sign lord) of H
    const owner = houseOwner[h];
    levelD.push(owner);

    // Level C: planets in the star of the owner of H
    const inStarOfOwner = planetsInStarOf[owner] ?? [];
    for (const p of inStarOfOwner) {
      if (!levelC.includes(p)) levelC.push(p);
    }

    // Node agency: if a node acts for this house, include it
    for (const node of NODES) {
      if (nodeActsForHouses[node].has(h)) {
        nodesActingFor.push(node);
      }
    }

    // Ordered: A → B → C → D, de-duplicated, preserving strength order
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const list of [levelA, levelB, levelC, levelD]) {
      for (const p of list) {
        if (!seen.has(p)) {
          seen.add(p);
          ordered.push(p);
        }
      }
    }
    // Add node agents that aren't already present
    for (const n of nodesActingFor) {
      if (!seen.has(n)) {
        seen.add(n);
        ordered.push(n);
      }
    }

    result.push({ house: h, levelA, levelB, levelC, levelD, nodesActingFor, ordered });
  }

  return result;
}
