/**
 * Eclipse computation module.
 *
 * Computes the next solar and lunar eclipses (date/time, type, sidereal
 * sign/nakshatra, visibility from a place) plus a short upcoming list,
 * using the existing Sun/Moon/node ephemeris (VSOP87 + ELP-82).
 *
 * Algorithm:
 *   Eclipses occur at New Moon (solar) or Full Moon (lunar) when the
 *   Sun–Moon line is within ~18° of the lunar node axis. We step through
 *   synodic months, refine the exact syzygy by bisection, classify the
 *   eclipse type from the Sun–node angular distance, and check local
 *   visibility from geometry.
 *
 * BOUNDED: scans at most MAX_ECLIPSES forward, never a lifetime scan.
 *
 * Validated against PyJHora 4.8.6 `jhora.panchanga.eclipse`
 *   (next_solar_eclipse / next_lunar_eclipse).
 */

import {
  julianDay, julianCenturies, sunLongitude, moonLongitude,
  rahuLongitude, norm360,
} from "./astronomy.ts";
import { ayanamsa, toSidereal, signNumber, signName, nakshatraIndex, nakshatraName, type AyanamsaKey } from "./vedic.ts";
import { SIGN_NAMES, NAKSHATRA_NAMES } from "./constants.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const SYNODIC_MONTH = 29.530588853; // days
const MAX_ECLIPSES = 12; // hard cap per type
const SEARCH_HORIZON_MONTHS = 48; // ~4 years forward max
const SOLAR_NODE_LIMIT = 15.4; // max degrees from node for a solar eclipse
const LUNAR_NODE_LIMIT = 12.0; // max degrees from node for a lunar eclipse
const DEG = Math.PI / 180;

// ─── Types ──────────────────────────────────────────────────────────────────

export type EclipseKind = 'solar' | 'lunar';
export type EclipseType = 'total' | 'annular' | 'partial' | 'penumbral';

export interface EclipseRecord {
  kind: EclipseKind;
  type: EclipseType;
  /** Julian Day of maximum eclipse (UT). */
  jdMax: number;
  /** ISO date string of maximum eclipse (UTC). */
  dateUtc: string;
  /** Sidereal sign number (1–12) of the eclipsed luminary. */
  signNumber: number;
  signName: string;
  /** Nakshatra name at the eclipsed point. */
  nakshatra: string;
  /** Whether visible from the given observer location. */
  visibleFromPlace: boolean;
}

export interface EclipseData {
  nextSolar: EclipseRecord | null;
  nextLunar: EclipseRecord | null;
  upcoming: EclipseRecord[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize angle to [-180, +180]. */
function normPM180(d: number): number {
  let r = ((d % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return r;
}

/** Julian Day → ISO UTC date string. */
function jdToIso(jd: number): string {
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms).toISOString();
}

/**
 * Find the JD of the next New Moon (elongation ≈ 0) or Full Moon (elongation ≈ 180)
 * near `jdGuess` by bisection. Returns the refined JD.
 */
function refineSyzygy(jdGuess: number, targetElong: number): number {
  // Bisect over ±2 days around the guess
  let lo = jdGuess - 2;
  let hi = jdGuess + 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const T = julianCenturies(mid);
    const sun = sunLongitude(T);
    const moon = moonLongitude(T);
    let elong = normPM180(moon - sun - targetElong);
    // Moon moves ~13°/day, so elong changes sign at syzygy
    const TLo = julianCenturies(lo);
    const sunLo = sunLongitude(TLo);
    const moonLo = moonLongitude(TLo);
    const elongLo = normPM180(moonLo - sunLo - targetElong);
    if (elongLo * elong <= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (Math.abs(hi - lo) < 0.00001) break; // ~0.86 seconds precision
  }
  return (lo + hi) / 2;
}

/**
 * Approximate lunar parallax in degrees for a given latitude.
 * The Moon's horizontal parallax is ~0.95° on average.
 */
function lunarParallax(latDeg: number): number {
  return 0.95 * Math.cos(latDeg * DEG);
}

/**
 * Apparent angular distance of the Sun from Rahu/Ketu axis.
 * Returns the minimum of |Sun - Rahu| and |Sun - Ketu| normalised to [0, 180].
 */
function sunNodeDistance(jd: number): number {
  const T = julianCenturies(jd);
  const sun = sunLongitude(T);
  const rahu = rahuLongitude(T, 'true');
  const dRahu = Math.abs(normPM180(sun - rahu));
  const dKetu = Math.abs(normPM180(sun - (rahu + 180)));
  return Math.min(dRahu, dKetu);
}

// ─── Eclipse classification ─────────────────────────────────────────────────

/**
 * Classify a solar eclipse type from Sun–node distance at New Moon.
 * - < 9.5° from node → total or annular (depends on Moon distance)
 * - 9.5°–11.5° → annular or partial
 * - 11.5°–18.5° → partial
 * We use a simplified model; the total/annular distinction depends on
 * Moon's apparent size vs Sun's. We approximate from the Moon's anomaly.
 */
function classifySolarEclipse(jd: number): EclipseType | null {
  const dist = sunNodeDistance(jd);
  if (dist > SOLAR_NODE_LIMIT) return null;

  // Moon's mean anomaly for size estimation
  const T = julianCenturies(jd);
  const moonAnomaly = norm360(134.9634114 + 477198.8676313 * T);
  // When anomaly is near 0° (perigee), Moon is larger → total; near 180° (apogee) → annular
  const isLargerMoon = Math.cos(moonAnomaly * DEG) > 0;

  if (dist < 9.5) return isLargerMoon ? 'total' : 'annular';
  if (dist < 11.5) return isLargerMoon ? 'total' : 'partial';
  return 'partial';
}

/**
 * Classify a lunar eclipse type from Sun–node distance at Full Moon.
 * - < 3.8° → total
 * - 3.8°–6° → partial
 * - 6°–12° → penumbral
 * - > 12° → no eclipse (but we use 16° to catch edge penumbrals)
 */
function classifyLunarEclipse(jd: number): EclipseType | null {
  const dist = sunNodeDistance(jd);
  if (dist > LUNAR_NODE_LIMIT) return null;
  if (dist < 3.8) return 'total';
  if (dist < 6.0) return 'partial';
  return 'penumbral';
}

// ─── Visibility ─────────────────────────────────────────────────────────────

/**
 * Check if a solar eclipse is visible from a given latitude/longitude.
 * Simplified: the eclipse is visible if the Moon's shadow cone (center ±~35°
 * of sub-solar point) covers the observer. We approximate by checking if
 * the Moon's topocentric parallax doesn't shift it too far from the Sun.
 *
 * More precisely: solar eclipse is visible if the apparent Moon (adjusted
 * for parallax) overlaps the Sun disc as seen from the observer.
 * We use a simplified geometric check based on altitude of the Sun at
 * maximum eclipse and the local hour angle.
 */
function isSolarEclipseVisible(jd: number, lat: number, lon: number): boolean {
  const T = julianCenturies(jd);
  const sun = sunLongitude(T);
  const rahu = rahuLongitude(T, 'true');

  // Sun's ecliptic longitude → approximate equatorial declination
  const obliquity = 23.44 - 0.013 * T;
  const sunDecl = Math.asin(Math.sin(obliquity * DEG) * Math.sin(sun * DEG)) / DEG;

  // Greenwich Hour Angle of the Sun
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const sunRA = Math.atan2(
    Math.cos(obliquity * DEG) * Math.sin(sun * DEG),
    Math.cos(sun * DEG),
  ) / DEG;
  const lha = norm360(gmst + lon - norm360(sunRA));

  // Sun altitude
  const sinAlt = Math.sin(lat * DEG) * Math.sin(sunDecl * DEG) +
    Math.cos(lat * DEG) * Math.cos(sunDecl * DEG) * Math.cos(lha * DEG);
  const sunAlt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;

  // Eclipse shadow path center: the sub-Moon point. The shadow has width ~250 km
  // (~2.2° great circle), but partial visibility extends much further (~5000 km / ~45°).
  // We use a generous 70° altitude-based cutoff: if the Sun is above the horizon
  // and the eclipse geometry is favourable.
  if (sunAlt < -5) return false; // Sun well below horizon

  // Check proximity of the observer to the eclipse central line.
  // The central line is where Moon's shadow falls on Earth. For a simplified model,
  // we check: is the Moon's apparent position (after parallax) within ~1.5° of the Sun?
  // Parallax shifts the Moon southward/northward by up to ~1° depending on latitude.
  const parallaxShift = lunarParallax(lat);

  // The Moon's ecliptic latitude at this point tells us the offset from the ecliptic
  // For a more comprehensive test, we just check if the Sun is high enough and
  // the node distance is close enough for the shadow to reach this latitude.
  const nodeAngle = Math.abs(normPM180(sun - rahu));
  const nodeAngle2 = Math.abs(normPM180(sun - (rahu + 180)));
  const minNodeAngle = Math.min(nodeAngle, nodeAngle2);

  // Generous visibility: if Sun is above horizon at max eclipse, and the node
  // distance is within the same limit used to classify the eclipse. Using a
  // stricter cutoff here (e.g. a hardcoded 15°) marks edge eclipses — classified
  // up to SOLAR_NODE_LIMIT (15.4°) — invisible from every location.
  return sunAlt > -1 && minNodeAngle <= SOLAR_NODE_LIMIT;
}

/**
 * Check if a lunar eclipse is visible from a given latitude/longitude.
 * A lunar eclipse is visible wherever the Moon is above the horizon during
 * the eclipse. We check if the Full Moon is above the horizon at max eclipse.
 */
function isLunarEclipseVisible(jd: number, lat: number, lon: number): boolean {
  const T = julianCenturies(jd);
  const moon = moonLongitude(T);

  // Moon's approximate declination
  const obliquity = 23.44 - 0.013 * T;
  const moonDecl = Math.asin(Math.sin(obliquity * DEG) * Math.sin(moon * DEG)) / DEG;

  // Moon's approximate RA
  const moonRA = Math.atan2(
    Math.cos(obliquity * DEG) * Math.sin(moon * DEG),
    Math.cos(moon * DEG),
  ) / DEG;

  // Local Hour Angle of the Moon
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const lha = norm360(gmst + lon - norm360(moonRA));

  // Moon altitude
  const sinAlt = Math.sin(lat * DEG) * Math.sin(moonDecl * DEG) +
    Math.cos(lat * DEG) * Math.cos(moonDecl * DEG) * Math.cos(lha * DEG);
  const moonAlt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;

  // Visible if Moon is above the horizon (with some tolerance for refraction)
  return moonAlt > -2;
}

// ─── Main computation ───────────────────────────────────────────────────────

/**
 * Compute the next solar + lunar eclipses and an upcoming list (bounded).
 *
 * @param fromJd - Julian Day to start searching from (UT).
 * @param lat - Observer latitude (degrees, north positive).
 * @param lon - Observer longitude (degrees, east positive).
 * @param aya - Ayanamsa key for sidereal positions.
 * @param maxEclipses - Maximum number of eclipses per type to find (default 6).
 */
export function computeEclipses(
  fromJd: number,
  lat: number,
  lon: number,
  aya: AyanamsaKey = 'lahiri',
  maxEclipses = 6,
): EclipseData {
  const cap = Math.min(maxEclipses, MAX_ECLIPSES);
  const solarList: EclipseRecord[] = [];
  const lunarList: EclipseRecord[] = [];

  // Find the approximate JD of the next New Moon from fromJd
  const T0 = julianCenturies(fromJd);
  const sun0 = sunLongitude(T0);
  const moon0 = moonLongitude(T0);
  const elong0 = normPM180(moon0 - sun0);
  // Days until next New Moon (elongation = 0)
  const daysToNewMoon = elong0 <= 0
    ? (-elong0 / 360) * SYNODIC_MONTH
    : ((360 - elong0) / 360) * SYNODIC_MONTH;
  // Days until next Full Moon (elongation = 180)
  const elongToFull = normPM180(moon0 - sun0 - 180);
  const daysToFullMoon = elongToFull <= 0
    ? (-elongToFull / 360) * SYNODIC_MONTH
    : ((360 - elongToFull) / 360) * SYNODIC_MONTH;

  // Scan New Moons for solar eclipses
  for (let i = 0; i < SEARCH_HORIZON_MONTHS && solarList.length < cap; i++) {
    const guessJd = fromJd + daysToNewMoon + i * SYNODIC_MONTH;
    const jdNewMoon = refineSyzygy(guessJd, 0);
    if (jdNewMoon < fromJd) continue;

    const eclType = classifySolarEclipse(jdNewMoon);
    if (!eclType) continue;

    const ayaVal = ayanamsa(aya, jdNewMoon);
    const T = julianCenturies(jdNewMoon);
    const sunTrop = sunLongitude(T);
    const sunSid = toSidereal(sunTrop, ayaVal);
    const sn = signNumber(sunSid);
    const nIdx = nakshatraIndex(sunSid);
    const visible = isSolarEclipseVisible(jdNewMoon, lat, lon);

    solarList.push({
      kind: 'solar',
      type: eclType,
      jdMax: jdNewMoon,
      dateUtc: jdToIso(jdNewMoon),
      signNumber: sn,
      signName: signName(sn),
      nakshatra: NAKSHATRA_NAMES[nIdx],
      visibleFromPlace: visible,
    });
  }

  // Scan Full Moons for lunar eclipses
  for (let i = 0; i < SEARCH_HORIZON_MONTHS && lunarList.length < cap; i++) {
    const guessJd = fromJd + daysToFullMoon + i * SYNODIC_MONTH;
    const jdFullMoon = refineSyzygy(guessJd, 180);
    if (jdFullMoon < fromJd) continue;

    const eclType = classifyLunarEclipse(jdFullMoon);
    if (!eclType) continue;

    const ayaVal = ayanamsa(aya, jdFullMoon);
    const T = julianCenturies(jdFullMoon);
    const moonTrop = moonLongitude(T);
    const moonSid = toSidereal(moonTrop, ayaVal);
    const sn = signNumber(moonSid);
    const nIdx = nakshatraIndex(moonSid);
    const visible = isLunarEclipseVisible(jdFullMoon, lat, lon);

    lunarList.push({
      kind: 'lunar',
      type: eclType,
      jdMax: jdFullMoon,
      dateUtc: jdToIso(jdFullMoon),
      signNumber: sn,
      signName: signName(sn),
      nakshatra: NAKSHATRA_NAMES[nIdx],
      visibleFromPlace: visible,
    });
  }

  // Merge and sort all eclipses by date
  const upcoming = [...solarList, ...lunarList].sort((a, b) => a.jdMax - b.jdMax);

  return {
    nextSolar: solarList[0] ?? null,
    nextLunar: lunarList[0] ?? null,
    upcoming,
  };
}
