/**
 * Golden-snapshot tests for ashtakavarga.ts — Bhinnashtakavarga (per-planet)
 * and Sarvashtakavarga (aggregate) bindu totals.
 *
 * Reference: BPHS Ch. 48 standard contribution tables. The following invariants
 * hold for ANY chart with the standard Parashari tables:
 *   - Each Bhinna row sum is fixed: Sun=48, Moon=49, Mars=39, Mercury=54,
 *     Jupiter=56, Venus=52, Saturn=39.
 *   - Sarva total (sum of all 12 houses) = 337.
 * Per-house Sarva distributions are chart-specific and verified against
 * JHora (PyJHora v4.8.5, Lahiri) for the reference charts.
 *
 * Run with: deno test supabase/functions/calculate-kundli/ashtakavarga_test.ts
 */

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";
import type { AshtakavargaData } from "./ashtakavarga.ts";

// ─── Reference charts ───────────────────────────────────────────────────────

const DEV_CHART: BirthDetails = {
  fullName: "Dev Chart",
  dateOfBirth: "1983-08-23",
  timeOfBirth: "15:35:00",
  placeOfBirth: {
    name: "Patan, Gujarat",
    latitude: 23.85,
    longitude: 72.12,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
};

const AMITABH: BirthDetails = {
  fullName: "Amitabh Bachchan",
  dateOfBirth: "1942-10-11",
  timeOfBirth: "16:00:00",
  placeOfBirth: {
    name: "Allahabad, India",
    latitude: 25.4358,
    longitude: 81.8463,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
};

const RAJIV: BirthDetails = {
  fullName: "Rajiv Gandhi",
  dateOfBirth: "1944-08-20",
  timeOfBirth: "08:11:00",
  placeOfBirth: {
    name: "Mumbai, India",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
};

// ─── BPHS invariant row sums (valid for ALL charts, Parashari tables) ───────

const BHINNA_INVARIANT_SUMS: Record<string, number> = {
  sun: 48, moon: 49, mars: 39, mercury: 54,
  jupiter: 56, venus: 52, saturn: 39,
};

// ─── Tests: universal invariants ────────────────────────────────────────────

Deno.test("ashtakavarga: Dev Chart — Sarva total = 337", async () => {
  const k = await calculateKundli(DEV_CHART);
  const sum = k.ashtakavarga.sarva.reduce((a: number, b: number) => a + b, 0);
  assertEquals(sum, 337);
});

Deno.test("ashtakavarga: Amitabh — Sarva total = 337", async () => {
  const k = await calculateKundli(AMITABH);
  const sum = k.ashtakavarga.sarva.reduce((a: number, b: number) => a + b, 0);
  assertEquals(sum, 337);
});

Deno.test("ashtakavarga: Rajiv — Sarva total = 337", async () => {
  const k = await calculateKundli(RAJIV);
  const sum = k.ashtakavarga.sarva.reduce((a: number, b: number) => a + b, 0);
  assertEquals(sum, 337);
});

Deno.test("ashtakavarga: Dev Chart — Bhinna row sums match BPHS invariants", async () => {
  // BPHS Ch. 48: each planet's bindu contributions from 8 sources (7 planets + lagna)
  // produce a fixed total across 12 houses.
  const k = await calculateKundli(DEV_CHART);
  for (const [planet, expectedSum] of Object.entries(BHINNA_INVARIANT_SUMS)) {
    const row = k.ashtakavarga.bhinna[planet] as number[];
    const actual = row.reduce((a: number, b: number) => a + b, 0);
    assertEquals(actual, expectedSum, `${planet} bhinna sum`);
  }
});

Deno.test("ashtakavarga: Amitabh — Bhinna row sums match BPHS invariants", async () => {
  const k = await calculateKundli(AMITABH);
  for (const [planet, expectedSum] of Object.entries(BHINNA_INVARIANT_SUMS)) {
    const row = k.ashtakavarga.bhinna[planet] as number[];
    const actual = row.reduce((a: number, b: number) => a + b, 0);
    assertEquals(actual, expectedSum, `${planet} bhinna sum`);
  }
});

Deno.test("ashtakavarga: Rajiv — Bhinna row sums match BPHS invariants", async () => {
  const k = await calculateKundli(RAJIV);
  for (const [planet, expectedSum] of Object.entries(BHINNA_INVARIANT_SUMS)) {
    const row = k.ashtakavarga.bhinna[planet] as number[];
    const actual = row.reduce((a: number, b: number) => a + b, 0);
    assertEquals(actual, expectedSum, `${planet} bhinna sum`);
  }
});

// ─── Tests: per-house Sarva distributions (chart-specific, JHora-verified) ──

Deno.test("ashtakavarga: Dev Chart — Sarva per-house matches JHora", async () => {
  // JHora (PyJHora v4.8.5, Lahiri, Dev Chart 23 Aug 1983 15:35 IST Patan):
  // Houses 1-12 (zodiac signs Mesha through Meena):
  const k = await calculateKundli(DEV_CHART);
  const expected = [29, 34, 31, 29, 27, 28, 27, 21, 28, 26, 30, 27];
  assertEquals(k.ashtakavarga.sarva, expected);
});

Deno.test("ashtakavarga: Amitabh — Sarva per-house matches JHora", async () => {
  // JHora (PyJHora v4.8.5, Lahiri, Amitabh 11 Oct 1942 16:00 IST Allahabad):
  const k = await calculateKundli(AMITABH);
  const expected = [27, 33, 29, 42, 23, 20, 21, 29, 32, 23, 31, 27];
  assertEquals(k.ashtakavarga.sarva, expected);
});

Deno.test("ashtakavarga: Rajiv — Sarva per-house matches JHora", async () => {
  // JHora (PyJHora v4.8.5, Lahiri, Rajiv 20 Aug 1944 08:11 IST Mumbai):
  const k = await calculateKundli(RAJIV);
  const expected = [29, 31, 49, 23, 23, 22, 31, 23, 27, 34, 19, 26];
  assertEquals(k.ashtakavarga.sarva, expected);
});

// ─── Tests: specific Bhinna cell values ─────────────────────────────────────

Deno.test("ashtakavarga: Dev Chart — Sun bhinna per-house matches JHora", async () => {
  // JHora: Sun bhinna row for Dev Chart
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.ashtakavarga.bhinna["sun"], [5, 5, 3, 6, 4, 3, 3, 5, 1, 4, 5, 4]);
});

Deno.test("ashtakavarga: Amitabh — Jupiter bhinna per-house matches JHora", async () => {
  // JHora: Jupiter bhinna row for Amitabh
  const k = await calculateKundli(AMITABH);
  assertEquals(k.ashtakavarga.bhinna["jupiter"], [5, 5, 6, 7, 3, 5, 7, 3, 4, 3, 5, 3]);
});

Deno.test("ashtakavarga: Rajiv — Moon bhinna per-house matches JHora", async () => {
  // JHora: Moon bhinna row for Rajiv
  const k = await calculateKundli(RAJIV);
  assertEquals(k.ashtakavarga.bhinna["moon"], [2, 7, 7, 2, 4, 0, 7, 5, 2, 4, 6, 3]);
});

// ─── Tests: Sarva = sum of all Bhinna rows ──────────────────────────────────

Deno.test("ashtakavarga: Dev Chart — Sarva[h] = Σ bhinna[planet][h]", async () => {
  // By definition, SAV house h = sum of BAV values across all 7 planets for house h
  const k = await calculateKundli(DEV_CHART);
  const planets = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
  for (let h = 0; h < 12; h++) {
    const bhSum = planets.reduce((s, p) => s + (k.ashtakavarga.bhinna[p] as number[])[h], 0);
    assertEquals(bhSum, k.ashtakavarga.sarva[h], `SAV house ${h + 1}`);
  }
});

// ─── Tests: 12 houses per planet ────────────────────────────────────────────

Deno.test("ashtakavarga: each bhinna row has exactly 12 values", async () => {
  const k = await calculateKundli(DEV_CHART);
  for (const planet of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) {
    const row = k.ashtakavarga.bhinna[planet] as number[];
    assertEquals(row.length, 12, `${planet} should have 12 houses`);
  }
});

Deno.test("ashtakavarga: sarva has exactly 12 values", async () => {
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.ashtakavarga.sarva.length, 12);
});

// ─── Tests: attribution exists ──────────────────────────────────────────────

Deno.test("ashtakavarga: attribution populated for each planet", async () => {
  const k = await calculateKundli(DEV_CHART);
  const av = k.ashtakavarga as AshtakavargaData;
  assert(av.attribution !== undefined, "attribution should be present");
  for (const planet of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) {
    const attrs = av.attribution![planet];
    assert(attrs !== undefined, `${planet} attribution missing`);
    assertEquals(attrs.length, 12, `${planet} should have 12 house attributions`);
    for (const ha of attrs) {
      // Each house's contributingPositions count should match the bhinna value
      const bhVal = (av.bhinna[planet] as number[])[ha.house - 1];
      assertEquals(
        ha.contributingPositions.length,
        bhVal,
        `${planet} house ${ha.house}: attribution count vs bhinna`,
      );
    }
  }
});
