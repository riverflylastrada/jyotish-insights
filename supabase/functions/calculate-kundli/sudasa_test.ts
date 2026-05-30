/**
 * Unit tests for Sudasa (Wealth) Dasha.
 *
 * Run with: deno test supabase/functions/calculate-kundli/sudasa_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSudasaDasha } from "./sudasa.ts";
import type { PlanetPos, DivChart } from "./divisional.ts";

// ─── Helper ─────────────────────────────────────────────────────────────────

function mockPlanet(planet: string, signNumber: number, signDegree: number, houseNumber: number, dignity?: string): PlanetPos {
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
    dignity,
  };
}

function buildD2Chart(d2AscSign: number, d2Planets: PlanetPos[]): DivChart {
  return {
    varga: 'D2',
    vargaName: 'Hora',
    significance: 'Wealth',
    ascendantSign: d2AscSign,
    planets: d2Planets,
  };
}

// ─── Reference chart 1: Dev Chart (Dhanu Lagna, sign 9) ─────────────────────
// D-2 (Hora): for Dhanu asc deg ~9.56° → odd sign, <15° → Leo(5)

const devD1: PlanetPos[] = [
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

// Approximate D2 positions (Hora chart: Cancer/Leo two-sign chart)
const devD2Planets: PlanetPos[] = [
  mockPlanet('ascendant', 5, 9, 1),   // D2 Asc in Leo
  mockPlanet('sun', 4, 6, 12),        // Sun → Cancer (odd sign, <15°)
  mockPlanet('moon', 5, 3, 1),        // Moon → Leo (odd sign, <15°)
  mockPlanet('mars', 5, 12, 1),       // Mars → Leo (even sign, <15°)
  mockPlanet('mercury', 4, 3, 12),    // Mercury → Cancer
  mockPlanet('jupiter', 4, 8, 12),    // Jupiter → Cancer
  mockPlanet('venus', 4, 8, 12),      // Venus → Cancer
  mockPlanet('saturn', 4, 6, 12),     // Saturn → Cancer
  mockPlanet('rahu', 5, 27, 1),       // Rahu → Leo
  mockPlanet('ketu', 5, 27, 1),       // Ketu → Leo
];

const devDivCharts: DivChart[] = [
  { varga: 'D1', vargaName: 'Rasi', significance: 'Main', ascendantSign: 9, planets: devD1 },
  buildD2Chart(5, devD2Planets),
];

Deno.test("Sudasa (Dev Chart): returns 12 maha periods", () => {
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), devDivCharts);
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'sudasa');
});

Deno.test("Sudasa (Dev Chart): all durations in valid range 1-12", () => {
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), devDivCharts);
  for (const p of result.timeline) {
    assert(p.durationYears >= 1 && p.durationYears <= 12,
      `${p.planet} duration ${p.durationYears} out of range`);
  }
});

Deno.test("Sudasa (Dev Chart): each maha has 12 antar children", () => {
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), devDivCharts);
  for (const p of result.timeline) {
    assertExists(p.children);
    assertEquals(p.children!.length, 12);
  }
});

Deno.test("Sudasa (Dev Chart): all 12 signs appear exactly once", () => {
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), devDivCharts);
  const signs = result.timeline.map(p => p.planet);
  assertEquals(new Set(signs).size, 12);
});

Deno.test("Sudasa (Dev Chart): currentMahaDasha is populated", () => {
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), devDivCharts);
  assertExists(result.currentMahaDasha);
  assertExists(result.currentMahaDasha.planet);
});

// ─── Reference chart 2: Rajiv Gandhi ────────────────────────────────────────

const rajivD1: PlanetPos[] = [
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

const rajivD2Planets: PlanetPos[] = [
  mockPlanet('ascendant', 4, 14, 1),
  mockPlanet('sun', 4, 3, 1),
  mockPlanet('moon', 4, 1, 1),
  mockPlanet('mars', 5, 20, 2),
  mockPlanet('mercury', 5, 22, 2),
  mockPlanet('jupiter', 5, 25, 2),
  mockPlanet('venus', 5, 23, 2),
  mockPlanet('saturn', 5, 18, 2),
  mockPlanet('rahu', 4, 6, 1),
  mockPlanet('ketu', 4, 6, 1),
];

const rajivDivCharts: DivChart[] = [
  { varga: 'D1', vargaName: 'Rasi', significance: 'Main', ascendantSign: 5, planets: rajivD1 },
  buildD2Chart(4, rajivD2Planets),
];

Deno.test("Sudasa (Rajiv): returns 12 maha periods", () => {
  const result = buildSudasaDasha(rajivD1, 5, new Date('1944-08-20'), rajivDivCharts);
  assertEquals(result.timeline.length, 12);
});

Deno.test("Sudasa (Rajiv): total dasha years are positive", () => {
  const result = buildSudasaDasha(rajivD1, 5, new Date('1944-08-20'), rajivDivCharts);
  const total = result.timeline.reduce((s, p) => s + p.durationYears, 0);
  assert(total > 0, `Total dasha years should be positive, got ${total}`);
});

// ─── Reference chart 3: Amitabh Bachchan ────────────────────────────────────

const amitabhD1: PlanetPos[] = [
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

const amitabhD2Planets: PlanetPos[] = [
  mockPlanet('ascendant', 5, 14, 1),
  mockPlanet('sun', 4, 24, 12),
  mockPlanet('moon', 5, 13, 1),
  mockPlanet('mars', 4, 13, 12),
  mockPlanet('mercury', 4, 5, 12),
  mockPlanet('jupiter', 5, 18, 1),
  mockPlanet('venus', 4, 13, 12),
  mockPlanet('saturn', 5, 1, 1),
  mockPlanet('rahu', 4, 8, 12),
  mockPlanet('ketu', 5, 8, 1),
];

const amitabhDivCharts: DivChart[] = [
  { varga: 'D1', vargaName: 'Rasi', significance: 'Main', ascendantSign: 11, planets: amitabhD1 },
  buildD2Chart(5, amitabhD2Planets),
];

Deno.test("Sudasa (Amitabh): returns 12 maha periods", () => {
  const result = buildSudasaDasha(amitabhD1, 11, new Date('1942-10-11'), amitabhDivCharts);
  assertEquals(result.timeline.length, 12);
});

Deno.test("Sudasa (Amitabh): all 12 signs appear exactly once", () => {
  const result = buildSudasaDasha(amitabhD1, 11, new Date('1942-10-11'), amitabhDivCharts);
  const signs = result.timeline.map(p => p.planet);
  assertEquals(new Set(signs).size, 12);
});

// ─── Fallback: no D2 chart available → uses D1 ─────────────────────────────

Deno.test("Sudasa: graceful fallback when no D2 chart available", () => {
  const noDivCharts: DivChart[] = [
    { varga: 'D1', vargaName: 'Rasi', significance: 'Main', ascendantSign: 9, planets: devD1 },
  ];
  const result = buildSudasaDasha(devD1, 9, new Date('1983-08-23'), noDivCharts);
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'sudasa');
});
