/**
 * Jaimini Special Lagnas — alternative ascendants used in timing and analysis.
 *
 * Implements six special lagnas validated against PyJHora v4.8.5 (Lahiri):
 *   Bhava Lagna, Hora Lagna, Ghati Lagna, Vighati Lagna, Pranapada Lagna, Sree Lagna.
 *
 * Bhava / Hora / Ghati / Vighati follow the "special ascendant" formula:
 *   longitude = (sunAtSunrise + elapsedMinutes × rateFactor) mod 360
 *
 * Pranapada uses birth nazhikai + sun longitude + sign-type offset.
 * Sree Lagna uses moon's fractional progress within its nakshatra.
 */

import { norm360, julianCenturies, sunLongitude } from "./astronomy.ts";
import { signNumber, signName, signDegree, toSidereal } from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpecialLagnaEntry {
  name: string;
  longitude: number;
  sign: number;
  signName: string;
  degree: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIXED_SIGNS = [2, 5, 8, 11];   // Vrishabha, Simha, Vrischika, Kumbha
const DUAL_SIGNS  = [3, 6, 9, 12];   // Mithuna, Kanya, Dhanu, Meena

const RAD = Math.PI / 180;

// ─── Precision Sunrise (iterative) ──────────────────────────────────────────

/** Sun's declination from its ecliptic longitude (geocentric, mean obliquity). */
function sunDeclination(sunTropLon: number): number {
  const eps = 23.4393; // mean obliquity, sufficient for sunrise
  return Math.asin(Math.sin(RAD * eps) * Math.sin(RAD * sunTropLon)) / RAD;
}

/**
 * Sun altitude at a given JD for location (lat, lon).
 * Uses hour angle method. Returns altitude in degrees.
 */
function sunAltitude(jd: number, lat: number, lon: number): number {
  const T = julianCenturies(jd);
  const sunLon = sunLongitude(T);
  const decl = sunDeclination(sunLon);

  // Greenwich Mean Sidereal Time (hours)
  const T0 = julianCenturies(Math.floor(jd - 0.5) + 0.5);
  const gmst0 = 6.697374558 + 2400.0513369 * T0 + 0.0000258622 * T0 * T0;
  const utHours = ((jd + 0.5) % 1) * 24;
  const gmst = (gmst0 + utHours * 1.00273790935) % 24;

  // Local Sidereal Time
  const lstHours = ((gmst + lon / 15) % 24 + 24) % 24;

  // Right ascension of sun (approximate)
  const ra = Math.atan2(
    Math.cos(RAD * 23.4393) * Math.sin(RAD * sunLon),
    Math.cos(RAD * sunLon),
  ) / RAD;
  const raHours = ((ra / 15) % 24 + 24) % 24;

  // Hour angle
  const ha = (lstHours - raHours) * 15;

  // Altitude
  const alt = Math.asin(
    Math.sin(RAD * lat) * Math.sin(RAD * decl) +
    Math.cos(RAD * lat) * Math.cos(RAD * decl) * Math.cos(RAD * ha),
  ) / RAD;

  return alt;
}

/**
 * Compute sunrise JD to high precision using iterative refinement.
 * Finds the moment when sun center altitude = -0.833° (refraction-adjusted horizon).
 */
function computeSunriseJd(jdBirth: number, lat: number, lon: number): number {
  // NOAA simplified estimate for initial guess
  const jd0 = Math.floor(jdBirth - 0.5) + 0.5;
  const lonW = -lon;
  const n = Math.round(jd0 - 2451545.0009 - lonW / 360);
  const Jstar = 2451545.0009 + n + lonW / 360;
  const T0 = (Jstar - 2451545.0) / 36525.0;
  const M = norm360(357.5291 + 35999.0503 * T0);
  const C = 1.9148 * Math.sin(RAD * M) + 0.02 * Math.sin(RAD * 2 * M) + 0.0003 * Math.sin(RAD * 3 * M);
  const lambda = norm360(M + C + 180 + 102.9372);
  const decl = Math.asin(Math.sin(RAD * 23.44) * Math.sin(RAD * lambda)) / RAD;
  const cosH = (Math.sin(RAD * -0.833) - Math.sin(RAD * lat) * Math.sin(RAD * decl))
             / (Math.cos(RAD * lat) * Math.cos(RAD * decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
  const Jtransit = Jstar + 0.0053 * Math.sin(RAD * M) - 0.0069 * Math.sin(RAD * 2 * lambda);
  let jdRise = Jtransit - H / 360;

  // Iterative refinement: bisect to find apparent sunrise altitude = −0.833°
  // (34' refraction + 16' solar semidiameter — matches Drik Panchang / Swiss Eph)
  const TARGET_ALT = -0.833;
  let lo = jdRise - 15 / 1440;
  let hi = jdRise + 15 / 1440;

  let altLo = sunAltitude(lo, lat, lon);
  let altHi = sunAltitude(hi, lat, lon);

  // Widen bracket if needed
  if ((altLo - TARGET_ALT) * (altHi - TARGET_ALT) > 0) {
    lo = jdRise - 60 / 1440;
    hi = jdRise + 60 / 1440;
    altLo = sunAltitude(lo, lat, lon);
    altHi = sunAltitude(hi, lat, lon);
  }

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const altMid = sunAltitude(mid, lat, lon);
    if ((altMid - TARGET_ALT) * (altLo - TARGET_ALT) > 0) {
      lo = mid;
      altLo = altMid;
    } else {
      hi = mid;
      altHi = altMid;
    }
    if (Math.abs(hi - lo) < 0.1 / 86400) break; // 0.1 second precision
  }

  return (lo + hi) / 2;
}

function jdToLocalHours(jd: number, tz: number): number {
  const frac = (jd + 0.5) % 1;
  return ((frac * 24) + tz + 24) % 24;
}

// ─── Special Ascendant (Bhava, Hora, Ghati, Vighati) ─────────────────────

function specialAscendant(
  sunSidAtSunrise: number,
  birthHours: number,
  sunriseHours: number,
  rateFactor: number,
): number {
  let diff = birthHours - sunriseHours;
  if (diff < 0) diff += 24;
  return norm360(sunSidAtSunrise + diff * 60 * rateFactor);
}

// ─── Pranapada Lagna ────────────────────────────────────────────────────────

function pranapada(
  sunSidAtBirth: number,
  birthHours: number,
  sunriseHours: number,
): number {
  let diff = birthHours - sunriseHours;
  if (diff < 0) diff += 24;

  // Convert to tharparai (PyJHora's nazhikai system)
  const h = Math.floor(diff);
  const frac = diff - h;
  const m = Math.floor(frac * 60);
  const s = Math.floor((frac * 60 - m) * 60);
  const tharparai = h * 9000 + m * 150 + s;
  const nazhikai = tharparai / 3600.0;

  const birthLong = (nazhikai * 4) % 12;
  let pl = birthLong * 30 + sunSidAtBirth;

  const sunSign = signNumber(sunSidAtBirth);
  if (FIXED_SIGNS.includes(sunSign)) pl += 240;
  else if (DUAL_SIGNS.includes(sunSign)) pl += 120;

  return norm360(pl);
}

// ─── Sree Lagna ─────────────────────────────────────────────────────────────

function sreeLagna(moonSid: number, ascSid: number): number {
  const oneNak = 360 / 27;
  const progress = moonSid % oneNak;
  return norm360(ascSid + progress * 27);
}

// ─── Entry point ────────────────────────────────────────────────────────────

function makeLagna(name: string, lon: number): SpecialLagnaEntry {
  const sn = signNumber(lon);
  return { name, longitude: lon, sign: sn, signName: signName(sn), degree: signDegree(lon) };
}

/**
 * Compute all 6 special lagnas.
 * @param jdBirth - Julian Day of birth (UT)
 * @param lat - latitude (north positive)
 * @param lon - longitude (east positive)
 * @param tz - timezone offset in hours east of UTC
 * @param aya - ayanamsa value in degrees
 * @param sunSidAtBirth - sidereal longitude of sun at birth
 * @param moonSid - sidereal longitude of moon at birth
 * @param ascSid - sidereal longitude of ascendant at birth
 */
export function computeSpecialLagnas(
  jdBirth: number,
  lat: number,
  lon: number,
  tz: number,
  aya: number,
  sunSidAtBirth: number,
  moonSid: number,
  ascSid: number,
  birthHours: number,
): SpecialLagnaEntry[] {
  const sunriseJd = computeSunriseJd(jdBirth, lat, lon);
  const sunriseHours = jdToLocalHours(sunriseJd, tz);

  // Compute sun's sidereal longitude at sunrise using the same local-JD
  // convention as PyJHora: midnight UT + localSunriseHours / 24.
  // PyJHora's internal JD convention treats local time as UT when passing
  // to swiss ephemeris, effectively computing the sun at a shifted epoch.
  const jd0 = Math.floor(jdBirth - 0.5) + 0.5; // midnight UT
  const sunriseLocalJd = jd0 + sunriseHours / 24;
  const Tsr = julianCenturies(sunriseLocalJd);
  const sunSidAtSunrise = toSidereal(sunLongitude(Tsr), aya);

  return [
    makeLagna('Bhava Lagna',     specialAscendant(sunSidAtSunrise, birthHours, sunriseHours, 0.25)),
    makeLagna('Hora Lagna',      specialAscendant(sunSidAtSunrise, birthHours, sunriseHours, 0.5)),
    makeLagna('Ghati Lagna',     specialAscendant(sunSidAtSunrise, birthHours, sunriseHours, 1.25)),
    makeLagna('Vighati Lagna',   specialAscendant(sunSidAtSunrise, birthHours, sunriseHours, 15.0)),
    makeLagna('Pranapada Lagna', pranapada(sunSidAtBirth, birthHours, sunriseHours)),
    makeLagna('Sree Lagna',      sreeLagna(moonSid, ascSid)),
  ];
}
