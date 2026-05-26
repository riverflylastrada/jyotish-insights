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

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tropical year length in days (same as PyJHora const.tropical_year). */
const TROPICAL_YEAR = 365.24219;

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

/**
 * Compute Varshesh (Year Lord) via Panchadhikari method.
 *
 * 5 candidates (in priority order):
 * 1. Lord of Sun-sign (day) or Moon-sign (night)
 * 2. Lord of natal lagna sign
 * 3. Lord of Muntha sign
 * 4. Lord of annual ascendant sign
 * 5. Trirashi lord of the annual ascendant (day/night)
 *
 * Then filter by which candidate occupies or has 7th-aspect on the lagna house.
 * If exactly one → Year Lord. Otherwise fallback to candidates[0].
 *
 * Note: PyJHora uses full Panchavargeeya Bala for tie-breaking;
 * this implementation uses a simplified occupancy/aspect check.
 */
function computeYearLord(
  annualPlanets: VarshphalPlanet[],
  annualAscSign: number,
  natalAscSign: number,
  munthaSign: number,
  isNightBirth: boolean,
): string {
  // Build planet-to-house map
  const planetHouseMap: Record<string, number> = {};
  for (const p of annualPlanets) {
    planetHouseMap[p.planet] = p.houseNumber;
  }

  // Gather 5 candidates (planet names, unique, in order)
  const candidates: string[] = [];
  const addCandidate = (planet: string) => {
    if (!candidates.includes(planet)) candidates.push(planet);
  };

  // 1. Lord of Sun-sign (day) or Moon-sign (night)
  if (isNightBirth) {
    const moonPlanet = annualPlanets.find(p => p.planet === "moon");
    if (moonPlanet) addCandidate(getSignLord(moonPlanet.signNumber));
  } else {
    const sunPlanet = annualPlanets.find(p => p.planet === "sun");
    if (sunPlanet) addCandidate(getSignLord(sunPlanet.signNumber));
  }

  // 2. Lord of natal lagna sign
  addCandidate(getSignLord(natalAscSign));

  // 3. Lord of Muntha sign
  addCandidate(getSignLord(munthaSign));

  // 4. Lord of annual ascendant sign
  addCandidate(getSignLord(annualAscSign));

  // 5. Trirashi lord of annual ascendant
  const triLord = isNightBirth
    ? TRI_RASI_NIGHT[annualAscSign]
    : TRI_RASI_DAY[annualAscSign];
  if (triLord !== undefined) {
    addCandidate(PLANET_BY_INDEX[triLord] ?? "sun");
  }

  // Filter: which candidates occupy or have 7th aspect on lagna (house 1)?
  const aspecting = candidates.filter(c => {
    const h = planetHouseMap[c];
    if (h === undefined) return false;
    return h === 1 || h === 7; // occupies lagna or aspects from 7th
  });

  if (aspecting.length === 1) return aspecting[0];

  // Fallback: first candidate (primary Panchadhikari candidate)
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
  const timeParts = details.timeOfBirth.split(":").map(Number);
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

  // Year Lord (Varshesh)
  // Determine night birth: compare birth local time to sunrise/sunset at VP moment
  // Simplified: use birth hour vs 6:00/18:00 as a rough day/night check
  const birthLocalHour = hour + minute / 60 + second / 3600;
  const isNightBirth = birthLocalHour >= 18 || birthLocalHour < 6;

  const yearLord = computeYearLord(
    planets,
    annualAscSign,
    natalAscSign,
    munthaSign,
    isNightBirth,
  );

  return {
    years,
    varshaPraveshJd: vpJd,
    annualAscSign,
    annualAscDeg,
    planets,
    munthaSign,
    munthaHouse,
    yearLord,
  };
}
