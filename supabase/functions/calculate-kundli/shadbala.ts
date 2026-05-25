/**
 * Shadbala — six-source planetary strength per Parashari/BPHS.
 *
 * Computes the classical six balas for Sun–Saturn (7 grahas) in virupas,
 * then total Rupas (1 Rupa = 60 virupas), required minimum, ratio, and rank.
 *
 * Root-cause fixes (PR #18 update, validated against AstroSage):
 * 1. Sun Cheshta = Ayana Bala, Moon Cheshta = Paksha Bala (per BPHS)
 * 2. Dig Bala uses angular distance from weakpoint cusp longitude
 * 3. Kendradi Bala uses Bhava (Placidus) house positions
 * 4. Cheshta for Mars–Saturn uses 8-state classification
 * 5. Nathonnatha & Tribhaga use computed sunrise/sunset
 */

import { DEG, OWN_SIGNS, MOOLTRIKONA, FRIENDSHIPS } from "./constants.ts";
import type { PlanetPos } from "./divisional.ts";
import type { DivChart } from "./divisional.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

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
}

export interface ShadbalaResult {
  planets: Record<string, PlanetShadbala>;
  rank: string[];       // planet keys sorted by total descending
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAHA_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;
type Graha = typeof GRAHA_KEYS[number];

const REQUIRED_RUPAS: Record<Graha, number> = {
  sun: 6.5, moon: 6, mars: 5, mercury: 7, jupiter: 6.5, venus: 5.5, saturn: 5,
};

/** Naisargika Bala (fixed, BPHS). */
const NAISARGIKA: Record<Graha, number> = {
  sun: 60, moon: 51.43, mars: 17.14, mercury: 25.71, jupiter: 34.28, venus: 42.85, saturn: 8.57,
};

/** Debilitation degrees = exaltation + 180. */
const DEBIL_DEG: Record<Graha, number> = {
  sun: 190, moon: 213, mars: 118, mercury: 345, jupiter: 275, venus: 177, saturn: 20,
};

/** Sign lord lookup (1-indexed sign). */
function signLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
    9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

function isMoonBenefic(moonSunAngle: number): boolean {
  return moonSunAngle >= 120 && moonSunAngle <= 300;
}

const rad = (d: number) => d * DEG;
const norm360 = (d: number) => ((d % 360) + 360) % 360;

/** Mean daily motion (degrees/day) for each planet. */
const MEAN_DAILY_MOTION: Record<Graha, number> = {
  sun: 0.9856,
  moon: 13.1764,
  mars: 0.5240,
  mercury: 1.3833,   // mean heliocentric
  jupiter: 0.08309,
  venus: 1.2000,     // mean heliocentric
  saturn: 0.03346,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Determine which Bhava (Placidus house) a planet falls in based on cusps. */
function bhavaHouse(planetLon: number, cusps: number[]): number {
  const plon = norm360(planetLon);
  for (let i = 0; i < 12; i++) {
    const start = norm360(cusps[i]);
    const end = norm360(cusps[(i + 1) % 12]);
    if (start <= end) {
      if (plon >= start && plon < end) return i + 1;
    } else {
      // wrap around 360°
      if (plon >= start || plon < end) return i + 1;
    }
  }
  return 1; // fallback
}

/** Compute sunrise/sunset JD for the given date and location. */
function sunriseSunsetJd(jd: number, lat: number, lon: number): { sunriseJd: number; sunsetJd: number } {
  const T = (jd - 2451545.0) / 36525.0;
  const M = norm360(357.5291 + 35999.0503 * T);
  const C = 1.9148 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 0.0003 * Math.sin(rad(3 * M));
  const lambda = norm360(M + C + 180 + 102.9372);
  const decl = Math.asin(Math.sin(rad(23.44)) * Math.sin(rad(lambda)));
  const cosH = (Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * Math.sin(decl)) /
               (Math.cos(rad(lat)) * Math.cos(decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / DEG;
  // lon is east-positive; NOAA formula uses west-positive, so negate
  const Jnoon = 2451545.0 + Math.round(jd - 2451545.0 + lon / 360) - lon / 360;
  const Jtransit = Jnoon + 0.0053 * Math.sin(rad(M)) - 0.0069 * Math.sin(rad(2 * lambda));
  return { sunriseJd: Jtransit - H / 360, sunsetJd: Jtransit + H / 360 };
}

// ─── 1. Sthana Bala ─────────────────────────────────────────────────────────

function uchchaBala(planet: Graha, sidLon: number): number {
  const debilDeg = DEBIL_DEG[planet];
  let dist = norm360(sidLon - debilDeg);
  if (dist > 180) dist = 360 - dist;
  return dist / 3; // max 60 virupas
}

/**
 * Saptavargaja Bala — dignity across 7 vargas (D1, D2, D3, D7, D9, D12, D30).
 * Points per varga: Mooltrikona 45, Own sign 30, Great friend 22.5,
 * Friend 15, Neutral 7.5, Enemy 3.75, Great enemy 1.875.
 *
 * Compound (Panchada) relationship for each varga:
 * naisargika friendship ± temporal friendship.
 */
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

    // Check mooltrikona (only in D1 — degree range is D1-specific)
    if (code === 'D1') {
      const mt = MOOLTRIKONA[planet];
      if (mt && mt[0] === sign && degInSign >= mt[1] && degInSign <= mt[2]) {
        total += 45;
        continue;
      }
    }

    // Check own sign
    if (OWN_SIGNS[planet]?.includes(sign)) {
      total += 30;
      continue;
    }

    // Relationship-based scoring
    if (lord === planet) {
      total += 30; // own sign (lord check redundant with above, but safety)
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
  // Temporal friends: houses 2,3,4,10,11,12 from planet → distances 1,2,3,9,10,11
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
    if (!isOddSign) total += 15;     // even rasi
    if (!isOddNavamsa) total += 15;  // even navamsa
  } else {
    if (isOddSign) total += 15;      // odd rasi
    if (isOddNavamsa) total += 15;   // odd navamsa
  }
  return total;
}

function kendradiBala(house: number): number {
  if ([1, 4, 7, 10].includes(house)) return 60;
  if ([2, 5, 8, 11].includes(house)) return 30;
  return 15;
}

function drekkanaBala(planet: Graha, degInSign: number): number {
  const drekkana = degInSign < 10 ? 1 : degInSign < 20 ? 2 : 3;
  const male = ['sun', 'mars', 'jupiter'];
  const female = ['moon', 'venus'];
  const neuter = ['mercury', 'saturn'];

  if (drekkana === 1 && male.includes(planet)) return 15;
  if (drekkana === 2 && neuter.includes(planet)) return 15;
  if (drekkana === 3 && female.includes(planet)) return 15;
  return 0;
}

function computeSthanaBala(
  planet: Graha,
  sidLon: number,
  d1Planets: PlanetPos[],
  divCharts: DivChart[],
  siderealCusps: number[],
): number {
  const pp = d1Planets.find(p => p.planet === planet);
  if (!pp) return 0;

  const d9 = divCharts.find(c => c.varga === 'D9');
  const d9Planet = d9?.planets.find(p => p.planet === planet);
  const d9Sign = d9Planet?.signNumber ?? pp.signNumber;

  const uchcha = uchchaBala(planet, sidLon);
  const sapta = saptavargajaBala(planet, d1Planets, divCharts);
  const ojha = ojhayugmaBala(planet, pp.signNumber, d9Sign);

  // Kendradi uses Bhava (Placidus) house — not whole-sign
  const bhouse = bhavaHouse(sidLon, siderealCusps);
  const kendra = kendradiBala(bhouse);
  const drekk = drekkanaBala(planet, pp.signDegree);

  return uchcha + sapta + ojha + kendra + drekk;
}

// ─── 2. Dig Bala ────────────────────────────────────────────────────────────

function computeDigBala(planet: Graha, planetLon: number, cusps: number[]): number {
  // Angular distance from weakpoint cusp longitude (max 60V at 180°).
  // Strong → Weak:  Jupiter/Mercury: ASC→DESC, Sun/Mars: MC→IC,
  //                  Saturn: DESC→ASC, Moon/Venus: IC→MC
  const weakCuspIdx: Record<Graha, number> = {
    jupiter: 6, mercury: 6,   // weak at DESC
    sun: 3, mars: 3,          // weak at IC
    saturn: 0,                // weak at ASC
    moon: 9, venus: 9,        // weak at MC
  };

  const weakLon = cusps[weakCuspIdx[planet]];
  let dist = norm360(planetLon - weakLon);
  if (dist > 180) dist = 360 - dist;
  return dist / 3; // max 60 when 180° from weak point
}

// ─── 3. Kala Bala ───────────────────────────────────────────────────────────

function nathonnathaBalance(planet: Graha, jd: number, sunriseJd: number, sunsetJd: number): number {
  // Mercury: always 60 (ubhayachari — strong both day and night)
  if (planet === 'mercury') return 60;

  // Noon midpoint from actual sunrise/sunset
  const noonJd = (sunriseJd + sunsetJd) / 2;
  let distFromNoon = Math.abs(jd - noonJd);
  if (distFromNoon > 0.5) distFromNoon = 1 - distFromNoon;
  // frac: 0 at noon, 1 at midnight
  const frac = Math.min(1, distFromNoon / 0.5);

  const diurnal = ['sun', 'jupiter', 'venus'];
  if (diurnal.includes(planet)) return (1 - frac) * 60;
  // nocturnal: Moon, Mars, Saturn
  return frac * 60;
}

function pakshaBala(planet: Graha, moonSunAngle: number): number {
  // Shukla Paksha: benefics gain, malefics lose
  // Moon–Sun angle: 0° = new moon, 180° = full moon
  if (planet === 'moon') {
    let angle = moonSunAngle;
    if (angle > 180) angle = 360 - angle;
    return angle / 3; // 0–60
  }

  const benefics = ['jupiter', 'venus', 'mercury'];
  let angle = moonSunAngle;
  if (angle > 180) angle = 360 - angle; // 0–180

  if (benefics.includes(planet)) {
    return angle / 3; // max 60 at full moon
  }
  // malefics: Sun, Mars, Saturn
  return (180 - angle) / 3; // max 60 at new moon
}

function tribhagaBala(planet: Graha, jd: number, sunriseJd: number, sunsetJd: number): number {
  // Mercury does NOT own a specific Tribhaga period; scored 0 like non-ruling planets.
  // (Mercury's "always strong" is reflected in Nathonnatha, not Tribhaga.)

  const isDay = jd >= sunriseJd && jd < sunsetJd;

  if (isDay) {
    const dayProgress = (jd - sunriseJd) / (sunsetJd - sunriseJd);
    if (dayProgress < 1 / 3 && planet === 'jupiter') return 60;
    if (dayProgress >= 1 / 3 && dayProgress < 2 / 3 && planet === 'sun') return 60;
    if (dayProgress >= 2 / 3 && planet === 'saturn') return 60;
  } else {
    // Night: approximate from sunset to next sunrise
    const nightDuration = 1 - (sunsetJd - sunriseJd); // in days
    const timeSinceSunset = jd >= sunsetJd
      ? jd - sunsetJd
      : jd - sunsetJd + 1; // wrapped past midnight
    const nightProgress = Math.max(0, Math.min(1, timeSinceSunset / nightDuration));
    if (nightProgress < 1 / 3 && planet === 'moon') return 60;
    if (nightProgress >= 1 / 3 && nightProgress < 2 / 3 && planet === 'venus') return 60;
    if (nightProgress >= 2 / 3 && planet === 'mars') return 60;
  }
  return 0;
}

function abdaMasaVaraHoraBala(planet: Graha, jd: number, sunriseJd: number, sunsetJd: number): number {
  // Weekday lord (Vara)
  const weekday = Math.floor(jd + 1.5) % 7;
  const varaLords = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const varaLord = varaLords[weekday];

  // Hora lord — planetary hours using actual sunrise and unequal hours
  const horaSequence = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars'];
  const varaIdx = horaSequence.indexOf(varaLord);
  const dayLen = sunsetJd - sunriseJd;
  const nightLen = 1 - dayLen;
  const isDay = jd >= sunriseJd && jd < sunsetJd;
  let horaIdx: number;
  if (isDay) {
    const horaLen = dayLen / 12;
    horaIdx = Math.floor((jd - sunriseJd) / horaLen);
  } else {
    const horaLen = nightLen / 12;
    const elapsed = jd >= sunsetJd ? jd - sunsetJd : jd - sunsetJd + 1;
    horaIdx = 12 + Math.floor(elapsed / horaLen);
  }
  horaIdx = Math.min(horaIdx, 23);
  const horaLord = horaSequence[(varaIdx + horaIdx) % 7];

  // Abda lord (year lord, approximate)
  const yearFromJd = Math.floor((jd - 588465.5) / 365.25);
  const abdaLord = varaLords[yearFromJd % 7];

  // Masa lord (month lord, approximate)
  const monthFromJd = Math.floor((jd - 588465.5) / 29.5306);
  const masaLord = varaLords[monthFromJd % 7];

  let total = 0;
  if (planet === abdaLord) total += 15;
  if (planet === masaLord) total += 30;
  if (planet === varaLord) total += 45;
  if (planet === horaLord) total += 60;

  return total;
}

function ayanaBala(planet: Graha, tropicalLon: number, obliquityDeg: number): number {
  // Declination from tropical longitude
  const sinDecl = Math.sin(rad(obliquityDeg)) * Math.sin(rad(tropicalLon));
  const decl = Math.asin(Math.max(-1, Math.min(1, sinDecl))) / DEG;

  // AyanaBala = (decl + obliquity) / (2 * obliquity) * 60 for north-gaining
  const normalized = ((decl + obliquityDeg) / (2 * obliquityDeg)) * 60;

  // Sun, Mars, Jupiter: gain with northern declination
  const northGain = ['sun', 'mars', 'jupiter'];
  // Moon, Venus, Saturn: gain with southern declination
  const southGain = ['moon', 'saturn', 'venus'];

  if (planet === 'mercury') return normalized;
  if (northGain.includes(planet)) return normalized;
  if (southGain.includes(planet)) return 60 - normalized;
  return 30;
}

function yuddhaBala(
  _planet: Graha,
  _d1Planets: PlanetPos[],
): number {
  // Stubbed: requires planetary latitude data not yet in engine.
  return 0;
}

function computeKalaBala(
  planet: Graha,
  jd: number,
  _lat: number,
  _lon: number,
  _sunTropLon: number,
  moonSunAngle: number,
  obliquityDeg: number,
  tropicalLon: number,
  d1Planets: PlanetPos[],
  sunriseJd: number,
  sunsetJd: number,
): number {
  const nath = nathonnathaBalance(planet, jd, sunriseJd, sunsetJd);
  const paksha = pakshaBala(planet, moonSunAngle);
  const tribhaga = tribhagaBala(planet, jd, sunriseJd, sunsetJd);
  const lordBala = abdaMasaVaraHoraBala(planet, jd, sunriseJd, sunsetJd);
  const ayana = ayanaBala(planet, tropicalLon, obliquityDeg);
  const yuddha = yuddhaBala(planet, d1Planets);

  return nath + paksha + tribhaga + lordBala + ayana + yuddha;
}

// ─── 4. Cheshta Bala ────────────────────────────────────────────────────────

function computeCheshtaBala(
  planet: Graha,
  speed: number,
  isRetro: boolean,
  moonSunAngle: number,
  tropicalLon: number,
  obliquityDeg: number,
): number {
  // Per BPHS: Sun's Cheshta Bala = its Ayana Bala (credited again here).
  if (planet === 'sun') {
    return ayanaBala('sun', tropicalLon, obliquityDeg);
  }

  // Per BPHS: Moon's Cheshta Bala = its Paksha Bala (double-credited as Cheshta).
  if (planet === 'moon') {
    return pakshaBala('moon', moonSunAngle);
  }

  // Mars through Saturn: 8-state classification based on speed vs mean.
  const meanSpeed = MEAN_DAILY_MOTION[planet];

  // Vakra (retrograde)
  if (speed < 0 || isRetro) return 60;

  // Vikala (stationary, speed < 5% of mean)
  if (Math.abs(speed) < meanSpeed * 0.05) return 15;

  const ratio = speed / meanSpeed;
  if (ratio < 0.5) return 7.5;    // Mandatara (very slow)
  if (ratio < 0.9) return 15;     // Manda (slow)
  if (ratio <= 1.1) return 30;    // Sama (mean speed)
  if (ratio < 2.0) return 45;     // Chara (fast)
  return 30;                       // Atichara (very fast)
}

// ─── 5. Naisargika Bala ─────────────────────────────────────────────────────

function computeNaisargikaBala(planet: Graha): number {
  return NAISARGIKA[planet];
}

// ─── 6. Drik Bala ───────────────────────────────────────────────────────────

function computeDrikBala(
  planet: Graha,
  d1Planets: PlanetPos[],
  moonSunAngle: number,
): number {
  const pp = d1Planets.find(p => p.planet === planet);
  if (!pp) return 0;

  const planetSign = pp.signNumber;
  let total = 0;

  const moonBenefic = isMoonBenefic(moonSunAngle);

  for (const other of d1Planets) {
    if (other.planet === planet || other.planet === 'ascendant' || other.planet === 'rahu' || other.planet === 'ketu') continue;
    if (!GRAHA_KEYS.includes(other.planet as Graha)) continue;

    const otherSign = other.signNumber;
    const dist = ((otherSign - planetSign + 12) % 12);

    let aspectStrength = 0;

    // 7th house aspect (all planets)
    if (dist === 6) aspectStrength = 1.0;
    // Mars special: 4th and 8th
    else if (other.planet === 'mars' && (dist === 3 || dist === 7)) aspectStrength = 0.75;
    // Jupiter special: 5th and 9th
    else if (other.planet === 'jupiter' && (dist === 4 || dist === 8)) aspectStrength = 0.75;
    // Saturn special: 3rd and 10th
    else if (other.planet === 'saturn' && (dist === 2 || dist === 9)) aspectStrength = 0.75;

    if (aspectStrength === 0) continue;

    let beneficAspect = false;
    if (other.planet === 'jupiter' || other.planet === 'venus') {
      beneficAspect = true;
    } else if (other.planet === 'moon' && moonBenefic) {
      beneficAspect = true;
    } else if (other.planet === 'mercury') {
      beneficAspect = true;
    }

    const contribution = aspectStrength * 15;
    if (beneficAspect) {
      total += contribution;
    } else {
      total -= contribution;
    }
  }

  return total;
}

// ─── Main computation ───────────────────────────────────────────────────────

export interface ShadbalaInput {
  d1Planets: PlanetPos[];
  divCharts: DivChart[];
  jd: number;
  lat: number;
  lon: number;
  tropicalPositions: Record<string, number>;
  obliquityDeg: number;
  siderealCusps: number[]; // 12 Placidus cusps (sidereal longitudes, 0-indexed)
}

export function computeShadbala(input: ShadbalaInput): ShadbalaResult {
  const {
    d1Planets, divCharts, jd, lat, lon,
    tropicalPositions: tropPos,
    obliquityDeg,
    siderealCusps,
  } = input;

  // Moon–Sun tropical angle for Paksha Bala
  const sunTropLon = tropPos.sun ?? 0;
  const moonTropLon = tropPos.moon ?? 0;
  const moonSunAngle = norm360(moonTropLon - sunTropLon);

  // Compute sunrise/sunset JDs for Nathonnatha and Tribhaga
  const { sunriseJd, sunsetJd } = sunriseSunsetJd(jd, lat, lon);

  const result: Record<string, PlanetShadbala> = {};

  for (const planet of GRAHA_KEYS) {
    const pp = d1Planets.find(p => p.planet === planet);
    if (!pp) continue;

    const tropLon = tropPos[planet] ?? 0;
    const speed = pp.speed ?? MEAN_DAILY_MOTION[planet];
    const isRetro = pp.isRetrograde;

    const sthanaBala = computeSthanaBala(planet, pp.longitude, d1Planets, divCharts, siderealCusps);
    const digBala = computeDigBala(planet, pp.longitude, siderealCusps);
    const kalaBala = computeKalaBala(
      planet, jd, lat, lon, sunTropLon, moonSunAngle,
      obliquityDeg, tropLon, d1Planets,
      sunriseJd, sunsetJd,
    );
    const cheshtaBala = computeCheshtaBala(planet, speed, isRetro, moonSunAngle, tropLon, obliquityDeg);
    const naisargikaBala = computeNaisargikaBala(planet);
    const drikBala = computeDrikBala(planet, d1Planets, moonSunAngle);

    const totalVirupas = sthanaBala + digBala + kalaBala + cheshtaBala + naisargikaBala + drikBala;
    const totalRupas = totalVirupas / 60;
    const required = REQUIRED_RUPAS[planet];
    const ratio = totalRupas / required;

    result[planet] = {
      sthanaBala: Math.round(sthanaBala * 100) / 100,
      digBala: Math.round(digBala * 100) / 100,
      kalaBala: Math.round(kalaBala * 100) / 100,
      cheshtaBala: Math.round(cheshtaBala * 100) / 100,
      naisargikaBala: Math.round(naisargikaBala * 100) / 100,
      drikBala: Math.round(drikBala * 100) / 100,
      totalVirupas: Math.round(totalVirupas * 100) / 100,
      totalRupas: Math.round(totalRupas * 100) / 100,
      required,
      ratio: Math.round(ratio * 100) / 100,
    };
  }

  // Rank by total descending
  const rank = Object.entries(result)
    .sort(([, a], [, b]) => b.totalVirupas - a.totalVirupas)
    .map(([k]) => k);

  return { planets: result, rank };
}
