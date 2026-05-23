/**
 * Unit tests for KP sub-lord engine.
 *
 * Run with: deno test supabase/functions/calculate-kundli/kp_test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { kpLords, computeKpPlanetSubLords, computeRulingPlanets } from "./kp.ts";

// ─── kpLords basic tests ────────────────────────────────────────────────────

Deno.test("kpLords: 0° Aries → sign-lord Mars, star-lord Ketu", () => {
  const result = kpLords(0);
  assertEquals(result.signLord, "Mars");
  assertEquals(result.starLord, "Ketu");
});

Deno.test("kpLords: 13.333° (start of Bharani) → star-lord Venus", () => {
  const result = kpLords(13.3334);
  assertEquals(result.starLord, "Venus");
});

Deno.test("kpLords: 26.667° (start of Krittika) → star-lord Sun", () => {
  const result = kpLords(26.6668);
  assertEquals(result.starLord, "Sun");
});

Deno.test("kpLords: sub-lord is always one of the 9 Vimshottari planets", () => {
  const vimPlanets = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  // Test a range of longitudes
  for (let lon = 0; lon < 360; lon += 5) {
    const result = kpLords(lon);
    assertExists(result.subLord, `Sub-lord missing at ${lon}°`);
    assertEquals(
      vimPlanets.includes(result.subLord),
      true,
      `Sub-lord '${result.subLord}' at ${lon}° is not a valid Vimshottari planet`,
    );
  }
});

Deno.test("kpLords: sign-lord changes at 30° boundary", () => {
  const aries = kpLords(29.9);
  const taurus = kpLords(30.1);
  assertEquals(aries.signLord, "Mars");
  assertEquals(taurus.signLord, "Venus");
});

Deno.test("kpLords: Ashwini sub-lords start with Ketu (first sub in Ketu star)", () => {
  // At 0° Aries (Ashwini), star lord = Ketu, and the first sub-lord should be Ketu
  const result = kpLords(0.01);
  assertEquals(result.starLord, "Ketu");
  assertEquals(result.subLord, "Ketu");
});

Deno.test("kpLords: handles longitude > 360 (normalization)", () => {
  const a = kpLords(45);
  const b = kpLords(405); // 45 + 360
  assertEquals(a.signLord, b.signLord);
  assertEquals(a.starLord, b.starLord);
  assertEquals(a.subLord, b.subLord);
});

Deno.test("kpLords: handles negative longitude (normalization)", () => {
  const a = kpLords(350);
  const b = kpLords(-10); // 360 - 10 = 350
  assertEquals(a.signLord, b.signLord);
  assertEquals(a.starLord, b.starLord);
  assertEquals(a.subLord, b.subLord);
});

// ─── computeKpPlanetSubLords ────────────────────────────────────────────────

Deno.test("computeKpPlanetSubLords: returns 9 entries (excludes ascendant)", () => {
  const mockPlanets = [
    { planet: 'ascendant', longitude: 100, signNumber: 4, signName: 'Karka', signDegree: 10, nakshatra: 'Pushya', nakshatraPada: 1 as const, houseNumber: 1, isRetrograde: false, isCombust: false },
    { planet: 'sun', longitude: 120, signNumber: 5, signName: 'Simha', signDegree: 0, nakshatra: 'Magha', nakshatraPada: 1 as const, houseNumber: 2, isRetrograde: false, isCombust: false },
    { planet: 'moon', longitude: 45, signNumber: 2, signName: 'Vrishabha', signDegree: 15, nakshatra: 'Rohini', nakshatraPada: 3 as const, houseNumber: 11, isRetrograde: false, isCombust: false },
    { planet: 'mars', longitude: 200, signNumber: 7, signName: 'Tula', signDegree: 20, nakshatra: 'Swati', nakshatraPada: 4 as const, houseNumber: 4, isRetrograde: false, isCombust: false },
    { planet: 'mercury', longitude: 130, signNumber: 5, signName: 'Simha', signDegree: 10, nakshatra: 'Magha', nakshatraPada: 3 as const, houseNumber: 2, isRetrograde: false, isCombust: false },
    { planet: 'jupiter', longitude: 250, signNumber: 9, signName: 'Dhanu', signDegree: 10, nakshatra: 'Mula', nakshatraPada: 3 as const, houseNumber: 6, isRetrograde: false, isCombust: false },
    { planet: 'venus', longitude: 310, signNumber: 11, signName: 'Kumbha', signDegree: 10, nakshatra: 'Shatabhisha', nakshatraPada: 3 as const, houseNumber: 8, isRetrograde: false, isCombust: false },
    { planet: 'saturn', longitude: 330, signNumber: 11, signName: 'Kumbha', signDegree: 30, nakshatra: 'Purva Bhadrapada', nakshatraPada: 2 as const, houseNumber: 8, isRetrograde: false, isCombust: false },
    { planet: 'rahu', longitude: 60, signNumber: 3, signName: 'Mithuna', signDegree: 0, nakshatra: 'Mrigashira', nakshatraPada: 3 as const, houseNumber: 12, isRetrograde: true, isCombust: false },
    { planet: 'ketu', longitude: 240, signNumber: 9, signName: 'Dhanu', signDegree: 0, nakshatra: 'Mula', nakshatraPada: 1 as const, houseNumber: 6, isRetrograde: true, isCombust: false },
  ];
  const result = computeKpPlanetSubLords(mockPlanets);
  assertEquals(result.length, 9);
  assertEquals(result.every(r => r.signLord && r.starLord && r.subLord), true);
});

// ─── computeRulingPlanets ───────────────────────────────────────────────────

Deno.test("computeRulingPlanets: returns 5 valid fields", () => {
  const now = new Date('2026-05-22T12:00:00Z'); // Friday = Venus
  const result = computeRulingPlanets(100, 45, now);
  assertExists(result.ascSignLord);
  assertExists(result.ascStarLord);
  assertExists(result.moonSignLord);
  assertExists(result.moonStarLord);
  assertEquals(result.dayLord, "Venus"); // Friday
});

Deno.test("computeRulingPlanets: Sunday → Sun as day lord", () => {
  const sunday = new Date('2026-05-24T12:00:00Z'); // Sunday
  const result = computeRulingPlanets(0, 0, sunday);
  assertEquals(result.dayLord, "Sun");
});
