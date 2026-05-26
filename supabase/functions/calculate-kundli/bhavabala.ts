/**
 * Bhava Bala — house strength per BPHS, validated against PyJHora v4.8.5.
 *
 * Each of the 12 houses gets a total strength in virupas from three sources:
 *  1. Bhavadhipathi Bala — the total Shadbala (virupas) of the house lord
 *  2. Bhava Dig Bala — directional strength based on the bhava madhya's rasi type
 *  3. Bhava Drik Bala — net benefic/malefic aspect strength on the bhava
 *
 * Sum → total virupas, Rupas (÷60), rank (strongest → weakest house).
 * Matched to PyJHora's bhava_bala() algorithm.
 */

import type { PlanetPos } from "./divisional.ts";
import type { ShadbalaResult } from "./shadbala.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HouseBhavaBala {
  house: number;
  bhavadhipathiBala: number;
  bhavaDigBala: number;
  bhavaDrikBala: number;
  totalVirupas: number;
  totalRupas: number;
}

export interface BhavaBalaResult {
  houses: HouseBhavaBala[];
  rank: number[];
}

export interface BhavaBalaInput {
  d1Planets: PlanetPos[];
  siderealCusps: number[];
  shadbala: ShadbalaResult;
  ascSign: number;
  jd: number;
  lat: number;
  lon: number;
  tz: number;
  ayanamsaDeg: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAHA_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;
const GRAHA_IDX: Record<string, number> = {
  sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6,
};
const BENEFIC_IDS = new Set([1, 3, 4, 5]); // Moon, Mercury, Jupiter, Venus
const MALEFIC_ROW_IDS = new Set([0, 2, 6]); // PyJHora checks row index against these

function signLord(sign: number): string {
  const lords: Record<number, string> = {
    1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
    5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
    9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
  };
  return lords[sign] ?? 'sun';
}

const norm360 = (d: number) => ((d % 360) + 360) % 360;

// ─── Rasi classification by longitude range ─────────────────────────────────
// Determines if a sidereal longitude falls in nara / jalachara / chatushpada / keeta.

type RasiType = 'nara' | 'jalachara' | 'chatushpada' | 'keeta';

const NARA_RANGES: [number, number][] = [[60, 90], [150, 180], [180, 210], [240, 255], [300, 330]];
const JALACHARA_RANGES: [number, number][] = [[90, 120], [285, 300], [330, 360]];
const CHATUSHPADA_RANGES: [number, number][] = [[0, 30], [30, 60], [120, 150], [255, 270], [270, 285]];
const KEETA_RANGES: [number, number][] = [[210, 240]];

const RASI_PEAK: Record<RasiType, number> = {
  nara: 0,           // peak at house 1 (East)
  jalachara: 3,      // peak at house 4 (North)
  chatushpada: 9,    // peak at house 10 (South)
  keeta: 6,          // peak at house 7 (West)
};

function inRange(lon: number, ranges: [number, number][]): boolean {
  return ranges.some(([lo, hi]) => lon >= lo && lon <= hi);
}

function rasiType(lon: number): RasiType | null {
  const n = norm360(lon);
  if (inRange(n, NARA_RANGES)) return 'nara';
  if (inRange(n, JALACHARA_RANGES)) return 'jalachara';
  if (inRange(n, CHATUSHPADA_RANGES)) return 'chatushpada';
  if (inRange(n, KEETA_RANGES)) return 'keeta';
  return null;
}

// ─── Sripathi Bhava Madhya ──────────────────────────────────────────────────

function sripathiBhavaMadhya(cusps: number[]): number[] {
  const bm = [...cusps];
  const cardinals = [0, 3, 6, 9, 12];
  for (let ci = 1; ci < cardinals.length; ci++) {
    const bi1 = cardinals[ci - 1] % 12;
    const bi2 = cardinals[ci] % 12;
    let b1 = bm[bi1];
    let b2 = bm[bi2];
    if (b2 < b1) b2 += 360;
    const bd = Math.abs(b2 - b1) / 3.0;
    bm[(bi1 + 1) % 12] = norm360(bm[bi1 % 12] + bd);
    bm[(bi2 - 1 + 12) % 12] = norm360(bm[bi2 % 12] - bd);
  }
  return bm;
}

// ─── 1. Bhavadhipathi Bala ──────────────────────────────────────────────────

function bhavadhipathiBala(
  ascSign: number,
  ascDegInSign: number,
  shadbala: ShadbalaResult,
): number[] {
  const result: number[] = [];
  let ascRasi0 = ascSign - 1; // convert to 0-indexed
  // Match PyJHora bhava_chart_houses: if ascendant < 15° in sign, the KP bhava
  // straddles into the previous sign, shifting the lord mapping by one.
  if (ascDegInSign < 15) {
    ascRasi0 = (ascRasi0 - 1 + 12) % 12;
  }
  for (let h = 0; h < 12; h++) {
    const rasi1 = ((ascRasi0 + h) % 12) + 1;
    const lord = signLord(rasi1);
    const sb = shadbala.planets[lord];
    result.push(sb ? sb.totalVirupas : 0);
  }
  return result;
}

// ─── 2. Bhava Dig Bala ──────────────────────────────────────────────────────

function bhavaDigBala(sripathiMadhya: number[]): number[] {
  const result = new Array(12).fill(0);
  const typeMap: Array<{ type: RasiType; ranges: [number, number][] }> = [
    { type: 'nara', ranges: NARA_RANGES },
    { type: 'jalachara', ranges: JALACHARA_RANGES },
    { type: 'chatushpada', ranges: CHATUSHPADA_RANGES },
    { type: 'keeta', ranges: KEETA_RANGES },
  ];

  for (const { type, ranges } of typeMap) {
    const peak = RASI_PEAK[type];
    for (let offset = -7; offset < 7; offset++) {
      const houseIdx = ((peak + offset) % 12 + 12) % 12;
      const bm = norm360(sripathiMadhya[houseIdx]);
      if (inRange(bm, ranges)) {
        const value = Math.abs(60 - Math.abs(offset) * 10);
        result[houseIdx] = value;
      }
    }
  }
  return result;
}

// ─── Rasi Drishti (Jaimini sign aspects) ────────────────────────────────────

const MOVABLE = [0, 3, 6, 9];
const FIXED = [1, 4, 7, 10];
const DUAL = [2, 5, 8, 11];

function rasiDrishtiSigns(sign0: number): number[] {
  if (MOVABLE.includes(sign0)) {
    const adjacent = (sign0 + 1) % 12;
    return FIXED.filter(f => f !== adjacent);
  }
  if (FIXED.includes(sign0)) {
    const adjacent = (sign0 - 1 + 12) % 12;
    return MOVABLE.filter(m => m !== adjacent);
  }
  if (DUAL.includes(sign0)) {
    return DUAL.filter(d => d !== sign0);
  }
  return [];
}

// ─── Graha Drishti (Parashari planet aspects) ───────────────────────────────

function grahaDrishtiHouses(house0: number, planet: string): number[] {
  const aspects: number[] = [(house0 + 6) % 12]; // 7th
  if (planet === 'mars') {
    aspects.push((house0 + 3) % 12);  // 4th
    aspects.push((house0 + 7) % 12);  // 8th
  }
  if (planet === 'jupiter') {
    aspects.push((house0 + 4) % 12);  // 5th
    aspects.push((house0 + 8) % 12);  // 9th
  }
  if (planet === 'saturn') {
    aspects.push((house0 + 2) % 12);  // 3rd
    aspects.push((house0 + 9) % 12);  // 10th
  }
  return aspects;
}

// ─── Combined aspects per planet → 0-indexed house set ──────────────────────

function combinedAspects(
  d1Planets: PlanetPos[],
  ascSign: number,
): Map<number, number[]> {
  const ascRasi0 = ascSign - 1;
  const result = new Map<number, number[]>();

  for (const key of GRAHA_KEYS) {
    const idx = GRAHA_IDX[key];
    const pp = d1Planets.find(p => p.planet === key);
    if (!pp) continue;
    const sign0 = pp.signNumber - 1;
    const house0 = ((sign0 - ascRasi0) % 12 + 12) % 12;

    const graha = grahaDrishtiHouses(house0, key);
    const rasiAspectedSigns = rasiDrishtiSigns(sign0);
    const rasiHouses = rasiAspectedSigns.map(s => ((s - ascRasi0) % 12 + 12) % 12);

    const combined = new Set([...graha, ...rasiHouses]);
    result.set(idx, [...combined].sort((a, b) => a - b));
  }
  return result;
}

// ─── Aspect strength formula (PyJHora __bhava_drik_bala_calc_1) ─────────────

function aspectStrength(angDist: number, planetIdx: number): number {
  let v = angDist;
  if (angDist > 0 && angDist <= 30) {
    v = 0;
  } else if (angDist >= 30.01 && angDist <= 60) {
    v = 0.5 * (angDist - 30);
  } else if (angDist >= 60.01 && angDist <= 90) {
    v = (angDist - 60) + 15;
    if (planetIdx === 6) v += 45; // Saturn 3rd aspect
  } else if (angDist >= 90.01 && angDist <= 120) {
    v = 0.5 * (120 - angDist) + 30;
    if (planetIdx === 2) v += 15; // Mars 4th aspect
  } else if (angDist >= 120.01 && angDist <= 150) {
    v = (150 - angDist);
    if (planetIdx === 4) v += 30; // Jupiter 5th aspect
  } else if (angDist >= 150.01 && angDist <= 180) {
    v = 2 * (angDist - 150);
  } else if (angDist >= 180.01 && angDist <= 300) {
    v = 0.5 * (300 - angDist);
    if (planetIdx === 2 && angDist > 210.01 && angDist < 240.01) v += 15; // Mars 8th
    if (planetIdx === 4 && angDist > 240.01 && angDist < 270.01) v += 30; // Jupiter 9th
    if (planetIdx === 6 && angDist > 270.01 && angDist < 300.01) v += 45; // Saturn 10th
  } else {
    v = 0;
  }
  // Mercury (3) and Jupiter (4) keep full value; others scale by 0.25
  if (planetIdx !== 3 && planetIdx !== 4) {
    v = Math.round(v * 0.25 * 100) / 100;
  }
  return Math.round(v * 100) / 100;
}

// ─── 3. Bhava Drik Bala ────────────────────────────────────────────────────

function bhavaDrikBala(
  d1Planets: PlanetPos[],
  kpMadhya: number[],
  ascSign: number,
): number[] {
  const aspects = combinedAspects(d1Planets, ascSign);

  // Build dk[house][planet] = aspect strength
  const dk: number[][] = Array.from({ length: 12 }, () => new Array(7).fill(0));

  for (let h = 0; h < 12; h++) {
    const hMid = kpMadhya[h];
    for (const key of GRAHA_KEYS) {
      const idx = GRAHA_IDX[key];
      const planetAspects = aspects.get(idx) ?? [];
      // PyJHora checks (h+1) against the 0-indexed aspect list (off-by-one match)
      if (planetAspects.includes(h + 1)) {
        const pp = d1Planets.find(p => p.planet === key);
        if (!pp) continue;
        const pLong = pp.longitude;
        const dist = Math.round(norm360(hMid - pLong) * 100) / 100;
        dk[h][idx] = aspectStrength(dist, idx);
      }
    }
  }

  // Sum benefic/malefic (matching PyJHora's row/column logic)
  const dkp = new Array(12).fill(0);
  const dkm = new Array(12).fill(0);
  const dkFinal = new Array(12).fill(0);

  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 7; col++) {
      if (BENEFIC_IDS.has(col)) {
        dkp[row] += dk[row][col];
      }
      if (MALEFIC_ROW_IDS.has(row)) {
        dkm[row] += dk[row][col];
      }
      dkFinal[row] = Math.round((dkp[row] - dkm[row]) / 4 * 100) / 100;
    }
  }

  return dkFinal;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function computeBhavaBala(input: BhavaBalaInput): BhavaBalaResult {
  const { d1Planets, siderealCusps, shadbala, ascSign } = input;

  // Sub-component #1: Bhavadhipathi Bala
  const ascDegInSign = siderealCusps[0] % 30;
  const adhipathi = bhavadhipathiBala(ascSign, ascDegInSign, shadbala);

  // Sub-component #2: Bhava Dig Bala (uses Sripathi bhava madhya)
  const sripathi = sripathiBhavaMadhya(siderealCusps);
  const dig = bhavaDigBala(sripathi);

  // Sub-component #3: Bhava Drik Bala (uses KP/Placidus bhava madhya)
  const drik = bhavaDrikBala(d1Planets, siderealCusps, ascSign);

  // Assemble per-house results
  const houses: HouseBhavaBala[] = [];
  for (let h = 0; h < 12; h++) {
    const total = Math.round((adhipathi[h] + dig[h] + drik[h]) * 100) / 100;
    houses.push({
      house: h + 1,
      bhavadhipathiBala: Math.round(adhipathi[h] * 100) / 100,
      bhavaDigBala: dig[h],
      bhavaDrikBala: drik[h],
      totalVirupas: total,
      totalRupas: Math.round(total / 60 * 100) / 100,
    });
  }

  // Rank: houses sorted by totalVirupas descending
  const ranked = houses
    .slice()
    .sort((a, b) => b.totalVirupas - a.totalVirupas)
    .map(h => h.house);

  return { houses, rank: ranked };
}
