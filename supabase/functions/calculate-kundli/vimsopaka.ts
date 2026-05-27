/**
 * Vimsopaka Bala — dignity-weighted strength across 16 divisional charts
 * (Shodhasavarga scheme), scored out of 20.
 *
 * Algorithm (matching PyJHora v4.8.5 charts._vimsopaka_bala_of_planets):
 *  1. For each of 16 vargas, look up each planet's sign in the precomputed
 *     divisional chart (from divisional.ts's buildDivisionalCharts).
 *  2. If planet is owner/ruler in that varga → dignity = 20/20.
 *     Else use compound (panchada) relation with the sign lord → scaled score.
 *  3. Weighted sum across vargas yields a 0–20 score.
 *
 * Compound relations from D1 (rasi chart) are used for ALL vargas (per JHora).
 *
 * Validated against PyJHora v4.8.5 vimsopaka_shodhasavarga_of_planets()
 * with SIDM_LAHIRI and corrected harness (local time to JD, Lahiri ayanamsa).
 */

import type { PlanetPos, DivChart } from "./divisional.ts";
import { FRIENDSHIPS } from "./constants.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAHA_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;
type GrahaKey = typeof GRAHA_KEYS[number];

const SIGN_OWNERS_1: Record<number, GrahaKey> = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
  5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
  9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

/** Shodhasavarga (16-varga) weights (PyJHora const.shodhasa_varga_amsa_vimsopaka). */
const SHODHASA_VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60] as const;
const SHODHASA_WEIGHTS: Record<number, number> = {
  1: 3.5, 2: 1, 3: 1, 4: 0.5, 7: 0.5, 9: 3, 10: 0.5, 12: 0.5,
  16: 2, 20: 0.5, 24: 0.5, 27: 0.5, 30: 1, 40: 0.5, 45: 0.5, 60: 4,
};

/** Compound relation → vimsopaka score (index: 0=great_enemy..4=great_friend). */
const VIMSOPAKA_SCORES = [5, 7, 10, 15, 18] as const;

// ─── House-strengths table (same as PyJHora const.house_strengths_of_planets) ─

const HOUSE_STRENGTHS: number[][] = [
  /* Sun     */ [4, 1, 2, 2, 5, 2, 0, 3, 3, 1, 1, 3],
  /* Moon    */ [2, 4, 3, 5, 3, 3, 2, 0, 2, 2, 2, 2],
  /* Mars    */ [5, 2, 1, 0, 3, 1, 2, 5, 3, 4, 2, 3],
  /* Mercury */ [2, 3, 5, 1, 3, 5, 3, 2, 2, 2, 2, 0],
  /* Jupiter */ [3, 1, 1, 4, 3, 3, 1, 3, 5, 0, 2, 5],
  /* Venus   */ [2, 5, 3, 1, 1, 0, 5, 2, 3, 3, 3, 4],
  /* Saturn  */ [0, 3, 3, 1, 1, 3, 4, 1, 2, 5, 5, 2],
];

const _OWNER_RULER = 5;
const _FRIEND = 3;

/** Moola trikona signs (0-indexed) per planet (Sun–Saturn). */
const MOOLA_TRIKONA_SIGNS = [4, 1, 0, 5, 8, 6, 10];

// ─── Compound (Panchada) Relations ──────────────────────────────────────────

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

const RELATION_TO_INDEX: Record<Relation, number> = {
  great_enemy: 0, enemy: 1, neutral: 2, friend: 3, great_friend: 4,
};

// ─── Per-planet Vimsopaka result ────────────────────────────────────────────

export interface PlanetVimsopaka {
  score: number;
  count: number;
  charts: string;
}

export interface VimsopakaResult {
  planets: Record<string, PlanetVimsopaka>;
}

// ─── PyJHora chart_method=1 overrides for D2, D30, D60 ──────────────────────
// The engine's divisional.ts uses different formulas for some vargas than
// PyJHora's chart_method=1 (which is the default for vimsopaka computation):
//   D2:  Engine uses traditional Parasara (Leo/Cancer only).
//        PyJHora uses parivritti_even_reverse.
//   D30: Engine uses moola trikona sign for the ruling planet.
//        PyJHora uses odd/even ruling signs (standard Parashari Trimsamsa).
//   D60: Engine uses odd=Aries start, even=Libra start.
//        PyJHora uses seed=natal sign (chart_method=1).
// We override only these vargas to match PyJHora parity while keeping the
// display divisional charts unchanged.

const EVEN_SIGNS_0 = new Set([1, 3, 5, 7, 9, 11]);
const ODD_SIGNS_0 = new Set([0, 2, 4, 6, 8, 10]);

function jhoraD2Sign0(rasi0: number, degInSign: number): number {
  const part = Math.floor(degInSign / 15);
  return EVEN_SIGNS_0.has(rasi0)
    ? (rasi0 * 2 + (1 - part)) % 12
    : (rasi0 * 2 + part) % 12;
}

function jhoraD30Sign0(rasi0: number, degInSign: number): number {
  // Standard Parashari Trimsamsa: odd signs use odd ruling signs, even signs use even.
  const oddRanges: [number, number, number][] = [[0, 5, 0], [5, 10, 10], [10, 18, 8], [18, 25, 2], [25, 30, 6]];
  const evenRanges: [number, number, number][] = [[0, 5, 1], [5, 12, 5], [12, 20, 11], [20, 25, 9], [25, 30, 7]];
  const ranges = ODD_SIGNS_0.has(rasi0) ? oddRanges : evenRanges;
  for (const [lo, hi, sign] of ranges) {
    if (degInSign >= lo && degInSign <= hi) return sign;
  }
  return 0;
}

function jhoraD60Sign0(rasi0: number, degInSign: number): number {
  const part = Math.floor(degInSign / 0.5);
  return (rasi0 + part) % 12;
}

// ─── Main computation ───────────────────────────────────────────────────────

export function computeVimsopakaBala(d1Planets: PlanetPos[], divCharts: DivChart[]): VimsopakaResult {
  const planets: Record<string, PlanetVimsopaka> = {};

  // Pre-compute compound relations from D1 chart (reused for all vargas)
  const compoundRelations: Record<string, Record<string, Relation>> = {};
  for (const g of GRAHA_KEYS) {
    compoundRelations[g] = {};
    for (const other of GRAHA_KEYS) {
      compoundRelations[g][other] = getCompoundRelation(g, other, d1Planets);
    }
  }

  for (let gi = 0; gi < GRAHA_KEYS.length; gi++) {
    const planet = GRAHA_KEYS[gi];
    const d1pp = d1Planets.find(p => p.planet === planet);

    let totalScore = 0;
    let count = 0;
    const chartList: string[] = [];

    for (const dvf of SHODHASA_VARGAS) {
      const weight = SHODHASA_WEIGHTS[dvf];

      let sign0: number;

      // D2, D30, D60: use PyJHora chart_method=1 formulas for vimsopaka parity
      if ((dvf === 2 || dvf === 30 || dvf === 60) && d1pp) {
        const rasi0 = d1pp.signNumber - 1;
        sign0 = dvf === 2  ? jhoraD2Sign0(rasi0, d1pp.signDegree)
              : dvf === 30 ? jhoraD30Sign0(rasi0, d1pp.signDegree)
              :              jhoraD60Sign0(rasi0, d1pp.signDegree);
      } else {
        const chart = divCharts.find(c => c.varga === `D${dvf}`);
        if (!chart) continue;
        const pp = chart.planets.find(p => p.planet === planet);
        if (!pp) continue;
        sign0 = pp.signNumber - 1;
      }

      // Count: dignity ≥ friend level OR mooltrikona (per JHora)
      const hStrength = HOUSE_STRENGTHS[gi][sign0];
      if (hStrength > _FRIEND || sign0 === MOOLA_TRIKONA_SIGNS[gi]) {
        count++;
        chartList.push(`D${dvf}`);
      }

      // Score: own sign → 20; else compound relation with sign lord → scaled
      let vv: number;
      if (hStrength === _OWNER_RULER) {
        vv = 20;
      } else {
        const lord = SIGN_OWNERS_1[sign0 + 1];
        const relation = compoundRelations[planet][lord];
        vv = VIMSOPAKA_SCORES[RELATION_TO_INDEX[relation]];
      }

      totalScore += weight * vv / 20;
    }

    planets[planet] = {
      score: Math.round(totalScore * 10000) / 10000,
      count,
      charts: chartList.join('/'),
    };
  }

  return { planets };
}
