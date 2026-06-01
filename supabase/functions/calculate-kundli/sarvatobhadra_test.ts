/**
 * Parity test for Sarvatobhadra Chakra engine module.
 *
 * Validated against PyJHora 4.8.6 (Lahiri ayanamsa).
 *
 * Chart 1 (primary): Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *   Moon = Kumbha 3.85° = Dhanishta (28-nk idx 23); Lagna = Sagittarius.
 *
 * Chart 2 (secondary): Born 15 Aug 1947, 00:00 IST, Delhi (28.61N, 77.21E).
 *   Moon = Pushya (28-nk idx 7); Lagna = Shravana (28-nk idx 22).
 *
 * Run: deno test supabase/functions/calculate-kundli/sarvatobhadra_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSarvatobhadra, NAKSHATRAS_28 } from "./sarvatobhadra.ts";

// ── Chart 1: Dev chart ──────────────────────────────────────────────────────
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
const CHART1_ASC = 249.0;  // ~Mula (idx 18)

// ── Chart 2: India Independence ─────────────────────────────────────────────
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
const CHART2_ASC = 289.03;  // ~Shravana (idx 22)

// ─── Grid structure tests ───────────────────────────────────────────────────

Deno.test("SBC — grid is 9×9", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);
  assertEquals(result.grid.length, 9, "Grid should have 9 rows");
  for (let r = 0; r < 9; r++) {
    assertEquals(result.grid[r].length, 9, `Row ${r} should have 9 columns`);
  }
});

Deno.test("SBC — grid contains >=20 nakshatra cells", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);
  let nkCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (result.grid[r][c].type === 'nakshatra' && result.grid[r][c].nakshatraIdx >= 0) nkCount++;
    }
  }
  assertEquals(nkCount >= 20, true, `Expected >=20 nakshatra cells, got ${nkCount}`);
});

Deno.test("SBC — grid contains rashi cells", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);
  let rashiCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (result.grid[r][c].type === 'rashi' && result.grid[r][c].rashiNum > 0) rashiCount++;
    }
  }
  assertEquals(rashiCount >= 8, true, `Expected >=8 rashi cells, got ${rashiCount}`);
});

// ─── JHora Types parity — Chart 1 (PyJHora 4.8.6) ──────────────────────────
// Moon in Dhanishta (idx 23). The expected From-Moon nakshatras were extracted
// directly from PyJHora 4.8.6 for this chart.

Deno.test("SBC — JHora types Chart 1: From-Moon matches PyJHora exactly", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);

  const expectedFromMoon: Record<string, string> = {
    'Janma':       'Dhanishta',
    'Karma':       'Mrigashira',
    'Samudayika':  'Hasta',
    'Sanghatika':  'Purva Phalguni',
    'Jaati':       'Uttara Bhadrapada',
    'Naidhana':    'Bharani',
    'Desa':        'Punarvasu',
    'Abhisheka':   'Abhijit',
    'Aadhaana':    'Chitra',
    'Vainasika':   'Anuradha',
    'Maanasa':     'Purva Ashadha',
  };

  assertEquals(result.jhoraTypes.length, 11);
  for (const jt of result.jhoraTypes) {
    const expected = expectedFromMoon[jt.type];
    assertEquals(jt.fromMoon.nakshatraName, expected,
      `Chart 1 From-Moon: ${jt.type} expected ${expected}, got ${jt.fromMoon.nakshatraName}`);
  }
});

// ─── JHora Types parity — Chart 2 (PyJHora 4.8.6) ──────────────────────────
// Moon in Pushya (idx 7), Lagna in Shravana (idx 22).

Deno.test("SBC — JHora types Chart 2: From-Moon matches PyJHora exactly", () => {
  const result = computeSarvatobhadra(CHART2_PLANETS, CHART2_ASC);

  // PyJHora 4.8.6 output for Moon=Pushya (idx 7):
  const expectedFromMoon: Record<string, string> = {
    'Janma':       'Pushya',         // idx 7+0=7
    'Karma':       'Anuradha',       // idx 7+9=16
    'Samudayika':  'Shatabhisha',    // idx 7+17=24
    'Sanghatika':  'Shravana',       // idx 7+15=22
    'Jaati':       'Purva Phalguni', // idx 7+3=10
    'Naidhana':    'Chitra',         // idx 7+6=13
    'Desa':        'Mula',           // idx 7+11=18
    'Abhisheka':   'Ardra',          // idx (7+26)%28=5
    'Aadhaana':    'Purva Bhadrapada', // idx (7+18)%28=25
    'Vainasika':   'Ashwini',        // idx (7+21)%28=0
    'Maanasa':     'Rohini',         // idx (7+24)%28=3
  };

  assertEquals(result.jhoraTypes.length, 11);
  for (const jt of result.jhoraTypes) {
    const expected = expectedFromMoon[jt.type];
    assertEquals(jt.fromMoon.nakshatraName, expected,
      `Chart 2 From-Moon: ${jt.type} expected ${expected}, got ${jt.fromMoon.nakshatraName}`);
  }
});

Deno.test("SBC — JHora types Chart 2: From-Lagna matches PyJHora exactly", () => {
  const result = computeSarvatobhadra(CHART2_PLANETS, CHART2_ASC);

  // PyJHora 4.8.6 output for Lagna=Shravana (idx 22):
  const expectedFromLagna: Record<string, string> = {
    'Janma':       'Shravana',         // idx 22+0=22
    'Karma':       'Rohini',           // idx (22+9)%28=3
    'Samudayika':  'Uttara Phalguni',  // idx (22+17)%28=11
    'Sanghatika':  'Magha',            // idx (22+15)%28=9
    'Jaati':       'Purva Bhadrapada', // idx (22+3)%28=25
    'Naidhana':    'Ashwini',          // idx (22+6)%28=0
    'Desa':        'Ardra',            // idx (22+11)%28=5
    'Abhisheka':   'Uttara Ashadha',   // idx (22+26)%28=20
    'Aadhaana':    'Hasta',            // idx (22+18)%28=12
    'Vainasika':   'Vishakha',         // idx (22+21)%28=15
    'Maanasa':     'Mula',             // idx (22+24)%28=18
  };

  assertEquals(result.jhoraTypes.length, 11);
  for (const jt of result.jhoraTypes) {
    const expected = expectedFromLagna[jt.type];
    assertEquals(jt.fromLagna.nakshatraName, expected,
      `Chart 2 From-Lagna: ${jt.type} expected ${expected}, got ${jt.fromLagna.nakshatraName}`);
  }
});

// ─── Tara groups ────────────────────────────────────────────────────────────

Deno.test("SBC — Tara groups from Moon: 9 groups, Janma first", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);
  assertEquals(result.taraFromMoon.length, 9);
  assertEquals(result.taraFromMoon[0].group, 'Janma');
  assertEquals(result.taraFromMoon[8].group, 'Parama Mitra');
  // Janma should be Moon's own nakshatra (Dhanishta)
  assertEquals(result.taraFromMoon[0].nakshatraName, 'Dhanishta');
});

// ─── Vedha ──────────────────────────────────────────────────────────────────

Deno.test("SBC — Vedha computation structural check", () => {
  const transitPlanets = [
    { planet: 'saturn', longitude: 333.0 },
    { planet: 'jupiter', longitude: 55.0 },
  ];
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC, transitPlanets);
  for (const v of result.vedha) {
    assertEquals(typeof v.transitPlanet, 'string');
    assertEquals(typeof v.natalPoint, 'string');
    assertEquals(v.isVedha, true);
  }
});

// ─── Citation ───────────────────────────────────────────────────────────────

Deno.test("SBC — citation present", () => {
  const result = computeSarvatobhadra(CHART1_PLANETS, CHART1_ASC);
  assertEquals(typeof result.citation, 'string');
  assertEquals(result.citation.includes('Muhurta'), true);
});
