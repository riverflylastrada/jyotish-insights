/**
 * Tests for KP Horary 1-249 table and chartBasis engine paths.
 *
 * Run with: deno test supabase/functions/calculate-kundli/kp_horary_test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { kpHoraryTable, kpHoraryLongitude, kpHorarySegment } from "./kp_horary.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";

// ─── KP 1-249 table structure ──────────────────────────────────────────────

Deno.test("KP horary table has exactly 249 segments", async () => {
  assertEquals(kpHoraryTable().length, 249);
});

Deno.test("KP table is continuous (no gaps)", async () => {
  const t = kpHoraryTable();
  for (let i = 1; i < t.length; i++) {
    assertAlmostEquals(t[i].startDeg, t[i - 1].endDeg, 1e-6,
      `Gap between segment ${t[i - 1].number} and ${t[i].number}`);
  }
});

Deno.test("KP table covers 0-360 degrees", async () => {
  const t = kpHoraryTable();
  assertAlmostEquals(t[0].startDeg, 0, 1e-9);
  assertAlmostEquals(t[248].endDeg, 360, 1e-6);
});

Deno.test("KP number 1: Aries/Ashwini/Ketu-Ketu, ends at 0°46'40\"", () => {
  const seg = kpHorarySegment(1)!;
  assertEquals(seg.sign, 1);
  assertEquals(seg.starLord, "Ketu");
  assertEquals(seg.subLord, "Ketu");
  assertAlmostEquals(seg.endDeg, 7 / 9, 0.001); // 0.7778°
});

Deno.test("KP number 2: Aries/Ashwini/Ketu-Venus, ends at 3°00'", () => {
  const seg = kpHorarySegment(2)!;
  assertEquals(seg.sign, 1);
  assertEquals(seg.starLord, "Ketu");
  assertEquals(seg.subLord, "Venus");
  assertAlmostEquals(seg.endDeg, 3.0, 0.001);
});

Deno.test("KP number 9: last Ashwini sub (Ketu-Mercury), ends at 13°20'", () => {
  const seg = kpHorarySegment(9)!;
  assertEquals(seg.starLord, "Ketu");
  assertEquals(seg.subLord, "Mercury");
  assertAlmostEquals(seg.endDeg, 40 / 3, 0.001); // 13.333°
});

Deno.test("KP number 10: Bharani start (Venus-Venus)", async () => {
  const seg = kpHorarySegment(10)!;
  assertEquals(seg.sign, 1);
  assertEquals(seg.starLord, "Venus");
  assertEquals(seg.subLord, "Venus");
});

Deno.test("KP 30° boundary splits Krittika/Rahu into numbers 22 and 23", async () => {
  const n22 = kpHorarySegment(22)!;
  const n23 = kpHorarySegment(23)!;
  assertEquals(n22.sign, 1); // Aries
  assertEquals(n23.sign, 2); // Taurus
  assertAlmostEquals(n22.endDeg, 30, 0.001);
  assertAlmostEquals(n23.startDeg, 30, 0.001);
  assertEquals(n22.starLord, n23.starLord);
  assertEquals(n22.subLord, n23.subLord);
});

Deno.test("KP 60° is NOT split (sub boundary coincidence)", async () => {
  const t = kpHoraryTable();
  const gemStart = t.find(s => s.sign === 3)!;
  assertAlmostEquals(gemStart.startDeg, 60, 0.001);
});

Deno.test("KP 120° is NOT split (nakshatra boundary)", async () => {
  const t = kpHoraryTable();
  const leoStart = t.find(s => s.sign === 5)!;
  assertAlmostEquals(leoStart.startDeg, 120, 0.001);
});

Deno.test("KP number 249: Meena/Revati/Mercury-Saturn", async () => {
  const seg = kpHorarySegment(249)!;
  assertEquals(seg.sign, 12);
  assertEquals(seg.starLord, "Mercury");
  assertEquals(seg.subLord, "Saturn");
});

Deno.test("kpHoraryLongitude returns midpoint", async () => {
  const seg = kpHorarySegment(1)!;
  assertAlmostEquals(kpHoraryLongitude(1)!, (seg.startDeg + seg.endDeg) / 2, 1e-9);
});

Deno.test("kpHoraryLongitude returns null for invalid numbers", async () => {
  assertEquals(kpHoraryLongitude(0), null);
  assertEquals(kpHoraryLongitude(250), null);
  assertEquals(kpHoraryLongitude(1.5), null);
});

// ─── Chart basis: solar ─────────────────────────────────────────────────────

const BASE_DETAILS: BirthDetails = {
  fullName: "Test",
  dateOfBirth: "1983-08-23",
  placeOfBirth: {
    name: "Patan",
    latitude: 23.85,
    longitude: 72.12,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
};

Deno.test("Solar chart: ascendant sign matches Sun's sign", async () => {
  const result = await calculateKundli({ ...BASE_DETAILS, chartBasis: "solar" });
  const sunPos = result.divisionalCharts[0].planets.find((p) => p.planet === "sun")!;
  assertEquals(result.ascendant.signNumber, sunPos.signNumber);
  assertEquals(result.chartBasis, "solar");
});

Deno.test("Solar chart: ascendant at 0° of Sun's sign", async () => {
  const result = await calculateKundli({ ...BASE_DETAILS, chartBasis: "solar" });
  // For whole-sign solar chart, ascendant is placed at sign start
  assertEquals(result.ascendant.signDegree, 0);
});

// ─── Chart basis: moon ──────────────────────────────────────────────────────

Deno.test("Moon chart: ascendant sign matches Moon's sign", async () => {
  const result = await calculateKundli({ ...BASE_DETAILS, chartBasis: "moon" });
  const moonPos = result.divisionalCharts[0].planets.find((p) => p.planet === "moon")!;
  assertEquals(result.ascendant.signNumber, moonPos.signNumber);
  assertEquals(result.chartBasis, "moon");
});

Deno.test("Moon chart without timeOfBirth flags uncertainty", async () => {
  const result = await calculateKundli({
    ...BASE_DETAILS,
    chartBasis: "moon",
    timeOfBirth: undefined,
  });
  assertEquals(result.moonSignUncertain, true);
});

Deno.test("Moon chart with timeOfBirth does not flag uncertainty", async () => {
  const result = await calculateKundli({
    ...BASE_DETAILS,
    chartBasis: "moon",
    timeOfBirth: "15:35:00",
  });
  assertEquals(result.moonSignUncertain, undefined);
});

// ─── Chart basis: horary ────────────────────────────────────────────────────

Deno.test("Horary chart: ascendant from KP number 42", async () => {
  const result = await calculateKundli({
    ...BASE_DETAILS,
    chartBasis: "horary",
    horaryNumber: 42,
  });
  const seg = kpHorarySegment(42)!;
  const expectedLon = (seg.startDeg + seg.endDeg) / 2;
  assertAlmostEquals(result.ascendant.longitude, expectedLon, 0.001);
  assertEquals(result.chartBasis, "horary");
});

Deno.test("Horary chart: ascendant sign matches KP segment sign", async () => {
  for (const num of [1, 42, 100, 200, 249]) {
    const result = await calculateKundli({
      ...BASE_DETAILS,
      chartBasis: "horary",
      horaryNumber: num,
    });
    const seg = kpHorarySegment(num)!;
    assertEquals(result.ascendant.signNumber, seg.sign,
      `Horary ${num}: expected sign ${seg.sign}, got ${result.ascendant.signNumber}`);
  }
});

// ─── Default (rasi) unchanged ───────────────────────────────────────────────

Deno.test("Default rasi chart: same as before (no chartBasis field)", async () => {
  const withBasis = await calculateKundli({ ...BASE_DETAILS, timeOfBirth: "15:35:00", chartBasis: "rasi" });
  const without = await calculateKundli({ ...BASE_DETAILS, timeOfBirth: "15:35:00" });
  assertEquals(withBasis.ascendant.signNumber, without.ascendant.signNumber);
  assertAlmostEquals(withBasis.ascendant.longitude, without.ascendant.longitude, 0.001);
});
