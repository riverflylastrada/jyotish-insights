/**
 * Shadbala — six-source planetary strength per Parashari/BPHS.
 *
 * Computes the classical six balas for Sun–Saturn (7 grahas) in virupas,
 * then total Rupas (1 Rupa = 60 virupas), required minimum, ratio, and rank.
 *
 * Conventions follow Jagannatha Hora (JHora) as closely as possible.
 * Sub-component choices documented inline.
 */

import { DEG, EXALTATION, DEBILITATION, OWN_SIGNS, MOOLTRIKONA, FRIENDSHIPS } from "./constants.ts";
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

/** Exaltation degrees (sidereal, full 360°) per BPHS. */
const EXALT_DEG: Record<Graha, number> = {
  sun: 10, moon: 33, mars: 298, mercury: 165, jupiter: 95, venus: 357, saturn: 200,
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

/** Natural benefics and malefics (JHora convention). */
function isBenefic(planet: string): boolean {
  return ['jupiter', 'venus'].includes(planet);
}

/** Full Moon → benefic, else malefic (simplified; more precise Paksha logic below). */
function isMoonBenefic(moonSunAngle: number): boolean {
  // Moon benefic when Shukla Paksha 8th tithi onward ≈ angle > 120°
  // JHora: Moon benefic if Sun-Moon angle > 120° (waxing side)
  return moonSunAngle >= 120 && moonSunAngle <= 300;
}

function isMercuryBenefic(mercuryAssociation: boolean): boolean {
  // Mercury is benefic if not associated with malefics — simplified: treat as benefic
  // JHora default: Mercury = benefic
  return !mercuryAssociation;
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
 * We compute compound (Panchada) relationship for each varga:
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
    const chart = code === 'D1' ? divCharts.find(c => c.varga === 'D1') : divCharts.find(c => c.varga === code);
    if (!chart) continue;

    const pp = chart.planets.find(p => p.planet === planet);
    if (!pp) continue;

    const sign = pp.signNumber;
    const lord = signLord(sign);
    const degInSign = pp.signDegree;

    // Check mooltrikona (only in D1)
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
      total += 30; // own sign
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
  // Temporal friends: 2, 3, 4, 10, 11, 12 from planet
  // (houses 2,3,4,10,11,12 → distances 1,2,3,9,10,11)
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
  // Odd/Even rasi + navamsa bala
  // Moon, Venus: get 15 virupas each for even rasi and even navamsa (total max 30)
  // Sun, Mars, Jupiter, Mercury, Saturn: 15 for odd rasi, 15 for odd navamsa
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
  // Kendra (1,4,7,10) = 60; Panapara (2,5,8,11) = 30; Apoklima (3,6,9,12) = 15
  if ([1, 4, 7, 10].includes(house)) return 60;
  if ([2, 5, 8, 11].includes(house)) return 30;
  return 15;
}

function drekkanaBala(planet: Graha, degInSign: number): number {
  // First drekkana (0–10°): male planets (Sun, Mars, Jupiter) get 15
  // Second drekkana (10–20°): neutral planets (Mercury, Saturn) get 15
  // Third drekkana (20–30°): female planets (Moon, Venus) get 15
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
): number {
  const pp = d1Planets.find(p => p.planet === planet);
  if (!pp) return 0;

  const d9 = divCharts.find(c => c.varga === 'D9');
  const d9Planet = d9?.planets.find(p => p.planet === planet);
  const d9Sign = d9Planet?.signNumber ?? pp.signNumber;

  const uchcha = uchchaBala(planet, sidLon);
  const sapta = saptavargajaBala(planet, d1Planets, divCharts);
  const ojha = ojhayugmaBala(planet, pp.signNumber, d9Sign);
  const kendra = kendradiBala(pp.houseNumber);
  const drekk = drekkanaBala(planet, pp.signDegree);

  return uchcha + sapta + ojha + kendra + drekk;
}

// ─── 2. Dig Bala ────────────────────────────────────────────────────────────

function computeDigBala(planet: Graha, house: number): number {
  // Strong house (max dig bala) per planet:
  // Jupiter, Mercury: 1st house (lagna, East)
  // Sun, Mars: 10th house (MC, South)
  // Saturn: 7th house (Descendant, West)
  // Moon, Venus: 4th house (IC, North)
  // Weak point = opposite house
  const strongHouse: Record<Graha, number> = {
    jupiter: 1, mercury: 1,
    sun: 10, mars: 10,
    saturn: 7,
    moon: 4, venus: 4,
  };

  const strong = strongHouse[planet];
  // Distance from weak point (strong + 6 houses = weak point on 12-house circle)
  // Angular distance from weak point in house units, convert to virupas
  const weakHouse = ((strong - 1 + 6) % 12) + 1;

  // House distance from weak point (modular on 12)
  let dist = ((house - weakHouse + 12) % 12);
  if (dist > 6) dist = 12 - dist;

  return dist * 10; // max 60 virupas when dist=6 (at strong house)
}

// ─── 3. Kala Bala ───────────────────────────────────────────────────────────

function nathonnathaBalance(planet: Graha, sunLonTropical: number, jd: number, lat: number, lon: number): number {
  // Day/night strength.
  // Sun, Jupiter, Venus: diurnal (stronger during day)
  // Moon, Mars, Saturn: nocturnal (stronger at night)
  // Mercury: always 60 (ubhayachari)

  if (planet === 'mercury') return 60;

  // Approximate fraction of day elapsed using JD
  // Local apparent time fraction (0=midnight, 0.5=noon)
  // Simplified: use hour angle from JD fractional part + longitude correction
  const jdFrac = (jd + 0.5) % 1; // fraction of day since midnight UT
  const localFrac = norm360((jdFrac * 360) + lon) / 360; // local noon ~0.5

  // Distance from midnight (0 at midnight, 0.5 at noon)
  let dayFrac = localFrac;
  if (dayFrac > 0.5) dayFrac = 1 - dayFrac;
  // dayFrac: 0 at midnight, 0.5 at noon

  const diurnal = ['sun', 'jupiter', 'venus'];
  const nocturnal = ['moon', 'mars', 'saturn'];

  // Day planets: max 60 at noon, 0 at midnight
  // Night planets: max 60 at midnight, 0 at noon
  if (diurnal.includes(planet)) {
    return dayFrac * 2 * 60; // 0–60
  } else if (nocturnal.includes(planet)) {
    return (1 - dayFrac * 2) * 60; // 60–0
  }
  return 30;
}

function pakshaBala(planet: Graha, moonSunAngle: number): number {
  // Shukla Paksha: benefics gain, malefics lose (and vice versa in Krishna)
  // Moon–Sun angle: 0° = new moon, 180° = full moon
  // Paksha Bala = (angle/3) for benefics, ((360-angle)/3) for malefics
  // Max 60 virupas. Per JHora convention: doubled for Moon.

  // For Moon: Paksha Bala = moonSunAngle / 3 (0 at new, 60 at full)
  // This also serves as Moon's Cheshta Bala equivalent.
  if (planet === 'moon') {
    let angle = moonSunAngle;
    if (angle > 180) angle = 360 - angle;
    return angle / 3; // 0–60
  }

  // Benefics (Jupiter, Venus, [well-aspected Mercury]): strength in Shukla
  // Malefics (Sun, Mars, Saturn): strength in Krishna
  const benefics = ['jupiter', 'venus', 'mercury'];
  const malefics = ['sun', 'mars', 'saturn'];

  let angle = moonSunAngle;
  if (angle > 180) angle = 360 - angle; // 0–180

  if (benefics.includes(planet)) {
    return angle / 3; // max 60 at full moon
  } else if (malefics.includes(planet)) {
    return (180 - angle) / 3; // max 60 at new moon
  }
  return 30;
}

function tribhagaBala(planet: Graha, jd: number, lon: number): number {
  // Day divided into 3 parts; Night divided into 3 parts
  // Day: 1st third = Jupiter, 2nd = Sun, 3rd = Saturn
  // Night: 1st third = Moon, 2nd = Venus, 3rd = Mars
  // Mercury: all times (60 virupas always)
  // Winner gets 60 virupas.

  if (planet === 'mercury') return 60;

  const jdFrac = (jd + 0.5) % 1;
  const localFrac = norm360((jdFrac * 360) + lon) / 360;

  // Approximate: sunrise~0.25, sunset~0.75 of day fraction
  // Simplified: day = 0.25–0.75, night = 0.75–1.25 (wrapped)
  const isDay = localFrac >= 0.25 && localFrac < 0.75;

  if (isDay) {
    const dayProgress = (localFrac - 0.25) / 0.5; // 0–1
    if (dayProgress < 1 / 3 && planet === 'jupiter') return 60;
    if (dayProgress >= 1 / 3 && dayProgress < 2 / 3 && planet === 'sun') return 60;
    if (dayProgress >= 2 / 3 && planet === 'saturn') return 60;
  } else {
    const nightFrac = localFrac >= 0.75 ? localFrac - 0.75 : localFrac + 0.25;
    const nightProgress = nightFrac / 0.5;
    if (nightProgress < 1 / 3 && planet === 'moon') return 60;
    if (nightProgress >= 1 / 3 && nightProgress < 2 / 3 && planet === 'venus') return 60;
    if (nightProgress >= 2 / 3 && planet === 'mars') return 60;
  }
  return 0;
}

function abdaMasaVaraHoraBala(planet: Graha, jd: number): number {
  // Abda lord (year lord), Masa lord (month lord), Vara lord (weekday lord), Hora lord (hour lord)
  // Each gives 15, 30, 45, 60 virupas respectively if the planet is that lord.

  // Weekday lord (Vara) — most significant sub-component
  // JD 0 = Monday. weekday = floor(JD + 1.5) mod 7: 0=Sun,1=Mon,...6=Sat
  const weekday = Math.floor(jd + 1.5) % 7;
  const varaLords = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const varaLord = varaLords[weekday];

  // Hora lord: hour of the day. Planet hour sequence cycles every 7, starting from vara lord at sunrise
  // Simplified: calculate hours since sunrise (approx 6:00 local)
  const jdFrac = (jd + 0.5) % 1;
  const hourOfDay = jdFrac * 24;
  // Hora sequence: each hour ruled by a planet in the order: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars
  // Starting from the vara lord at sunrise (~6:00)
  const horaSequence = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars'];
  const varaIdx = horaSequence.indexOf(varaLord);
  const hoursSinceSunrise = Math.floor(((hourOfDay - 6 + 24) % 24));
  const horaLord = horaSequence[(varaIdx + hoursSinceSunrise) % 7];

  // Abda lord (year lord): the vara lord of the day on which the solar year starts
  // Simplified: use a cycle. JHora uses Kali Yuga year start.
  // Approximate via JD. This is a minor contribution (15 virupas max).
  const yearFromJd = Math.floor((jd - 588465.5) / 365.25); // rough Kali year
  const abdaLord = varaLords[yearFromJd % 7];

  // Masa lord: weekday lord of the lunar month
  // Approximate: month index from JD
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
  // Based on declination. Planets with northern declination (positive) when
  // benefic, or southern when malefic, gain strength.
  // Ayana Bala = (declination + max_decl) / (2 * max_decl) * 60
  // where max_decl = obliquity (~23.44°)
  // JHora: AyanaBala = (decl/max_decl + 1) * 30 for those gaining in north,
  // or (1 - decl/max_decl) * 30 for those gaining in south.

  // Compute declination: sin(decl) = sin(obliquity) * sin(tropical_longitude)
  const sinDecl = Math.sin(rad(obliquityDeg)) * Math.sin(rad(tropicalLon));
  const decl = Math.asin(Math.max(-1, Math.min(1, sinDecl))) / DEG; // degrees

  // Sun and Mars, Jupiter, Venus: gain in north (positive decl)
  // Moon, Saturn: gain in south (negative decl)
  // Mercury: always 60 (or use formula)
  // Per JHora/BPHS: planets with northern declination gain ayana bala.
  // Actually: Sun, Mars, Jupiter — gain with northern ayane (Uttarayana)
  // Moon, Venus, Saturn — gain with southern ayane (Dakshinayana)
  // Mercury — both equally
  // Formula: ((decl + obliquity) / (2 * obliquity)) * 60

  // Normalized: 0 at max south decl, 60 at max north decl
  const normalized = ((decl + obliquityDeg) / (2 * obliquityDeg)) * 60;

  // Planets gaining in northern declination
  const northGain = ['sun', 'mars', 'jupiter'];
  // Planets gaining in southern declination
  const southGain = ['moon', 'saturn', 'venus'];

  if (planet === 'mercury') return normalized; // Mercury gains in both
  if (northGain.includes(planet)) return normalized;
  if (southGain.includes(planet)) return 60 - normalized;
  return 30;
}

function yuddhaBala(
  _planet: Graha,
  _d1Planets: PlanetPos[],
): number {
  // Planetary war: when two planets are within 1° of each other.
  // The one with higher latitude wins and gains; the other loses.
  // This is a relatively small correction and requires latitude data
  // we don't currently have. Stubbed at 0.
  return 0;
}

function computeKalaBala(
  planet: Graha,
  jd: number,
  lat: number,
  lon: number,
  sunTropLon: number,
  moonSunAngle: number,
  obliquityDeg: number,
  tropicalLon: number,
  d1Planets: PlanetPos[],
): number {
  const nath = nathonnathaBalance(planet, sunTropLon, jd, lat, lon);
  const paksha = pakshaBala(planet, moonSunAngle);
  const tribhaga = tribhagaBala(planet, jd, lon);
  const lordBala = abdaMasaVaraHoraBala(planet, jd);
  const ayana = ayanaBala(planet, tropicalLon, obliquityDeg);
  const yuddha = yuddhaBala(planet, d1Planets);

  return nath + paksha + tribhaga + lordBala + ayana + yuddha;
}

// ─── 4. Cheshta Bala ────────────────────────────────────────────────────────

function computeCheshtaBala(planet: Graha, speed: number, isRetro: boolean, moonSunAngle: number, tropicalSunLon: number): number {
  // Motional strength from speed relative to mean daily motion.
  // Retrograde planets get high cheshta bala (max 60).
  // Sun uses Ayana Bala equivalent (already computed in Kala Bala for JHora).
  // Moon uses Paksha Bala equivalent.
  //
  // JHora convention: Sun's Cheshta = Ayana Bala (computed in Kala Bala),
  // Moon's Cheshta = Paksha Bala (already in Kala Bala).
  // For Sun and Moon, Cheshta Bala is set to 0 here (already counted in Kala Bala).

  if (planet === 'sun') {
    // Sun's Cheshta Bala per JHora = Ayana Cheshta
    // Use the tropical longitude to derive a value based on position in orbit
    // Sun moves fastest at perihelion (~Jan) and slowest at aphelion (~Jul)
    // Approximate: CheshtaBala = |(speed - mean) / mean| * 60, capped at 60
    // Actually per BPHS, Sun's Cheshta = Ayana Bala already in Kala.
    // JHora sets Sun's Cheshta to 0 (folded into Kala). Return 0.
    return 0;
  }

  if (planet === 'moon') {
    // Moon's Cheshta = Paksha Bala already counted in Kala Bala.
    // JHora sets Moon's Cheshta to 0. Return 0.
    return 0;
  }

  // For Mars through Saturn:
  // 8 states of motion (Meeus): vakra (retro), anuvakra (retro entering),
  // vikala (stationary), manda (slow), mandatara (slower), sama (mean),
  // chara (fast), atichara (very fast).
  // Virupas: vakra=60, anuvakra=30, vikala=15, manda=15, mandatara=7.5,
  // sama=30, chara=45, atichara=30
  // Simplified approach matching JHora's formula:
  // CheshtaBala = |(actualSpeed - meanSpeed) / meanSpeed| * 60
  // retrograde → extra boost

  const meanSpeed = MEAN_DAILY_MOTION[planet];

  if (isRetro) {
    // Retrograde motion → high cheshta bala
    // JHora typically gives ~45-60 for retrograde
    return 60;
  }

  if (Math.abs(speed) < 0.01) {
    // Stationary (vikala) = 60 virupas per JHora
    return 60;
  }

  // Speed ratio: how fast vs mean
  const ratio = speed / meanSpeed;

  if (ratio < 0) {
    // Retrograde (should be caught above, but just in case)
    return 60;
  }

  // JHora-like mapping:
  // ratio < 0.5 (very slow) → ~45–60
  // ratio ~ 1.0 (mean speed) → ~30
  // ratio > 1.5 (very fast) → ~45
  // The farther from mean, the higher the score

  const deviation = Math.abs(ratio - 1.0);
  // Map deviation to 0–60: at deviation=0 → 30 (sama), at deviation≥1 → 60
  const bala = 30 + Math.min(30, deviation * 30);
  return Math.min(60, bala);
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
  // Aspectual strength: sum of benefic aspects minus sum of malefic aspects.
  // Full aspect = 60 virupas base, scaled by planet's relationship.
  // Standard Parashari aspects:
  // All planets aspect 7th house fully (180°)
  // Mars: 4th and 8th also
  // Jupiter: 5th and 9th also
  // Saturn: 3rd and 10th also

  const pp = d1Planets.find(p => p.planet === planet);
  if (!pp) return 0;

  const planetSign = pp.signNumber;
  let total = 0;

  const moonBenefic = isMoonBenefic(moonSunAngle);

  for (const other of d1Planets) {
    if (other.planet === planet || other.planet === 'ascendant' || other.planet === 'rahu' || other.planet === 'ketu') continue;
    if (!GRAHA_KEYS.includes(other.planet as Graha)) continue;

    const otherSign = other.signNumber;
    const dist = ((otherSign - planetSign + 12) % 12); // houses from planet

    // Check if other planet aspects the planet's sign
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

    // Determine if aspecting planet is benefic or malefic
    let beneficAspect = false;
    if (other.planet === 'jupiter' || other.planet === 'venus') {
      beneficAspect = true;
    } else if (other.planet === 'moon' && moonBenefic) {
      beneficAspect = true;
    } else if (other.planet === 'mercury') {
      // Mercury is conditionally benefic; default: benefic unless with malefics
      beneficAspect = true;
    }
    // Sun, Mars, Saturn are malefics

    const contribution = aspectStrength * 15; // scaled to ~15 virupas per aspect
    if (beneficAspect) {
      total += contribution;
    } else {
      total -= contribution;
    }
  }

  // Drik Bala can be negative (net malefic aspects)
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
}

export function computeShadbala(input: ShadbalaInput): ShadbalaResult {
  const {
    d1Planets, divCharts, jd, lat, lon,
    tropicalPositions: tropPos,
    obliquityDeg,
  } = input;

  // Moon–Sun sidereal angle for Paksha Bala
  const sunTropLon = tropPos.sun ?? 0;
  const moonTropLon = tropPos.moon ?? 0;
  const moonSunAngle = norm360(moonTropLon - sunTropLon);

  const result: Record<string, PlanetShadbala> = {};

  for (const planet of GRAHA_KEYS) {
    const pp = d1Planets.find(p => p.planet === planet);
    if (!pp) continue;

    const tropLon = tropPos[planet] ?? 0;
    const speed = pp.speed ?? MEAN_DAILY_MOTION[planet];
    const isRetro = pp.isRetrograde;

    const sthanaBala = computeSthanaBala(planet, pp.longitude, d1Planets, divCharts);
    const digBala = computeDigBala(planet, pp.houseNumber);
    const kalaBala = computeKalaBala(planet, jd, lat, lon, sunTropLon, moonSunAngle, obliquityDeg, tropLon, d1Planets);
    const cheshtaBala = computeCheshtaBala(planet, speed, isRetro, moonSunAngle, sunTropLon);
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
