/**
 * Unit tests for Lagna Kendradi Dasha.
 *
 * Run with: deno test supabase/functions/calculate-kundli/lagna_kendradi_test.ts
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLagnaKendradiDasha } from "./lagna_kendradi.ts";
import type { PlanetPos } from "./divisional.ts";

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

Deno.test("Lagna Kendradi (Dev Chart): returns 12 maha periods", () => {
  const result = buildLagnaKendradiDasha(devPlanets, 9, new Date('1983-08-23'));
  assertEquals(result.timeline.length, 12);
  assertEquals(result.system, 'lagna_kendradi');
});

Deno.test("Lagna Kendradi (Dev Chart): first sign is Lagna (Dhanu = sign 9)", () => {
  const result = buildLagnaKendradiDasha(devPlanets, 9, new Date('1983-08-23'));
  assertEquals(result.timeline[0].planet, 'Dhanu');
});

Deno.test("Lagna Kendradi (Dev Chart): kendras come before panaphara and apoklima", () => {
  const result = buildLagnaKendradiDasha(devPlanets, 9, new Date('1983-08-23'));
  // Lagna=9 → kendras: 9,12,3,6  panaphara: 10,1,4,7  apoklima: 11,2,5,8
  const signs = result.timeline.map(p => {
    const idx = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
      'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'].indexOf(p.planet) + 1;
    return idx;
  });
  // Houses from Lagna
  const houses = signs.map(s => ((s - 9 + 12) % 12) + 1);
  // First 4 should be kendras (1,4,7,10)
  const kendraSet = new Set([1, 4, 7, 10]);
  for (let i = 0; i < 4; i++) {
    assert(kendraSet.has(houses[i]),
      `Position ${i}: house ${houses[i]} should be a kendra`);
  }
  // Next 4 should be panapharas (2,5,8,11)
  const panapharaSet = new Set([2, 5, 8, 11]);
  for (let i = 4; i < 8; i++) {
    assert(panapharaSet.has(houses[i]),
      `Position ${i}: house ${houses[i]} should be a panaphara`);
  }
  // Last 4 should be apoklimas (3,6,9,12)
  const apoklimaSet = new Set([3, 6, 9, 12]);
  for (let i = 8; i < 12; i++) {
    assert(apoklimaSet.has(houses[i]),
      `Position ${i}: house ${houses[i]} should be an apoklima`);
  }
});

Deno.test("Lagna Kendradi (Dev Chart): all durations in valid range 1-12", () => {
  const result = buildLagnaKendradiDasha(devPlanets, 9, new Date('1983-08-23'));
  for (const p of result.timeline) {
    assert(p.durationYears >= 1 && p.durationYears <= 12,
      `${p.planet} duration ${p.durationYears} out of range`);
  }
});

Deno.test("Lagna Kendradi (Dev Chart): each maha has 12 antar children", () => {
  const result = buildLagnaKendradiDasha(devPlanets, 9, new Date('1983-08-23'));
  for (const p of result.timeline) {
    assertExists(p.children);
    assertEquals(p.children!.length, 12);
  }
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

Deno.test("Lagna Kendradi (Rajiv): starts from Simha (Lagna)", () => {
  const result = buildLagnaKendradiDasha(rajivPlanets, 5, new Date('1944-08-20'));
  assertEquals(result.timeline[0].planet, 'Simha');
});

Deno.test("Lagna Kendradi (Rajiv): Simha should be 12 years (Sun in own sign)", () => {
  const result = buildLagnaKendradiDasha(rajivPlanets, 5, new Date('1944-08-20'));
  // Simha lord = Sun, Sun is in sign 5 (Simha) → lord in own sign → 12
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

Deno.test("Lagna Kendradi (Amitabh): starts from Kumbha (Lagna)", () => {
  const result = buildLagnaKendradiDasha(amitabhPlanets, 11, new Date('1942-10-11'));
  assertEquals(result.timeline[0].planet, 'Kumbha');
});

Deno.test("Lagna Kendradi (Amitabh): all 12 signs appear exactly once", () => {
  const result = buildLagnaKendradiDasha(amitabhPlanets, 11, new Date('1942-10-11'));
  const signs = result.timeline.map(p => p.planet);
  assertEquals(new Set(signs).size, 12);
});
