/**
 * Avasthas — Planetary States (BPHS Ch. 45)
 *
 * Three classification systems:
 * 1. Baladi (5 age-states based on degree-in-sign) — BPHS 45.3–4
 * 2. Jagradadi (3 alertness-states based on dignity) — BPHS 45.10–15
 * 3. Deeptadi (9 condition-states based on dignity + retrogression + combustion + conjunction) — BPHS 45.16–25
 *
 * Rahu/Ketu return undefined (nodes lack standard sign-degree positioning).
 */

import type { PlanetPos, AvasthasResult } from "./divisional.ts";

// ─── Baladi Avastha (BPHS Ch. 45, śl. 3–4) ─────────────────────────────────

type BaladiState = AvasthasResult['baladi'];

/** Even signs (2,4,6,8,10,12) reverse the Baladi order per BPHS 45.4. */
function isEvenSign(sign: number): boolean {
  return sign % 2 === 0;
}

const BALADI_ODD: BaladiState[] = ['bala', 'kumara', 'yuva', 'vriddha', 'mrita'];
const BALADI_EVEN: BaladiState[] = ['mrita', 'vriddha', 'yuva', 'kumara', 'bala'];

function baladiAvastha(degInSign: number, signNumber: number): { state: BaladiState; citation: string } {
  const idx = Math.min(Math.floor(degInSign / 6), 4);
  const even = isEvenSign(signNumber);
  const state = even ? BALADI_EVEN[idx] : BALADI_ODD[idx];
  const citation = even
    ? 'BPHS Ch. 45, śl. 3–4 (even-sign reversed order)'
    : 'BPHS Ch. 45, śl. 3–4 (odd-sign order)';
  return { state, citation };
}

// ─── Jagradadi Avastha (BPHS Ch. 45, śl. 10–15) ────────────────────────────

type JagradadiState = AvasthasResult['jagradadi'];

function jagradadiAvastha(dignity: string | undefined): { state: JagradadiState; citation: string } {
  switch (dignity) {
    case 'exalted':
    case 'own_sign':
    case 'mooltrikona':
      return { state: 'jagrat', citation: 'BPHS Ch. 45, śl. 10–12 (own/exalted/mooltrikona → Jagrat)' };
    case 'debilitated':
    case 'enemy':
      return { state: 'sushupti', citation: 'BPHS Ch. 45, śl. 13–14 (debilitated/enemy → Sushupti)' };
    case 'friend':
    case 'neutral':
    default:
      return { state: 'swapna', citation: 'BPHS Ch. 45, śl. 15 (friend/neutral → Swapna)' };
  }
}

// ─── Deeptadi Avastha (BPHS Ch. 45, śl. 16–25) ─────────────────────────────

type DeeptadiState = AvasthasResult['deeptadi'];

/**
 * Standard rule table for Deeptadi states (BPHS 45.16–25).
 *
 * Priority: strong dignities first (Deepta/Swastha/Khala are never
 * overridden by combustion or conjunction), then afflictions for
 * weaker dignities (Vikala/Dina), then base dignity states.
 *
 * | Priority | State     | Condition                                  |
 * |----------|-----------|--------------------------------------------|
 * | 1        | Khala     | Debilitated (always worst)                 |
 * | 2        | Deepta    | Exalted (always best, overrides combust)   |
 * | 3        | Swastha   | Own sign / Mooltrikona                     |
 * | 4        | Vikala    | Combust (for friend/neutral/enemy dignity) |
 * | 5        | Dina      | Conjunct natural malefic (same sign)       |
 * | 6        | Peedita   | Enemy sign                                 |
 * | 7        | Shakta    | Retrograde                                 |
 * | 8        | Pramudita | Friend sign                                |
 * | 9        | Shanta    | Neutral / default                          |
 */

const NATURAL_MALEFICS = ['sun', 'mars', 'saturn', 'rahu', 'ketu'];

function deeptadiAvastha(
  planet: PlanetPos,
  allPlanets: PlanetPos[],
): { state: DeeptadiState; citation: string } {
  const dignity = planet.dignity;

  if (dignity === 'debilitated') {
    return { state: 'khala', citation: 'BPHS Ch. 45, śl. 25 (debilitated → Khala)' };
  }

  if (dignity === 'exalted') {
    return { state: 'deepta', citation: 'BPHS Ch. 45, śl. 16 (exalted → Deepta)' };
  }

  if (dignity === 'own_sign' || dignity === 'mooltrikona') {
    return { state: 'swastha', citation: 'BPHS Ch. 45, śl. 17 (own sign/mooltrikona → Swastha)' };
  }

  if (planet.isCombust) {
    return { state: 'vikala', citation: 'BPHS Ch. 45, śl. 24 (combust → Vikala)' };
  }

  const conjunctMalefic = allPlanets.some(
    (p) =>
      p.planet !== planet.planet &&
      p.planet !== 'ascendant' &&
      NATURAL_MALEFICS.includes(p.planet) &&
      p.signNumber === planet.signNumber,
  );
  if (conjunctMalefic) {
    return { state: 'dina', citation: 'BPHS Ch. 45, śl. 23 (conjunct malefic → Dina)' };
  }

  if (dignity === 'enemy') {
    return { state: 'peedita', citation: 'BPHS Ch. 45, śl. 22 (enemy sign → Peedita)' };
  }

  if (planet.isRetrograde) {
    return { state: 'shakta', citation: 'BPHS Ch. 45, śl. 21 (retrograde → Shakta)' };
  }

  if (dignity === 'friend') {
    return { state: 'pramudita', citation: 'BPHS Ch. 45, śl. 18 (friend sign → Pramudita)' };
  }

  return { state: 'shanta', citation: 'BPHS Ch. 45, śl. 19–20 (neutral/benefic subdivision → Shanta)' };
}

// ─── Public API ─────────────────────────────────────────────────────────────

const SKIP_PLANETS = new Set(['rahu', 'ketu', 'ascendant']);

export function computeAvasthas(
  planet: PlanetPos,
  allPlanets: PlanetPos[],
): AvasthasResult | undefined {
  if (SKIP_PLANETS.has(planet.planet)) return undefined;

  const baladi = baladiAvastha(planet.signDegree, planet.signNumber);
  const jagradadi = jagradadiAvastha(planet.dignity);
  const deeptadi = deeptadiAvastha(planet, allPlanets);

  return {
    baladi: baladi.state,
    baladiCitation: baladi.citation,
    jagradadi: jagradadi.state,
    jagradadiCitation: jagradadi.citation,
    deeptadi: deeptadi.state,
    deeptadiCitation: deeptadi.citation,
  };
}
