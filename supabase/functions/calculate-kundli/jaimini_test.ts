/**
 * Unit tests for Jaimini engine.
 *
 * Run with: deno test supabase/functions/calculate-kundli/jaimini_test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeCharaKarakas, karakamsa, computeArudhaPadas, computeCharaDasha, getJaiminiLord } from "./jaimini.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Helper: build a mock D1 planet set ─────────────────────────────────────

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

// Reference chart: 15 Aug 1980, 14:30, Ahmedabad
// Approximated degrees for testing
const testPlanets: PlanetPos[] = [
  mockPlanet('ascendant', 11, 5, 1),    // Kumbha lagna
  mockPlanet('sun', 4, 28, 7),          // Karka 28°
  mockPlanet('moon', 5, 12, 8),         // Simha 12°
  mockPlanet('mars', 5, 23, 8),         // Simha 23°
  mockPlanet('mercury', 5, 5, 8),       // Simha 5°
  mockPlanet('jupiter', 5, 0, 8),       // Simha 0° (just entered)
  mockPlanet('venus', 4, 15, 7),        // Karka 15°
  mockPlanet('saturn', 5, 28, 8),       // Simha 28°
  mockPlanet('rahu', 5, 10, 8),         // Simha 10° → Jaimini uses 30 - 10 = 20°
  mockPlanet('ketu', 11, 10, 2),        // Kumbha 10°
];

// ─── Chara Karakas ──────────────────────────────────────────────────────────

Deno.test("computeCharaKarakas: returns 8 karakas", () => {
  const result = computeCharaKarakas(testPlanets);
  assertEquals(result.length, 8);
});

Deno.test("computeCharaKarakas: highest degree is AK", () => {
  const result = computeCharaKarakas(testPlanets);
  assertEquals(result[0].karaka, 'AK');
  // Sun and Saturn both at 28°, Sun comes first in natural order tiebreaker
  assertEquals(result[0].planet, 'sun');
});

Deno.test("computeCharaKarakas: all 8 labels are unique", () => {
  const result = computeCharaKarakas(testPlanets);
  const labels = result.map(r => r.karaka);
  assertEquals(new Set(labels).size, 8);
});

Deno.test("computeCharaKarakas: Rahu uses reverse degree (30 - signDegree)", () => {
  const result = computeCharaKarakas(testPlanets);
  const rahu = result.find(r => r.planet === 'rahu');
  assertExists(rahu);
  // Rahu at 10° → Jaimini degree = 30 - 10 = 20°
  assertEquals(rahu!.degreeInSign, 20);
});

Deno.test("computeCharaKarakas: ketu is excluded", () => {
  const result = computeCharaKarakas(testPlanets);
  const ketu = result.find(r => r.planet === 'ketu');
  assertEquals(ketu, undefined);
});

// ─── Karakamsa ──────────────────────────────────────────────────────────────

Deno.test("karakamsa: returns sign of AK in D9", () => {
  const d9Planets: PlanetPos[] = [
    mockPlanet('saturn', 3, 15, 1), // Saturn in Mithuna D9
    mockPlanet('sun', 7, 10, 5),
  ];
  const result = karakamsa('saturn', d9Planets);
  assertEquals(result.sign, 3);
  assertEquals(result.signName, 'Mithuna');
});

Deno.test("karakamsa: returns Unknown if AK not found in D9", () => {
  const d9Planets: PlanetPos[] = [
    mockPlanet('sun', 7, 10, 5),
  ];
  const result = karakamsa('saturn', d9Planets);
  assertEquals(result.sign, 0);
  assertEquals(result.signName, 'Unknown');
});

// ─── Arudha Padas ───────────────────────────────────────────────────────────

Deno.test("computeArudhaPadas: returns 4 padas (AL, A2, A7, UL)", () => {
  const result = computeArudhaPadas(testPlanets, 11); // Kumbha lagna = sign 11
  assertEquals(result.length, 4);
  assertEquals(result.map(r => r.house), [1, 2, 7, 12]);
});

Deno.test("computeArudhaPadas: labels are correct", () => {
  const result = computeArudhaPadas(testPlanets, 11);
  const al = result.find(r => r.house === 1);
  assertEquals(al?.label, 'Arudha Lagna (AL)');
  const ul = result.find(r => r.house === 12);
  assertEquals(ul?.label, 'Upapada (UL)');
});

Deno.test("computeArudhaPadas: sign numbers are in valid range 1–12", () => {
  const result = computeArudhaPadas(testPlanets, 11);
  for (const ap of result) {
    assertEquals(ap.sign >= 1 && ap.sign <= 12, true, `${ap.label} sign=${ap.sign} out of range`);
  }
});

// Test Arudha exception 1: if Arudha = H itself → move to 10th from H
Deno.test("computeArudhaPadas: exception case — lord in same house", () => {
  // Create scenario where lord of H1 is IN H1
  // Lagna Aries (1), lord Mars in Aries H1 → count from H1 to H1 = 12
  // Arudha = 12 houses from H1 = H12... but if that == H1, move to H10
  // Actually count is: lord in H1 itself, N = 12 (full cycle), arudha = 12 from lord = H12 from H1 = H12.
  // H12 is not H1, so exception doesn't fire here. Let me engineer a proper case.
  // Lord in same house: N=12, arudha = lordHouse + 12 = lordHouse itself = H1. Exception fires → H10.
  // Wait: N = ((1-1+12)%12) || 12 = 12. arudhaHouse = ((1-1+12)%12)+1 = 1. That equals h=1 → exception.
  const planets: PlanetPos[] = [
    mockPlanet('ascendant', 1, 5, 1),
    mockPlanet('mars', 1, 20, 1),     // Lord of Aries in Aries = H1
    mockPlanet('sun', 5, 10, 5),
    mockPlanet('moon', 4, 10, 4),
    mockPlanet('mercury', 6, 10, 6),
    mockPlanet('jupiter', 9, 10, 9),
    mockPlanet('venus', 2, 10, 2),
    mockPlanet('saturn', 10, 10, 10),
    mockPlanet('rahu', 3, 10, 3),
    mockPlanet('ketu', 9, 10, 9),
  ];
  const result = computeArudhaPadas(planets, 1);
  const al = result.find(r => r.house === 1);
  // Exception: Arudha was H1, moved to 10th from H1 = H10
  assertEquals(al?.sign, 10); // Makara (sign 10 from Aries asc)
});

// ─── getJaiminiLord ─────────────────────────────────────────────────────────

Deno.test("getJaiminiLord: standard signs", () => {
  assertEquals(getJaiminiLord(1), 'mars');
  assertEquals(getJaiminiLord(5), 'sun');
  assertEquals(getJaiminiLord(9), 'jupiter');
});

Deno.test("getJaiminiLord: dual-lord signs use primary lord", () => {
  assertEquals(getJaiminiLord(8), 'mars');      // Scorpio → Mars (not Ketu)
  assertEquals(getJaiminiLord(11), 'saturn');    // Aquarius → Saturn (not Rahu)
  assertEquals(getJaiminiLord(12), 'jupiter');   // Pisces → Jupiter (not Ketu)
});

// ─── Chara Dasha (stubbed) ──────────────────────────────────────────────────

Deno.test("computeCharaDasha: returns null (stubbed)", () => {
  const result = computeCharaDasha(testPlanets, 11, new Date('1980-08-15'));
  assertEquals(result, null);
});
