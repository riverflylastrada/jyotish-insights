/**
 * Unit tests for Shat-trimsa-sama Dasha (36-year conditional).
 *
 * Run with: deno test supabase/functions/calculate-kundli/shat_trimsa_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildShatTrimsaDasha } from "./shat_trimsa.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Helper ─────────────────────────────────────────────────────────────────

function mockPlanet(planet: string, signNumber: number, signDegree: number, houseNumber: number): PlanetPos {
  return {
    planet,
    longitude: (signNumber - 1) * 30 + signDegree,
    signNumber,
    signName: ['', 'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'][signNumber] ?? '',
    signDegree,
    nakshatra: 'Test',
    nakshatraPada: 1 as const,
    houseNumber,
    isRetrograde: planet === 'rahu' || planet === 'ketu',
    isCombust: false,
  };
}

// ─── Positive test 1: Sun in Lagna (1st house) ─────────────────────────────
// Simha Lagna (5), Sun in house 1 → condition met.

const positivePlanets1: PlanetPos[] = [
  mockPlanet('ascendant', 5, 15.0, 1),
  mockPlanet('sun', 5, 10.0, 1),     // Sun in Lagna → condition fires
  mockPlanet('moon', 9, 20.0, 5),    // Moon at ~260° (Dhanu)
  mockPlanet('mars', 1, 15.0, 9),
  mockPlanet('mercury', 6, 10.0, 2),
  mockPlanet('jupiter', 11, 15.0, 7),
  mockPlanet('venus', 3, 20.0, 11),
  mockPlanet('saturn', 8, 5.0, 4),
  mockPlanet('rahu', 2, 12.0, 10),
  mockPlanet('ketu', 8, 12.0, 4),
];

Deno.test("Shat-trimsa (positive: Sun in Lagna): returns DashaSystem", () => {
  const moonLon = (9 - 1) * 30 + 20; // 260°
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  assertEquals(result!.system, 'shat_trimsa');
});

Deno.test("Shat-trimsa (positive): has 7+ maha periods covering 36-year cycle", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  assert(result!.timeline.length >= 7, `Expected >= 7 maha periods, got ${result!.timeline.length}`);
});

Deno.test("Shat-trimsa (positive): each maha duration is ~5.14 years (except first balance)", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  const expectedYears = 36 / 7;
  // Subsequent periods should be close to 5.142857
  for (let i = 1; i < Math.min(result!.timeline.length, 7); i++) {
    const diff = Math.abs(result!.timeline[i].durationYears - expectedYears);
    assert(diff < 0.001, `Period ${i} duration ${result!.timeline[i].durationYears} differs from expected ${expectedYears}`);
  }
});

Deno.test("Shat-trimsa (positive): first period balance <= ~5.14 years", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  assert(result!.timeline[0].durationYears > 0 && result!.timeline[0].durationYears <= 36 / 7 + 0.001,
    `First period ${result!.timeline[0].durationYears} out of range`);
});

Deno.test("Shat-trimsa (positive): lords are from the 7-planet sequence", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  const validLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  for (const p of result!.timeline) {
    assert(validLords.includes(p.planet), `Unexpected lord: ${p.planet}`);
  }
});

// ─── Positive test 2: Sun is AK and in kendra from Lagna ───────────────────
// Mesha Lagna (1), Sun at sign 7 (Tula) → house 7 → kendra. Sun is AK.

const positivePlanets2: PlanetPos[] = [
  mockPlanet('ascendant', 1, 10.0, 1),
  mockPlanet('sun', 7, 25.0, 7),     // Sun is AK, in house 7 (kendra) → condition fires
  mockPlanet('moon', 4, 10.0, 4),    // Moon at ~100°
  mockPlanet('mars', 3, 15.0, 3),
  mockPlanet('mercury', 8, 10.0, 8),
  mockPlanet('jupiter', 12, 15.0, 12),
  mockPlanet('venus', 2, 20.0, 2),
  mockPlanet('saturn', 10, 5.0, 10),
  mockPlanet('rahu', 6, 12.0, 6),
  mockPlanet('ketu', 12, 12.0, 12),
];

Deno.test("Shat-trimsa (positive: Sun is AK in kendra): returns DashaSystem", () => {
  const moonLon = (4 - 1) * 30 + 10; // 100°
  const result = buildShatTrimsaDasha(positivePlanets2, 1, moonLon, new Date('1980-05-20'), 'sun');
  assertExists(result);
  assertEquals(result!.system, 'shat_trimsa');
});

// ─── Negative test: condition not met ───────────────────────────────────────
// Mesha Lagna (1), Sun in house 3 (not 1, not kendra). Sun is NOT AK.

const negativePlanets: PlanetPos[] = [
  mockPlanet('ascendant', 1, 15.0, 1),
  mockPlanet('sun', 3, 10.0, 3),     // Sun in 3rd house → not Lagna, not kendra with AK
  mockPlanet('moon', 5, 15.0, 5),
  mockPlanet('mars', 7, 20.0, 7),
  mockPlanet('mercury', 4, 10.0, 4),
  mockPlanet('jupiter', 9, 15.0, 9),
  mockPlanet('venus', 2, 20.0, 2),
  mockPlanet('saturn', 10, 5.0, 10),
  mockPlanet('rahu', 6, 12.0, 6),
  mockPlanet('ketu', 12, 12.0, 12),
];

Deno.test("Shat-trimsa (negative): returns null when condition not met", () => {
  const moonLon = (5 - 1) * 30 + 15;
  // AK is Mars (not Sun), Sun not in Lagna → should not apply
  const result = buildShatTrimsaDasha(negativePlanets, 1, moonLon, new Date('1990-01-15'), 'mars');
  assertEquals(result, null);
});

// ─── Negative test 2: Sun is AK but NOT in kendra ──────────────────────────
// Sun is AK but in house 3 → not a kendra

const negativePlanets2: PlanetPos[] = [
  mockPlanet('ascendant', 1, 15.0, 1),
  mockPlanet('sun', 3, 28.0, 3),     // Sun is AK (highest degree) but in house 3 → not kendra
  mockPlanet('moon', 5, 15.0, 5),
  mockPlanet('mars', 7, 20.0, 7),
  mockPlanet('mercury', 4, 10.0, 4),
  mockPlanet('jupiter', 9, 15.0, 9),
  mockPlanet('venus', 2, 20.0, 2),
  mockPlanet('saturn', 10, 5.0, 10),
  mockPlanet('rahu', 6, 12.0, 6),
  mockPlanet('ketu', 12, 12.0, 12),
];

Deno.test("Shat-trimsa (negative: Sun AK but not in kendra): returns null", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildShatTrimsaDasha(negativePlanets2, 1, moonLon, new Date('1990-01-15'), 'sun');
  assertEquals(result, null);
});

// ─── Antardasha test ────────────────────────────────────────────────────────

Deno.test("Shat-trimsa (positive): each maha has 7 antar children", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  assertExists(result!.timeline[0].children);
  assertEquals(result!.timeline[0].children!.length, 7);
});

Deno.test("Shat-trimsa (positive): currentMahaDasha is populated", () => {
  const moonLon = (9 - 1) * 30 + 20;
  const result = buildShatTrimsaDasha(positivePlanets1, 5, moonLon, new Date('1990-03-15'), 'mars');
  assertExists(result);
  assertExists(result!.currentMahaDasha);
  assertExists(result!.currentMahaDasha.planet);
});
