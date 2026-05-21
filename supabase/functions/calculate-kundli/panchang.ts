/**
 * Panchang (five-limbed almanac): Tithi, Vara, Nakshatra, Yoga, Karana.
 */

import {
  TITHI_NAMES, PANCHANG_YOGA_NAMES, KARANA_NAMES, WEEKDAYS,
  NAKSHATRA_NAMES,
} from "./constants.ts";
import { norm360 } from "./astronomy.ts";
import { nakshatraIndex } from "./vedic.ts";

export interface PanchangData {
  tithi: string;
  vara: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
}

export function computePanchang(
  sunTrop: number, moonTrop: number, moonSid: number,
  jd: number, sunrise: string, sunset: string,
): PanchangData {
  // Tithi: elongation of Moon from Sun in steps of 12°
  const elong = norm360(moonTrop - sunTrop);
  const tithiIdx = Math.floor(elong / 12);
  const paksha = tithiIdx < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
  const tithi = `${paksha} ${TITHI_NAMES[tithiIdx % 30]}`;

  // Vara: weekday from JD
  const dayOfWeek = Math.floor(jd + 1.5) % 7;
  const vara = WEEKDAYS[dayOfWeek];

  // Nakshatra: Moon's sidereal nakshatra
  const nIdx = nakshatraIndex(moonSid);
  const nakshatra = NAKSHATRA_NAMES[nIdx];

  // Yoga (panchang): (sunTrop + moonTrop) mod 360 / (360/27)
  const yogaAngle = norm360(sunTrop + moonTrop);
  const yogaIdx = Math.floor(yogaAngle / (360 / 27));
  const yoga = PANCHANG_YOGA_NAMES[yogaIdx % 27];

  // Karana: half-tithi
  const karanaIdx = Math.floor(elong / 6);
  // First karana of cycle is Kimstughna (fixed), then 7 repeating, then Shakuni etc.
  let karana: string;
  if (karanaIdx === 0) karana = 'Kimstughna';
  else if (karanaIdx >= 57) {
    const fixed = ['Shakuni', 'Chatushpada', 'Naga'];
    karana = fixed[karanaIdx - 57] ?? 'Kimstughna';
  } else {
    karana = KARANA_NAMES[(karanaIdx - 1) % 7];
  }

  return { tithi, vara, nakshatra, yoga, karana, sunrise, sunset };
}
