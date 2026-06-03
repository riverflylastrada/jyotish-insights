/**
 * Golden-snapshot tests for dashas.ts — Vimshottari Maha → Antar → Pratyantar
 * boundaries and balance at birth.
 *
 * Reference values:
 *  - AstroSage.com celebrity kundli: Amitabh Bachchan (Rahu Maha balance 12Y 3M 8D,
 *    Maha dates validated). Source: Kundli Sangraha (Bhat).
 *  - Swiss Ephemeris (pyswisseph 2.10, Lahiri) for Dev Chart Moon position.
 *  - Standard Vimshottari cycle: 120-year, 9-planet lordship from nakshatra.
 *
 * Run with: deno test supabase/functions/calculate-kundli/dashas_test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildVimshottari } from "./dashas.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";

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

// ─── Helper ─────────────────────────────────────────────────────────────────

function dateStr(iso: string): string {
  return iso.substring(0, 10);
}

// ─── Dev Chart: Moon in Dhanishtha → Mars Maha at birth ─────────────────────

Deno.test("vimshottari: Dev Chart — first Maha lord is Mars (Dhanishtha lord)", async () => {
  // Moon in Dhanishtha (nakshatra 22), lord cycle index 22 % 9 = 4 → Mars
  // Standard Vimshottari lord cycle: Ketu(0), Venus(1), Sun(2), Moon(3), Mars(4), …
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertEquals(vim.timeline[0].planet, "Mars");
});

Deno.test("vimshottari: Dev Chart — Mars Maha balance ≈ 1.478 years", async () => {
  // Moon at Kumbha 3.85° → sidereal lon ≈ 303.85°
  // Dhanishtha: 293.333°–306.667° (span 13.333°). Moon position in nak = 10.517°
  // Fraction remaining = 1 − (10.517/13.333) = 0.2111
  // Mars Maha = 7 × 0.2111 = 1.478 years
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertAlmostEquals(vim.timeline[0].durationYears, 1.478, 0.05);
});

Deno.test("vimshottari: Dev Chart — Maha sequence follows standard order", async () => {
  // After Mars: Rahu, Jupiter, Saturn, Mercury, Ketu, Venus, Sun, Moon
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const seq = vim.timeline.slice(0, 9).map((p: { planet: string }) => p.planet);
  assertEquals(seq, ["Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon"]);
});

Deno.test("vimshottari: Dev Chart — Maha durations match standard years", async () => {
  // Second Maha onwards should be full-period years
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const expected = [18, 16, 19, 17, 7, 20, 6, 10]; // Rahu through Moon
  for (let i = 0; i < expected.length; i++) {
    assertAlmostEquals(
      vim.timeline[i + 1].durationYears,
      expected[i],
      0.01,
      `Maha #${i + 2} (${vim.timeline[i + 1].planet})`,
    );
  }
});

Deno.test("vimshottari: Dev Chart — Rahu Maha starts ≈ Feb 1985", async () => {
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const rahuStart = dateStr(vim.timeline[1].startDate);
  assert(rahuStart.startsWith("1985-02"), `Rahu start: ${rahuStart}`);
});

// ─── Amitabh: Moon in Swati → Rahu Maha at birth ───────────────────────────

Deno.test("vimshottari: Amitabh — first Maha lord is Rahu (Swati lord)", async () => {
  // AstroSage: Moon in Swati (nakshatra 14), lord cycle 14 % 9 = 5 → Rahu
  // Standard: Ketu(0),Venus(1),Sun(2),Moon(3),Mars(4),Rahu(5),Jupiter(6),Saturn(7),Mercury(8)
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertEquals(vim.timeline[0].planet, "Rahu");
});

Deno.test("vimshottari: Amitabh — Rahu Maha balance ≈ 12.28 years", async () => {
  // AstroSage: Balance = 12Y 3M 8D ≈ 12.27 years
  // Engine calculation: Moon in Swati (186.667°–200°), Moon at ~190.90°
  // fraction remaining = 1 − (4.233/13.333) = 0.6826
  // Rahu Maha = 18 × 0.6826 = 12.29 years
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertAlmostEquals(vim.timeline[0].durationYears, 12.28, 0.1);
});

Deno.test("vimshottari: Amitabh — Maha dates match AstroSage", async () => {
  // AstroSage reference (astrosage.com/celebrity-horoscope/amitabh-bachchan):
  //   Rahu: 11/10/42 to 19/1/55
  //   Jupiter: 19/1/55 to 19/1/71
  //   Saturn: 19/1/71 to 19/1/90
  //   Mercury: 19/1/90 to 19/1/07
  //   Ketu: 19/1/07 to 19/1/14
  //   Venus: 19/1/14 to 19/1/34
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;

  assertEquals(dateStr(vim.timeline[0].startDate), "1942-10-11"); // Rahu start = birth
  assert(dateStr(vim.timeline[1].startDate).startsWith("1955-01"), "Jupiter start ≈ Jan 1955");
  assert(dateStr(vim.timeline[2].startDate).startsWith("1971-01"), "Saturn start ≈ Jan 1971");
  assert(dateStr(vim.timeline[3].startDate).startsWith("1990-01"), "Mercury start ≈ Jan 1990");
  assert(dateStr(vim.timeline[4].startDate).startsWith("2007-01"), "Ketu start ≈ Jan 2007");
  assert(dateStr(vim.timeline[5].startDate).startsWith("2014-01"), "Venus start ≈ Jan 2014");
});

Deno.test("vimshottari: Amitabh — Maha sequence correct", async () => {
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const seq = vim.timeline.slice(0, 9).map((p: { planet: string }) => p.planet);
  assertEquals(seq, ["Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon", "Mars"]);
});

// ─── Rajiv Gandhi: Moon in Purva Phalguni → Venus Maha at birth ─────────────

Deno.test("vimshottari: Rajiv — first Maha lord is Venus (Purva Phalguni lord)", async () => {
  // Moon in Purva Phalguni (nakshatra 10), lord cycle 10 % 9 = 1 → Venus
  const k = await calculateKundli(RAJIV);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertEquals(vim.timeline[0].planet, "Venus");
});

Deno.test("vimshottari: Rajiv — Venus Maha balance ≈ 13.53 years", async () => {
  // Moon at Simha 17.65° → sidereal lon ≈ 137.65°
  // Purva Phalguni: 133.333°–146.667°. Position = 4.317°/13.333° = 0.324
  // Balance = 20 × (1 − 0.324) = 13.52 years
  const k = await calculateKundli(RAJIV);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  assertAlmostEquals(vim.timeline[0].durationYears, 13.53, 0.1);
});

// ─── Antar dasha structure ──────────────────────────────────────────────────

Deno.test("vimshottari: current Maha has 9 Antar sub-periods", async () => {
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const children = vim.currentMahaDasha.children;
  assert(children !== undefined, "Antar dashas should be present");
  assertEquals(children!.length, 9, "Exactly 9 Antar periods");
});

Deno.test("vimshottari: Antar sequence starts with Maha lord", async () => {
  // Standard rule: Antar cycle starts from the Maha lord itself
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const mahaLord = vim.currentMahaDasha.planet;
  assertEquals(vim.currentMahaDasha.children![0].planet, mahaLord);
});

Deno.test("vimshottari: Antar durations sum to Maha duration", async () => {
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const antarSum = vim.currentMahaDasha.children!.reduce(
    (s: number, a: { durationYears: number }) => s + a.durationYears,
    0,
  );
  assertAlmostEquals(antarSum, vim.currentMahaDasha.durationYears, 0.01);
});

Deno.test("vimshottari: Pratyantar sub-periods exist inside Antar", async () => {
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const firstAntar = vim.currentMahaDasha.children![0];
  assert(firstAntar.children !== undefined, "Pratyantar should exist");
  assertEquals(firstAntar.children!.length, 9, "9 Pratyantar periods per Antar");
});

Deno.test("vimshottari: Pratyantar durations sum to Antar duration", async () => {
  const k = await calculateKundli(DEV_CHART);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const firstAntar = vim.currentMahaDasha.children![0];
  const pratSum = firstAntar.children!.reduce(
    (s: number, p: { durationYears: number }) => s + p.durationYears,
    0,
  );
  assertAlmostEquals(pratSum, firstAntar.durationYears, 0.001);
});

// ─── Timeline coverage ──────────────────────────────────────────────────────

Deno.test("vimshottari: timeline has no gaps (end[i] ≈ start[i+1])", async () => {
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  for (let i = 0; i < vim.timeline.length - 1; i++) {
    const end = new Date(vim.timeline[i].endDate).getTime();
    const nextStart = new Date(vim.timeline[i + 1].startDate).getTime();
    const diffMs = Math.abs(end - nextStart);
    assert(diffMs < 1000, `Gap between Maha ${i} and ${i + 1}: ${diffMs}ms`);
  }
});

Deno.test("vimshottari: 2nd through 10th Maha durations sum to 120 years", async () => {
  // timeline[0] is the partial balance at birth; timeline[1..9] are 8 full periods
  // plus the first full period of the next cycle — together exactly 120 yrs.
  const k = await calculateKundli(AMITABH);
  const vim = k.dashas.find((d: { system: string }) => d.system === "vimshottari")!;
  const sum = vim.timeline.slice(1, 10).reduce(
    (s: number, p: { durationYears: number }) => s + p.durationYears,
    0,
  );
  assertAlmostEquals(sum, 120, 0.01);
});
