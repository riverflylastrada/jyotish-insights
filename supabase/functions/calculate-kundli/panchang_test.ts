/**
 * Golden-snapshot tests for panchang.ts — Tithi, Vara, Nakshatra, Yoga, Karana.
 *
 * Reference:
 *  - Drik Panchang (drikpanchang.com) for 23 Aug 1983: Shukla Purnima, Tuesday,
 *    Dhanishtha, Atiganda yoga (for New Delhi; panchang five-limbs valid across
 *    Indian timezones at the given moment).
 *  - AstroSage.com celebrity kundli for Amitabh (11 Oct 1942, Sunday).
 *  - Standard panchang computation: Tithi = (Moon − Sun)/12°, Vara from weekday,
 *    Nakshatra = Moon's sidereal nakshatra, Yoga = (sidereal Sun + sidereal
 *    Moon)/13°20', Karana = half-tithi. Yoga is nirayana (sidereal) — the same
 *    longitudes as nakshatra, not tropical.
 *
 * Run with: deno test supabase/functions/calculate-kundli/panchang_test.ts
 */

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
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

// Regression chart for the nirayana-yoga fix: an astrologer reported that for
// this birth our panchang showed Vyatipata, but the correct (sidereal) nitya
// yoga is Harshana. The old code summed *tropical* Sun+Moon, shifting the result
// forward by ~2× ayanamsa (≈3 yogas: Harshana → Vajra → Siddhi → Vyatipata).
const RAMJI: BirthDetails = {
  fullName: "Ramji Desai",
  dateOfBirth: "1952-11-25",
  timeOfBirth: "06:01:43",
  placeOfBirth: {
    name: "Ahmedabad, India",
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
};

// ─── Dev Chart: 23 Aug 1983, Tuesday ────────────────────────────────────────

Deno.test("panchang: Dev Chart — Tithi is Shukla Paksha Purnima", async () => {
  // Drik Panchang (drikpanchang.com, 23 Aug 1983, New Delhi): Tithi = Purnima
  // (Shukla Paksha). Full Moon day, confirmed by Raksha Bandhan falling on this date.
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.panchang.tithi, "Shukla Paksha Purnima");
});

Deno.test("panchang: Dev Chart — Vara is Tuesday (Mangalavara)", async () => {
  // 23 Aug 1983 is a Tuesday. Verified via standard calendar and Drik Panchang.
  const k = await calculateKundli(DEV_CHART);
  assert(k.panchang.vara.includes("Mangalavara"), `Got: ${k.panchang.vara}`);
});

Deno.test("panchang: Dev Chart — Nakshatra is Dhanishtha", async () => {
  // Moon in Dhanishtha at birth time. Drik Panchang: Dhanishtha for this date.
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.panchang.nakshatra, "Dhanishtha");
});

Deno.test("panchang: Dev Chart — Yoga is Atiganda", async () => {
  // Drik Panchang (23 Aug 1983, New Delhi): Shobhana upto 09:29 AM, then
  // Atiganda for the rest of the day. Birth is 15:35, so the prevailing nitya
  // yoga is Atiganda. Yoga uses sidereal Sun + sidereal Moon (nirayana).
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.panchang.yoga, "Atiganda");
});

Deno.test("panchang: Dev Chart — Karana is Bava", async () => {
  // Karana = half-tithi. Purnima 2nd half = Bava.
  const k = await calculateKundli(DEV_CHART);
  assertEquals(k.panchang.karana, "Bava");
});

// ─── Amitabh: 11 Oct 1942, Sunday ──────────────────────────────────────────

Deno.test("panchang: Amitabh — Vara is Sunday (Ravivara)", async () => {
  // 11 Oct 1942 is a Sunday. AstroSage confirms: "Date of Birth: Sunday, October 11, 1942"
  const k = await calculateKundli(AMITABH);
  assert(k.panchang.vara.includes("Ravivara"), `Got: ${k.panchang.vara}`);
});

Deno.test("panchang: Amitabh — Nakshatra is Swati", async () => {
  // AstroSage: Moon in Swati at birth.
  const k = await calculateKundli(AMITABH);
  assertEquals(k.panchang.nakshatra, "Swati");
});

Deno.test("panchang: Amitabh — Tithi is Shukla Paksha Dwitiya", async () => {
  // Engine output validated. Shukla Dwitiya for this date.
  const k = await calculateKundli(AMITABH);
  assertEquals(k.panchang.tithi, "Shukla Paksha Dwitiya");
});

Deno.test("panchang: Amitabh — Yoga is Vishkambha", async () => {
  // Drik Panchang (11 Oct 1942, Allahabad): Vaidhriti upto 08:34 AM, then
  // Vishkambha for the rest of the day. Birth is 16:00, so the prevailing
  // nitya yoga is Vishkambha. Yoga uses sidereal Sun + sidereal Moon (nirayana).
  const k = await calculateKundli(AMITABH);
  assertEquals(k.panchang.yoga, "Vishkambha");
});

Deno.test("panchang: Amitabh — Karana is Balava", async () => {
  const k = await calculateKundli(AMITABH);
  assertEquals(k.panchang.karana, "Balava");
});

// ─── Rajiv: 20 Aug 1944, Sunday ────────────────────────────────────────────

Deno.test("panchang: Rajiv — Vara is Sunday (Ravivara)", async () => {
  // 20 Aug 1944 is a Sunday (standard calendar).
  const k = await calculateKundli(RAJIV);
  assert(k.panchang.vara.includes("Ravivara"), `Got: ${k.panchang.vara}`);
});

Deno.test("panchang: Rajiv — Nakshatra is Purva Phalguni", async () => {
  // Moon in Purva Phalguni. AstroSage: Moon in "Purvaphalgini" pada 2.
  const k = await calculateKundli(RAJIV);
  assertEquals(k.panchang.nakshatra, "Purva Phalguni");
});

Deno.test("panchang: Rajiv — Tithi is Shukla Paksha Dwitiya", async () => {
  const k = await calculateKundli(RAJIV);
  assertEquals(k.panchang.tithi, "Shukla Paksha Dwitiya");
});

// ─── Ramji: 25 Nov 1952 — nirayana-yoga regression ──────────────────────────

Deno.test("panchang: Ramji — Yoga is Harshana (sidereal, not tropical Vyatipata)", async () => {
  // Drik Panchang (25 Nov 1952, Ahmedabad): Harshana upto 10:58 PM. Birth is
  // 06:01:43, so the nitya yoga is Harshana. Summing tropical longitudes (the
  // old bug) gave Vyatipata — wrong by ~3 yogas. Guards against regressing to it.
  const k = await calculateKundli(RAMJI);
  assertEquals(k.panchang.yoga, "Harshana");
});

// ─── Structural tests ───────────────────────────────────────────────────────

Deno.test("panchang: all five elements are non-empty strings", async () => {
  const k = await calculateKundli(DEV_CHART);
  for (const field of ["tithi", "vara", "nakshatra", "yoga", "karana"] as const) {
    assert(typeof k.panchang[field] === "string", `${field} should be string`);
    assert(k.panchang[field].length > 0, `${field} should not be empty`);
  }
});

Deno.test("panchang: sunrise and sunset are present", async () => {
  const k = await calculateKundli(DEV_CHART);
  assert(typeof k.panchang.sunrise === "string", "sunrise should be string");
  assert(typeof k.panchang.sunset === "string", "sunset should be string");
  // Basic format check: HH:MM
  assert(/^\d{1,2}:\d{2}$/.test(k.panchang.sunrise), `sunrise format: ${k.panchang.sunrise}`);
  assert(/^\d{1,2}:\d{2}$/.test(k.panchang.sunset), `sunset format: ${k.panchang.sunset}`);
});

Deno.test("panchang: Vara matches day-of-week for known dates", async () => {
  // Cross-check: three charts on known days
  const charts: [BirthDetails, string][] = [
    [DEV_CHART, "Mangalavara"],   // Tuesday
    [AMITABH, "Ravivara"],        // Sunday
    [RAJIV, "Ravivara"],          // Sunday
  ];
  for (const [bd, expectedVara] of charts) {
    const k = await calculateKundli(bd);
    assert(k.panchang.vara.includes(expectedVara), `${bd.fullName}: ${k.panchang.vara}`);
  }
});
