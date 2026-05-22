/**
 * Main orchestrator — ties all modules together to produce a KundliData object.
 */

import {
  julianDay, julianCenturies, tropicalPositions,
  isRetrograde, planetSpeed, sunriseSunset,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada, dignity, isCombust,
  wholeSignHouse,
  type AyanamsaKey,
} from "./vedic.ts";
import { buildDivisionalCharts, type PlanetPos } from "./divisional.ts";
import { buildVimshottari } from "./dashas.ts";
import { detectYogas } from "./yogas.ts";
import { detectDoshas } from "./doshas.ts";
import { computeAshtakavarga } from "./ashtakavarga.ts";
import { computePanchang } from "./panchang.ts";

// ─── BirthDetails shape (mirrors frontend) ─────────────────────────────────

export interface BirthDetails {
  fullName: string;
  dateOfBirth: string;   // YYYY-MM-DD
  timeOfBirth: string;   // HH:MM:SS
  placeOfBirth: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneOffset: number; // hours east of UTC (e.g. 5.5 for IST)
  };
  gender?: string;
  ayanamsa: AyanamsaKey;
  houseSystem: string;
}

// ─── Planet list ────────────────────────────────────────────────────────────

const PLANETS: Array<{ key: string; label: string }> = [
  { key: 'ascendant', label: 'ascendant' },
  { key: 'sun', label: 'sun' },
  { key: 'moon', label: 'moon' },
  { key: 'mars', label: 'mars' },
  { key: 'mercury', label: 'mercury' },
  { key: 'jupiter', label: 'jupiter' },
  { key: 'venus', label: 'venus' },
  { key: 'saturn', label: 'saturn' },
  { key: 'rahu', label: 'rahu' },
  { key: 'ketu', label: 'ketu' },
];

// ─── Main calculation ───────────────────────────────────────────────────────

export function calculateKundli(details: BirthDetails) {
  // Parse birth date/time → Julian Day in UT
  const [y, m, d] = details.dateOfBirth.split('-').map(Number);
  const timeParts = details.timeOfBirth.split(':').map(Number);
  const hour = timeParts[0] ?? 0;
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;

  const tzOffset = details.placeOfBirth.timezoneOffset;
  const utHour = hour - tzOffset;
  const jd = julianDay(y, m, d, utHour, minute, second);
  const T = julianCenturies(jd);

  const lat = details.placeOfBirth.latitude;
  const lon = details.placeOfBirth.longitude;

  // Tropical positions
  const trop = tropicalPositions(jd, lat, lon);

  // Ayanamsa
  const aya = ayanamsa(details.ayanamsa, jd);

  // Build D1 planet positions
  const ascSid = toSidereal(trop.ascendant, aya);
  const ascSign = signNumber(ascSid);

  const d1Planets: PlanetPos[] = PLANETS.map(({ key }) => {
    const tropLon = (trop as Record<string, number>)[key];
    const sidLon = toSidereal(tropLon, aya);
    const sn = signNumber(sidLon);
    const sd = signDegree(sidLon);
    const nIdx = nakshatraIndex(sidLon);
    const retro = isRetrograde(key, T);
    const comb = isCombust(key, sidLon, toSidereal(trop.sun, aya), retro);

    return {
      planet: key,
      longitude: sidLon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: sd,
      nakshatra: nakshatraName(nIdx),
      nakshatraPada: nakshatraPada(sidLon),
      houseNumber: wholeSignHouse(sn, ascSign),
      isRetrograde: retro,
      isCombust: comb,
      speed: planetSpeed(key, T),
      dignity: dignity(key, sn, sd),
    };
  });

  // Divisional charts
  const ascDeg = signDegree(ascSid);
  const divCharts = buildDivisionalCharts(d1Planets, ascSign, ascDeg);

  // Vimshottari Dasha
  const moonSid = toSidereal(trop.moon, aya);
  const birthDate = new Date(`${details.dateOfBirth}T${details.timeOfBirth}`);
  const dashas = [buildVimshottari(moonSid, birthDate)];

  // Yogas & Doshas
  const yogas = detectYogas(d1Planets);
  const doshas = detectDoshas(d1Planets);

  // Ashtakavarga
  const ashtakavarga = computeAshtakavarga(d1Planets);

  // Panchang
  const { sunrise, sunset } = sunriseSunset(jd, lat, lon);
  const panchang = computePanchang(trop.sun, trop.moon, moonSid, jd, sunrise, sunset);

  return {
    id: crypto.randomUUID(),
    birthDetails: details,
    generatedAt: new Date().toISOString(),
    ascendant: d1Planets[0], // ascendant entry
    panchang,
    divisionalCharts: divCharts,
    dashas,
    doshas,
    yogas,
    ashtakavarga,
    raw: { source: 'calculate-kundli', ayanamsa: aya, julianDay: jd },
  };
}

// ─── Transit positions ─────────────────────────────────────────────────────

export function calculateTransits(details: BirthDetails) {
  const now = new Date();
  const jd = julianDay(
    now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
  );
  const T = julianCenturies(jd);
  const trop = tropicalPositions(jd, details.placeOfBirth.latitude, details.placeOfBirth.longitude);
  const aya = ayanamsa(details.ayanamsa, jd);
  const ascSid = toSidereal(trop.ascendant, aya);
  const ascSign = signNumber(ascSid);

  return PLANETS.filter(({ key }) => key !== 'ascendant').map(({ key }) => {
    const tropLon = (trop as Record<string, number>)[key];
    const sidLon = toSidereal(tropLon, aya);
    const sn = signNumber(sidLon);
    const sd = signDegree(sidLon);
    const nIdx = nakshatraIndex(sidLon);
    const retro = isRetrograde(key, T);
    return {
      planet: key,
      longitude: sidLon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: sd,
      nakshatra: nakshatraName(nIdx),
      nakshatraPada: nakshatraPada(sidLon),
      houseNumber: wholeSignHouse(sn, ascSign),
      isRetrograde: retro,
      isCombust: false,
      speed: planetSpeed(key, T),
    };
  });
}
