/**
 * Varshphal (Tajik Annual Chart) — Solar Return, Muntha, Varshesh (Year Lord).
 *
 * Computes the annual chart for a given year by finding the exact moment the
 * Sun returns to its natal sidereal longitude (Varsha Pravesh), then computing
 * all planet positions and the ascendant at that instant.
 *
 * Validated against PyJHora v4.8.5 (Lahiri ayanamsa).
 */

import {
  julianDay, julianCenturies, tropicalPositions,
  isRetrograde, norm360, sunLongitude, lst, obliquity,
  type NodeType,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada, getSignLord, wholeSignHouse,
  type AyanamsaKey,
} from "./vedic.ts";
import type { BirthDetails } from "./engine.ts";
import { computeSahams, type SahamsData } from "./sahams.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tropical year length in days (same as PyJHora const.tropical_year). */
const TROPICAL_YEAR = 365.24219;

/** Sidereal year length in days (PyJHora const.sidereal_year — used for Year Lord JD). */
const SIDEREAL_YEAR = 365.256364;

/** Planet index → name mapping for Year Lord. */
const PLANET_BY_INDEX: Record<number, string> = {
  0: "sun", 1: "moon", 2: "mars", 3: "mercury",
  4: "jupiter", 5: "venus", 6: "saturn",
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VarshphalPlanet {
  planet: string;
  longitude: number;
  signNumber: number;
  signName: string;
  signDegree: number;
  nakshatra: string;
  nakshatraPada: 1 | 2 | 3 | 4;
  houseNumber: number;
  isRetrograde: boolean;
}

export interface VarshphalData {
  /** Years elapsed since birth for this annual chart. */
  years: number;
  /** Julian Day of the Varsha Pravesh (solar return) instant. */
  varshaPraveshJd: number;
  /** Annual chart ascendant sign (1–12). */
  annualAscSign: number;
  /** Annual chart ascendant degree within sign. */
  annualAscDeg: number;
  /** All 9 planet positions in the annual chart. */
  planets: VarshphalPlanet[];
  /** Muntha sign (1–12). */
  munthaSign: number;
  /** Muntha's house placement in the annual chart. */
  munthaHouse: number;
  /** Year Lord (Varshesh) planet name (Panchadhikari method). */
  yearLord: string;
  /** Tajik yogas detected on the annual chart. */
  tajikYogas?: import("./tajik_yogas.ts").TajikYogaResult;
  /** 36 Sahams (sensitive points) computed on the annual chart. */
  sahams?: SahamsData;
}

// ─── Solar Return (Varsha Pravesh) ──────────────────────────────────────────

/**
 * Find the JD of the Varsha Pravesh: the moment the Sun returns to its
 * natal sidereal longitude for the Nth time.
 *
 * Algorithm: Start from an estimate (birth JD + years * tropical_year),
 * then use Newton-Raphson iteration on the difference between the Sun's
 * current sidereal longitude and the natal target.
 */
function findSolarReturnJd(
  birthJd: number,
  natalSunSidereal: number,
  years: number,
  ayaKey: AyanamsaKey,
): number {
  // Initial estimate: years is 1-indexed (years=N → the Nth solar return
  // = (N-1) tropical years from birth), matching PyJHora convention.
  let jd = birthJd + (years - 1) * TROPICAL_YEAR;

  // Newton-Raphson: find jd where sunSidereal(jd) == natalSunSidereal
  for (let iter = 0; iter < 50; iter++) {
    const T = julianCenturies(jd);
    const tropSun = sunLongitude(T);
    const aya = ayanamsa(ayaKey, jd);
    const sidSun = norm360(toSidereal(tropSun, aya));

    let diff = sidSun - natalSunSidereal;
    // Normalize to [-180, 180]
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 1e-8) break; // converged (<0.00004 arcsec)

    // Sun moves ~0.9856°/day in longitude
    const step = diff / 0.9856;
    jd -= step;
  }

  return jd;
}

// ─── Muntha ─────────────────────────────────────────────────────────────────

/**
 * Muntha sign: natal lagna sign advanced one sign per completed year.
 * @param natalAscSign - Natal lagna sign (1–12)
 * @param years - Years elapsed since birth
 * @returns Muntha sign (1–12)
 */
function computeMuntha(natalAscSign: number, years: number): number {
  return ((natalAscSign - 1 + years) % 12) + 1;
}

// ─── Varshesh (Year Lord, Panchadhikari method) ─────────────────────────────

/** Trirashi daytime lords (sign 1–12 → planet index). */
const TRI_RASI_DAY: Record<number, number> = {
  1: 0, 2: 5, 3: 6, 4: 1, 5: 0, 6: 5,
  7: 6, 8: 1, 9: 4, 10: 2, 11: 4, 12: 2,
};

/** Trirashi nighttime lords (sign 1–12 → planet index). */
const TRI_RASI_NIGHT: Record<number, number> = {
  1: 4, 2: 1, 3: 6, 4: 2, 5: 4, 6: 1,
  7: 3, 8: 2, 9: 0, 10: 5, 11: 0, 12: 5,
};

// ─── Panchavargeeya Bala (PVB) ──────────────────────────────────────────────

/**
 * House-strength table [planet 0–6][sign 0–11].
 * Values: 5=OWNER, 4=MULATRIKONA, 3=FRIEND, 2=NEUTRAL, 1=ENEMY, 0=DEBILITATED.
 * Matches PyJHora's house.house_strengths_of_planets.
 */
const HOUSE_STRENGTH: number[][] = [
  /* Sun */     [4,1,2,2,5,2,0,3,3,1,1,3],
  /* Moon */    [2,4,3,5,3,3,2,0,2,2,2,2],
  /* Mars */    [5,2,1,0,3,1,2,5,3,4,2,3],
  /* Mercury */ [2,3,5,1,3,5,3,2,2,2,2,0],
  /* Jupiter */ [3,1,1,4,3,3,1,3,5,0,2,5],
  /* Venus */   [2,5,3,1,1,0,5,2,3,3,3,4],
  /* Saturn */  [0,3,3,1,1,3,4,1,2,5,5,2],
];

const _HS_FRIEND = 3;
const _HS_ENEMY = 1;

/** Deep debilitation longitudes (Sun–Saturn), absolute sidereal. */
const DEBILITATION_LONGS = [190.0, 213.0, 118.0, 345.0, 275.0, 177.0, 20.0];

/** Hadda (terms) lords per sign (0-indexed). Each entry: [planetIdx, boundDeg]. */
const HADDA_LORDS: [number, number][][] = [
  [[4,6],[5,12],[3,20],[2,25],[6,30]], [[5,8],[3,14],[5,22],[6,27],[2,30]],
  [[3,6],[5,12],[4,17],[2,24],[6,30]], [[2,7],[5,13],[3,19],[4,26],[6,30]],
  [[4,6],[5,11],[6,18],[3,24],[2,30]], [[3,7],[5,17],[4,21],[2,28],[6,30]],
  [[6,6],[3,14],[4,21],[5,28],[2,30]], [[2,7],[5,11],[3,19],[4,24],[6,30]],
  [[4,12],[5,17],[3,21],[2,26],[6,30]], [[3,7],[4,14],[5,22],[6,26],[2,30]],
  [[3,7],[5,13],[4,20],[2,25],[6,50]], [[5,12],[4,16],[3,19],[2,28],[6,30]],
];

/** Planetary friendships: planet → list of friends (indices). */
const FRIENDLY: Record<number, number[]> = {
  0:[1,2,4], 1:[0,3], 2:[0,1,4], 3:[0,5], 4:[0,1,2], 5:[3,6], 6:[3,5],
};

/** Planetary enmities: planet → list of enemies (indices). */
const ENEMY_OF: Record<number, number[]> = {
  0:[5,6], 1:[], 2:[3], 3:[1], 4:[3,5], 5:[0,1], 6:[0,1,2],
};

/** PVB strength threshold (must exceed to select via PVB). */
const PVB_THRESHOLD = 10;

/** Map planet name → index (Sun=0..Saturn=6). */
const PLANET_INDEX: Record<string, number> = {
  sun:0, moon:1, mars:2, mercury:3, jupiter:4, venus:5, saturn:6,
};

/**
 * Compute Panchavargeeya Bala for all 7 planets at given sidereal longitudes.
 *
 * Five components (Kshetra, Uchcha, Hadda, Drekkana, Navamsa) averaged.
 * Matches PyJHora's strength.pancha_vargeeya_bala.
 */
function computePVB(longitudes: number[]): number[] {
  const pvb: number[] = [];
  for (let p = 0; p < 7; p++) {
    const lon = longitudes[p];
    const sign0 = Math.floor(lon / 30);
    const deg = lon % 30;
    const hs = HOUSE_STRENGTH[p][sign0];

    // 1. Kshetra Bala (dignity in D1)
    const kb = hs > _HS_FRIEND ? 30 : hs === _HS_FRIEND ? 15 : hs === _HS_ENEMY ? 7.5 : 0;

    // 2. Uchcha Bala (Saravali formula: distance from debilitation / 3)
    let pd = (lon + 360 - DEBILITATION_LONGS[p]) % 360;
    if (pd > 180) pd = 360 - pd;
    const ub = pd / 3;

    // 3. Hadda Bala (terms)
    let haddaLord = HADDA_LORDS[sign0][HADDA_LORDS[sign0].length - 1][0];
    for (const [lord, bound] of HADDA_LORDS[sign0]) {
      if (deg <= bound) { haddaLord = lord; break; }
    }
    const hb = p === haddaLord ? 15
      : (FRIENDLY[p] ?? []).includes(haddaLord) ? 7.5
      : (ENEMY_OF[p] ?? []).includes(haddaLord) ? 3.75 : 0;

    // 4. Drekkana Bala (dignity in D3 — Parashara method)
    const d3Sign = deg < 10 ? sign0 : deg < 20 ? (sign0 + 4) % 12 : (sign0 + 8) % 12;
    const d3hs = HOUSE_STRENGTH[p][d3Sign];
    const db = d3hs > _HS_FRIEND ? 10 : d3hs === _HS_FRIEND ? 5 : d3hs === _HS_ENEMY ? 2.5 : 0;

    // 5. Navamsa Bala (dignity in D9)
    const d9Sign = (sign0 * 9 + Math.floor(deg / (30 / 9))) % 12;
    const d9hs = HOUSE_STRENGTH[p][d9Sign];
    const nb = d9hs > _HS_FRIEND ? 5 : d9hs === _HS_FRIEND ? 2.5 : d9hs === _HS_ENEMY ? 1.25 : 0;

    pvb.push((kb + ub + hb + db + nb) / 4.0);
  }
  return pvb;
}

// ─── Tajik Aspect Helpers ───────────────────────────────────────────────────

/**
 * Check if planet at `planetSign` has Tajik benefic aspect on `targetSign`.
 * Benefic = trine (5th/9th) or sextile (3rd/11th) from planet → target.
 * Distance formula: (target − planet + 12) % 12 ∈ {2, 4, 8, 10}.
 */
function hasBeneficAspect(planetSign: number, targetSign: number): boolean {
  const dist = (targetSign - planetSign + 12) % 12;
  return dist === 2 || dist === 4 || dist === 8 || dist === 10;
}

/**
 * Check if planet at `planetSign` has Tajik malefic aspect on `targetSign`.
 * Malefic = conjunction (1st), square (4th/10th), opposition (7th).
 * Distance formula: (target − planet + 12) % 12 ∈ {0, 3, 6, 9}.
 */
function hasMaleficAspect(planetSign: number, targetSign: number): boolean {
  const dist = (targetSign - planetSign + 12) % 12;
  return dist === 0 || dist === 3 || dist === 6 || dist === 9;
}

// ─── Varshesh (Year Lord) ───────────────────────────────────────────────────

/**
 * Compute Varshesh (Year Lord) via Panchadhikari + Panchavargeeya Bala tie-break.
 *
 * Algorithm (matches PyJHora tajaka._get_the_lord_of_tajaka_chart):
 * 1. Build 5 candidates from the Year Lord chart (at birthJd + years*sidereal_year)
 * 2. Filter by Tajik benefic aspect on annual ascendant → single → lord
 * 3. If none benefic → filter by malefic aspect → single → lord
 * 4. Multiple → compute PVB for all candidates, highest above threshold wins
 * 5. Fallback → candidates[0]
 *
 * Note: The Year Lord chart uses a JD computed with sidereal year (matching
 * PyJHora's tajaka.year_value = const.sidereal_year), which differs slightly
 * from the solar return JD used for the annual chart display.
 */
function computeYearLord(
  birthJd: number,
  years: number,
  natalAscSign: number,
  lat: number,
  lon: number,
  tzOffset: number,
  ayaKey: AyanamsaKey,
  nodeType: NodeType,
): string {
  // Year Lord chart JD: birth_jd_local + years*sidereal_year - tz/24
  // Since birth_jd_local = birthJd(UT) + tz/24, the tz terms cancel:
  //   chart_jd = birthJd(UT) + years * SIDEREAL_YEAR
  const chartJd = birthJd + years * SIDEREAL_YEAR;

  // Compute positions at chartJd
  const chartT = julianCenturies(chartJd);
  const chartAya = ayanamsa(ayaKey, chartJd);
  const chartTrop = tropicalPositions(chartJd, lat, lon, nodeType);
  const chartAscSid = norm360(toSidereal(chartTrop.ascendant, chartAya));
  const annAscSign = signNumber(chartAscSid);

  // Get sidereal longitudes for Sun–Saturn
  const planetKeys = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
  const longitudes: number[] = planetKeys.map(key => {
    const tropLon = (chartTrop as unknown as Record<string, number>)[key];
    return norm360(toSidereal(tropLon, chartAya));
  });
  const planetSigns: Record<string, number> = {};
  for (let i = 0; i < planetKeys.length; i++) {
    planetSigns[planetKeys[i]] = signNumber(longitudes[i]);
  }

  // Night determination: extract time-of-day from "local JD" and compare with
  // approximate sunrise/sunset (PyJHora convention).
  const localJd = birthJd + tzOffset / 24 + years * SIDEREAL_YEAR;
  const tobHrs = ((localJd % 1) * 24 + 12) % 24;

  // Approximate day length from solar declination
  const tropSunForDec = (chartTrop as unknown as Record<string, number>).sun;
  const obliq = obliquity(chartT);
  const decRad = Math.asin(Math.sin(obliq * Math.PI / 180) * Math.sin(tropSunForDec * Math.PI / 180));
  const latRad = lat * Math.PI / 180;
  let cosHA = -Math.tan(latRad) * Math.tan(decRad);
  cosHA = Math.max(-1, Math.min(1, cosHA));
  const haRad = Math.acos(cosHA);
  const dayLen = 2 * (haRad * 180 / Math.PI) / 15;
  const sunrise = 12 - dayLen / 2;
  const sunset = 12 + dayLen / 2;
  const isNight = tobHrs < sunrise || tobHrs > sunset;

  // Muntha for candidates (PyJHora: (annAscSign - 1 + years) % 12 + 1)
  const munthaSign = ((annAscSign - 1 + years) % 12) + 1;

  // Gather 5 candidates (planet names, unique, in order)
  const candidates: string[] = [];
  const addCandidate = (planet: string) => {
    if (!candidates.includes(planet)) candidates.push(planet);
  };

  // 1. Lord of Moon-sign (night) or Sun-sign (day)
  if (isNight) {
    addCandidate(getSignLord(planetSigns["moon"]));
  } else {
    addCandidate(getSignLord(planetSigns["sun"]));
  }

  // 2. Lord of natal lagna sign
  addCandidate(getSignLord(natalAscSign));

  // 3. Lord of Muntha sign
  addCandidate(getSignLord(munthaSign));

  // 4. Lord of annual ascendant sign
  addCandidate(getSignLord(annAscSign));

  // 5. Trirashi lord of annual ascendant
  const triLord = isNight
    ? TRI_RASI_NIGHT[annAscSign]
    : TRI_RASI_DAY[annAscSign];
  if (triLord !== undefined) {
    addCandidate(PLANET_BY_INDEX[triLord] ?? "sun");
  }

  // Filter by Tajik benefic aspect on annual ascendant
  const benefic = candidates.filter(c => hasBeneficAspect(planetSigns[c], annAscSign));
  if (benefic.length === 1) return benefic[0];

  // If no benefic, try malefic aspect
  if (benefic.length === 0) {
    const malefic = candidates.filter(c => hasMaleficAspect(planetSigns[c], annAscSign));
    if (malefic.length === 1) return malefic[0];
  }

  // Multiple benefic/malefic or no aspects: PVB tie-break among ALL candidates
  const pvb = computePVB(longitudes);
  let bestCandidate = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const idx = PLANET_INDEX[c];
    if (idx !== undefined && pvb[idx] > bestScore) {
      bestScore = pvb[idx];
      bestCandidate = c;
    }
  }

  // Only select via PVB if above threshold
  if (bestScore > PVB_THRESHOLD) return bestCandidate;

  // Fallback: first candidate
  return candidates[0] ?? "sun";
}

// ─── Main: compute Varshphal ────────────────────────────────────────────────

const PLANET_KEYS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

/**
 * Compute the Varshphal (annual Tajik chart) for the given year.
 * @param details - Birth details (same as used for natal chart)
 * @param years - Years elapsed since birth (the Varsha containing `now`).
 *               If omitted, defaults to the current Varsha year.
 */
export function computeVarshphal(
  details: BirthDetails,
  years?: number,
): VarshphalData {
  // Parse birth date/time → Julian Day
  const [y, m, d] = details.dateOfBirth.split("-").map(Number);
  const timeParts = (details.timeOfBirth || "12:00:00").split(":").map(Number);
  const hour = timeParts[0] ?? 0;
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;
  const tzOffset = details.placeOfBirth.timezoneOffset;
  const utHour = hour - tzOffset;
  const birthJd = julianDay(y, m, d, utHour, minute, second);

  // Determine natal Sun sidereal longitude
  const birthT = julianCenturies(birthJd);
  const natalTropSun = sunLongitude(birthT);
  const birthAya = ayanamsa(details.ayanamsa as AyanamsaKey, birthJd);
  const natalSunSidereal = norm360(toSidereal(natalTropSun, birthAya));

  // Determine natal ascendant sign (for Muntha)
  const lat = details.placeOfBirth.latitude;
  const lon = details.placeOfBirth.longitude;
  const nodeType = (details as { nodeType?: NodeType }).nodeType ?? "true";
  const natalTrop = tropicalPositions(birthJd, lat, lon, nodeType);
  const natalAscSid = toSidereal(natalTrop.ascendant, birthAya);
  const natalAscSign = signNumber(natalAscSid);

  // Determine years if not provided: the Varsha year containing "today".
  // Convention: years=N means the Nth solar return (1-indexed, matching PyJHora).
  // For someone born 1983 and current date in Aug 2025–Aug 2026, years=43.
  if (years === undefined) {
    const now = new Date();
    const nowJd = now.getTime() / 86400000 + 2440587.5;
    const approxReturns = (nowJd - birthJd) / TROPICAL_YEAR;
    // Floor gives the number of COMPLETED returns; +1 for 1-indexing
    years = Math.floor(approxReturns) + 1;
    if (years < 1) years = 1;
  }

  // Find the Varsha Pravesh JD (solar return)
  const vpJd = findSolarReturnJd(birthJd, natalSunSidereal, years, details.ayanamsa as AyanamsaKey);

  // Compute positions at Varsha Pravesh
  const vpT = julianCenturies(vpJd);
  const vpAya = ayanamsa(details.ayanamsa as AyanamsaKey, vpJd);
  const vpTrop = tropicalPositions(vpJd, lat, lon, nodeType);
  const vpAscSid = toSidereal(vpTrop.ascendant, vpAya);
  const annualAscSign = signNumber(vpAscSid);
  const annualAscDeg = signDegree(vpAscSid);

  // Build planet positions
  const planets: VarshphalPlanet[] = PLANET_KEYS.map((key) => {
    const tropLon = (vpTrop as unknown as Record<string, number>)[key];
    const sidLon = norm360(toSidereal(tropLon, vpAya));
    const sn = signNumber(sidLon);
    const sd = signDegree(sidLon);
    const nIdx = nakshatraIndex(sidLon);
    const retro = isRetrograde(key, vpT);

    return {
      planet: key,
      longitude: sidLon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: sd,
      nakshatra: nakshatraName(nIdx),
      nakshatraPada: nakshatraPada(sidLon),
      houseNumber: wholeSignHouse(sn, annualAscSign),
      isRetrograde: retro,
    };
  });

  // Muntha
  const munthaSign = computeMuntha(natalAscSign, years);
  const munthaHouse = wholeSignHouse(munthaSign, annualAscSign);

  // Year Lord (Varshesh) — computed at a separate JD (birthJd + years*sidereal_year)
  // matching PyJHora's tajaka.lord_of_the_year convention with full PVB tie-break.
  const yearLord = computeYearLord(
    birthJd,
    years,
    natalAscSign,
    lat,
    lon,
    tzOffset,
    details.ayanamsa as AyanamsaKey,
    nodeType,
  );

  // Sahams — computed from NATAL planet positions (traditional Tajik method).
  // Day/night: Sun in houses 7–12 = above horizon = day birth.
  const sunSidNatal = norm360(toSidereal(natalTrop.sun, birthAya));
  const sunHouseNatal = wholeSignHouse(signNumber(sunSidNatal), natalAscSign);
  const isDayBirth = sunHouseNatal >= 7 && sunHouseNatal <= 12;

  const natalLons = {
    ascendant: natalAscSid,
    sun: sunSidNatal,
    moon: norm360(toSidereal(natalTrop.moon, birthAya)),
    mars: norm360(toSidereal(natalTrop.mars, birthAya)),
    mercury: norm360(toSidereal(natalTrop.mercury, birthAya)),
    jupiter: norm360(toSidereal(natalTrop.jupiter, birthAya)),
    venus: norm360(toSidereal(natalTrop.venus, birthAya)),
    saturn: norm360(toSidereal(natalTrop.saturn, birthAya)),
  };
  const sahamsData = computeSahams(natalLons, natalAscSign, isDayBirth);

  return {
    years,
    varshaPraveshJd: vpJd,
    annualAscSign,
    annualAscDeg,
    planets,
    munthaSign,
    munthaHouse,
    yearLord,
    sahams: sahamsData,
  };
}
