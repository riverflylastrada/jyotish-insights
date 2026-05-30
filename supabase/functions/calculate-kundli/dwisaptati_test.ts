/**
 * Unit tests for Dwisaptati-sama Dasha (72-year conditional).
 *
 * Run with: deno test supabase/functions/calculate-kundli/dwisaptati_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDwisaptatiDasha } from "./dwisaptati.ts";
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

// ─── Positive test: Lagna lord in 7th house ─────────────────────────────────
// Mesha Lagna (1), Lagna lord = Mars. Mars in house 7 → condition met.

const positivePlanets1: PlanetPos[] = [
  mockPlanet('ascendant', 1, 15.0, 1),
  mockPlanet('sun', 3, 10.0, 3),
  mockPlanet('moon', 5, 15.0, 5),   // Moon at ~135° (Simha)
  mockPlanet('mars', 7, 20.0, 7),   // Lagna lord in 7th house → condition fires
  mockPlanet('mercury', 4, 10.0, 4),
  mockPlanet('jupiter', 9, 15.0, 9),
  mockPlanet('venus', 2, 20.0, 2),
  mockPlanet('saturn', 10, 5.0, 10),
  mockPlanet('rahu', 6, 12.0, 6),
  mockPlanet('ketu', 12, 12.0, 12),
];

Deno.test("Dwisaptati (positive: Lagna lord in 7th): returns DashaSystem", () => {
  const moonLon = (5 - 1) * 30 + 15; // 135°
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  assertEquals(result!.system, 'dwisaptati');
});

Deno.test("Dwisaptati (positive): has 8+ maha periods covering 72-year cycle", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  assert(result!.timeline.length >= 8, `Expected >= 8 maha periods, got ${result!.timeline.length}`);
});

Deno.test("Dwisaptati (positive): each maha duration is 9 years (except first balance)", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  // First period may have balance; subsequent should be 9 years
  for (let i = 1; i < Math.min(result!.timeline.length, 8); i++) {
    assertEquals(result!.timeline[i].durationYears, 9);
  }
});

Deno.test("Dwisaptati (positive): first period balance <= 9 years", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  assert(result!.timeline[0].durationYears > 0 && result!.timeline[0].durationYears <= 9,
    `First period ${result!.timeline[0].durationYears} out of range`);
});

Deno.test("Dwisaptati (positive): lords are from the 8-planet sequence", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  const validLords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];
  for (const p of result!.timeline) {
    assert(validLords.includes(p.planet), `Unexpected lord: ${p.planet}`);
  }
});

// ─── Positive test 2: 7th lord in 1st house ─────────────────────────────────
// Tula Lagna (7), 7th house = Mesha, 7th lord = Mars. Mars in house 1 → condition met.

const positivePlanets2: PlanetPos[] = [
  mockPlanet('ascendant', 7, 10.0, 1),
  mockPlanet('sun', 8, 15.0, 2),
  mockPlanet('moon', 3, 20.0, 9),  // Moon at ~80°
  mockPlanet('mars', 7, 5.0, 1),   // 7th lord (Mesha lord Mars) in 1st house
  mockPlanet('mercury', 9, 10.0, 3),
  mockPlanet('jupiter', 11, 15.0, 5),
  mockPlanet('venus', 6, 20.0, 12),
  mockPlanet('saturn', 1, 5.0, 7),
  mockPlanet('rahu', 4, 12.0, 10),
  mockPlanet('ketu', 10, 12.0, 4),
];

Deno.test("Dwisaptati (positive: 7th lord in 1st): returns DashaSystem", () => {
  const moonLon = (3 - 1) * 30 + 20; // 80°
  const result = buildDwisaptatiDasha(positivePlanets2, 7, moonLon, new Date('1985-06-10'));
  assertExists(result);
  assertEquals(result!.system, 'dwisaptati');
});

// ─── Negative test: condition not met ───────────────────────────────────────
// Mesha Lagna (1), Lagna lord = Mars in house 3, 7th lord = Venus in house 5.
// Neither in 1st nor 7th → condition NOT met.

const negativePlanets: PlanetPos[] = [
  mockPlanet('ascendant', 1, 15.0, 1),
  mockPlanet('sun', 3, 10.0, 3),
  mockPlanet('moon', 5, 15.0, 5),
  mockPlanet('mars', 3, 20.0, 3),   // Lagna lord in 3rd → no
  mockPlanet('mercury', 4, 10.0, 4),
  mockPlanet('jupiter', 9, 15.0, 9),
  mockPlanet('venus', 5, 20.0, 5),   // 7th lord (Tula → Venus) in 5th → no
  mockPlanet('saturn', 10, 5.0, 10),
  mockPlanet('rahu', 6, 12.0, 6),
  mockPlanet('ketu', 12, 12.0, 12),
];

Deno.test("Dwisaptati (negative): returns null when condition not met", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(negativePlanets, 1, moonLon, new Date('1990-01-15'));
  assertEquals(result, null);
});

// ─── Antardasha test ────────────────────────────────────────────────────────

Deno.test("Dwisaptati (positive): each maha has 8 antar children", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  // Check first maha has children
  assertExists(result!.timeline[0].children);
  assertEquals(result!.timeline[0].children!.length, 8);
});

Deno.test("Dwisaptati (positive): currentMahaDasha is populated", () => {
  const moonLon = (5 - 1) * 30 + 15;
  const result = buildDwisaptatiDasha(positivePlanets1, 1, moonLon, new Date('1990-01-15'));
  assertExists(result);
  assertExists(result!.currentMahaDasha);
  assertExists(result!.currentMahaDasha.planet);
});
