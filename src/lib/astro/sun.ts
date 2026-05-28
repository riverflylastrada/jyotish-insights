/**
 * Client-side sunrise / sunset calculator.
 *
 * Uses the NOAA Solar Calculator algorithm (simplified Meeus) with
 * iterative bisection refinement — the same approach as the engine's
 * `computeSunriseJd` in special_lagna.ts.  All intermediate math is
 * in UTC Julian Day; the final results are converted to local time
 * via the supplied IANA timezone string.
 *
 * Accuracy target: ±1 minute vs Drik Panchang / USNO for latitudes
 * between ±60°.
 */

const RAD = Math.PI / 180;

// ── Julian Day helpers ──────────────────────────────────────────────

function dateToJd(year: number, month: number, day: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

// ── Sun position (low-precision, sufficient for sunrise/set) ────────

function sunLongitude(T: number): number {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M  = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C  = (1.914602 - 0.004817 * T) * Math.sin(RAD * M)
           + 0.019993 * Math.sin(RAD * 2 * M)
           + 0.000290 * Math.sin(RAD * 3 * M);
  return norm360(L0 + C);
}

function sunDeclination(sunTropLon: number): number {
  const eps = 23.4393;
  return Math.asin(Math.sin(RAD * eps) * Math.sin(RAD * sunTropLon)) / RAD;
}

function sunAltitude(jd: number, lat: number, lon: number): number {
  const T = julianCenturies(jd);
  const sunLon = sunLongitude(T);
  const decl = sunDeclination(sunLon);

  const T0 = julianCenturies(Math.floor(jd - 0.5) + 0.5);
  const gmst0 = 6.697374558 + 2400.0513369 * T0 + 0.0000258622 * T0 * T0;
  const utHours = ((jd + 0.5) % 1) * 24;
  const gmst = (gmst0 + utHours * 1.00273790935) % 24;
  const lstHours = ((gmst + lon / 15) % 24 + 24) % 24;

  const ra = Math.atan2(
    Math.cos(RAD * 23.4393) * Math.sin(RAD * sunLon),
    Math.cos(RAD * sunLon),
  ) / RAD;
  const raHours = ((ra / 15) % 24 + 24) % 24;
  const ha = (lstHours - raHours) * 15;

  return Math.asin(
    Math.sin(RAD * lat) * Math.sin(RAD * decl) +
    Math.cos(RAD * lat) * Math.cos(RAD * decl) * Math.cos(RAD * ha),
  ) / RAD;
}

// ── Sunrise / sunset JD (iterative bisection) ───────────────────────

/**
 * Apparent sunrise: sun's upper limb at the horizon.
 * Target altitude = −0.833° (34' atmospheric refraction + 16' solar semidiameter).
 * Matches Drik Panchang / Swiss Ephemeris swe.rise_trans convention.
 */
function computeSunriseJd(jd0: number, lat: number, lon: number): number {
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
  const jdRise = Jtransit - H / 360;

  // Bisect to target alt = −0.833° (apparent sunrise: upper limb + refraction)
  const TARGET_ALT = -0.833;
  let lo = jdRise - 15 / 1440;
  let hi = jdRise + 15 / 1440;
  let altLo = sunAltitude(lo, lat, lon) - TARGET_ALT;
  let altHi = sunAltitude(hi, lat, lon) - TARGET_ALT;

  if (altLo * altHi > 0) {
    lo = jdRise - 60 / 1440;
    hi = jdRise + 60 / 1440;
    altLo = sunAltitude(lo, lat, lon) - TARGET_ALT;
    altHi = sunAltitude(hi, lat, lon) - TARGET_ALT;
  }

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const altMid = sunAltitude(mid, lat, lon) - TARGET_ALT;
    if (altMid * altLo > 0) { lo = mid; altLo = altMid; }
    else { hi = mid; altHi = altMid; }
    if (Math.abs(hi - lo) < 0.1 / 86400) break;
  }
  return (lo + hi) / 2;
}

function computeSunsetJd(jd0: number, lat: number, lon: number): number {
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
  const jdSet = Jtransit + H / 360;

  // Bisect to target alt = −0.833° (apparent sunset: upper limb + refraction)
  const TARGET_ALT = -0.833;
  let lo = jdSet - 15 / 1440;
  let hi = jdSet + 15 / 1440;
  let altLo = sunAltitude(lo, lat, lon) - TARGET_ALT;
  let altHi = sunAltitude(hi, lat, lon) - TARGET_ALT;

  if (altLo * altHi > 0) {
    lo = jdSet - 60 / 1440;
    hi = jdSet + 60 / 1440;
    altLo = sunAltitude(lo, lat, lon) - TARGET_ALT;
    altHi = sunAltitude(hi, lat, lon) - TARGET_ALT;
  }

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const altMid = sunAltitude(mid, lat, lon) - TARGET_ALT;
    if (altMid * altLo > 0) { lo = mid; altLo = altMid; }
    else { hi = mid; altHi = altMid; }
    if (Math.abs(hi - lo) < 0.1 / 86400) break;
  }
  return (lo + hi) / 2;
}

// ── Public API ──────────────────────────────────────────────────────

function jdToUtcDate(jd: number): Date {
  const jd0 = jd + 0.5;
  const Z = Math.floor(jd0);
  const F = jd0 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const fracDay = day - dayInt;
  const hours = fracDay * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);

  return new Date(Date.UTC(year, month - 1, dayInt, h, m, s));
}

function formatTimeInTz(utcDate: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

export interface SunTimes {
  sunrise: string;      // HH:MM in local tz
  sunset: string;       // HH:MM in local tz
  sunriseUtc: Date;
  sunsetUtc: Date;
}

/**
 * Compute sunrise and sunset for a given date + location.
 * @param dateStr  YYYY-MM-DD (the civil date in `tz`)
 * @param lat      latitude in degrees (north positive)
 * @param lon      longitude in degrees (east positive)
 * @param tz       IANA timezone string (e.g. "Asia/Kolkata")
 */
export function computeSunTimes(dateStr: string, lat: number, lon: number, tz: string): SunTimes {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jd0 = dateToJd(y, m, d);

  const riseJd = computeSunriseJd(jd0, lat, lon);
  const setJd = computeSunsetJd(jd0, lat, lon);

  const sunriseUtc = jdToUtcDate(riseJd);
  const sunsetUtc = jdToUtcDate(setJd);

  return {
    sunrise: formatTimeInTz(sunriseUtc, tz),
    sunset: formatTimeInTz(sunsetUtc, tz),
    sunriseUtc,
    sunsetUtc,
  };
}

/**
 * Return the user's local civil date (YYYY-MM-DD) in the given IANA timezone.
 */
export function localDateInTz(tz: string, instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}
