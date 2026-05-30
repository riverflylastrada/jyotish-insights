/**
 * Unit tests for Drigdasa (aspect-based rasi dasha).
 *
 * Run with: deno test supabase/functions/calculate-kundli/drigdasa_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDrigdasa } from "./drigdasa.ts";
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

// ─── Reference chart 1: Dev Chart (Dhanu Lagna, sign 9) ─────────────────────
// AK in this chart: Mars in Karka (sign 4) based on highest degree

const devPlanets: PlanetPos[] = [
  mockPlanet('ascendant', 9, 9.559, 1),
  mockPlanet('sun', 5, 6.09, 9),
  mockPlanet('moon', 11, 3.85, 3),
  mockPlanet('mars', 4, 12.63, 8),
  mockPlanet('mercury', 6, 3.05, 10),
  mockPlanet('jupiter', 8, 8.39, 12),
  mockPlanet('venus', 5, 8.89, 9),
  mockPlanet('saturn', 7, 6.29, 11),
  mockPlanet('rahu', 2, 27.81, 6),
  mockPlanet('ketu', 8, 27.81, 12),
];

Deno.test("Drigdasa (Dev Chart): returns 12 maha periods", () => {
  // AK sign: let's use Mars in Karka (4) as AK
  const result = buildDrigdasa(devPlanets, 9, new Date('1983-08-23'), 4);
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'drigdasa');
});

Deno.test("Drigdasa (Dev Chart): starts from AK's sign", () => {
  const result = buildDrigdasa(devPlanets, 9, new Date('1983-08-23'), 4);
  // AK in Karka (sign 4) → first maha should be Karka
  assertEquals(result.timeline[0].planet, 'Karka');
});

Deno.test("Drigdasa (Dev Chart): all durations in valid range 1-12", () => {
  const result = buildDrigdasa(devPlanets, 9, new Date('1983-08-23'), 4);
  for (const p of result.timeline) {
    assert(p.durationYears >= 1 && p.durationYears <= 12,
      `${p.planet} duration ${p.durationYears} out of range`);
  }
});

Deno.test("Drigdasa (Dev Chart): each maha has 12 antar children", () => {
  const result = buildDrigdasa(devPlanets, 9, new Date('1983-08-23'), 4);
  for (const p of result.timeline) {
    assertExists(p.children);
    assertEquals(p.children!.length, 12);
  }
});

Deno.test("Drigdasa (Dev Chart): currentMahaDasha is populated", () => {
  const result = buildDrigdasa(devPlanets, 9, new Date('1983-08-23'), 4);
  assertExists(result.currentMahaDasha);
  assertExists(result.currentMahaDasha.planet);
});

// ─── Reference chart 2: Rajiv Gandhi (Simha Lagna, sign 5) ──────────────────

const rajivPlanets: PlanetPos[] = [
  mockPlanet('ascendant', 5, 14.92, 1),
  mockPlanet('sun', 5, 3.37, 1),
  mockPlanet('moon', 5, 1.74, 1),
  mockPlanet('mars', 5, 20.5, 1),
  mockPlanet('mercury', 5, 22.19, 1),
  mockPlanet('jupiter', 5, 25.48, 1),
  mockPlanet('venus', 4, 23.5, 12),
  mockPlanet('saturn', 3, 18.52, 11),
  mockPlanet('rahu', 4, 6.4, 12),
  mockPlanet('ketu', 10, 6.4, 6),
];

Deno.test("Drigdasa (Rajiv): starts from AK's sign (Jupiter in Simha = 5)", () => {
  // Jupiter at 25.48° is highest degree → AK, in sign 5
  const result = buildDrigdasa(rajivPlanets, 5, new Date('1944-08-20'), 5);
  assertEquals(result.timeline[0].planet, 'Simha');
});

Deno.test("Drigdasa (Rajiv): timeline covers reasonable years", () => {
  const result = buildDrigdasa(rajivPlanets, 5, new Date('1944-08-20'), 5);
  const total = result.timeline.reduce((s, p) => s + p.durationYears, 0);
  assert(total > 12 && total <= 144, `Total ${total} out of expected range`);
});

// ─── Reference chart 3: Amitabh (Kumbha Lagna, sign 11) ─────────────────────

const amitabhPlanets: PlanetPos[] = [
  mockPlanet('ascendant', 11, 14.34, 1),
  mockPlanet('sun', 6, 24.64, 8),
  mockPlanet('moon', 11, 13.5, 1),
  mockPlanet('mars', 7, 13.8, 9),
  mockPlanet('mercury', 7, 5.0, 9),
  mockPlanet('jupiter', 4, 18.6, 6),
  mockPlanet('venus', 5, 13.8, 7),
  mockPlanet('saturn', 2, 1.5, 4),
  mockPlanet('rahu', 5, 8.1, 7),
  mockPlanet('ketu', 11, 8.1, 1),
];

Deno.test("Drigdasa (Amitabh): starts from AK's sign (Sun in Kanya = 6)", () => {
  // Sun at 24.64° is highest degree → AK, in sign 6
  const result = buildDrigdasa(amitabhPlanets, 11, new Date('1942-10-11'), 6);
  assertEquals(result.timeline[0].planet, 'Kanya');
});

Deno.test("Drigdasa (Amitabh): signs aspecting AK's sign come before non-aspecting", () => {
  // Kanya (6) is aspected by: 3, 9, 12 (dual → duals). Sign 6 is a dual sign.
  // RASI_DRISHTI[3] = [6, 9, 12] → Mithuna aspects Kanya ✓
  // RASI_DRISHTI[9] = [3, 6, 12] → Dhanu aspects Kanya ✓
  // RASI_DRISHTI[12] = [3, 6, 9] → Meena aspects Kanya ✓
  const result = buildDrigdasa(amitabhPlanets, 11, new Date('1942-10-11'), 6);
  // First maha = Kanya (AK sign itself)
  // Then the aspecting signs should come before non-aspecting
  const firstFour = result.timeline.slice(0, 4).map(p => p.planet);
  assertEquals(firstFour[0], 'Kanya');
  // The next 3 should be the signs aspecting Kanya: Mithuna(3), Dhanu(9), Meena(12)
  const aspectingSigns = ['Mithuna', 'Dhanu', 'Meena'];
  for (const s of aspectingSigns) {
    assert(firstFour.includes(s), `${s} should be in first 4 mahas`);
  }
});
