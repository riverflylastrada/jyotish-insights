/**
 * Vedic astrology layer: ayanamsa, nakshatra assignment,
 * house assignment, dignity, combustion.
 */

import {
  SIGN_NAMES, NAKSHATRA_NAMES, NAKSHATRA_LORDS,
  EXALTATION, DEBILITATION, OWN_SIGNS, MOOLTRIKONA,
  COMBUSTION_ORBS, FRIENDSHIPS,
} from "./constants.ts";
import { norm360, julianCenturies } from "./astronomy.ts";

// ─── Ayanamsa ───────────────────────────────────────────────────────────────

export type AyanamsaKey = 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';

/**
 * Lahiri (Chitrapaksha) ayanamsa — calibrated to Swiss Ephemeris SE_SIDM_LAHIRI.
 *
 * Epoch value at J2000.0: 23.857092° (23°51'25.5"), matching SwissEph
 * get_ayanamsa_ut(2451545.0) = 23.857092°. This supersedes the earlier
 * IAE-approximate 23.85306° (23°51'11") that produced a systematic +0.004°
 * offset in all sidereal positions.
 *
 * Precession uses the IAU 2006 general precession in longitude:
 *   p_A(T) = 5028.796195″T + 1.1054348″T² (arcseconds, T in Julian centuries)
 * converted to degrees: 1.396888°T + 0.000307°T².
 */
function lahiri(T: number): number {
  return 23.857092 + 1.396888 * T + 0.000307 * T * T;
}

/** Raman ayanamsa: ~22°27' at J2000.0. */
function raman(T: number): number {
  return 22.45 + T * (50.29 / 3600) * 100;
}

/** Krishnamurti (KP): slightly offset from Lahiri. */
function krishnamurti(T: number): number {
  return 23.86028 + T * (50.29 / 3600) * 100;
}

/** Yukteshwar: ~22°27'59" at J2000.0. */
function yukteshwar(T: number): number {
  return 22.46639 + T * (50.29 / 3600) * 100;
}

export function ayanamsa(key: AyanamsaKey, jd: number): number {
  const T = julianCenturies(jd);
  switch (key) {
    case 'lahiri':       return lahiri(T);
    case 'raman':        return raman(T);
    case 'krishnamurti': return krishnamurti(T);
    case 'yukteshwar':   return yukteshwar(T);
  }
}

/** Convert tropical longitude → sidereal. */
export function toSidereal(tropLon: number, aya: number): number {
  return norm360(tropLon - aya);
}

// ─── Sign helpers ───────────────────────────────────────────────────────────

export function signNumber(siderealLon: number): number {
  return Math.floor(siderealLon / 30) + 1;
}

export function signName(num: number): string {
  return SIGN_NAMES[(num - 1) % 12];
}

export function signDegree(siderealLon: number): number {
  return siderealLon % 30;
}

// ─── Nakshatra ──────────────────────────────────────────────────────────────

export function nakshatraIndex(siderealLon: number): number {
  return Math.floor(siderealLon / (360 / 27));
}

export function nakshatraName(idx: number): string {
  return NAKSHATRA_NAMES[idx % 27];
}

export function nakshatraPada(siderealLon: number): 1 | 2 | 3 | 4 {
  const span = 360 / 27;
  const within = siderealLon % span;
  return (Math.floor(within / (span / 4)) + 1) as 1 | 2 | 3 | 4;
}

export function nakshatraLord(idx: number): string {
  return NAKSHATRA_LORDS[idx % 9];
}

// ─── House (Whole Sign) ─────────────────────────────────────────────────────

export function wholeSignHouse(planetSign: number, ascSign: number): number {
  return ((planetSign - ascSign + 12) % 12) + 1;
}

// ─── Dignity ────────────────────────────────────────────────────────────────

export type Dignity = 'exalted' | 'debilitated' | 'own_sign' | 'mooltrikona' | 'friend' | 'neutral' | 'enemy';

export function dignity(planet: string, siderealSign: number, degInSign: number): Dignity | undefined {
  if (planet === 'rahu' || planet === 'ketu' || planet === 'ascendant') return undefined;

  const exalt = EXALTATION[planet];
  if (exalt && exalt[0] === siderealSign) return 'exalted';

  if (DEBILITATION[planet] === siderealSign) return 'debilitated';

  const mt = MOOLTRIKONA[planet];
  if (mt && mt[0] === siderealSign && degInSign >= mt[1] && degInSign <= mt[2]) return 'mooltrikona';

  if (OWN_SIGNS[planet]?.includes(siderealSign)) return 'own_sign';

  const f = FRIENDSHIPS[planet];
  if (!f) return undefined;
  const lord = signLord(siderealSign);
  if (f.friends.includes(lord)) return 'friend';
  if (f.enemies.includes(lord)) return 'enemy';
  if (f.neutrals.includes(lord)) return 'neutral';
  return undefined;
}

/** Traditional sign lordship. */
function signLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
    9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

export function getSignLord(sign: number): string {
  return signLord(sign);
}

// ─── Combustion ─────────────────────────────────────────────────────────────

export function isCombust(planet: string, planetLon: number, sunLon: number, retro: boolean): boolean {
  if (planet === 'sun' || planet === 'rahu' || planet === 'ketu' || planet === 'ascendant') return false;
  let orb = COMBUSTION_ORBS[planet];
  if (orb === undefined) return false;
  if (planet === 'mercury' && retro) orb = 12;
  if (planet === 'venus' && retro) orb = 8;
  let diff = Math.abs(planetLon - sunLon);
  if (diff > 180) diff = 360 - diff;
  return diff < orb;
}
