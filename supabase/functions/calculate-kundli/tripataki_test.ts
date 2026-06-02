/**
 * Parity test for Tripataki Chakra engine module.
 *
 * Validated against PyJHora 4.8.6 `jhora.ui.chakra.Tripataki`.
 *
 * PyJHora's Tripataki is a rashi-based diamond layout:
 *   - 12 rashis at fixed grid positions forming three interlocking triangles
 *   - Planets placed by their rashi (sign index)
 *   - Vedha lines between specific grid positions
 *
 * Chart 1 (primary): Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *   Moon = Kumbha (rashi 10), Dhanishta nak. Asc = Dhanu (rashi 8).
 *
 * PyJHora planet positions for this chart (D1, Lahiri):
 *   Sun     = Simha (4),  lon 125.22°, nak Magha (9)
 *   Moon    = Kumbha (10), lon 302.98°, nak Dhanishta (22)
 *   Mars    = Karka (3),  lon 101.76°, nak Pushya (7)
 *   Mercury = Kanya (5),  lon 152.17°, nak U.Phalguni (11)
 *   Jupiter = Vrischika (7), lon 217.51°, nak Anuradha (16)
 *   Venus   = Simha (4),  lon 128.01°, nak Magha (9)
 *   Saturn  = Tula (6),   lon 185.41°, nak Chitra (13)
 *   Rahu    = Vrishabha (1), lon 58.29°, nak Mrigashira (4)
 *   Ketu    = Vrischika (7), lon 238.29°, nak Jyeshtha (17)
 *
 * PyJHora Tripataki grid layout:
 *   Rashi 0 (Mesha)     -> (1,3)
 *   Rashi 1 (Vrishabha) -> (1,4)
 *   Rashi 2 (Mithuna)   -> (2,5)
 *   Rashi 3 (Karka)     -> (3,5)
 *   Rashi 4 (Simha)     -> (4,5)
 *   Rashi 5 (Kanya)     -> (5,4)
 *   Rashi 6 (Tula)      -> (5,3)
 *   Rashi 7 (Vrischika) -> (5,2)
 *   Rashi 8 (Dhanu)     -> (4,1)
 *   Rashi 9 (Makara)    -> (3,1)
 *   Rashi 10 (Kumbha)   -> (2,1)
 *   Rashi 11 (Meena)    -> (1,2)
 *
 * PyJHora Tripataki vedha lines (from `Tripataki.lines`):
 *   (2,5)↔(1,4), (2,5)↔(2,1), (2,5)↔(5,2)  → Mithuna↔Vrishabha, Mithuna↔Kumbha, Mithuna↔Vrischika
 *   (3,5)↔(1,3), (3,5)↔(3,1), (3,5)↔(5,3)  → Karka↔Mesha, Karka↔Makara, Karka↔Tula
 *   (4,5)↔(1,2), (4,5)↔(4,1), (4,5)↔(5,4)  → Simha↔Meena, Simha↔Dhanu, Simha↔Kanya
 *   (2,1)↔(1,2), (2,1)↔(5,4)                → Kumbha↔Meena, Kumbha↔Kanya
 *   (3,1)↔(1,3), (3,1)↔(5,3)                → Makara↔Mesha, Makara↔Tula
 *   (4,1)↔(1,4), (4,1)↔(5,2)                → Dhanu↔Vrishabha, Dhanu↔Vrischika
 *   (1,2)↔(5,2)                              → Meena↔Vrischika
 *   (1,3)↔(5,3)                              → Mesha↔Tula
 *   (1,4)↔(5,4)                              → Vrishabha↔Kanya
 *
 * Run: deno test supabase/functions/calculate-kundli/tripataki_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeTripataki } from "./tripataki.ts";

// ── Chart 1: Reference chart (23 Aug 1983, 15:35 IST, Patan) ───────────────
// Longitudes from our engine (validated separately against PyJHora)
const CHART1_PLANETS = [
  { planet: 'sun',     longitude: 126.09 },   // Simha (4)
  { planet: 'moon',    longitude: 303.86 },   // Kumbha (10)
  { planet: 'mars',    longitude: 102.63 },   // Karka (3)
  { planet: 'mercury', longitude: 153.05 },   // Kanya (5)
  { planet: 'jupiter', longitude: 218.39 },   // Vrischika (7)
  { planet: 'venus',   longitude: 128.90 },   // Simha (4)
  { planet: 'saturn',  longitude: 186.29 },   // Tula (6)
  { planet: 'rahu',    longitude: 57.82 },    // Vrishabha (1)
  { planet: 'ketu',    longitude: 237.82 },   // Vrischika (7)
];

// ─── Grid layout parity (PyJHora 4.8.6) ────────────────────────────────────

Deno.test("Tripataki — 12 rashi positions match PyJHora layout", () => {
  const result = computeTripataki(CHART1_PLANETS);

  // Expected grid positions from PyJHora's Tripataki.rasi_labels
  const expectedGrid: Array<[number, number]> = [
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

  assertEquals(result.positions.length, 12);
  for (let i = 0; i < 12; i++) {
    assertEquals(result.positions[i].gridX, expectedGrid[i][0],
      `Rashi ${i} gridX: expected ${expectedGrid[i][0]}, got ${result.positions[i].gridX}`);
    assertEquals(result.positions[i].gridY, expectedGrid[i][1],
      `Rashi ${i} gridY: expected ${expectedGrid[i][1]}, got ${result.positions[i].gridY}`);
  }
});

// ─── Planet placements (rashi) match PyJHora ────────────────────────────────

Deno.test("Tripataki — planet rashi placements match PyJHora", () => {
  const result = computeTripataki(CHART1_PLANETS);

  // Expected rashi for each planet (from PyJHora dhasavarga D1)
  const expectedRashi: Record<string, number> = {
    sun:     4,   // Simha
    moon:    10,  // Kumbha
    mars:    3,   // Karka
    mercury: 5,   // Kanya
    jupiter: 7,   // Vrischika
    venus:   4,   // Simha
    saturn:  6,   // Tula
    rahu:    1,   // Vrishabha
    ketu:    7,   // Vrischika
  };

  for (const placement of result.natalPlacements) {
    const expected = expectedRashi[placement.planet];
    assertEquals(placement.rashiIdx, expected,
      `${placement.planet}: expected rashi ${expected}, got ${placement.rashiIdx}`);
  }
});

// ─── Planet grid positions match PyJHora ────────────────────────────────────

Deno.test("Tripataki — planet grid positions match PyJHora", () => {
  const result = computeTripataki(CHART1_PLANETS);

  // Expected grid positions for each planet (derived from PyJHora rasi_labels[rashi])
  const expectedGrid: Record<string, [number, number]> = {
    sun:     [4, 5],  // Simha
    moon:    [2, 1],  // Kumbha
    mars:    [3, 5],  // Karka
    mercury: [5, 4],  // Kanya
    jupiter: [5, 2],  // Vrischika
    venus:   [4, 5],  // Simha
    saturn:  [5, 3],  // Tula
    rahu:    [1, 4],  // Vrishabha
    ketu:    [5, 2],  // Vrischika
  };

  for (const placement of result.natalPlacements) {
    const [ex, ey] = expectedGrid[placement.planet];
    assertEquals(placement.gridX, ex,
      `${placement.planet}: expected gridX ${ex}, got ${placement.gridX}`);
    assertEquals(placement.gridY, ey,
      `${placement.planet}: expected gridY ${ey}, got ${placement.gridY}`);
  }
});

// ─── Vedha lines match PyJHora ──────────────────────────────────────────────

Deno.test("Tripataki — vedha line count matches PyJHora", () => {
  const result = computeTripataki(CHART1_PLANETS);
  // PyJHora has 18 vedha lines (bidirectional pairs)
  assertEquals(result.lines.length, 18);
});

Deno.test("Tripataki — key vedha connections match PyJHora", () => {
  const result = computeTripataki(CHART1_PLANETS);

  // Build adjacency from result.lines
  const adj = new Map<number, Set<number>>();
  for (const line of result.lines) {
    if (!adj.has(line.fromRashi)) adj.set(line.fromRashi, new Set());
    if (!adj.has(line.toRashi)) adj.set(line.toRashi, new Set());
    adj.get(line.fromRashi)!.add(line.toRashi);
    adj.get(line.toRashi)!.add(line.fromRashi);
  }

  // PyJHora vedha connections
  const expectedVedha: Array<[number, number]> = [
    [2, 1], [2, 10], [2, 7],     // Mithuna
    [3, 0], [3, 9], [3, 6],      // Karka
    [4, 11], [4, 8], [4, 5],     // Simha
    [10, 11], [10, 5],           // Kumbha
    [9, 0], [9, 6],             // Makara
    [8, 1], [8, 7],             // Dhanu
    [11, 7],                     // Meena
    [0, 6],                      // Mesha
    [1, 5],                      // Vrishabha
  ];

  for (const [a, b] of expectedVedha) {
    assertEquals(adj.get(a)?.has(b), true,
      `Expected vedha between rashi ${a} and ${b}`);
    assertEquals(adj.get(b)?.has(a), true,
      `Expected vedha between rashi ${b} and ${a} (reverse)`);
  }
});

// ─── Moon and transit verdict ───────────────────────────────────────────────

Deno.test("Tripataki — Moon in Kumbha (rashi 10)", () => {
  const result = computeTripataki(CHART1_PLANETS);
  assertEquals(result.moonRashi, 10);
  assertEquals(result.moonRashiName, 'Kumbha');
});

Deno.test("Tripataki — transit verdicts match PyJHora vedha analysis", () => {
  const result = computeTripataki(CHART1_PLANETS);

  // Moon is in Kumbha (10).
  // Kumbha is connected to: Mithuna(2), Meena(11), Kanya(5)
  // Planets in those signs have vedha -> malefic
  // Planets NOT connected -> benefic

  const expectedVerdicts: Record<string, 'benefic' | 'malefic'> = {
    sun:     'benefic',  // Simha (4) — not connected to Kumbha
    mars:    'benefic',  // Karka (3) — not connected to Kumbha
    mercury: 'malefic',  // Kanya (5) — connected to Kumbha
    jupiter: 'benefic',  // Vrischika (7) — not connected to Kumbha
    venus:   'benefic',  // Simha (4) — not connected to Kumbha
    saturn:  'benefic',  // Tula (6) — not connected to Kumbha
    rahu:    'benefic',  // Vrishabha (1) — not connected to Kumbha
    ketu:    'benefic',  // Vrischika (7) — not connected to Kumbha
  };

  for (const tr of result.transitResults) {
    assertEquals(tr.verdict, expectedVerdicts[tr.planet],
      `${tr.planet}: expected ${expectedVerdicts[tr.planet]}, got ${tr.verdict}`);
  }
});

// ─── Chart 2: India Independence (secondary validation) ────────────────────

const CHART2_PLANETS = [
  { planet: 'sun',     longitude: 117.99 },   // Karka (3)
  { planet: 'moon',    longitude: 93.98 },    // Karka (3)
  { planet: 'mars',    longitude: 67.46 },    // Mithuna (2)
  { planet: 'mercury', longitude: 103.67 },   // Karka (3)
  { planet: 'jupiter', longitude: 205.88 },   // Tula (6)
  { planet: 'venus',   longitude: 112.56 },   // Karka (3)
  { planet: 'saturn',  longitude: 110.47 },   // Karka (3)
  { planet: 'rahu',    longitude: 35.07 },    // Vrishabha (1)
  { planet: 'ketu',    longitude: 215.07 },   // Tula (6)
];

Deno.test("Tripataki — Chart 2: Moon in Karka (rashi 3)", () => {
  const result = computeTripataki(CHART2_PLANETS);
  assertEquals(result.moonRashi, 3);
  assertEquals(result.moonRashiName, 'Karka');
});

Deno.test("Tripataki — Chart 2: planet placements correct", () => {
  const result = computeTripataki(CHART2_PLANETS);

  const expectedRashi: Record<string, number> = {
    sun:     3,  // Karka
    moon:    3,  // Karka
    mars:    2,  // Mithuna
    mercury: 3,  // Karka
    jupiter: 6,  // Tula
    venus:   3,  // Karka
    saturn:  3,  // Karka
    rahu:    1,  // Vrishabha
    ketu:    7,  // Vrischika
  };

  for (const placement of result.natalPlacements) {
    assertEquals(placement.rashiIdx, expectedRashi[placement.planet],
      `Chart 2 ${placement.planet}: expected rashi ${expectedRashi[placement.planet]}, got ${placement.rashiIdx}`);
  }
});

Deno.test("Tripataki — Chart 2: transit verdicts correct", () => {
  const result = computeTripataki(CHART2_PLANETS);

  // Moon in Karka (3). Karka connected to: Mesha(0), Makara(9), Tula(6)
  // Planets in connected signs + same sign (Karka=3) have vedha
  const expectedVerdicts: Record<string, 'benefic' | 'malefic'> = {
    sun:     'malefic',  // Karka (3) = same as Moon
    mars:    'benefic',  // Mithuna (2) — not connected to Karka
    mercury: 'malefic',  // Karka (3) = same as Moon
    jupiter: 'malefic',  // Tula (6) — connected to Karka
    venus:   'malefic',  // Karka (3) = same as Moon
    saturn:  'malefic',  // Karka (3) = same as Moon
    rahu:    'benefic',  // Vrishabha (1) — not connected to Karka
    ketu:    'benefic',  // Vrischika (7) — not connected to Karka
  };

  for (const tr of result.transitResults) {
    assertEquals(tr.verdict, expectedVerdicts[tr.planet],
      `Chart 2 ${tr.planet}: expected ${expectedVerdicts[tr.planet]}, got ${tr.verdict}`);
  }
});
