/**
 * Unit tests for Shoola Dasha (death/health timing rasi dasha).
 *
 * Run with: deno test supabase/functions/calculate-kundli/shoola_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildShoolaDasha } from "./shoola.ts";
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

Deno.test("Shoola Dasha (Dev Chart): returns 12 maha periods", () => {
  // AK sign: Mars in Karka (4). 7th from 4 = 10 (Makara)
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'shoola');
});

Deno.test("Shoola Dasha (Dev Chart): starts from 7th of AK sign", () => {
  // AK in Karka (4) → 7th = Makara (10), even → anti-zodiacal
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  assertEquals(result.timeline[0].planet, 'Makara');
});

Deno.test("Shoola Dasha (Dev Chart): even starting sign → anti-zodiacal progression", () => {
  // Makara (10) is even → anti-zodiacal: 10, 9, 8, 7, 6, ...
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  assertEquals(result.timeline[0].planet, 'Makara'); // 10
  assertEquals(result.timeline[1].planet, 'Dhanu');  // 9
  assertEquals(result.timeline[2].planet, 'Vrischika'); // 8
});

Deno.test("Shoola Dasha (Dev Chart): all durations in valid range 1-12", () => {
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  for (const p of result.timeline) {
    assert(p.durationYears >= 1 && p.durationYears <= 12,
      `${p.planet} duration ${p.durationYears} out of range`);
  }
});

Deno.test("Shoola Dasha (Dev Chart): each maha has 12 antar children", () => {
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  for (const p of result.timeline) {
    assertExists(p.children);
    assertEquals(p.children!.length, 12);
  }
});

Deno.test("Shoola Dasha (Dev Chart): currentMahaDasha is populated", () => {
  const result = buildShoolaDasha(devPlanets, 9, new Date('1983-08-23'), 4);
  assertExists(result.currentMahaDasha);
  assertExists(result.currentMahaDasha.planet);
});

// ─── Reference chart 2: Rajiv (Simha Lagna, AK Jupiter in Simha = 5) ────────

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

Deno.test("Shoola Dasha (Rajiv): starts from 7th of AK sign (Simha=5 → Kumbha=11, odd → zodiacal)", () => {
  const result = buildShoolaDasha(rajivPlanets, 5, new Date('1944-08-20'), 5);
  assertEquals(result.timeline[0].planet, 'Kumbha'); // 7th from Simha = Kumbha
  assertEquals(result.timeline[1].planet, 'Meena');  // zodiacal from 11: 12
  assertEquals(result.timeline[2].planet, 'Mesha');  // zodiacal from 11: 1
});

// ─── Reference chart 3: Amitabh (Kumbha Lagna, AK Sun in Kanya = 6) ────────

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

Deno.test("Shoola Dasha (Amitabh): starts from 7th of AK sign (Kanya=6 → Meena=12, even → anti-zodiacal)", () => {
  const result = buildShoolaDasha(amitabhPlanets, 11, new Date('1942-10-11'), 6);
  assertEquals(result.timeline[0].planet, 'Meena'); // 7th from Kanya = Meena (12)
  // 12 is even → anti-zodiacal: 12, 11, 10, ...
  assertEquals(result.timeline[1].planet, 'Kumbha'); // 11
  assertEquals(result.timeline[2].planet, 'Makara'); // 10
});

Deno.test("Shoola Dasha (Amitabh): total duration is positive and reasonable", () => {
  const result = buildShoolaDasha(amitabhPlanets, 11, new Date('1942-10-11'), 6);
  const total = result.timeline.reduce((s, p) => s + p.durationYears, 0);
  assert(total > 12 && total <= 144, `Total ${total} out of expected range`);
});
