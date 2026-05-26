/**
 * Main orchestrator — ties all modules together to produce a KundliData object.
 */

import {
  julianDay, julianCenturies, tropicalPositions,
  isRetrograde, planetSpeed, sunriseSunset,
  obliquity, lst, norm360,
  type NodeType,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada, dignity, isCombust,
  wholeSignHouse,
  type AyanamsaKey,
} from "./vedic.ts";
import { buildDivisionalCharts, type PlanetPos } from "./divisional.ts";
import { buildVimshottari } from "./dashas.ts";
import { buildYoginiDasha } from "./yogini.ts";
import { buildAshtottariDasha } from "./ashtottari.ts";
import { detectYogas } from "./yogas.ts";
import { detectDoshas } from "./doshas.ts";
import { computeAshtakavarga } from "./ashtakavarga.ts";
import { computePanchang } from "./panchang.ts";
import { computeKpPlanetSubLords, computePlacidusCusps, computeCuspalSubLords, computeRulingPlanets } from "./kp.ts";
import { computeCharaKarakas, karakamsa, computeArudhaPadas, computeCharaDasha } from "./jaimini.ts";
import { computeShadbala } from "./shadbala.ts";
import { computeBhavaBala } from "./bhavabala.ts";

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
  nodeType?: NodeType;
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

function kendras(h: number): boolean { return [1, 4, 7, 10].includes(h); }
function trikonas(h: number): boolean { return [1, 5, 9].includes(h); }
function dusthanas(h: number): boolean { return [6, 8, 12].includes(h); }

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
  const nodeType = details.nodeType ?? 'true';
  const trop = tropicalPositions(jd, lat, lon, nodeType);

  // Ayanamsa
  const aya = ayanamsa(details.ayanamsa, jd);

  // Build D1 planet positions
  const ascSid = toSidereal(trop.ascendant, aya);
  const ascSign = signNumber(ascSid);

  const d1Planets: PlanetPos[] = PLANETS.map(({ key }) => {
    const tropLon = (trop as unknown as Record<string, number>)[key];
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
  const dashas = [
    buildVimshottari(moonSid, birthDate),
    buildYoginiDasha(moonSid, birthDate),
    buildAshtottariDasha(moonSid, birthDate),
  ];

  // Yogas & Doshas
  const yogas = detectYogas(d1Planets);
  const doshas = detectDoshas(d1Planets);

  // Ashtakavarga
  const ashtakavarga = computeAshtakavarga(d1Planets);

  // Panchang
  const { sunrise, sunset } = sunriseSunset(jd, lat, lon);
  const panchang = computePanchang(trop.sun, trop.moon, moonSid, jd, sunrise, sunset);

  // Placidus cusps (needed by both Shadbala and KP)
  const eps = obliquity(T);
  const ramcDeg = lst(jd, lon);
  const tropCusps = computePlacidusCusps(jd, lat, eps, ramcDeg);
  const siderealCusps = tropCusps.map((c: number) => norm360(c - aya));

  // Full six-source Shadbala (Parashari/BPHS)
  const shadbala = computeShadbala({
    d1Planets,
    divCharts,
    jd,
    lat,
    lon,
    tz: tzOffset,
    ayanamsaDeg: aya,
    siderealCusps,
    ascSign,
  });

  // Bhava Bala (house strength, reuses Shadbala)
  const bhavaBala = computeBhavaBala({
    d1Planets,
    siderealCusps,
    shadbala,
    ascSign,
    jd,
    lat,
    lon,
    tz: tzOffset,
    ayanamsaDeg: aya,
  });

  // KP sub-lords for all 9 planets
  const kpPlanetSubLords = computeKpPlanetSubLords(d1Planets);

  // KP cuspal sub-lords (reuse tropCusps from above)
  const cuspalSubLords = computeCuspalSubLords(tropCusps, aya);

  // KP Ruling Planets (at chart time)
  const rulingPlanets = computeRulingPlanets(ascSid, moonSid, birthDate);

  // Jaimini: Chara Karakas, Karakamsa, Arudha Padas, Chara Dasha
  const charaKarakas = computeCharaKarakas(d1Planets);
  const ak = charaKarakas.find((ck) => ck.karaka === 'AK');
  const d9Chart = divCharts.find((c) => c.varga === 'D9');
  const karakamsaResult = ak && d9Chart
    ? karakamsa(ak.planet, d9Chart.planets)
    : { sign: 0, signName: 'Unknown' };
  const arudhaPadas = computeArudhaPadas(d1Planets, ascSign);
  const charaDashaTimeline = computeCharaDasha(d1Planets, ascSign, birthDate);

  return {
    id: crypto.randomUUID(),
    // Engine output version. Bump when the snapshot shape gains new data
    // (e.g. new sections). Keep in sync with CURRENT_SNAPSHOT_VERSION in
    // src/lib/astro/types.ts — saved charts below this version auto-recalculate.
    snapshotVersion: 7,
    birthDetails: details,
    generatedAt: new Date().toISOString(),
    ascendant: d1Planets[0], // ascendant entry
    panchang,
    divisionalCharts: divCharts,
    dashas,
    doshas,
    yogas,
    ashtakavarga,
    shadbala,
    bhavaBala,
    kp: { planetSubLords: kpPlanetSubLords, cuspalSubLords, rulingPlanets },
    jaimini: {
      charaKarakas,
      atmakaraka: ak?.planet ?? 'unknown',
      karakamsa: karakamsaResult,
      arudhaPadas,
      charaDasha: charaDashaTimeline ? (() => {
        const now = new Date();
        const current = charaDashaTimeline.find(
          (d) => new Date(d.startDate) <= now && now < new Date(d.endDate),
        );
        return {
          timeline: charaDashaTimeline,
          currentSign: current?.sign,
          currentSignName: current?.signName,
        };
      })() : undefined,
    },
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
  const nodeType = details.nodeType ?? 'true';
  const trop = tropicalPositions(jd, details.placeOfBirth.latitude, details.placeOfBirth.longitude, nodeType);
  const aya = ayanamsa(details.ayanamsa, jd);
  const ascSid = toSidereal(trop.ascendant, aya);
  const ascSign = signNumber(ascSid);

  return PLANETS.filter(({ key }) => key !== 'ascendant').map(({ key }) => {
    const tropLon = (trop as unknown as Record<string, number>)[key];
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
