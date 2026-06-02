/**
 * Tripataki Chakra engine module.
 *
 * Builds the classical Tripataki (triangular) chakra — a rashi-based
 * diamond layout used for transit analysis (esp. Saturn/Jupiter).
 * Twelve rashis are placed at fixed grid positions forming three
 * interlocking triangles. Lines between positions create vedha
 * (obstruction) relationships; a transiting planet whose rashi is
 * connected to the natal Moon's rashi via a line is deemed "malefic"
 * (has vedha), otherwise "benefic" (no vedha).
 *
 * The layout and line structure are taken directly from PyJHora 4.8.6
 * (`jhora.ui.chakra.Tripataki`).
 *
 * O(1) per planet — no time scans.
 *
 * References:
 *   - Uttar Kalamrit (Tripataki / Tripataka Chakra)
 *   - PyJHora 4.8.6 `jhora.ui.chakra.Tripataki` (layout + lines)
 *
 * @module tripataki
 */

import { nakshatraIndex } from "./vedic.ts";
import { NAKSHATRA_NAMES, SIGN_NAMES } from "./constants.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TripatakiPosition {
  /** 0-based rashi index (0=Mesha … 11=Meena). */
  rashiIdx: number;
  rashiName: string;
  /** Grid coordinates matching PyJHora's Tripataki layout. */
  gridX: number;
  gridY: number;
  /** Nakshatras that map to this rashi (3 per rashi in the 27-nak scheme). */
  nakshatras: string[];
  /** Planets currently placed at this position. */
  planets: string[];
}

export interface TripatakiLine {
  from: [number, number]; // gridX, gridY
  to: [number, number];
  fromRashi: number;
  toRashi: number;
}

export interface TripatakiPlanetPlacement {
  planet: string;
  rashiIdx: number;
  rashiName: string;
  nakshatraIdx: number;
  nakshatraName: string;
  gridX: number;
  gridY: number;
}

export type TripatakiVerdict = 'benefic' | 'malefic';

export interface TripatakiTransitResult {
  planet: string;
  rashiIdx: number;
  rashiName: string;
  nakshatraIdx: number;
  nakshatraName: string;
  /** Whether this planet has vedha (line connection) with Moon's rashi. */
  hasVedha: boolean;
  verdict: TripatakiVerdict;
}

export interface TripatakiData {
  positions: TripatakiPosition[];
  lines: TripatakiLine[];
  natalPlacements: TripatakiPlanetPlacement[];
  moonRashi: number;
  moonRashiName: string;
  moonNakshatraIdx: number;
  moonNakshatraName: string;
  transitResults: TripatakiTransitResult[];
  citation: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * PyJHora Tripataki grid positions for 12 rashis (0-indexed).
 * Format: [gridX, gridY] for each rashi.
 * Rashis 0–11 map to Mesha–Meena.
 */
const RASHI_GRID: ReadonlyArray<[number, number]> = [
  [1, 3],  // 0  Mesha
  [1, 4],  // 1  Vrishabha
  [2, 5],  // 2  Mithuna
  [3, 5],  // 3  Karka
  [4, 5],  // 4  Simha
  [5, 4],  // 5  Kanya
  [5, 3],  // 6  Tula
  [5, 2],  // 7  Vrischika
  [4, 1],  // 8  Dhanu
  [3, 1],  // 9  Makara
  [2, 1],  // 10 Kumbha
  [1, 2],  // 11 Meena
];

/**
 * Vedha lines from PyJHora `Tripataki.lines`.
 * Each entry: [fromRashi, toRashi] — bidirectional.
 * Lines form the three interlocking triangles of the chakra.
 */
const VEDHA_LINES: ReadonlyArray<[number, number]> = [
  // Triangle 1: Mithuna–Vrishabha, Mithuna–Kumbha, Mithuna–Vrischika
  [2, 1], [2, 10], [2, 7],
  // Triangle 2: Karka–Mesha, Karka–Makara, Karka–Tula
  [3, 0], [3, 9], [3, 6],
  // Triangle 3: Simha–Meena, Simha–Dhanu, Simha–Kanya
  [4, 11], [4, 8], [4, 5],
  // Additional cross-lines from PyJHora
  [10, 11], [10, 5],   // Kumbha–Meena, Kumbha–Kanya
  [9, 0], [9, 6],      // Makara–Mesha, Makara–Tula
  [8, 1], [8, 7],      // Dhanu–Vrishabha, Dhanu–Vrischika
  [11, 7],             // Meena–Vrischika
  [0, 6],              // Mesha–Tula
  [1, 5],              // Vrishabha–Kanya
];

/**
 * Adjacency set: for each rashi, the set of rashis it is connected to via vedha lines.
 */
const VEDHA_ADJ: ReadonlyArray<ReadonlySet<number>> = (() => {
  const adj: Set<number>[] = Array.from({ length: 12 }, () => new Set<number>());
  for (const [a, b] of VEDHA_LINES) {
    adj[a].add(b);
    adj[b].add(a);
  }
  return adj;
})();

/**
 * Maps a 27-nakshatra index (0–26) to its parent rashi (0–11).
 * Each rashi spans 3 consecutive nakshatras.
 */
function nakshatraToRashi(nkIdx: number): number {
  // Nak 0–2 → Mesha(0), 3–5 → Vrishabha(1), ..., 24–26 → Meena(11)
  // But actually: each nak spans 13°20', each rashi 30°.
  // Nak 0 = 0–13.33°  → Mesha (0–30°)
  // Nak 1 = 13.33–26.67° → Mesha
  // Nak 2 = 26.67–40° → straddles Mesha/Vrishabha
  // We use the midpoint of the nakshatra to determine its primary rashi.
  const midLon = (nkIdx + 0.5) * (360 / 27);
  return Math.floor(midLon / 30);
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

export function computeTripataki(
  natalPlanets: Array<{ planet: string; longitude: number }>,
): TripatakiData {
  // Build the 12 positions
  const positions: TripatakiPosition[] = SIGN_NAMES.map((name, idx) => {
    // Collect the nakshatras whose midpoint falls in this rashi
    const naks: string[] = [];
    for (let nk = 0; nk < 27; nk++) {
      if (nakshatraToRashi(nk) === idx) {
        naks.push(NAKSHATRA_NAMES[nk]);
      }
    }
    return {
      rashiIdx: idx,
      rashiName: name,
      gridX: RASHI_GRID[idx][0],
      gridY: RASHI_GRID[idx][1],
      nakshatras: naks,
      planets: [],
    };
  });

  // Build line definitions
  const lines: TripatakiLine[] = VEDHA_LINES.map(([a, b]) => ({
    from: [RASHI_GRID[a][0], RASHI_GRID[a][1]] as [number, number],
    to: [RASHI_GRID[b][0], RASHI_GRID[b][1]] as [number, number],
    fromRashi: a,
    toRashi: b,
  }));

  // Place each planet
  const natalPlacements: TripatakiPlanetPlacement[] = [];
  for (const { planet, longitude } of natalPlanets) {
    if (planet === 'ascendant') continue;

    const nkIdx = nakshatraIndex(longitude);
    const rashiIdx = Math.floor(longitude / 30);
    const [gx, gy] = RASHI_GRID[rashiIdx];

    positions[rashiIdx].planets.push(planet);
    natalPlacements.push({
      planet,
      rashiIdx,
      rashiName: SIGN_NAMES[rashiIdx],
      nakshatraIdx: nkIdx,
      nakshatraName: NAKSHATRA_NAMES[nkIdx],
      gridX: gx,
      gridY: gy,
    });
  }

  // Find the Moon
  const moonPlanet = natalPlanets.find(p => p.planet === 'moon');
  const moonLon = moonPlanet?.longitude ?? 0;
  const moonNkIdx = nakshatraIndex(moonLon);
  const moonRashi = Math.floor(moonLon / 30);

  // Transit analysis: for each planet, determine benefic/malefic via vedha
  const transitResults: TripatakiTransitResult[] = [];
  for (const { planet, longitude } of natalPlanets) {
    if (planet === 'ascendant' || planet === 'moon') continue;

    const nkIdx = nakshatraIndex(longitude);
    const rashiIdx = Math.floor(longitude / 30);
    const hasVedha = VEDHA_ADJ[moonRashi].has(rashiIdx) || rashiIdx === moonRashi;

    transitResults.push({
      planet,
      rashiIdx,
      rashiName: SIGN_NAMES[rashiIdx],
      nakshatraIdx: nkIdx,
      nakshatraName: NAKSHATRA_NAMES[nkIdx],
      hasVedha,
      verdict: hasVedha ? 'malefic' : 'benefic',
    });
  }

  return {
    positions,
    lines,
    natalPlacements,
    moonRashi,
    moonRashiName: SIGN_NAMES[moonRashi],
    moonNakshatraIdx: moonNkIdx,
    moonNakshatraName: NAKSHATRA_NAMES[moonNkIdx],
    transitResults,
    citation:
      'Uttar Kalamrit (Tripataki Chakra); ' +
      'Validated against PyJHora 4.8.6 jhora.ui.chakra.Tripataki layout + planet placements.',
  };
}
