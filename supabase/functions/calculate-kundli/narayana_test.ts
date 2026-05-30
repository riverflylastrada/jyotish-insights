/**
 * Unit tests for Narayana (Padakrama) Dasha.
 *
 * Run with: deno test supabase/functions/calculate-kundli/narayana_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNarayanaDasha } from "./narayana.ts";
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

Deno.test("Narayana Dasha (Dev Chart): returns 12 maha periods", () => {
  const result = buildNarayanaDasha(devPlanets, 9, new Date('1983-08-23'));
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'narayana');
});

Deno.test("Narayana Dasha (Dev Chart): starts from Lagna sign (Dhanu = 9, odd → zodiacal)", () => {
  const result = buildNarayanaDasha(devPlanets, 9, new Date('1983-08-23'));
  // Odd sign → zodiacal progression: 9, 10, 11, 12, 1, 2, ...
  assertEquals(result.timeline[0].planet, 'Dhanu');
  assertEquals(result.timeline[1].planet, 'Makara');
  assertEquals(result.timeline[2].planet, 'Kumbha');
});

Deno.test("Narayana Dasha (Dev Chart): all durations in valid range 1-12", () => {
  const result = buildNarayanaDasha(devPlanets, 9, new Date('1983-08-23'));
  for (const p of result.timeline) {
    assert(p.durationYears >= 1 && p.durationYears <= 12,
      `${p.planet} duration ${p.durationYears} out of range`);
  }
});

Deno.test("Narayana Dasha (Dev Chart): each maha has 12 antar children", () => {
  const result = buildNarayanaDasha(devPlanets, 9, new Date('1983-08-23'));
  for (const p of result.timeline) {
    assertExists(p.children);
    assertEquals(p.children!.length, 12);
  }
});

Deno.test("Narayana Dasha (Dev Chart): currentMahaDasha is populated", () => {
  const result = buildNarayanaDasha(devPlanets, 9, new Date('1983-08-23'));
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

Deno.test("Narayana Dasha (Rajiv): starts from Simha (5, odd → zodiacal)", () => {
  const result = buildNarayanaDasha(rajivPlanets, 5, new Date('1944-08-20'));
  assertEquals(result.timeline[0].planet, 'Simha');
  assertEquals(result.timeline[1].planet, 'Kanya');
  assertEquals(result.timeline[2].planet, 'Tula');
});

Deno.test("Narayana Dasha (Rajiv): Simha duration is 12 (Sun lord in own sign 5)", () => {
  const result = buildNarayanaDasha(rajivPlanets, 5, new Date('1944-08-20'));
  assertEquals(result.timeline[0].durationYears, 12);
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

Deno.test("Narayana Dasha (Amitabh): starts from Kumbha (11, odd → zodiacal)", () => {
  const result = buildNarayanaDasha(amitabhPlanets, 11, new Date('1942-10-11'));
  assertEquals(result.timeline[0].planet, 'Kumbha');
  assertEquals(result.timeline[1].planet, 'Meena');
  assertEquals(result.timeline[2].planet, 'Mesha');
});

Deno.test("Narayana Dasha (Amitabh): all durations sum to a positive total", () => {
  const result = buildNarayanaDasha(amitabhPlanets, 11, new Date('1942-10-11'));
  const total = result.timeline.reduce((s, p) => s + p.durationYears, 0);
  assert(total > 0, `Total dasha years should be positive, got ${total}`);
});

// ─── Even lagna test (Karka = 4, even → anti-zodiacal) ──────────────────────

Deno.test("Narayana Dasha: even lagna → anti-zodiacal progression", () => {
  const planets: PlanetPos[] = [
    mockPlanet('ascendant', 4, 10, 1),
    mockPlanet('sun', 5, 10, 2),
    mockPlanet('moon', 3, 10, 12),
    mockPlanet('mars', 1, 10, 10),
    mockPlanet('mercury', 6, 10, 3),
    mockPlanet('jupiter', 9, 10, 6),
    mockPlanet('venus', 2, 10, 11),
    mockPlanet('saturn', 10, 10, 7),
    mockPlanet('rahu', 7, 10, 4),
    mockPlanet('ketu', 1, 10, 10),
  ];
  const result = buildNarayanaDasha(planets, 4, new Date('2000-01-01'));
  // Even sign → anti-zodiacal: 4, 3, 2, 1, 12, 11, ...
  assertEquals(result.timeline[0].planet, 'Karka');
  assertEquals(result.timeline[1].planet, 'Mithuna');
  assertEquals(result.timeline[2].planet, 'Vrishabha');
});
