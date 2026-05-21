/**
 * Core astronomical calculations: Julian Day, planetary longitudes,
 * ascendant, obliquity, and sidereal time.
 *
 * Planetary positions use the Keplerian orbital elements approach from
 * Meeus "Astronomical Algorithms" and NASA/JPL tables, giving accuracy
 * of ~0.1–0.5° — more than sufficient for astrological purposes.
 */

import { DEG } from "./constants.ts";

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
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
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

/** Local Sidereal Time in degrees. */
export function lst(jd: number, lonEast: number): number {
  return norm360(gmst(jd) + lonEast);
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

// ─── Sun (geocentric ecliptic longitude) ────────────────────────────────────

export function sunLongitude(T: number): number {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = rad(M);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const omega = 125.04 - 1934.136 * T;
  return norm360(L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega)));
}

// ─── Moon (geocentric ecliptic longitude) ───────────────────────────────────

export function moonLongitude(T: number): number {
  const Lp = norm360(218.3165 + 481267.8813 * T);
  const D  = norm360(297.8502 + 445267.1115 * T);
  const M  = norm360(357.5291 + 35999.0503  * T);
  const Mp = norm360(134.9634 + 477198.8676 * T);
  const F  = norm360(93.2720  + 483202.0175 * T);
  const Dr = rad(D), Mr = rad(M), Mpr = rad(Mp), Fr = rad(F);
  return norm360(
    Lp +
    6.289  * Math.sin(Mpr) +
    1.274  * Math.sin(2 * Dr - Mpr) +
    0.658  * Math.sin(2 * Dr) +
    0.214  * Math.sin(2 * Mpr) -
    0.186  * Math.sin(Mr) -
    0.114  * Math.sin(2 * Fr) +
    0.059  * Math.sin(2 * Dr - 2 * Mpr) +
    0.057  * Math.sin(2 * Dr - Mr - Mpr) +
    0.053  * Math.sin(2 * Dr + Mpr) +
    0.046  * Math.sin(2 * Dr - Mr) -
    0.041  * Math.sin(Mr - Mpr) -
    0.035  * Math.sin(Dr) -
    0.030  * Math.sin(Mr + Mpr),
  );
}

// ─── Rahu (Mean Ascending Node) ─────────────────────────────────────────────

export function rahuLongitude(T: number): number {
  return norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
}

// ─── Planetary positions via Keplerian elements ─────────────────────────────

interface OrbElems {
  a0: number; a1: number;
  e0: number; e1: number;
  I0: number; I1: number;
  L0: number; L1: number;
  wbar0: number; wbar1: number;
  Om0: number; Om1: number;
}

const PLANETS: Record<string, OrbElems> = {
  mercury: { a0:0.38709927, a1:0.00000037, e0:0.20563593, e1:0.00001906, I0:7.00497902, I1:-0.00594749, L0:252.25032350, L1:149472.67411175, wbar0:77.45779628, wbar1:0.16047689, Om0:48.33076593, Om1:-0.12534081 },
  venus:   { a0:0.72333566, a1:0.00000390, e0:0.00677672, e1:-0.00004107, I0:3.39467605, I1:-0.00078890, L0:181.97909950, L1:58517.81538729, wbar0:131.60246718, wbar1:0.00268329, Om0:76.67984255, Om1:-0.27769418 },
  earth:   { a0:1.00000261, a1:0.00000562, e0:0.01671123, e1:-0.00004392, I0:-0.00001531, I1:-0.01294668, L0:100.46457166, L1:35999.37244981, wbar0:102.93768193, wbar1:0.32327364, Om0:0.0, Om1:0.0 },
  mars:    { a0:1.52371034, a1:0.00001847, e0:0.09339410, e1:0.00007882, I0:1.84969142, I1:-0.00813131, L0:-4.55343205, L1:19140.30268499, wbar0:-23.94362959, wbar1:0.44441088, Om0:49.55953891, Om1:-0.29257343 },
  jupiter: { a0:5.20288700, a1:-0.00011607, e0:0.04838624, e1:-0.00013253, I0:1.30439695, I1:-0.00183714, L0:34.39644051, L1:3034.74612775, wbar0:14.72847983, wbar1:0.21252668, Om0:100.47390909, Om1:0.20469106 },
  saturn:  { a0:9.53667594, a1:-0.00125060, e0:0.05386179, e1:-0.00050991, I0:2.48599187, I1:0.00193609, L0:49.95424423, L1:1222.49362201, wbar0:92.59887831, wbar1:-0.41897216, Om0:113.66242448, Om1:-0.28867794 },
};

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

function helioXYZ(el: OrbElems, T: number): [number, number, number] {
  const a   = el.a0 + el.a1 * T;
  const e   = el.e0 + el.e1 * T;
  const I   = rad(el.I0 + el.I1 * T);
  const L   = rad(norm360(el.L0 + el.L1 * T));
  const wbar = rad(norm360(el.wbar0 + el.wbar1 * T));
  const Om  = rad(norm360(el.Om0 + el.Om1 * T));

  const M = L - wbar;
  const E = solveKepler(M, e);
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));

  const w = wbar - Om; // argument of perihelion
  const u = v + w;     // argument of latitude

  const cosOm = Math.cos(Om), sinOm = Math.sin(Om);
  const cosI = Math.cos(I), sinI = Math.sin(I);
  const cosU = Math.cos(u), sinU = Math.sin(u);

  const x = r * (cosOm * cosU - sinOm * sinU * cosI);
  const y = r * (sinOm * cosU + cosOm * sinU * cosI);
  const z = r * sinU * sinI;
  return [x, y, z];
}

/** Geocentric ecliptic longitude of a planet (degrees 0-360). */
export function planetLongitude(planet: string, T: number): number {
  const el = PLANETS[planet];
  if (!el) throw new Error(`Unknown planet: ${planet}`);
  const [px, py, pz] = helioXYZ(el, T);
  const [ex, ey, _ez] = helioXYZ(PLANETS.earth, T);
  const dx = px - ex;
  const dy = py - ey;
  return norm360(deg(Math.atan2(dy, dx)));
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
): RawPositions {
  const T = julianCenturies(jd);
  const sun     = sunLongitude(T);
  const moon    = moonLongitude(T);
  const rahu    = rahuLongitude(T);
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
