/**
 * Core astronomical calculations: Julian Day, planetary longitudes,
 * ascendant, obliquity, and sidereal time.
 *
 * Planetary positions use VSOP87 (Bretagnon & Francou 1988) for Sun and
 * planets (Mercury–Saturn), giving sub-arcminute accuracy.
 *
 * Moon uses ELP-2000/82 (Chapront-Touzé & Chapront) via Meeus Ch. 47,
 * ~60 periodic terms for ~10 arcsecond longitude accuracy.
 *
 * Nutation uses IAU 1980 series (Meeus Ch. 22).
 * Rahu/Ketu default to true node (mean node + perturbations).
 */

import { DEG } from "./constants.ts";
import { vsop87SunLongitude, vsop87PlanetLongitude } from "./vsop87.ts";
import {
  elp82MoonLongitude,
  nutation,
  trueObliquity,
  trueNode,
  meanNode,
} from "./elp82.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

export const rad = (d: number) => d * DEG;
export const deg = (r: number) => r / DEG;
export const norm360 = (d: number) => ((d % 360) + 360) % 360;

// ─── Julian Day ─────────────────────────────────────────────────────────────

export function julianDay(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0,
): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const D = day + (hour + minute / 60 + second / 3600) / 24;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

/** Julian centuries from J2000.0. */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

// ─── Obliquity ──────────────────────────────────────────────────────────────

export function obliquity(T: number): number {
  return trueObliquity(T);
}

// ─── Sidereal Time ──────────────────────────────────────────────────────────

/** Greenwich Mean Sidereal Time in degrees for a given JD (UT). */
export function gmst(jd: number): number {
  const D = jd - 2451545.0;
  const T = D / 36525.0;
  return norm360(
    280.46061837 + 360.98564736629 * D + 0.000387933 * T * T - T * T * T / 38710000,
  );
}

/** Greenwich Apparent Sidereal Time (GMST + nutation correction). */
export function gast(jd: number): number {
  const T = julianCenturies(jd);
  const { deltaPsi } = nutation(T);
  const eps = obliquity(T);
  return norm360(gmst(jd) + deltaPsi * Math.cos(rad(eps)));
}

/** Local Apparent Sidereal Time in degrees. */
export function lst(jd: number, lonEast: number): number {
  return norm360(gast(jd) + lonEast);
}

// ─── Ascendant ──────────────────────────────────────────────────────────────

export function ascendant(jd: number, latDeg: number, lonDeg: number): number {
  const ramc = rad(lst(jd, lonDeg));
  const eps = rad(obliquity(julianCenturies(jd)));
  const phi = rad(latDeg);
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(ramc)),
  );
  return norm360(deg(asc));
}

// ─── Sun (VSOP87 geocentric ecliptic longitude) ─────────────────────────────

export function sunLongitude(T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  return vsop87SunLongitude(jd);
}

// ─── Moon (geocentric ecliptic longitude) ───────────────────────────────────

export function moonLongitude(T: number): number {
  return elp82MoonLongitude(T);
}

// ─── Rahu (Mean Ascending Node) ─────────────────────────────────────────────

export type NodeType = 'true' | 'mean';

export function rahuLongitude(T: number, nodeType: NodeType = 'true'): number {
  return nodeType === 'true' ? trueNode(T) : meanNode(T);
}

// ─── Planetary positions via VSOP87 ─────────────────────────────────────────

/** Geocentric ecliptic longitude of a planet (degrees 0-360). */
export function planetLongitude(planet: string, T: number): number {
  const jd = T * 36525.0 + 2451545.0;
  return vsop87PlanetLongitude(planet, jd);
}

// ─── Public: all tropical longitudes ────────────────────────────────────────

export interface RawPositions {
  sun: number; moon: number;
  mercury: number; venus: number; mars: number;
  jupiter: number; saturn: number;
  rahu: number; ketu: number;
  ascendant: number;
}

export function tropicalPositions(
  jd: number, lat: number, lon: number,
  nodeType: NodeType = 'true',
): RawPositions {
  const T = julianCenturies(jd);
  const sun     = sunLongitude(T);
  const moon    = moonLongitude(T);
  const rahu    = rahuLongitude(T, nodeType);
  const ketu    = norm360(rahu + 180);
  const mercury = planetLongitude('mercury', T);
  const venus   = planetLongitude('venus', T);
  const mars    = planetLongitude('mars', T);
  const jupiter = planetLongitude('jupiter', T);
  const saturn  = planetLongitude('saturn', T);
  const asc     = ascendant(jd, lat, lon);
  return { sun, moon, mercury, venus, mars, jupiter, saturn, rahu, ketu, ascendant: asc };
}

/** Detect retrograde by checking longitude change over a small interval. */
export function isRetrograde(planet: string, T: number): boolean {
  if (planet === 'sun' || planet === 'moon' || planet === 'rahu' || planet === 'ketu' || planet === 'ascendant') {
    return planet === 'rahu' || planet === 'ketu';
  }
  const dt = 1 / 36525; // ~1 day in centuries
  const l1 = planetLongitude(planet, T - dt);
  const l2 = planetLongitude(planet, T + dt);
  let diff = l2 - l1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

/** Approximate daily speed of a planet (degrees/day). */
export function planetSpeed(planet: string, T: number): number {
  if (planet === 'sun') return 0.9856;
  if (planet === 'moon') return 13.176;
  if (planet === 'rahu' || planet === 'ketu') return -0.053;
  if (planet === 'ascendant') return 0;
  const dt = 1 / 36525;
  const l1 = planetLongitude(planet, T - dt);
  const l2 = planetLongitude(planet, T + dt);
  let diff = l2 - l1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff / 2;
}

// ─── Sunrise / Sunset (simplified) ─────────────────────────────────────────

export function sunriseSunset(jd: number, lat: number, lon: number): { sunrise: string; sunset: string } {
  const T = julianCenturies(jd);
  const M = norm360(357.5291 + 35999.0503 * T);
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lambda = norm360(M + C + 180 + 102.9372);
  const decl = deg(Math.asin(Math.sin(rad(23.44)) * Math.sin(rad(lambda))));
  const cosH = (Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) /
               (Math.cos(rad(lat)) * Math.cos(rad(decl)));
  const H = deg(Math.acos(Math.max(-1, Math.min(1, cosH))));

  const Jnoon = 2451545.0 + Math.round(jd - 2451545.0 - lon / 360) + lon / 360;
  const Jtransit = Jnoon + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lambda));
  const Jrise = Jtransit - H / 360;
  const Jset  = Jtransit + H / 360;

  const toHHMM = (j: number) => {
    const frac = (j + 0.5) % 1;
    const totalMin = Math.round(frac * 1440);
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };
  return { sunrise: toHHMM(Jrise), sunset: toHHMM(Jset) };
}
