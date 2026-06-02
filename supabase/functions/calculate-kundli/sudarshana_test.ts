/**
 * Parity test for Sudarshana Chakra engine module.
 *
 * Validated against PyJHora 4.8.6 `charts.rasi_chart` (Lahiri ayanamsa).
 *
 * Reference chart: Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E, tz +5.5).
 *
 * PyJHora planet signs (1-indexed, Lahiri):
 *   Ascendant = 9 (Dhanu), Sun = 5 (Simha), Moon = 11 (Kumbha),
 *   Mars = 4 (Karka), Mercury = 6 (Kanya), Jupiter = 8 (Vrischika),
 *   Venus = 5 (Simha), Saturn = 7 (Tula), Rahu = 2 (Vrishabha),
 *   Ketu = 8 (Vrischika).
 *
 * The Sudarshana Chakra uses THREE reference wheels:
 *   - Lagna wheel:  Asc sign 9 (Dhanu)   as house 1
 *   - Moon wheel:   Moon sign 11 (Kumbha) as house 1
 *   - Sun wheel:    Sun sign 5 (Simha)    as house 1
 *
 * House placement = ((planet_sign - ref_sign + 12) % 12) + 1.
 *
 * Run: deno test supabase/functions/calculate-kundli/sudarshana_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSudarshana } from "./sudarshana.ts";

// ─── PyJHora reference data (signs are 1-indexed) ──────────────────────────

const PYJHORA_SIGNS: Record<string, number> = {
  sun: 5,       // Simha
  moon: 11,     // Kumbha
  mars: 4,      // Karka
  mercury: 6,   // Kanya
  jupiter: 8,   // Vrischika
  venus: 5,     // Simha
  saturn: 7,    // Tula
  rahu: 2,      // Vrishabha
  ketu: 8,      // Vrischika
};

const ASC_SIGN = 9;   // Dhanu (PyJHora Lagna)
const MOON_SIGN = 11; // Kumbha
const SUN_SIGN = 5;   // Simha

/**
 * Build test d1Planets from PyJHora signs. Longitude is derived from sign
 * midpoint (sign-1)*30+15 so signNumber() returns the correct sign.
 */
function buildTestPlanets() {
  const planets = [
    { planet: 'ascendant', signNumber: ASC_SIGN, longitude: (ASC_SIGN - 1) * 30 + 15 },
  ];
  for (const [name, sign] of Object.entries(PYJHORA_SIGNS)) {
    planets.push({ planet: name, signNumber: sign, longitude: (sign - 1) * 30 + 15 });
  }
  return planets;
}

/** Whole-sign house from planet sign relative to a reference sign. */
function expectedHouse(planetSign: number, refSign: number): number {
  return ((planetSign - refSign + 12) % 12) + 1;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("Sudarshana — Lagna/Moon/Sun signs match PyJHora", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  assertEquals(result.lagnaSign, ASC_SIGN, "Lagna sign mismatch");
  assertEquals(result.moonSign, MOON_SIGN, "Moon sign mismatch");
  assertEquals(result.sunSign, SUN_SIGN, "Sun sign mismatch");
});

Deno.test("Sudarshana — 12 houses returned", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  assertEquals(result.houses.length, 12);
  for (let i = 0; i < 12; i++) {
    assertEquals(result.houses[i].house, i + 1);
  }
});

Deno.test("Sudarshana — Lagna wheel houses match PyJHora", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  for (const [planet, sign] of Object.entries(PYJHORA_SIGNS)) {
    const expected = expectedHouse(sign, ASC_SIGN);
    const house = result.houses[expected - 1];
    assertEquals(
      house.lagnaPlanets.includes(planet), true,
      `${planet} should be in Lagna-wheel house ${expected} but isn't (found in: ${JSON.stringify(result.houses.map((h, i) => h.lagnaPlanets.includes(planet) ? i + 1 : null).filter(Boolean))})`,
    );
  }
});

Deno.test("Sudarshana — Moon wheel houses match PyJHora", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  for (const [planet, sign] of Object.entries(PYJHORA_SIGNS)) {
    const expected = expectedHouse(sign, MOON_SIGN);
    const house = result.houses[expected - 1];
    assertEquals(
      house.moonPlanets.includes(planet), true,
      `${planet} should be in Moon-wheel house ${expected} but isn't`,
    );
  }
});

Deno.test("Sudarshana — Sun wheel houses match PyJHora", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  for (const [planet, sign] of Object.entries(PYJHORA_SIGNS)) {
    const expected = expectedHouse(sign, SUN_SIGN);
    const house = result.houses[expected - 1];
    assertEquals(
      house.sunPlanets.includes(planet), true,
      `${planet} should be in Sun-wheel house ${expected} but isn't`,
    );
  }
});

Deno.test("Sudarshana — confirmedCount is correct per house", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  for (const h of result.houses) {
    const expected =
      (h.lagnaPlanets.length > 0 ? 1 : 0) +
      (h.moonPlanets.length > 0 ? 1 : 0) +
      (h.sunPlanets.length > 0 ? 1 : 0);
    assertEquals(h.confirmedCount, expected, `House ${h.house} confirmedCount mismatch`);
  }
});

Deno.test("Sudarshana — citation is non-empty", () => {
  const result = computeSudarshana(buildTestPlanets(), ASC_SIGN);
  assertEquals(result.citation.length > 0, true, "Citation should not be empty");
});
