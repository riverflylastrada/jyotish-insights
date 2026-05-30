/**
 * Shadbala — six-source planetary strength per Parashari/BPHS.
 *
 * Computes the classical six balas for Sun–Saturn (7 grahas) in virupas,
 * then total Rupas (1 Rupa = 60 virupas), required minimum, ratio, and rank.
 *
 * Validated against PyJHora (Jagannatha Hora) v4.8.5 algorithms.
 * Key conventions matched to JHora:
 *  - Cheshta uses Cheshta Kendra from Surya Siddhanta mean longitudes
 *  - Sun/Moon Cheshta = 0 (Ayana/Paksha credited only in Kala)
 *  - Moon Paksha doubled in Kala Bala
 *  - Sun Ayana doubled in Kala Bala
 *  - Jupiter always gets 60V Tribhaga
 *  - Kendradi uses whole-sign houses
 *  - Drik uses degree-based aspect strengths with special aspects
 *  - Lord balas use Ahargana-based computation
 */

import { DEG, OWN_SIGNS, MOOLTRIKONA, FRIENDSHIPS } from "./constants.ts";
import type { PlanetPos } from "./divisional.ts";
import type { DivChart } from "./divisional.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Sub-bala breakdown for each of the 6 top-level balas (all in Virupas). */
export interface SubBalas {
  /** BPHS Ch. 27 shlokas 2–12: Positional strength sub-components. */
  sthana?: { uchcha: number; saptavargeeya: number; ojhayugma: number; kendra: number; drekkana: number };
  /** BPHS Ch. 27 shlokas 13–17: Directional strength. */
  dig?: { fromCardinal: number; idealDirection: 'east' | 'south' | 'west' | 'north'; offset: number };
  /** BPHS Ch. 27 shlokas 18–36: Temporal strength sub-components. */
  kala?: { nathonnatha: number; paksha: number; tribhaga: number; varsha: number; masa: number; vara: number; hora: number; ayana: number; yuddha: number };
  /** BPHS Ch. 27 shlokas 37–40: Motional strength. */
  cheshta?: { motionFactor: number };
  /** BPHS Ch. 27 shloka 41: Natural (inherent) strength. */
  naisargika?: { source: string };
  /** BPHS Ch. 27 shlokas 42–45: Aspectual strength per-aspecting-planet contribution. */
  drik?: { fromPlanet: Record<string, number> };
}

export interface PlanetShadbala {
  sthanaBala: number;   // virupas
  digBala: number;      // virupas
  kalaBala: number;     // virupas
  cheshtaBala: number;  // virupas
  naisargikaBala: number; // virupas
  drikBala: number;     // virupas
  totalVirupas: number;
  totalRupas: number;   // = totalVirupas / 60
  required: number;     // minimum Rupas (standard BPHS set)
  ratio: number;        // totalRupas / required
  ishtaPhala: number;   // virupas — sqrt(uchchaBala × cheshtaBala)
  kashtaPhala: number;  // virupas — sqrt((60-uchcha) × (60-cheshta))
  subBalas?: SubBalas;
}

export interface ShadbalaResult {
  planets: Record<string, PlanetShadbala>;
  rank: string[];       // planet keys sorted by total descending
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAHA_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;
type Graha = typeof GRAHA_KEYS[number];

const GRAHA_INDEX: Record<Graha, number> = {
  sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6,
};

const REQUIRED_RUPAS: Record<Graha, number> = {
  sun: 6.5, moon: 6, mars: 5, mercury: 7, jupiter: 6.5, venus: 5.5, saturn: 5,
};

const NAISARGIKA: Record<Graha, number> = {
  sun: 60, moon: 51.43, mars: 17.14, mercury: 25.71, jupiter: 34.29, venus: 42.86, saturn: 8.57,
};

/** Python-style modulo (always non-negative for positive divisor) */
function pymod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

const DEBIL_DEG: Record<Graha, number> = {
  sun: 190, moon: 213, mars: 118, mercury: 345, jupiter: 275, venus: 177, saturn: 20,
};

function signLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
    9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

const rad = (d: number) => d * DEG;
const norm360 = (d: number) => ((d % 360) + 360) % 360;

// ─── Sunrise/Sunset/Midnight ────────────────────────────────────────────────

/** NOAA solar declination and equation of time at a given JD. */
function solarDeclEot(jd: number): { decl: number; eotMin: number } {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = norm360(280.46646 + T * (36000.76983 + 0.0003032 * T));
  const M = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T))
          + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T)
          + Math.sin(rad(3 * M)) * 0.000289;
  const sunTL = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const sunAL = sunTL - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const obliq0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliq = obliq0 + 0.00256 * Math.cos(rad(omega));
  const decl = Math.asin(Math.sin(rad(obliq)) * Math.sin(rad(sunAL)));
  const y2 = Math.pow(Math.tan(rad(obliq / 2)), 2);
  const eotMin = 4 * (y2 * Math.sin(2 * rad(L0))
    - 2 * e * Math.sin(rad(M))
    + 4 * e * y2 * Math.sin(rad(M)) * Math.cos(2 * rad(L0))
    - 0.5 * y2 * y2 * Math.sin(4 * rad(L0))
    - 1.25 * e * e * Math.sin(2 * rad(M))) / DEG;
  return { decl, eotMin };
}

/** Iterative NOAA sunrise/sunset (2-pass for higher accuracy). */
function sunriseSunsetJd(jd: number, lat: number, lon: number): { sunriseJd: number; sunsetJd: number } {
  const dayStart = Math.floor(jd - 0.5) + 0.5;
  const noonJd = dayStart + 0.5;

  function riseSet(atJd: number): { sunriseJd: number; sunsetJd: number } {
    const { decl, eotMin } = solarDeclEot(atJd);
    const cosH = (0 /* disc-center, no refraction (JHora) */ - Math.sin(rad(lat)) * Math.sin(decl)) /
                 (Math.cos(rad(lat)) * Math.cos(decl));
    const HA = Math.acos(Math.max(-1, Math.min(1, cosH))) / DEG;
    const srMin = 720 - 4 * (lon + HA) - eotMin;
    const ssMin = 720 - 4 * (lon - HA) - eotMin;
    return { sunriseJd: dayStart + srMin / 1440, sunsetJd: dayStart + ssMin / 1440 };
  }

  // Pass 1: compute at noon
  const pass1 = riseSet(noonJd);
  // Pass 2: refine using the sun position at the approximate sunrise/sunset times
  const { decl: srDecl, eotMin: srEot } = solarDeclEot(pass1.sunriseJd);
  const cosHsr = (0 /* disc-center, no refraction (JHora) */ - Math.sin(rad(lat)) * Math.sin(srDecl)) /
                 (Math.cos(rad(lat)) * Math.cos(srDecl));
  const HAsr = Math.acos(Math.max(-1, Math.min(1, cosHsr))) / DEG;
  const srMin2 = 720 - 4 * (lon + HAsr) - srEot;

  const { decl: ssDecl, eotMin: ssEot } = solarDeclEot(pass1.sunsetJd);
  const cosHss = (0 /* disc-center, no refraction (JHora) */ - Math.sin(rad(lat)) * Math.sin(ssDecl)) /
                 (Math.cos(rad(lat)) * Math.cos(ssDecl));
  const HAss = Math.acos(Math.max(-1, Math.min(1, cosHss))) / DEG;
  const ssMin2 = 720 - 4 * (lon - HAss) - ssEot;

  return { sunriseJd: dayStart + srMin2 / 1440, sunsetJd: dayStart + ssMin2 / 1440 };
}

function sunriseSunsetHours(jd: number, lat: number, lon: number, tz: number): { sunrise: number; sunset: number } {
  const { sunriseJd, sunsetJd } = sunriseSunsetJd(jd, lat, lon);
  const sunrise = ((sunriseJd - Math.floor(jd - 0.5) - 0.5) * 24 + tz);
  const sunset = ((sunsetJd - Math.floor(jd - 0.5) - 0.5) * 24 + tz);
  return { sunrise, sunset };
}

// ─── 1. Sthana Bala ─────────────────────────────────────────────────────────

function uchchaBala(planet: Graha, sidLon: number): number {
  const debilDeg = DEBIL_DEG[planet];
  let dist = norm360(sidLon - debilDeg);
  if (dist > 180) dist = 360 - dist;
  return dist / 3;
}

function saptavargajaBala(
  planet: Graha,
  d1Planets: PlanetPos[],
  divCharts: DivChart[],
): number {
  const vargaCodes = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
  let total = 0;

  for (const code of vargaCodes) {
    const chart = divCharts.find(c => c.varga === code);
    if (!chart) continue;

    const pp = chart.planets.find(p => p.planet === planet);
    if (!pp) continue;

    const sign = pp.signNumber;
    const lord = signLord(sign);
    const degInSign = pp.signDegree;

    // JHora: Mooltrikona = entire sign (no degree range) for Saptavargaja in D1
    if (code === 'D1') {
      const mt = MOOLTRIKONA[planet];
      if (mt && mt[0] === sign) {
        total += 45;
        continue;
      }
    }

    if (OWN_SIGNS[planet]?.includes(sign)) {
      total += 30;
      continue;
    }

    if (lord === planet) {
      total += 30;
      continue;
    }

    const relation = getCompoundRelation(planet, lord, d1Planets);
    switch (relation) {
      case 'great_friend': total += 22.5; break;
      case 'friend': total += 15; break;
      case 'neutral': total += 7.5; break;
      case 'enemy': total += 3.75; break;
      case 'great_enemy': total += 1.875; break;
    }
  }

  return total;
}

type Relation = 'great_friend' | 'friend' | 'neutral' | 'enemy' | 'great_enemy';

function getNaisargikaRelation(planet: string, other: string): 'friend' | 'neutral' | 'enemy' {
  if (planet === other) return 'friend';
  const f = FRIENDSHIPS[planet];
  if (!f) return 'neutral';
  if (f.friends.includes(other)) return 'friend';
  if (f.enemies.includes(other)) return 'enemy';
  return 'neutral';
}

function getTemporalRelation(planet: string, other: string, d1Planets: PlanetPos[]): 'friend' | 'enemy' {
  const pp = d1Planets.find(p => p.planet === planet);
  const op = d1Planets.find(p => p.planet === other);
  if (!pp || !op) return 'enemy';

  const pSign = pp.signNumber;
  const oSign = op.signNumber;
  const dist = ((oSign - pSign + 12) % 12);
  return [1, 2, 3, 9, 10, 11].includes(dist) ? 'friend' : 'enemy';
}

function getCompoundRelation(planet: string, lord: string, d1Planets: PlanetPos[]): Relation {
  if (planet === lord) return 'great_friend';
  const nat = getNaisargikaRelation(planet, lord);
  const temp = getTemporalRelation(planet, lord, d1Planets);

  if (nat === 'friend' && temp === 'friend') return 'great_friend';
  if (nat === 'friend' && temp === 'enemy') return 'neutral';
  if (nat === 'enemy' && temp === 'friend') return 'neutral';
  if (nat === 'enemy' && temp === 'enemy') return 'great_enemy';
  if (nat === 'neutral' && temp === 'friend') return 'friend';
  if (nat === 'neutral' && temp === 'enemy') return 'enemy';
  return 'neutral';
}

function ojhayugmaBala(planet: Graha, d1Sign: number, d9Sign: number): number {
  let total = 0;
  const isOddSign = d1Sign % 2 === 1;
  const isOddNavamsa = d9Sign % 2 === 1;

  if (planet === 'moon' || planet === 'venus') {
    if (!isOddSign) total += 15;
    if (!isOddNavamsa) total += 15;
  } else {
    if (isOddSign) total += 15;
    if (isOddNavamsa) total += 15;
  }
  return total;
}

/** Kendradi Bala — uses WHOLE-SIGN house from lagna (per JHora). */
function kendradiBala(houseFromLagna: number): number {
  if ([1, 4, 7, 10].includes(houseFromLagna)) return 60;
  if ([2, 5, 8, 11].includes(houseFromLagna)) return 30;
  return 15;
}

function drekkanaBala(planet: Graha, degInSign: number): number {
  const drekkana = degInSign < 10 ? 0 : degInSign < 20 ? 1 : 2;
  const male: Graha[] = ['sun', 'mars', 'jupiter'];
  const female: Graha[] = ['moon', 'venus'];
  const neuter: Graha[] = ['mercury', 'saturn'];

  if (drekkana === 0 && male.includes(planet)) return 15;
  if (drekkana === 1 && neuter.includes(planet)) return 15;
  if (drekkana === 2 && female.includes(planet)) return 15;
  return 0;
}

interface SthanaSubBalas { uchcha: number; saptavargeeya: number; ojhayugma: number; kendra: number; drekkana: number }

function computeSthanaBala(
  planet: Graha,
  sidLon: number,
  d1Planets: PlanetPos[],
  divCharts: DivChart[],
  ascSign: number,
): { total: number; sub: SthanaSubBalas } {
  const pp = d1Planets.find(p => p.planet === planet);
  if (!pp) return { total: 0, sub: { uchcha: 0, saptavargeeya: 0, ojhayugma: 0, kendra: 0, drekkana: 0 } };

  const d9 = divCharts.find(c => c.varga === 'D9');
  const d9Planet = d9?.planets.find(p => p.planet === planet);
  const d9Sign = d9Planet?.signNumber ?? pp.signNumber;

  const uchcha = uchchaBala(planet, sidLon);
  const saptavargeeya = saptavargajaBala(planet, d1Planets, divCharts);
  const ojhayugma = ojhayugmaBala(planet, pp.signNumber, d9Sign);

  const wholeSignHouse = ((pp.signNumber - ascSign + 12) % 12) + 1;
  const kendra = kendradiBala(wholeSignHouse);
  const drekkana = drekkanaBala(planet, pp.signDegree);

  const total = uchcha + saptavargeeya + ojhayugma + kendra + drekkana;
  return { total, sub: { uchcha, saptavargeeya, ojhayugma, kendra, drekkana } };
}

// ─── 2. Dig Bala ────────────────────────────────────────────────────────────

const DIG_IDEAL_DIR: Record<Graha, 'east' | 'south' | 'west' | 'north'> = {
  sun: 'south', mars: 'south',
  moon: 'north', venus: 'north',
  mercury: 'east', jupiter: 'east',
  saturn: 'west',
};

interface DigSubBalas { fromCardinal: number; idealDirection: 'east' | 'south' | 'west' | 'north'; offset: number }

function computeDigBala(planet: Graha, planetLon: number, cusps: number[]): { total: number; sub: DigSubBalas } {
  // JHora: abs(weakpoint_longitude - planet_longitude) / 3
  // Weakpoints use Placidus cusp longitudes (no wrapping to 0-180).
  const weakCuspIdx: Record<Graha, number> = {
    sun: 3, mars: 3,          // weak at IC (4th cusp)
    moon: 9, venus: 9,        // weak at MC (10th cusp)
    mercury: 6, jupiter: 6,   // weak at DESC (7th cusp)
    saturn: 0,                // weak at ASC (1st cusp)
  };

  const weakLon = cusps[weakCuspIdx[planet]];
  const offset = Math.abs(weakLon - planetLon);
  const total = offset / 3;
  return { total, sub: { fromCardinal: total, idealDirection: DIG_IDEAL_DIR[planet], offset } };
}

// ─── 3. Kala Bala ───────────────────────────────────────────────────────────

/** JHora Nathonnatha: distance from midnight × 60/12 */
function nathonnathaBalance(planet: Graha, birthTimeHours: number, sunriseH: number, sunsetH: number): number {
  if (planet === 'mercury') return 60;

  const noon = (sunriseH + sunsetH) / 2;
  const midnight = noon > 12 ? noon - 12 : noon + 12;

  let tDiff: number;
  if (birthTimeHours < 12) {
    tDiff = (birthTimeHours - midnight + 24) % 24;
  } else {
    tDiff = (24 + midnight - birthTimeHours + 24) % 24;
  }
  tDiff = Math.min(tDiff, 24 - tDiff);
  const val = tDiff * 60 / 12;

  const diurnal = ['sun', 'jupiter', 'venus'];
  if (diurnal.includes(planet)) return val;
  return 60 - val;
}

/** Functional benefic/malefic classification (JHora: PVR Narasimha Rao method).
 *  Mercury's classification depends on planets conjunct in the same sign. */
function functionalBenMal(
  d1Planets: PlanetPos[],
  tithi: number,
): { benefics: Set<string>; malefics: Set<string> } {
  const waxing = tithi <= 15;
  const benefics = new Set<string>(['jupiter', 'venus']);
  const malefics = new Set<string>(['sun', 'mars', 'saturn']);
  if (waxing) benefics.add('moon'); else malefics.add('moon');

  // Mercury: benefic when alone or with more benefics in same sign; malefic otherwise
  const mercPos = d1Planets.find(p => p.planet === 'mercury');
  if (mercPos) {
    const mercSign = mercPos.signNumber;
    let benCount = 0, malCount = 0;
    for (const p of d1Planets) {
      if (p.planet === 'mercury' || !GRAHA_KEYS.includes(p.planet as Graha)) continue;
      if (p.signNumber !== mercSign) continue;
      if (benefics.has(p.planet)) benCount++;
      if (malefics.has(p.planet)) malCount++;
    }
    if (malCount > benCount) malefics.add('mercury');
    else benefics.add('mercury');
  } else {
    benefics.add('mercury');
  }
  return { benefics, malefics };
}

/** JHora Paksha: |sun - moon| / 3, malefics get 60 - pb, Moon doubled. */
function pakshaBala(
  d1Planets: PlanetPos[],
  moonSunAngleSid: number,
): Record<Graha, number> {
  const sunPos = d1Planets.find(p => p.planet === 'sun');
  const moonPos = d1Planets.find(p => p.planet === 'moon');
  if (!sunPos || !moonPos) {
    const r = {} as Record<Graha, number>;
    for (const g of GRAHA_KEYS) r[g] = 0;
    return r;
  }

  const sunLon = sunPos.longitude;
  const moonLon = moonPos.longitude;
  const pb = Math.abs(sunLon - moonLon) / 3;

  const tithi = Math.floor(moonSunAngleSid / 12) + 1;
  const { benefics, malefics } = functionalBenMal(d1Planets, tithi);

  const result = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) {
    if (malefics.has(g)) {
      result[g] = 60 - pb;
    } else {
      result[g] = pb;
    }
  }
  result.moon *= 2; // Moon's Paksha is doubled (per JHora)
  return result;
}

/** JHora Tribhaga: Jupiter ALWAYS 60. Day: 1st=Mercury, 2nd=Sun, 3rd=Saturn.
 *  Night: 1st=Moon, 2nd=Venus, 3rd=Mars. */
function tribhagaBala(planet: Graha, birthTimeH: number, sunriseH: number, sunsetH: number): number {
  if (planet === 'jupiter') return 60;

  const isDay = birthTimeH >= sunriseH && birthTimeH < sunsetH;

  if (isDay) {
    const dayLen = sunsetH - sunriseH;
    const dayInc = dayLen / 3;
    if (birthTimeH >= sunriseH && birthTimeH < sunriseH + dayInc) {
      if (planet === 'mercury') return 60;
    } else if (birthTimeH >= sunriseH + dayInc && birthTimeH < sunriseH + 2 * dayInc) {
      if (planet === 'sun') return 60;
    } else if (birthTimeH >= sunriseH + 2 * dayInc && birthTimeH < sunsetH) {
      if (planet === 'saturn') return 60;
    }
  } else {
    const nightLen = 24 - (sunsetH - sunriseH);
    const nightInc = nightLen / 3;
    let timeInNight = birthTimeH >= sunsetH
      ? birthTimeH - sunsetH
      : birthTimeH + (24 - sunsetH);

    if (timeInNight >= 0 && timeInNight < nightInc) {
      if (planet === 'moon') return 60;
    } else if (timeInNight >= nightInc && timeInNight < 2 * nightInc) {
      if (planet === 'venus') return 60;
    } else {
      if (planet === 'mars') return 60;
    }
  }
  return 0;
}

/** Lagrangian interpolation: given (x,y) table, find x-value at y=ya. */
function inverseLagrange(x: number[], y: number[], ya: number): number {
  let total = 0;
  for (let i = 0; i < x.length; i++) {
    let numer = 1;
    let denom = 1;
    for (let j = 0; j < x.length; j++) {
      if (j !== i) {
        numer *= (ya - y[j]);
        denom *= (y[i] - y[j]);
      }
    }
    total += (numer * x[i]) / denom;
  }
  return total;
}

// JHora declination table (Surya Siddhanta)
const DECL_TABLE = [0, 362 / 60, 703 / 60, 1002 / 60, 1238 / 60, 1388 / 60, 1440 / 60];
const BHUJA_TABLE = [0, 15, 30, 45, 60, 75, 90];

/** JHora Ayana Bala: declination via bhuja interpolation + north/south sign. */
function ayanaBala(
  planet: Graha,
  sidLon: number,
  ayanamsaDeg: number,
): number {
  const tropLon = norm360(sidLon + ayanamsaDeg);

  // Reduce to bhuja (first-quadrant equivalent)
  let bhuja = tropLon;
  if (tropLon > 90 && tropLon < 180) bhuja = 180 - tropLon;
  else if (tropLon > 180 && tropLon < 270) bhuja = tropLon - 180;
  else if (tropLon > 270 && tropLon < 360) bhuja = 360 - tropLon;

  // Declination via Lagrangian interpolation on Surya Siddhanta table
  const decl = inverseLagrange(DECL_TABLE, BHUJA_TABLE, bhuja);

  // North/south sign: positive when planet is in its preferred hemisphere
  const inNorth = tropLon >= 0 && tropLon < 180;
  let nsSign: number;
  if (inNorth) {
    nsSign = (['sun', 'mars', 'jupiter', 'venus'] as Graha[]).includes(planet) ? 1 : -1;
  } else {
    nsSign = (['moon', 'saturn'] as Graha[]).includes(planet) ? 1 : -1;
  }
  if (planet === 'mercury') nsSign = 1;

  let val = (24 + nsSign * decl) * 1.25;
  if (planet === 'sun') val *= 2;
  return val;
}

// ─── Ahargana-based Lord Balas (matching JHora) ─────────────────────────────

const AHARGANA_BASE_YEAR = 1951;
const AHARGANA_BASE_DAYS = 174;

const ABDAHIPATHI_WEEKDAYS = [2, 3, 4, 5, 6, 0, 1]; // Maps to Sun..Saturn (0-6)
const HORA_ORDER = [6, 4, 2, 0, 5, 3, 1]; // Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon

function daysElapsedSinceBase(year: number, baseYear = AHARGANA_BASE_YEAR, baseDays = AHARGANA_BASE_DAYS): number {
  const totalYears = year - baseYear;
  let leapYears = 0;
  for (let y = baseYear + 1; y <= year; y++) {
    if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) leapYears++;
  }
  const nonLeapYears = totalYears - leapYears;
  return baseDays + (leapYears * 366) + (nonLeapYears * 365);
}

function jdToGregorian(jd: number): { year: number; month: number; day: number; hours: number } {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const hours = f * 24;
  return { year, month, day, hours };
}

function gregorianToJd(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function abdadhipathiBala(jd: number, tz: number): Record<Graha, number> {
  const result = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) result[g] = 0;

  const { year } = jdToGregorian(jd);
  const jdJan1 = gregorianToJd(year, 1, 1);
  const elapsedDays = Math.floor(jd - jdJan1 + 1);
  const ahargana = daysElapsedSinceBase(year - 1) + elapsedDays;
  const dayIdx = pymod(Math.floor(ahargana / 360) * 3 + 1, 7);
  const lordIdx = ABDAHIPATHI_WEEKDAYS[dayIdx];
  result[GRAHA_KEYS[lordIdx]] = 15;
  return result;
}

function masadhipathiBala(jd: number, tz: number): Record<Graha, number> {
  const result = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) result[g] = 0;

  const { year } = jdToGregorian(jd);
  const jdJan1 = gregorianToJd(year, 1, 1);
  const elapsedDays = Math.floor(jd - jdJan1 + 1);
  const ahargana = daysElapsedSinceBase(year - 1) + elapsedDays;
  const dayIdx = pymod(Math.floor(ahargana / 30) * 2 + 1, 7);
  const lordIdx = ABDAHIPATHI_WEEKDAYS[dayIdx];
  result[GRAHA_KEYS[lordIdx]] = 30;
  return result;
}

function vaaradhipathiBala(jd: number, birthTimeH: number, sunriseH: number): Record<Graha, number> {
  const result = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) result[g] = 0;

  const { year } = jdToGregorian(jd);
  const jdJan1 = gregorianToJd(year, 1, 1);
  const elapsedDays = Math.floor(jd - jdJan1 + 1);
  let ahargana = daysElapsedSinceBase(year - 1, 1827, 244) + elapsedDays;
  if (birthTimeH < sunriseH) ahargana -= 1;
  const dayIdx = pymod(Math.floor(ahargana), 7);
  const lordIdx = ABDAHIPATHI_WEEKDAYS[dayIdx];
  result[GRAHA_KEYS[lordIdx]] = 45;
  return result;
}

function horaBala(jd: number, tz: number, birthTimeH: number, sunriseH: number): Record<Graha, number> {
  const result = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) result[g] = 0;

  // JHora uses local-time JD for weekday (ceil(jd_local + 1) % 7)
  const jdLocal = jd + tz / 24;
  const weekday = Math.ceil(jdLocal + 1) % 7;
  let day = weekday;
  let tobh = birthTimeH;
  if (tobh < sunriseH) {
    day = (day - 1 + 7) % 7;
    tobh += 24;
  }
  const hora = (Math.floor(tobh - sunriseH) + day + 1) % 7;
  const lordIdx = HORA_ORDER[hora];
  result[GRAHA_KEYS[lordIdx]] = 60;
  return result;
}

function yuddhaBala(_planet: Graha, _d1Planets: PlanetPos[]): number {
  return 0;
}

interface KalaSubBalas { nathonnatha: number; paksha: number; tribhaga: number; varsha: number; masa: number; vara: number; hora: number; ayana: number; yuddha: number }

function computeKalaBala(
  d1Planets: PlanetPos[],
  jd: number,
  lat: number,
  lon: number,
  tz: number,
  ayanamsaDeg: number,
  moonSunAngleSid: number,
): { totals: Record<Graha, number>; subs: Record<Graha, KalaSubBalas> } {
  const { sunrise: srH, sunset: ssH } = sunriseSunsetHours(jd, lat, lon, tz);
  const { hours: birthTimeH } = jdToGregorian(jd);
  const localBirthH = birthTimeH + tz;

  const pb = pakshaBala(d1Planets, moonSunAngleSid);
  const abdaBala = abdadhipathiBala(jd, tz);
  const masaBala = masadhipathiBala(jd, tz);
  const varaBala = vaaradhipathiBala(jd, localBirthH, srH);
  const hrBala = horaBala(jd, tz, localBirthH, srH);

  const totals = {} as Record<Graha, number>;
  const subs = {} as Record<Graha, KalaSubBalas>;
  for (const planet of GRAHA_KEYS) {
    const pp = d1Planets.find(p => p.planet === planet);
    const sidLon = pp?.longitude ?? 0;

    const nath = nathonnathaBalance(planet, localBirthH, srH, ssH);
    const trib = tribhagaBala(planet, localBirthH, srH, ssH);
    const ayana = ayanaBala(planet, sidLon, ayanamsaDeg);
    const yuddha = yuddhaBala(planet, d1Planets);
    const varsha = abdaBala[planet] ?? 0;
    const masa = masaBala[planet] ?? 0;
    const vara = varaBala[planet] ?? 0;
    const hora = hrBala[planet] ?? 0;

    totals[planet] = nath + pb[planet] + trib + varsha + masa + vara + hora + ayana + yuddha;
    subs[planet] = { nathonnatha: nath, paksha: pb[planet], tribhaga: trib, varsha, masa, vara, hora, ayana, yuddha };
  }
  return { totals, subs };
}

// ─── 4. Cheshta Bala ────────────────────────────────────────────────────────

// Surya Siddhanta mean longitude computation (matching JHora's get_planet_mean_longitude)
const EPOCH_JD = 2415020.5; // 1 Jan 1900, 0h UT
const UJJAIN_LON = 76;
const EPOCH_YEAR = 1900;

const MEAN_POS_AT_EPOCH = [257.4568, -1, 270.22, 164, 220.04, 328.51, 236.74];
const SPEED_AT_EPOCH = [0.9856, -1, 0.524, 4.0923, 0.0831, 1.60215, 0.033439];
const CORRECTION_FACTORS: [number, number, number][] = [
  [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 6.67, -0.00133],
  [-1, 3.3, 0.0067], [-1, 5, 0.0001], [1, 5, 0.001],
];

function getMeanLongitude(jd: number, placeLon: number, planetIdx: number): number {
  if (planetIdx === 1) return 0; // Moon not used
  const daysFromEpoch = jd - EPOCH_JD + (UJJAIN_LON - placeLon) / 15 / 24;
  const yearsSinceEpoch = jdToGregorian(jd).year - EPOCH_YEAR;
  const cf = CORRECTION_FACTORS[planetIdx];
  const correction = cf[0] * (cf[1] + cf[2] * yearsSinceEpoch);
  return ((MEAN_POS_AT_EPOCH[planetIdx] + daysFromEpoch * SPEED_AT_EPOCH[planetIdx]) + correction) % 360;
}

interface CheshtaSubBalas { motionFactor: number }

function computeCheshtaBala(
  planet: Graha,
  jd: number,
  placeLon: number,
  trueLon: number,
): { total: number; sub: CheshtaSubBalas } {
  if (planet === 'sun' || planet === 'moon') return { total: 0, sub: { motionFactor: 0 } };

  const pIdx = GRAHA_INDEX[planet];
  const sunMeanLong = getMeanLongitude(jd, placeLon, 0);

  let seegrocha: number;
  let meanLong: number;

  if (planet === 'mercury' || planet === 'venus') {
    seegrocha = getMeanLongitude(jd, placeLon, pIdx);
    meanLong = sunMeanLong;
  } else {
    meanLong = getMeanLongitude(jd, placeLon, pIdx);
    seegrocha = sunMeanLong;
  }

  const aveLong = (trueLon + meanLong) / 2;
  const reducedCheshtaKendra = Math.abs(seegrocha - aveLong);
  const total = reducedCheshtaKendra / 3;
  return { total, sub: { motionFactor: total } };
}

// ─── 6. Drik Bala ───────────────────────────────────────────────────────────

function drikBalaAspect(angleDeg: number, aspectingPlanet: Graha): number {
  const a = angleDeg;
  let v: number;

  if (a >= 0 && a < 30) {
    v = 0;
  } else if (a >= 30 && a < 60) {
    v = 0.5 * (a - 30);
  } else if (a >= 60 && a < 90) {
    v = (a - 60) + 15;
    if (aspectingPlanet === 'saturn') v += 45;
  } else if (a >= 90 && a < 120) {
    v = 0.5 * (120 - a) + 30;
    if (aspectingPlanet === 'mars') v += 15;
  } else if (a >= 120 && a < 150) {
    v = (150 - a);
    if (aspectingPlanet === 'jupiter') v += 30;
  } else if (a >= 150 && a < 180) {
    v = 2 * (a - 150);
  } else if (a >= 180 && a < 300) {
    v = 0.5 * (300 - a);
    if (aspectingPlanet === 'mars' && a >= 210 && a < 240) v += 15;
    if (aspectingPlanet === 'jupiter' && a >= 240 && a < 270) v += 30;
    if (aspectingPlanet === 'saturn' && a >= 270 && a < 300) v += 45;
  } else {
    v = 0;
  }
  return v;
}

function computeDrikBala(
  d1Planets: PlanetPos[],
  moonSunAngleSid: number,
): { totals: Record<Graha, number>; perPlanet: Record<Graha, Record<string, number>> } {
  const grahaLons: Record<Graha, number> = {} as Record<Graha, number>;
  for (const g of GRAHA_KEYS) {
    const pp = d1Planets.find(p => p.planet === g);
    grahaLons[g] = pp ? pp.longitude : 0;
  }

  // Build aspect matrix: dk[aspected][aspecting]
  const dk: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  for (let p1 = 0; p1 < 7; p1++) {
    for (let p2 = 0; p2 < 7; p2++) {
      const p1Long = grahaLons[GRAHA_KEYS[p1]];
      const p2Long = grahaLons[GRAHA_KEYS[p2]];
      const angle = ((360 + p1Long - p2Long) % 360);
      dk[p1][p2] = drikBalaAspect(angle, GRAHA_KEYS[p2]);
    }
  }

  // Transpose so dk[aspecting][aspected]
  const dkT: number[][] = Array.from({ length: 7 }, (_, i) =>
    Array.from({ length: 7 }, (_, j) => dk[j][i])
  );

  // Functional benefics/malefics (same classification as Paksha)
  const tithi = Math.floor(moonSunAngleSid / 12) + 1;
  const { benefics: benSet, malefics: malSet } = functionalBenMal(d1Planets, tithi);
  const benefics = new Set<number>();
  const malefics = new Set<number>();
  for (let i = 0; i < GRAHA_KEYS.length; i++) {
    if (benSet.has(GRAHA_KEYS[i])) benefics.add(i);
    if (malSet.has(GRAHA_KEYS[i])) malefics.add(i);
  }

  const dkp = Array(7).fill(0);
  const dkm = Array(7).fill(0);
  const dkFinal = Array(7).fill(0);

  // Per-aspecting-planet contribution: for each aspected planet (col),
  // track how much each aspecting planet (row) adds/subtracts
  const perPlanetContrib: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));

  for (const row of Array.from({ length: 7 }, (_, i) => i)) {
    for (let col = 0; col < 7; col++) {
      let contrib = 0;
      if (benefics.has(row)) {
        dkp[col] += dkT[row][col];
        contrib += dkT[row][col];
      }
      if (malefics.has(row)) {
        dkm[col] += dkT[row][col];
        contrib -= dkT[row][col];
      }
      perPlanetContrib[col][row] = contrib / 4;
      dkFinal[col] = (dkp[col] - dkm[col]) / 4;
    }
  }

  const totals = {} as Record<Graha, number>;
  const perPlanet = {} as Record<Graha, Record<string, number>>;
  for (let i = 0; i < 7; i++) {
    totals[GRAHA_KEYS[i]] = Math.round(dkFinal[i] * 100) / 100;
    const contribs: Record<string, number> = {};
    for (let j = 0; j < 7; j++) {
      contribs[GRAHA_KEYS[j]] = Math.round(perPlanetContrib[i][j] * 100) / 100;
    }
    perPlanet[GRAHA_KEYS[i]] = contribs;
  }
  return { totals, perPlanet };
}

// ─── Main computation ───────────────────────────────────────────────────────

export interface ShadbalaInput {
  d1Planets: PlanetPos[];
  divCharts: DivChart[];
  jd: number;
  lat: number;
  lon: number;
  tz: number;
  ayanamsaDeg: number;
  siderealCusps: number[];
  ascSign: number;
}

/** Source label for Naisargika Bala (fixed, from BPHS). */
const NAISARGIKA_SOURCE: Record<Graha, string> = {
  sun: 'Luminosity order (BPHS Ch.27 ś41): brightest = 60V',
  moon: 'Luminosity order (BPHS Ch.27 ś41): 51.43V',
  mars: 'Luminosity order (BPHS Ch.27 ś41): 17.14V',
  mercury: 'Luminosity order (BPHS Ch.27 ś41): 25.71V',
  jupiter: 'Luminosity order (BPHS Ch.27 ś41): 34.29V',
  venus: 'Luminosity order (BPHS Ch.27 ś41): 42.86V',
  saturn: 'Luminosity order (BPHS Ch.27 ś41): dimmest = 8.57V',
};

export function computeShadbala(input: ShadbalaInput): ShadbalaResult {
  const {
    d1Planets, divCharts, jd, lat, lon, tz,
    ayanamsaDeg,
    siderealCusps,
    ascSign,
  } = input;

  const sunSid = d1Planets.find(p => p.planet === 'sun')?.longitude ?? 0;
  const moonSid = d1Planets.find(p => p.planet === 'moon')?.longitude ?? 0;
  const moonSunAngleSid = norm360(moonSid - sunSid);

  const kalaBalaAll = computeKalaBala(
    d1Planets, jd, lat, lon, tz, ayanamsaDeg, moonSunAngleSid,
  );
  const drikBalaAll = computeDrikBala(d1Planets, moonSunAngleSid);

  const result: Record<string, PlanetShadbala> = {};

  for (const planet of GRAHA_KEYS) {
    const pp = d1Planets.find(p => p.planet === planet);
    if (!pp) continue;

    const ub = uchchaBala(planet, pp.longitude);
    const sthanaResult = computeSthanaBala(planet, pp.longitude, d1Planets, divCharts, ascSign);
    const digResult = computeDigBala(planet, pp.longitude, siderealCusps);
    const kalaBala = kalaBalaAll.totals[planet];
    const cheshtaResult = computeCheshtaBala(planet, jd, lon, pp.longitude);
    const naisargikaBala = NAISARGIKA[planet];
    const drikBala = drikBalaAll.totals[planet];

    const sthanaBala = sthanaResult.total;
    const digBala = digResult.total;
    const cheshtaBala = cheshtaResult.total;

    const totalVirupas = sthanaBala + digBala + kalaBala + cheshtaBala + naisargikaBala + drikBala;
    const totalRupas = totalVirupas / 60;
    const required = REQUIRED_RUPAS[planet];
    const ratio = totalRupas / required;

    // BPHS Ishta/Kashta Phala (Ch 27): derived from Uchcha Bala + Cheshta Bala.
    const ishtaPhala = Math.sqrt(Math.max(0, ub * cheshtaBala));
    const kashtaPhala = Math.sqrt(Math.max(0, (60 - ub) * (60 - cheshtaBala)));

    const r2 = (v: number) => Math.round(v * 100) / 100;

    result[planet] = {
      sthanaBala: r2(sthanaBala),
      digBala: r2(digBala),
      kalaBala: r2(kalaBala),
      cheshtaBala: r2(cheshtaBala),
      naisargikaBala: r2(naisargikaBala),
      drikBala: r2(drikBala),
      totalVirupas: r2(totalVirupas),
      totalRupas: r2(totalRupas),
      required,
      ratio: r2(ratio),
      ishtaPhala: r2(ishtaPhala),
      kashtaPhala: r2(kashtaPhala),
      subBalas: {
        sthana: {
          uchcha: r2(sthanaResult.sub.uchcha),
          saptavargeeya: r2(sthanaResult.sub.saptavargeeya),
          ojhayugma: r2(sthanaResult.sub.ojhayugma),
          kendra: r2(sthanaResult.sub.kendra),
          drekkana: r2(sthanaResult.sub.drekkana),
        },
        dig: {
          fromCardinal: r2(digResult.sub.fromCardinal),
          idealDirection: digResult.sub.idealDirection,
          offset: r2(digResult.sub.offset),
        },
        kala: {
          nathonnatha: r2(kalaBalaAll.subs[planet].nathonnatha),
          paksha: r2(kalaBalaAll.subs[planet].paksha),
          tribhaga: r2(kalaBalaAll.subs[planet].tribhaga),
          varsha: r2(kalaBalaAll.subs[planet].varsha),
          masa: r2(kalaBalaAll.subs[planet].masa),
          vara: r2(kalaBalaAll.subs[planet].vara),
          hora: r2(kalaBalaAll.subs[planet].hora),
          ayana: r2(kalaBalaAll.subs[planet].ayana),
          yuddha: r2(kalaBalaAll.subs[planet].yuddha),
        },
        cheshta: { motionFactor: r2(cheshtaResult.sub.motionFactor) },
        naisargika: { source: NAISARGIKA_SOURCE[planet] },
        drik: { fromPlanet: drikBalaAll.perPlanet[planet] },
      },
    };
  }

  const rank = Object.entries(result)
    .sort(([, a], [, b]) => b.totalVirupas - a.totalVirupas)
    .map(([k]) => k);

  return { planets: result, rank };
}
