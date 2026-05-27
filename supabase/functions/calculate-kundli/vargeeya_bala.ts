/**
 * Vargeeya Bala — divisional-chart strength for the 7 grahas (Sun–Saturn).
 *
 * 1. Pancha-vargeeya Bala: composite score from Kshetra, Uchcha, and Hadda
 *    bala plus a planet-index term (matching PyJHora v4.8.5).
 * 2. Dwadasa-vargeeya Bala: count of favourable placements (≥ friend level)
 *    across D1–D12 divisional charts (vaiseshikamsa count).
 *
 * Reference: jhora/horoscope/chart/strength.py — pancha_vargeeya_bala(),
 * dwadhasa_vargeeya_bala().
 */

import type { PlanetPos, DivChart } from "./divisional.ts";

// ─── Planet ordering (Sun=0 … Saturn=6) ────────────────────────────────────

const GRAHA_KEYS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;
type GrahaKey = typeof GRAHA_KEYS[number];

// ─── House-strengths table (PyJHora const.house_strengths_of_planets) ───────
//  Index = 0-based sign (0=Aries … 11=Pisces).
//  Values: 0=debilitated, 1=great-enemy, 2=enemy, 3=neutral/friend,
//          4=friend/exalted, 5=own/great-friend.
//  _FRIEND=3, _ENEMY=1 in PyJHora constants.

const HOUSE_STRENGTHS: number[][] = [
  /* Sun     */ [4, 1, 2, 2, 5, 2, 0, 3, 3, 1, 1, 3],
  /* Moon    */ [2, 4, 3, 5, 3, 3, 2, 0, 2, 2, 2, 2],
  /* Mars    */ [5, 2, 1, 0, 3, 1, 2, 5, 3, 4, 2, 3],
  /* Mercury */ [2, 3, 5, 1, 3, 5, 3, 2, 2, 2, 2, 0],
  /* Jupiter */ [3, 1, 1, 4, 3, 3, 1, 3, 5, 0, 2, 5],
  /* Venus   */ [2, 5, 3, 1, 1, 0, 5, 2, 3, 3, 3, 4],
  /* Saturn  */ [0, 3, 3, 1, 1, 3, 4, 1, 2, 5, 5, 2],
];

const _FRIEND = 3;
const _ENEMY = 1;

// ─── Deep-debilitation longitudes (absolute sidereal, PyJHora) ─────────────

const DEEP_DEBILITATION: number[] = [
  190.0,  // Sun
  213.0,  // Moon
  118.0,  // Mars
  345.0,  // Mercury
  275.0,  // Jupiter
  177.0,  // Venus
   20.0,  // Saturn
];

// ─── Hadda (term) lords per sign ────────────────────────────────────────────
//  Each entry: [planetId, upperDegreeBound].

const HADDA_LORDS: [number, number][][] = [
  [[4, 6], [5, 12], [3, 20], [2, 25], [6, 30]],   // Aries
  [[5, 8], [3, 14], [5, 22], [6, 27], [2, 30]],    // Taurus
  [[3, 6], [5, 12], [4, 17], [2, 24], [6, 30]],    // Gemini
  [[2, 7], [5, 13], [3, 19], [4, 26], [6, 30]],    // Cancer
  [[4, 6], [5, 11], [6, 18], [3, 24], [2, 30]],    // Leo
  [[3, 7], [5, 17], [4, 21], [2, 28], [6, 30]],    // Virgo
  [[6, 6], [3, 14], [4, 21], [5, 28], [2, 30]],    // Libra
  [[2, 7], [5, 11], [3, 19], [4, 24], [6, 30]],    // Scorpio
  [[4, 12], [5, 17], [3, 21], [2, 26], [6, 30]],   // Sagittarius
  [[3, 7], [4, 14], [5, 22], [6, 26], [2, 30]],    // Capricorn
  [[3, 7], [5, 13], [4, 20], [2, 25], [6, 50]],    // Aquarius
  [[5, 12], [4, 16], [3, 19], [2, 28], [6, 30]],   // Pisces
];

// ─── Friendly / enemy planet sets (planet-id → set of planet-ids) ──────────

const FRIENDLY_PLANETS: Set<number>[] = [
  new Set([1, 2, 4]),       // Sun's friends
  new Set([0, 3]),          // Moon's friends
  new Set([0, 1, 4]),       // Mars's friends
  new Set([0, 5]),          // Mercury's friends
  new Set([0, 1, 2]),       // Jupiter's friends
  new Set([3, 6, 7]),       // Venus's friends
  new Set([3, 5, 7]),       // Saturn's friends
];

const ENEMY_PLANETS: Set<number>[] = [
  new Set([5, 6, 7]),       // Sun's enemies
  new Set(),                // Moon has no enemies
  new Set([3]),             // Mars's enemies
  new Set([1, 8]),          // Mercury's enemies
  new Set([3, 5, 7]),       // Jupiter's enemies
  new Set([0, 1]),          // Venus's enemies
  new Set([0, 1, 2, 8]),    // Saturn's enemies
];

const HADDA_POINTS = [15, 7.5, 3.75] as const;

// ─── Sign-owner list (0-indexed sign → owner planet-id) ────────────────────
//  Aries=Mars(2), Taurus=Venus(5), …, Pisces=Jupiter(4)

const SIGN_OWNERS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];

// ─── Odd / even / movable / fixed / dual sign helpers ──────────────────────

const ODD_SIGNS  = new Set([0, 2, 4, 6, 8, 10]);
const EVEN_SIGNS = new Set([1, 3, 5, 7, 9, 11]);
const FIXED_SIGNS = new Set([1, 4, 7, 10]);
const DUAL_SIGNS  = new Set([2, 5, 8, 11]);

// Panchamsa (D5) sign tables
const PANCHAMSA_ODD  = [0, 10, 8, 2, 6];
const PANCHAMSA_EVEN = [1, 5, 11, 9, 7];

// ─── Varga-sign helper for D5, D6, D8, D11 (0-indexed in, 0-indexed out) ──

function vargaSign0(dvf: number, sign0: number, degInSign: number): number {
  switch (dvf) {
    case 5: {
      const part = Math.floor(degInSign / 6);
      return ODD_SIGNS.has(sign0) ? PANCHAMSA_ODD[part] : (PANCHAMSA_EVEN[part] % 12);
    }
    case 6: {
      const part = Math.floor(degInSign / 5);
      return EVEN_SIGNS.has(sign0) ? (part + 6) % 12 : part % 12;
    }
    case 8: {
      const part = Math.floor(degInSign / 3.75);
      if (DUAL_SIGNS.has(sign0)) return (part + 4) % 12;
      if (FIXED_SIGNS.has(sign0)) return (part + 8) % 12;
      return part % 12; // movable
    }
    case 11: {
      const part = Math.floor(degInSign / (30 / 11));
      return (12 - sign0 + part) % 12;
    }
    default:
      return sign0;
  }
}

// ─── Map engine's 1-indexed sign to 0-indexed ──────────────────────────────

function to0(sign1: number): number { return sign1 - 1; }

// ─── Get planet sign (0-indexed) in a divisional chart ─────────────────────

function planetSign0InDiv(
  planet: GrahaKey,
  dvf: number,
  d1Planets: PlanetPos[],
  divCharts: DivChart[],
): number {
  if (dvf === 1) {
    const p = d1Planets.find(pp => pp.planet === planet);
    return p ? to0(p.signNumber) : 0;
  }

  // For D5, D6, D8, D11: compute locally
  if (dvf === 5 || dvf === 6 || dvf === 8 || dvf === 11) {
    const p = d1Planets.find(pp => pp.planet === planet);
    if (!p) return 0;
    return vargaSign0(dvf, to0(p.signNumber), p.signDegree);
  }

  // For D2, D3, D4, D7, D9, D10, D12: pull from existing divCharts
  const codeMap: Record<number, string> = {
    2: "D2", 3: "D3", 4: "D4", 7: "D7",
    9: "D9", 10: "D10", 12: "D12",
  };
  const code = codeMap[dvf];
  if (!code) return 0;
  const chart = divCharts.find(c => c.varga === code);
  if (!chart) return 0;
  const pp = chart.planets.find(p => p.planet === planet);
  return pp ? to0(pp.signNumber) : 0;
}

// ─── Kshetra Bala ──────────────────────────────────────────────────────────

function kshetraBala(d1Planets: PlanetPos[]): number[] {
  return GRAHA_KEYS.map(key => {
    const p = d1Planets.find(pp => pp.planet === key);
    if (!p) return 0;
    const s = HOUSE_STRENGTHS[GRAHA_KEYS.indexOf(key)][to0(p.signNumber)];
    if (s > _FRIEND) return 30;
    if (s === _FRIEND) return 15;
    if (s === _ENEMY) return 7.5;
    return 0;
  });
}

// ─── Uchcha Bala (Saravali formula: pd / 3) ────────────────────────────────

function ucchaBala(d1Planets: PlanetPos[]): number[] {
  return GRAHA_KEYS.map((key, i) => {
    const p = d1Planets.find(pp => pp.planet === key);
    if (!p) return 0;
    const pLong = to0(p.signNumber) * 30 + p.signDegree;
    let pd = (pLong + 360 - DEEP_DEBILITATION[i]) % 360;
    if (pd > 180) pd = 360 - pd;
    return Math.round((pd / 3) * 100) / 100;
  });
}

// ─── Hadda Bala ────────────────────────────────────────────────────────────

function haddaBala(d1Planets: PlanetPos[]): number[] {
  return GRAHA_KEYS.map((key, pIdx) => {
    const p = d1Planets.find(pp => pp.planet === key);
    if (!p) return 0;
    const sign0 = to0(p.signNumber);
    const deg = p.signDegree;
    const rulers = HADDA_LORDS[sign0];
    const haddaLord = rulers.find(([, bound]) => deg <= bound);
    if (!haddaLord) return 0;
    const lordId = haddaLord[0];
    if (lordId === pIdx) return HADDA_POINTS[0];          // own hadda
    if (FRIENDLY_PLANETS[pIdx].has(lordId)) return HADDA_POINTS[1];
    if (ENEMY_PLANETS[pIdx].has(lordId))   return HADDA_POINTS[2];
    return 0;
  });
}

// ─── Public: Pancha-vargeeya Bala ──────────────────────────────────────────

export interface VargeeyaBalaResult {
  panchaVargeeya: Record<string, number>;
  dwadasaVargeeya: Record<string, number>;
}

export function computeVargeeyaBala(
  d1Planets: PlanetPos[],
  divCharts: DivChart[],
): VargeeyaBalaResult {
  const kb = kshetraBala(d1Planets);
  const ub = ucchaBala(d1Planets);
  const hb = haddaBala(d1Planets);

  // Pancha-vargeeya: (kshetra + uchcha + hadda + 2*planetIndex) / 4
  // The drekkana/navamsa dict iteration in PyJHora yields planet indices,
  // so the effective formula is sum(kb, ub, hb, p, p) / 4.
  const panchaVargeeya: Record<string, number> = {};
  for (let i = 0; i < GRAHA_KEYS.length; i++) {
    const raw = (kb[i] + ub[i] + hb[i] + 2 * i) / 4;
    panchaVargeeya[GRAHA_KEYS[i]] = Math.round(raw * 100) / 100;
  }

  // Dwadasa-vargeeya: count favourable placements (strength ≥ _FRIEND)
  // across D1–D12
  const dwadasaVargeeya: Record<string, number> = {};
  for (let i = 0; i < GRAHA_KEYS.length; i++) {
    let count = 0;
    for (let dvf = 1; dvf <= 12; dvf++) {
      const sign0 = planetSign0InDiv(GRAHA_KEYS[i], dvf, d1Planets, divCharts);
      if (HOUSE_STRENGTHS[i][sign0] >= _FRIEND) count++;
    }
    dwadasaVargeeya[GRAHA_KEYS[i]] = count;
  }

  return { panchaVargeeya, dwadasaVargeeya };
}
