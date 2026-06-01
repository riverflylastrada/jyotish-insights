/**
 * Parity test for Kalachakra Chakra (directional) engine module.
 *
 * Validated against PyJHora 4.8.6 (Lahiri ayanamsa).
 *
 * Chart 1 (primary): Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *   Sun = Magha (28-nk idx 9) → base_star = 9
 *
 * Chart 2 (secondary): Born 15 Aug 1947, 00:00 IST, Delhi (28.61N, 77.21E).
 *   Sun = Ashlesha (28-nk idx 8) → base_star = 8
 *
 * Run: deno test supabase/functions/calculate-kundli/kalachakra_direction_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeKalachakraDirection, NAKSHATRAS_28 } from "./kalachakra_direction.ts";
import type { Direction } from "./kalachakra_direction.ts";

// ── Chart 1: Dev chart (Sun in Magha, base_star=9) ─────────────────────────
const CHART1_PLANETS = [
  { planet: 'sun',     longitude: 126.09 },   // Magha (idx 9)
  { planet: 'moon',    longitude: 303.86 },   // Dhanishta (idx 23)
  { planet: 'mars',    longitude: 102.63 },   // Pushya (idx 7)
  { planet: 'mercury', longitude: 153.05 },   // U.Phalguni (idx 11)
  { planet: 'jupiter', longitude: 218.39 },   // Anuradha (idx 16)
  { planet: 'venus',   longitude: 128.90 },   // Magha (idx 9)
  { planet: 'saturn',  longitude: 186.29 },   // Chitra (idx 13)
  { planet: 'rahu',    longitude: 57.82 },    // Mrigashira (idx 4)
  { planet: 'ketu',    longitude: 237.82 },   // Jyeshtha (idx 17)
];

// ── Chart 2: India Independence (Sun in Ashlesha, base_star=8) ──────────────
const CHART2_PLANETS = [
  { planet: 'sun',     longitude: 117.99 },   // Ashlesha (idx 8)
  { planet: 'moon',    longitude: 93.98 },    // Pushya (idx 7)
  { planet: 'mars',    longitude: 67.46 },    // Ardra (idx 5)
  { planet: 'mercury', longitude: 103.67 },   // Pushya (idx 7)
  { planet: 'jupiter', longitude: 205.88 },   // Vishakha (idx 15)
  { planet: 'venus',   longitude: 112.56 },   // Ashlesha (idx 8)
  { planet: 'saturn',  longitude: 110.47 },   // Ashlesha (idx 8)
  { planet: 'rahu',    longitude: 35.07 },    // Krittika (idx 2)
  { planet: 'ketu',    longitude: 215.07 },   // Anuradha (idx 16)
];

// ─── Structure tests ────────────────────────────────────────────────────────

Deno.test("KC — 8 directions present with deity mapping", () => {
  const result = computeKalachakraDirection(CHART1_PLANETS);
  assertEquals(result.directions.length, 8);
  const dirs: Direction[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const deities = ['Indra', 'Agni', 'Yama', 'Nirriti', 'Varuna', 'Vayu', 'Kubera', 'Isana'];
  for (let i = 0; i < 8; i++) {
    assertEquals(result.directions[i].direction, dirs[i]);
    assertEquals(result.directions[i].deity, deities[i]);
  }
});

Deno.test("KC — 28 nakshatras distributed across 8 directions", () => {
  const result = computeKalachakraDirection(CHART1_PLANETS);
  let totalNk = 0;
  for (const d of result.directions) totalNk += d.nakshatras.length;
  assertEquals(totalNk, 28);
  // Alternating 3-4 pattern
  const sizes = result.directions.map(d => d.nakshatras.length);
  assertEquals(sizes, [3, 4, 3, 4, 3, 4, 3, 4]);
});

// ─── Chart 1 parity: every planet direction matches PyJHora 4.8.6 ──────────

Deno.test("KC — Chart 1: every planet direction+deity matches PyJHora exactly", () => {
  const result = computeKalachakraDirection(CHART1_PLANETS);

  // PyJHora 4.8.6 output for Chart 1 (Sun=Magha base_star=9):
  const expected: Record<string, { dir: Direction; deity: string; nak: string }> = {
    'sun':     { dir: 'E',  deity: 'Indra',  nak: 'Magha' },
    'moon':    { dir: 'W',  deity: 'Varuna', nak: 'Dhanishta' },
    'mars':    { dir: 'NE', deity: 'Isana',  nak: 'Pushya' },
    'mercury': { dir: 'E',  deity: 'Indra',  nak: 'U.Phalguni' },
    'jupiter': { dir: 'S',  deity: 'Yama',   nak: 'Anuradha' },
    'venus':   { dir: 'E',  deity: 'Indra',  nak: 'Magha' },
    'saturn':  { dir: 'SE', deity: 'Agni',   nak: 'Chitra' },
    'rahu':    { dir: 'N',  deity: 'Kubera', nak: 'Mrigashira' },
    'ketu':    { dir: 'S',  deity: 'Yama',   nak: 'Jyeshtha' },
  };

  for (const pp of result.planetPlacements) {
    const exp = expected[pp.planet];
    assertEquals(pp.direction, exp.dir,
      `Chart 1 ${pp.planet}: expected dir ${exp.dir}, got ${pp.direction}`);
    assertEquals(pp.deity, exp.deity,
      `Chart 1 ${pp.planet}: expected deity ${exp.deity}, got ${pp.deity}`);
    assertEquals(pp.nakshatraName, exp.nak,
      `Chart 1 ${pp.planet}: expected nak ${exp.nak}, got ${pp.nakshatraName}`);
  }
});

// ─── Chart 2 parity: every planet direction matches PyJHora 4.8.6 ──────────

Deno.test("KC — Chart 2: every planet direction+deity matches PyJHora exactly", () => {
  const result = computeKalachakraDirection(CHART2_PLANETS);

  // PyJHora 4.8.6 output for Chart 2 (Sun=Ashlesha base_star=8):
  const expected: Record<string, { dir: Direction; deity: string; nak: string }> = {
    'sun':     { dir: 'E',  deity: 'Indra',  nak: 'Ashlesha' },
    'moon':    { dir: 'NE', deity: 'Isana',  nak: 'Pushya' },
    'mars':    { dir: 'NE', deity: 'Isana',  nak: 'Ardra' },
    'mercury': { dir: 'NE', deity: 'Isana',  nak: 'Pushya' },
    'jupiter': { dir: 'S',  deity: 'Yama',   nak: 'Vishakha' },
    'venus':   { dir: 'E',  deity: 'Indra',  nak: 'Ashlesha' },
    'saturn':  { dir: 'E',  deity: 'Indra',  nak: 'Ashlesha' },
    'rahu':    { dir: 'N',  deity: 'Kubera', nak: 'Krittika' },
    'ketu':    { dir: 'S',  deity: 'Yama',   nak: 'Anuradha' },
  };

  for (const pp of result.planetPlacements) {
    const exp = expected[pp.planet];
    assertEquals(pp.direction, exp.dir,
      `Chart 2 ${pp.planet}: expected dir ${exp.dir}, got ${pp.direction}`);
    assertEquals(pp.deity, exp.deity,
      `Chart 2 ${pp.planet}: expected deity ${exp.deity}, got ${pp.deity}`);
    assertEquals(pp.nakshatraName, exp.nak,
      `Chart 2 ${pp.planet}: expected nak ${exp.nak}, got ${pp.nakshatraName}`);
  }
});

// ─── Devanagari names ───────────────────────────────────────────────────────

Deno.test("KC — Devanagari deity names present", () => {
  const result = computeKalachakraDirection(CHART1_PLANETS);
  for (const d of result.directions) {
    assertEquals(typeof d.deityDeva, 'string');
    assertEquals(d.deityDeva.length > 0, true, `Missing deityDeva for ${d.direction}`);
  }
});

// ─── Citation ───────────────────────────────────────────────────────────────

Deno.test("KC — citation present", () => {
  const result = computeKalachakraDirection(CHART1_PLANETS);
  assertEquals(typeof result.citation, 'string');
  assertEquals(result.citation.includes('Muhurta'), true);
  assertEquals(result.citation.includes('PyJHora'), true);
});
