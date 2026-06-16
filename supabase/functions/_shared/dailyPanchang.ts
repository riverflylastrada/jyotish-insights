/**
 * Today's Panchang for a given local date + place — computed with the engine's
 * authoritative astronomy (same path as calculate-kundli/engine.ts:221-222), NOT
 * the simplified frontend `src/lib/muhurta/panchangLite.ts`.
 *
 * Evaluated at local noon so the prevailing tithi/nakshatra reflect the day
 * itself, independent of the user's exact send time. sunrise/sunset are shifted
 * from the engine's UT output into the user's local clock for display.
 */

import { julianDay, tropicalPositions, sunriseSunset } from "../calculate-kundli/astronomy.ts";
import { ayanamsa, toSidereal, type AyanamsaKey } from "../calculate-kundli/vedic.ts";
import { computePanchang, type PanchangData } from "../calculate-kundli/panchang.ts";

/** Shift a "HH:MM" clock string by a (possibly fractional) hour offset, wrapping a day. */
function shiftHHMM(hhmm: string, offsetHours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + Math.round(offsetHours * 60);
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function computeDayPanchang(
  localDate: string,        // 'YYYY-MM-DD' in the user's timezone
  lat: number,
  lon: number,
  tzOffsetHours: number,
  ayaKey: AyanamsaKey = "lahiri",
): PanchangData {
  const [y, m, d] = localDate.split("-").map(Number);
  // Local noon → UT. julianDay accepts a continuous hour (may be <0 or >24); the
  // resulting JD is still correct, so no manual date roll-over is needed.
  const utHour = 12 - tzOffsetHours;
  const jd = julianDay(y, m, d, utHour, 0, 0);
  const trop = tropicalPositions(jd, lat, lon, "mean"); // nodeType irrelevant for sun/moon
  const aya = ayanamsa(ayaKey, jd);
  const sunSid = toSidereal(trop.sun, aya);
  const moonSid = toSidereal(trop.moon, aya);
  const { sunrise, sunset } = sunriseSunset(jd, lat, lon); // UT "HH:MM"
  const p = computePanchang(trop.sun, trop.moon, sunSid, moonSid, jd, sunrise, sunset);
  return {
    ...p,
    sunrise: shiftHHMM(p.sunrise, tzOffsetHours),
    sunset: shiftHHMM(p.sunset, tzOffsetHours),
  };
}
