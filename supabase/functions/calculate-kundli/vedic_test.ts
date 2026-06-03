/**
 * Golden-snapshot tests for vedic.ts — sidereal conversion, nakshatra/pada,
 * whole-sign houses, dignity, combustion.
 *
 * Reference values: AstroSage.com celebrity kundli pages (Lahiri ayanamsa)
 * cross-checked with Swiss Ephemeris (pyswisseph 2.10, SIDM_LAHIRI, Moshier).
 * See parity_test.ts for the full SwissEph reference set.
 *
 * Run with: deno test supabase/functions/calculate-kundli/vedic_test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ayanamsa,
  toSidereal,
  signNumber,
  signName,
  signDegree,
  nakshatraIndex,
  nakshatraName,
  nakshatraPada,
  wholeSignHouse,
  dignity,
  isCombust,
  getSignLord,
} from "./vedic.ts";
import { julianDay, julianCenturies } from "./astronomy.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";

// ─── Reference charts ───────────────────────────────────────────────────────

/** Dev Chart — Swiss Ephemeris validated (parity_test.ts Chart 1).
 *  Born 23 Aug 1983 15:35 IST, Patan Gujarat (23.85°N, 72.12°E).
 *  AstroSage: Dhanu Lagna, Moon in Kumbha/Dhanishtha. */
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

/** Amitabh Bachchan — AstroSage celebrity kundli (Kundli Sangraha, Bhat).
 *  Born 11 Oct 1942 16:00 IST, Allahabad (25°26'N, 81°51'E).
 *  AstroSage: Kumbha Lagna, Moon in Tula/Swati, Rahu Maha at birth. */
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

// ─── Ayanamsa ───────────────────────────────────────────────────────────────

Deno.test("vedic: Lahiri ayanamsa at J2000.0 = 23.857°", () => {
  // Swiss Ephemeris SE_SIDM_LAHIRI at J2000.0 (JD 2451545.0) = 23.857092°
  const jd = 2451545.0;
  const aya = ayanamsa("lahiri", jd);
  assertAlmostEquals(aya, 23.857092, 0.001);
});

Deno.test("vedic: Lahiri ayanamsa 23 Aug 1983 ≈ 23.62°", () => {
  // JD for 23 Aug 1983 10:05 UT (15:35 IST − 5.5h)
  const jd = julianDay(1983, 8, 23, 10, 5, 0);
  const aya = ayanamsa("lahiri", jd);
  // SwissEph reference: ~23.62° for mid-1983
  assertAlmostEquals(aya, 23.62, 0.05);
});

Deno.test("vedic: Raman ayanamsa at J2000.0 ≈ 22.45°", () => {
  const aya = ayanamsa("raman", 2451545.0);
  assertAlmostEquals(aya, 22.45, 0.01);
});

// ─── toSidereal ─────────────────────────────────────────────────────────────

Deno.test("vedic: toSidereal subtracts ayanamsa and wraps", () => {
  // Tropical 10° with ayanamsa 23.857° → sidereal 346.143°
  const sid = toSidereal(10, 23.857);
  assertAlmostEquals(sid, 346.143, 0.001);
});

Deno.test("vedic: toSidereal normal range", () => {
  // Tropical 150° − 23.857° = 126.143°
  const sid = toSidereal(150, 23.857);
  assertAlmostEquals(sid, 126.143, 0.001);
});

// ─── Sign helpers ───────────────────────────────────────────────────────────

Deno.test("vedic: signNumber for 0° = 1 (Mesha)", () => {
  assertEquals(signNumber(0), 1);
});

Deno.test("vedic: signNumber for 29.99° = 1, 30° = 2", () => {
  assertEquals(signNumber(29.99), 1);
  assertEquals(signNumber(30), 2);
});

Deno.test("vedic: signNumber for 359° = 12 (Meena)", () => {
  assertEquals(signNumber(359), 12);
});

Deno.test("vedic: signName returns correct names", () => {
  assertEquals(signName(1), "Mesha");
  assertEquals(signName(4), "Karka");
  assertEquals(signName(9), "Dhanu");
  assertEquals(signName(12), "Meena");
});

Deno.test("vedic: signDegree extracts degree within sign", () => {
  assertAlmostEquals(signDegree(126.09), 6.09, 0.01);
  assertAlmostEquals(signDegree(303.85), 3.85, 0.01);
});

// ─── Nakshatra ──────────────────────────────────────────────────────────────

Deno.test("vedic: nakshatraIndex for Moon at 303.85° = 22 (Dhanishtha)", () => {
  // Dev Chart Moon at 303.85° sidereal (Kumbha 3.85°)
  // Dhanishtha spans 293°20' (293.333°) to 306°40' (306.667°) → index 22
  // AstroSage confirms: Moon in Dhanishtha for Dev Chart.
  assertEquals(nakshatraIndex(303.85), 22);
});

Deno.test("vedic: nakshatraName(22) = Dhanishtha", () => {
  assertEquals(nakshatraName(22), "Dhanishtha");
});

Deno.test("vedic: nakshatraPada for Moon at 303.85° = pada 4", () => {
  // Dhanishtha: 293.333°–306.667° (span 13.333°). Moon at 303.85°.
  // Within nakshatra: 303.85 − 293.333 = 10.517°; pada = floor(10.517/3.333)+1 = 4
  // AstroSage confirms: Dhanishtha pada 4 for Dev Chart Moon.
  assertEquals(nakshatraPada(303.85), 4);
});

Deno.test("vedic: Amitabh Moon nakshatra = Swati (index 14), pada 2", () => {
  // AstroSage: Moon at Tula 10°54'35" → sidereal lon ≈ 190.90°
  // Swati spans 186°40' (186.667°) to 200° → index 14
  // Within: 190.90 − 186.667 = 4.233; pada = floor(4.233/3.333)+1 = 2
  assertEquals(nakshatraIndex(190.90), 14);
  assertEquals(nakshatraName(14), "Swati");
  assertEquals(nakshatraPada(190.90), 2);
});

// ─── Whole-Sign Houses ──────────────────────────────────────────────────────

Deno.test("vedic: wholeSignHouse — same sign = house 1", () => {
  assertEquals(wholeSignHouse(9, 9), 1);
});

Deno.test("vedic: wholeSignHouse — Dev Chart Mars in Karka (4) from Dhanu (9) = H8", () => {
  // AstroSage/Swiss Eph: Mars in sign 4 (Karka), Asc sign 9 (Dhanu) → house 8
  assertEquals(wholeSignHouse(4, 9), 8);
});

Deno.test("vedic: wholeSignHouse — Amitabh Jupiter in Karka (4) from Kumbha (11) = H6", () => {
  // AstroSage: Jupiter in Cancer, Asc Aquarius → house 6
  assertEquals(wholeSignHouse(4, 11), 6);
});

Deno.test("vedic: wholeSignHouse wraps correctly", () => {
  // Planet in sign 1 (Mesha), Asc sign 12 (Meena) → house 2
  assertEquals(wholeSignHouse(1, 12), 2);
  // Planet in sign 12, Asc sign 1 → house 12
  assertEquals(wholeSignHouse(12, 1), 12);
});

// ─── Dignity ────────────────────────────────────────────────────────────────

Deno.test("vedic: dignity — Dev Chart Mercury exalted in Kanya", () => {
  // AstroSage: Mercury in Kanya (sign 6) at 3.05° → exalted
  assertEquals(dignity("mercury", 6, 3.05), "exalted");
});

Deno.test("vedic: dignity — Dev Chart Mars debilitated in Karka", () => {
  // AstroSage: Mars in Karka (sign 4) at 12.63° → debilitated
  assertEquals(dignity("mars", 4, 12.63), "debilitated");
});

Deno.test("vedic: dignity — Dev Chart Saturn exalted in Tula", () => {
  // AstroSage: Saturn in Tula (sign 7) at 6.29° → exalted
  assertEquals(dignity("saturn", 7, 6.29), "exalted");
});

Deno.test("vedic: dignity — Dev Chart Sun mooltrikona in Simha", () => {
  // AstroSage: Sun in Simha (sign 5) at 6.09° → mooltrikona (0°–20° Simha)
  assertEquals(dignity("sun", 5, 6.09), "mooltrikona");
});

Deno.test("vedic: dignity — Amitabh Venus debilitated in Kanya", () => {
  // AstroSage: Venus in Kanya (sign 6) at 15.25° → debilitated
  assertEquals(dignity("venus", 6, 15.25), "debilitated");
});

Deno.test("vedic: dignity — Amitabh Jupiter exalted in Karka", () => {
  // AstroSage: Jupiter in Karka (sign 4) at 0.55° → exalted
  assertEquals(dignity("jupiter", 4, 0.55), "exalted");
});

Deno.test("vedic: dignity — rahu/ketu return undefined", () => {
  assertEquals(dignity("rahu", 5, 10), undefined);
  assertEquals(dignity("ketu", 11, 10), undefined);
});

Deno.test("vedic: dignity — friend/enemy/neutral", () => {
  // Moon in Kumbha (sign 11, lord Saturn). Moon's friendships: enemies = []
  // Saturn is neutral to Moon → 'neutral'
  assertEquals(dignity("moon", 11, 3.85), "neutral");

  // Venus in Simha (sign 5, lord Sun). Venus enemies = [sun, moon] → 'enemy'
  assertEquals(dignity("venus", 5, 8.9), "enemy");

  // Jupiter in Vrischika (sign 8, lord Mars). Jupiter friends = [sun, moon, mars] → 'friend'
  assertEquals(dignity("jupiter", 8, 8.39), "friend");
});

// ─── Sign lordship ──────────────────────────────────────────────────────────

Deno.test("vedic: getSignLord — standard Parashari lordships", () => {
  assertEquals(getSignLord(1), "mars");     // Mesha
  assertEquals(getSignLord(2), "venus");    // Vrishabha
  assertEquals(getSignLord(4), "moon");     // Karka
  assertEquals(getSignLord(5), "sun");      // Simha
  assertEquals(getSignLord(9), "jupiter");  // Dhanu
  assertEquals(getSignLord(10), "saturn");  // Makara
});

// ─── Combustion ─────────────────────────────────────────────────────────────

Deno.test("vedic: isCombust — Dev Chart Venus combust (close to Sun)", () => {
  // Dev Chart: Sun at 126.09°, Venus at 128.90° → diff = 2.81° < 10° orb
  assertEquals(isCombust("venus", 128.90, 126.09, true), true);
});

Deno.test("vedic: isCombust — Amitabh Mars combust", () => {
  // AstroSage confirms Mars combust. Sun at 174.42°, Mars at 172.63° → diff 1.79° < 17°
  assertEquals(isCombust("mars", 172.63, 174.42, false), true);
});

Deno.test("vedic: isCombust — Amitabh Mercury combust (retrograde, orb = 12°)", () => {
  // AstroSage: Mercury retrograde, combust. Sun at 174.42°, Mercury at 173.61°
  // diff = 0.81° < 12° (retro orb)
  assertEquals(isCombust("mercury", 173.61, 174.42, true), true);
});

Deno.test("vedic: isCombust — Sun/Rahu/Ketu are never combust", () => {
  assertEquals(isCombust("sun", 126, 126, false), false);
  assertEquals(isCombust("rahu", 126, 126, false), false);
  assertEquals(isCombust("ketu", 126, 126, false), false);
});

Deno.test("vedic: isCombust — planet far from Sun is not combust", () => {
  // Saturn with 15° orb, diff = 60° → not combust
  assertEquals(isCombust("saturn", 60, 120, false), false);
});

// ─── Integration: calculateKundli D1 positions ─────────────────────────────

Deno.test("vedic: Dev Chart D1 positions match AstroSage/SwissEph", async () => {
  // Reference: Swiss Ephemeris (pyswisseph 2.10, Lahiri), cross-checked
  // with AstroSage kundli for 23 Aug 1983 15:35 IST Patan.
  const k = await calculateKundli(DEV_CHART);
  const d1 = k.divisionalCharts.find((c: { varga: string }) => c.varga === "D1")!;

  interface PlanetRef {
    planet: string;
    sign: number;
    nakshatra: string;
    pada: number;
    house: number;
  }
  const expected: PlanetRef[] = [
    { planet: "ascendant", sign: 9,  nakshatra: "Mula",              pada: 3, house: 1 },
    { planet: "sun",       sign: 5,  nakshatra: "Magha",             pada: 2, house: 9 },
    { planet: "moon",      sign: 11, nakshatra: "Dhanishtha",        pada: 4, house: 3 },
    { planet: "mars",      sign: 4,  nakshatra: "Pushya",            pada: 3, house: 8 },
    { planet: "mercury",   sign: 6,  nakshatra: "Uttara Phalguni",   pada: 2, house: 10 },
    { planet: "jupiter",   sign: 8,  nakshatra: "Anuradha",          pada: 2, house: 12 },
    { planet: "venus",     sign: 5,  nakshatra: "Magha",             pada: 3, house: 9 },
    { planet: "saturn",    sign: 7,  nakshatra: "Chitra",            pada: 4, house: 11 },
    { planet: "rahu",      sign: 2,  nakshatra: "Mrigashira",        pada: 2, house: 6 },
    { planet: "ketu",      sign: 8,  nakshatra: "Jyeshtha",          pada: 4, house: 12 },
  ];

  for (const exp of expected) {
    const p = d1.planets.find((pp: { planet: string }) => pp.planet === exp.planet);
    assertEquals(p?.signNumber, exp.sign, `${exp.planet} sign`);
    assertEquals(p?.nakshatra, exp.nakshatra, `${exp.planet} nakshatra`);
    assertEquals(p?.nakshatraPada, exp.pada, `${exp.planet} pada`);
    assertEquals(p?.houseNumber, exp.house, `${exp.planet} house`);
  }
});

Deno.test("vedic: Amitabh D1 positions match AstroSage celebrity kundli", async () => {
  // Reference: AstroSage.com/celebrity-horoscope/amitabh-bachchan-birth-chart.asp
  // Lahiri ayanamsa, 11 Oct 1942 16:00 IST, Allahabad.
  const k = await calculateKundli(AMITABH);
  const d1 = k.divisionalCharts.find((c: { varga: string }) => c.varga === "D1")!;

  interface PlanetRef {
    planet: string;
    sign: number;
    nakshatra: string;
    pada: number;
    dignity?: string;
  }
  const expected: PlanetRef[] = [
    { planet: "ascendant", sign: 11, nakshatra: "Purva Bhadrapada", pada: 1 },
    { planet: "sun",       sign: 6,  nakshatra: "Chitra",           pada: 1, dignity: "neutral" },
    { planet: "moon",      sign: 7,  nakshatra: "Swati",            pada: 2, dignity: "neutral" },
    { planet: "mars",      sign: 6,  nakshatra: "Hasta",            pada: 4, dignity: "enemy" },
    { planet: "mercury",   sign: 6,  nakshatra: "Chitra",           pada: 1, dignity: "exalted" },
    { planet: "jupiter",   sign: 4,  nakshatra: "Punarvasu",        pada: 4, dignity: "exalted" },
    { planet: "venus",     sign: 6,  nakshatra: "Hasta",            pada: 2, dignity: "debilitated" },
    { planet: "saturn",    sign: 2,  nakshatra: "Rohini",           pada: 3, dignity: "friend" },
    { planet: "rahu",      sign: 5,  nakshatra: "Magha",            pada: 3 },
    { planet: "ketu",      sign: 11, nakshatra: "Shatabhisha",      pada: 1 },
  ];

  for (const exp of expected) {
    const p = d1.planets.find((pp: { planet: string }) => pp.planet === exp.planet);
    assertEquals(p?.signNumber, exp.sign, `${exp.planet} sign`);
    assertEquals(p?.nakshatra, exp.nakshatra, `${exp.planet} nakshatra`);
    assertEquals(p?.nakshatraPada, exp.pada, `${exp.planet} pada`);
    if (exp.dignity) {
      assertEquals(p?.dignity, exp.dignity, `${exp.planet} dignity`);
    }
  }
});
