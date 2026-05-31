/**
 * Parity test for Kalachakra Chakra (directional) engine module.
 *
 * Reference: JHora directional chakra display (Lahiri ayanamsa).
 * Dev Chart: Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *
 * Run: deno test supabase/functions/calculate-kundli/kalachakra_direction_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeKalachakraDirection, NAKSHATRAS_27 } from "./kalachakra_direction.ts";
import type { Direction } from "./kalachakra_direction.ts";

const NATAL_PLANETS = [
  { planet: 'sun',     longitude: 126.89 },
  { planet: 'moon',    longitude: 303.854 },
  { planet: 'mars',    longitude: 85.41 },
  { planet: 'mercury', longitude: 141.02 },
  { planet: 'jupiter', longitude: 206.55 },
  { planet: 'venus',   longitude: 110.33 },
  { planet: 'saturn',  longitude: 175.12 },
  { planet: 'rahu',    longitude: 64.22 },
  { planet: 'ketu',    longitude: 244.22 },
];

Deno.test("KCD — 8 directions present", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);
  assertEquals(result.directions.length, 8);
  const dirs = result.directions.map(d => d.direction);
  assertEquals(dirs, ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
});

Deno.test("KCD — each direction has correct deity", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);
  const deityMap: Record<Direction, string> = {
    E: 'Indra', SE: 'Agni', S: 'Yama', SW: 'Nirriti',
    W: 'Varuna', NW: 'Vayu', N: 'Kubera', NE: 'Isana',
  };
  for (const d of result.directions) {
    assertEquals(d.deity, deityMap[d.direction],
      `${d.direction} should have deity ${deityMap[d.direction]}`);
  }
});

Deno.test("KCD — all 27 nakshatras distributed across directions", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);
  const allNk: string[] = [];
  for (const d of result.directions) {
    allNk.push(...d.nakshatras);
  }
  assertEquals(allNk.length, 27);

  // Each nakshatra should appear exactly once
  const unique = new Set(allNk);
  assertEquals(unique.size, 27);

  // All from NAKSHATRAS_27
  for (const nk of allNk) {
    assertEquals(NAKSHATRAS_27.includes(nk as typeof NAKSHATRAS_27[number]), true,
      `"${nk}" should be in NAKSHATRAS_27`);
  }
});

Deno.test("KCD — nakshatra mod 8 distribution", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);

  // Ashwini(0) → E (0%8=0), Bharani(1) → SE (1%8=1), etc.
  // E gets indices 0, 8, 16, 24
  const east = result.directions.find(d => d.direction === 'E');
  assertEquals(east!.nakshatraIndices.includes(0), true, "E should contain Ashwini (0)");
  assertEquals(east!.nakshatraIndices.includes(8), true, "E should contain Ashlesha (8)");
  assertEquals(east!.nakshatraIndices.includes(16), true, "E should contain Anuradha (16)");
  assertEquals(east!.nakshatraIndices.includes(24), true, "E should contain P.Bhadrapada (24)");

  // S gets indices 2, 10, 18, 26
  const south = result.directions.find(d => d.direction === 'S');
  assertEquals(south!.nakshatraIndices.includes(2), true, "S should contain Krittika (2)");
  assertEquals(south!.nakshatraIndices.includes(10), true, "S should contain Magha (10)... wait P.Phalguni");
  assertEquals(south!.nakshatraIndices.includes(18), true, "S should contain Mula (18)");
  assertEquals(south!.nakshatraIndices.includes(26), true, "S should contain Revati (26)");
});

Deno.test("KCD — dev chart planet placements", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);

  // 9 planets (no ascendant in input)
  assertEquals(result.planetPlacements.length, 9);

  // Sun at 126.89° → nakshatra index = floor(126.89 / (360/27)) = floor(9.516) = 9
  // Nk 9 = Magha, direction = 9%8 = 1 → SE
  const sun = result.planetPlacements.find(p => p.planet === 'sun');
  assertEquals(sun!.nakshatraName, 'Magha');
  assertEquals(sun!.direction, 'SE');
  assertEquals(sun!.deity, 'Agni');

  // Moon at 303.854° → nk = floor(303.854/13.333) = floor(22.789) = 22
  // Nk 22 = Dhanishta, direction = 22%8 = 6 → N
  const moon = result.planetPlacements.find(p => p.planet === 'moon');
  assertEquals(moon!.nakshatraName, 'Dhanishta');
  assertEquals(moon!.direction, 'N');
  assertEquals(moon!.deity, 'Kubera');

  // Mars at 85.41° → nk = floor(85.41/13.333) = floor(6.405) = 6
  // Nk 6 = Punarvasu, direction = 6%8 = 6 → N
  const mars = result.planetPlacements.find(p => p.planet === 'mars');
  assertEquals(mars!.nakshatraName, 'Punarvasu');
  assertEquals(mars!.direction, 'N');

  // Saturn at 175.12° → nk = floor(175.12/13.333) = floor(13.134) = 13
  // Nk 13 = Chitra, direction = 13%8 = 5 → NW
  const saturn = result.planetPlacements.find(p => p.planet === 'saturn');
  assertEquals(saturn!.nakshatraName, 'Chitra');
  assertEquals(saturn!.direction, 'NW');
  assertEquals(saturn!.deity, 'Vayu');
});

Deno.test("KCD — Devanagari deity names present", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);
  for (const d of result.directions) {
    assertEquals(typeof d.deityDeva, 'string');
    assertEquals(d.deityDeva.length > 0, true,
      `${d.direction} should have Devanagari deity name`);
  }
});

Deno.test("KCD — citation present", () => {
  const result = computeKalachakraDirection(NATAL_PLANETS);
  assertEquals(typeof result.citation, 'string');
  assertEquals(result.citation.includes('Muhurta'), true);
  assertEquals(result.citation.includes('Narada'), true);
});
