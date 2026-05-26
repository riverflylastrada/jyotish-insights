/**
 * Parity Test Harness — validates the calculateKundli engine against
 * Swiss Ephemeris reference values (the same engine used by AstroSage and JHora).
 *
 * Reference values computed via pyswisseph 2.10 with Lahiri ayanamsa (SIDM_LAHIRI)
 * and Moshier ephemeris. Cross-checked against AstroSage.com online kundli.
 *
 * Run with: deno test supabase/functions/calculate-kundli/parity_test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";

// ─── Tolerances ─────────────────────────────────────────────────────────────

/** Position tolerance in degrees.
 *  VSOP87 (Bretagnon & Francou 1988) gives sub-arcminute accuracy for
 *  Sun and planets (Mercury–Saturn). Tolerance set to 0.05° (3 arcmin)
 *  to validate parity with Swiss Ephemeris. */
const POS_TOLERANCE_DEG = 0.05;

/** Moon tolerance: ELP-2000/82 (Meeus Ch. 47, ~60 terms) gives ~10″ accuracy.
 *  Set to 0.1° (6 arcmin) to validate parity with Swiss Ephemeris. */
const MOON_TOLERANCE_DEG = 0.1;

/** Ascendant tolerance: with true obliquity (IAU nutation) and apparent
 *  sidereal time, ascendant matches Swiss Ephemeris within ~0.02°. */
const ASC_TOLERANCE_DEG = 0.02;

// ─── Reference chart definitions ────────────────────────────────────────────

interface ReferenceChart {
  label: string;
  source: string;
  birthDetails: BirthDetails;
  expected: {
    ascSign: number;
    ascDeg: number;
    planets: Record<string, { sign: number; deg: number; retro?: boolean }>;
    charaKarakas: Array<{ planet: string; karaka: string }>;
    /** Chara Dasha (KN Rao): first 12 maha-sign dashas */
    charaDasha?: Array<{ sign: number; durationYears: number }>;
    /** Placidus cusps (sidereal) — sign + degree for each cusp 1–12 */
    placidusCusps?: Array<{ cusp: number; sign: number; deg: number }>;
    /** Shadbala total Rupas per planet (from JHora / PyJHora v4.8.5, Lahiri) */
    shadbalaRupas?: Record<string, number>;
    /** Shadbala rank (strongest → weakest) */
    shadbalaRank?: string[];
    /** Bhava Bala total Rupas per house 1–12 (PyJHora v4.8.5, Lahiri) */
    bhavaBalaRupas?: Record<number, number>;
    /** Bhava Bala rank (strongest → weakest house) */
    bhavaBalaRank?: number[];
    /** Yogini Dasha: first 3 Maha lords + durations, and current Maha lord (PyJHora v4.8.5) */
    yoginiDasha?: {
      first3: Array<{ planet: string; durationYears: number }>;
      currentMahaLord: string;
    };
    /** Ashtottari Dasha: first 3 Maha lords + durations, and current Maha lord (PyJHora v4.8.5) */
    ashtottariDasha?: {
      first3: Array<{ planet: string; durationYears: number }>;
      currentMahaLord: string;
    };
    /** Chara Dasha antardasha: first Maha's 12 antardasha signs (KN Rao rule) */
    charaDashaAntar?: {
      firstMahaAntarSigns: number[];
      antarDurationYears: number;
    };
  };
}

const REFERENCE_CHARTS: ReferenceChart[] = [
  // ── Chart 1: Dev chart (user-specified reference) ──────────────────────
  {
    label: "Dev Chart (Dhanu Lagna)",
    source:
      "Swiss Ephemeris (pyswisseph 2.10, Lahiri SIDM_LAHIRI, Moshier). " +
      "Born 23 Aug 1983 15:35 IST, Patan Gujarat (23.85°N, 72.12°E). " +
      "Cross-ref: user confirmed Dhanu Lagna + Kumbha Moon ~3.8°.",
    birthDetails: {
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
    },
    expected: {
      ascSign: 9,   // Dhanu
      ascDeg: 9.559,
      planets: {
        sun:     { sign: 5, deg: 6.0888 },
        moon:    { sign: 11, deg: 3.8538 },
        mars:    { sign: 4, deg: 12.6293 },
        mercury: { sign: 6, deg: 3.0465 },
        jupiter: { sign: 8, deg: 8.3870 },
        venus:   { sign: 5, deg: 8.8930, retro: true },
        saturn:  { sign: 7, deg: 6.2863 },
        rahu:    { sign: 2, deg: 27.8146, retro: true },
        ketu:    { sign: 8, deg: 27.8146, retro: true },
      },
      charaKarakas: [
        { planet: "mars", karaka: "AK" },
        { planet: "venus", karaka: "AmK" },
        { planet: "jupiter", karaka: "BK" },
        { planet: "saturn", karaka: "MK" },
        { planet: "sun", karaka: "PK" },
        { planet: "moon", karaka: "GK" },
        { planet: "mercury", karaka: "DK" },
        { planet: "rahu", karaka: "Karaka8" },
      ],
      // Chara Dasha (KN Rao, 9th-house even-footed direction, PVN Rao co-lord)
      // 9th from Dhanu = Simha (even-footed) → REVERSE
      charaDasha: [
        { sign: 9, durationYears: 11 },   // Dhanu: Jupiter@8, not-EF → 8−9+12=11
        { sign: 8, durationYears: 8 },    // Vrischika: Ketu@8 (in sign) → use Mars@4, not-EF → 4−8+12=8
        { sign: 7, durationYears: 10 },   // Tula: Venus@5, not-EF → 5−7+12=10
        { sign: 6, durationYears: 12 },   // Kanya: Mercury@6, own sign
        { sign: 5, durationYears: 12 },   // Simha: Sun@5, own sign
        { sign: 4, durationYears: 5 },    // Karka: Moon@11, EF → 4−11+12=5
        { sign: 3, durationYears: 3 },    // Mithuna: Mercury@6, not-EF → 6−3=3
        { sign: 2, durationYears: 3 },    // Vrishabha: Venus@5, not-EF → 5−2=3
        { sign: 1, durationYears: 3 },    // Mesha: Mars@4, not-EF → 4−1=3
        { sign: 12, durationYears: 4 },   // Meena: Jupiter@8, EF → 12−8=4
        { sign: 11, durationYears: 4 },   // Kumbha: stronger=Saturn@7, EF → 11−7=4
        { sign: 10, durationYears: 3 },   // Makara: Saturn@7, EF → 10−7=3
      ],
      placidusCusps: [
        { cusp: 1, sign: 9, deg: 9.559 },
        { cusp: 2, sign: 10, deg: 12.762 },
        { cusp: 3, sign: 11, deg: 18.438 },
        { cusp: 4, sign: 12, deg: 22.119 },
        { cusp: 5, sign: 1, deg: 20.880 },
        { cusp: 6, sign: 2, deg: 15.746 },
        { cusp: 7, sign: 3, deg: 9.559 },
        { cusp: 8, sign: 4, deg: 12.762 },
        { cusp: 9, sign: 5, deg: 18.438 },
        { cusp: 10, sign: 6, deg: 22.119 },
        { cusp: 11, sign: 7, deg: 20.880 },
        { cusp: 12, sign: 8, deg: 15.746 },
      ],
      // JHora (PyJHora v4.8.5, Lahiri) — authoritative reference
      shadbalaRupas: { sun: 8.07, moon: 7.82, mars: 6.07, mercury: 8.75, jupiter: 6.77, venus: 6.84, saturn: 6.32 },
      shadbalaRank: ["mercury", "sun", "moon", "venus", "jupiter", "saturn", "mars"],
      // PyJHora v4.8.5 (Lahiri) — Bhava Bala (house strength in Rupas)
      bhavaBalaRupas: { 1: 7.04, 2: 7.11, 3: 6.98, 4: 7.56, 5: 7.04, 6: 6.50, 7: 6.82, 8: 9.10, 9: 8.65, 10: 8.61, 11: 9.42, 12: 7.01 },
      bhavaBalaRank: [11, 8, 9, 10, 4, 2, 1, 5, 12, 3, 7, 6],
      // PyJHora v4.8.5 (Lahiri) — Yogini & Ashtottari
      yoginiDasha: {
        first3: [
          { planet: "Sun",     durationYears: 2 },
          { planet: "Jupiter", durationYears: 3 },
          { planet: "Mars",    durationYears: 4 },
        ],
        currentMahaLord: "Mars",
      },
      ashtottariDasha: {
        first3: [
          { planet: "Jupiter", durationYears: 19 },
          { planet: "Rahu",    durationYears: 12 },
          { planet: "Venus",   durationYears: 21 },
        ],
        currentMahaLord: "Venus",
      },
      // Chara Dasha antardasha — KN Rao rule: rotate maha progression by 1
      // REVERSE progression: [9,8,7,6,5,4,3,2,1,12,11,10] → antardasha starts at index 1
      charaDashaAntar: {
        firstMahaAntarSigns: [8, 7, 6, 5, 4, 3, 2, 1, 12, 11, 10, 9],
        antarDurationYears: 11 / 12,  // 0.9167
      },
    },
  },
  // ── Chart 2: Rajiv Gandhi ──────────────────────────────────────────────
  {
    label: "Rajiv Gandhi (Simha Lagna)",
    source:
      "Swiss Ephemeris (pyswisseph 2.10, Lahiri, Moshier). " +
      "Born 20 Aug 1944 08:11 IST, Mumbai (19.076°N, 72.878°E). " +
      "Widely published chart — Simha Lagna with stellium in Leo.",
    birthDetails: {
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
    },
    expected: {
      ascSign: 5,   // Simha
      ascDeg: 28.809,
      planets: {
        sun:     { sign: 5, deg: 3.8606 },
        moon:    { sign: 5, deg: 17.6449 },
        mars:    { sign: 6, deg: 1.2216 },
        mercury: { sign: 5, deg: 28.5840 },
        jupiter: { sign: 5, deg: 12.2087 },
        venus:   { sign: 5, deg: 18.7047 },
        saturn:  { sign: 3, deg: 14.2198 },
        rahu:    { sign: 4, deg: 2.8090, retro: true },
        ketu:    { sign: 10, deg: 2.8090, retro: true },
      },
      charaKarakas: [
        { planet: "mercury", karaka: "AK" },
        { planet: "rahu", karaka: "AmK" },
        { planet: "venus", karaka: "BK" },
        { planet: "moon", karaka: "MK" },
        { planet: "saturn", karaka: "PK" },
        { planet: "jupiter", karaka: "GK" },
        { planet: "sun", karaka: "DK" },
        { planet: "mars", karaka: "Karaka8" },
      ],
      // Chara Dasha (KN Rao, 9th-house even-footed direction, PVN Rao co-lord)
      // 9th from Simha = Mesha (not even-footed) → FORWARD
      charaDasha: [
        { sign: 5, durationYears: 12 },   // Simha: Sun@5, own sign
        { sign: 6, durationYears: 1 },    // Kanya: Mercury@5, EF → 6−5=1
        { sign: 7, durationYears: 10 },   // Tula: Venus@5, not-EF → 5−7+12=10
        { sign: 8, durationYears: 2 },    // Vrischika: stronger=Ketu@10, not-EF → 10−8=2
        { sign: 9, durationYears: 8 },    // Dhanu: Jupiter@5, not-EF → 5−9+12=8
        { sign: 10, durationYears: 7 },   // Makara: Saturn@3, EF → 10−3=7
        { sign: 11, durationYears: 8 },   // Kumbha: stronger=Saturn@3, EF → 11−3=8
        { sign: 12, durationYears: 7 },   // Meena: Jupiter@5, EF → 12−5=7
        { sign: 1, durationYears: 5 },    // Mesha: Mars@6, not-EF → 6−1=5
        { sign: 2, durationYears: 3 },    // Vrishabha: Venus@5, not-EF → 5−2=3
        { sign: 3, durationYears: 2 },    // Mithuna: Mercury@5, not-EF → 5−3=2
        { sign: 4, durationYears: 11 },   // Karka: Moon@5, EF → 4−5+12=11
      ],
      placidusCusps: [
        { cusp: 1, sign: 5, deg: 28.809 },
        { cusp: 2, sign: 6, deg: 28.050 },
        { cusp: 3, sign: 7, deg: 28.605 },
        { cusp: 4, sign: 8, deg: 29.055 },
        { cusp: 5, sign: 9, deg: 29.196 },
        { cusp: 6, sign: 10, deg: 29.310 },
        { cusp: 7, sign: 11, deg: 28.809 },
        { cusp: 8, sign: 12, deg: 28.050 },
        { cusp: 9, sign: 1, deg: 28.605 },
        { cusp: 10, sign: 2, deg: 29.055 },
        { cusp: 11, sign: 3, deg: 29.196 },
        { cusp: 12, sign: 4, deg: 29.310 },
      ],
      // JHora (PyJHora v4.8.5, Lahiri) — authoritative reference
      shadbalaRupas: { sun: 10.02, moon: 4.57, mars: 6.06, mercury: 8.62, jupiter: 8.00, venus: 4.37, saturn: 5.85 },
      shadbalaRank: ["sun", "mercury", "jupiter", "mars", "saturn", "moon", "venus"],
      // PyJHora v4.8.5 (Lahiri) — Bhava Bala (house strength in Rupas)
      bhavaBalaRupas: { 1: 10.44, 2: 9.50, 3: 5.04, 4: 6.72, 5: 8.50, 6: 6.71, 7: 5.77, 8: 8.75, 9: 6.90, 10: 5.37, 11: 9.29, 12: 4.90 },
      bhavaBalaRank: [1, 2, 11, 8, 5, 9, 4, 6, 7, 10, 3, 12],
      yoginiDasha: {
        first3: [
          { planet: "Saturn",  durationYears: 6 },
          { planet: "Venus",   durationYears: 7 },
          { planet: "Rahu",    durationYears: 8 },
        ],
        currentMahaLord: "Venus",
      },
      ashtottariDasha: {
        first3: [
          { planet: "Moon",    durationYears: 15 },
          { planet: "Mars",    durationYears: 8 },
          { planet: "Mercury", durationYears: 17 },
        ],
        currentMahaLord: "Venus",
      },
      // Chara Dasha antardasha — KN Rao rule: rotate maha progression by 1
      // Progression: [5,6,7,8,9,10,11,12,1,2,3,4] → antardasha starts at index 1
      // Matches PyJHora chara_method=1 exactly for Rajiv
      charaDashaAntar: {
        firstMahaAntarSigns: [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5],
        antarDurationYears: 12 / 12,  // 1.0
      },
    },
  },
  // ── Chart 3: Amitabh Bachchan ──────────────────────────────────────────
  {
    label: "Amitabh Bachchan (Kumbha Lagna)",
    source:
      "Swiss Ephemeris (pyswisseph 2.10, Lahiri, Moshier). " +
      "Born 11 Oct 1942 16:00 IST, Allahabad (25.436°N, 81.846°E). " +
      "Widely published chart — Kumbha Lagna.",
    birthDetails: {
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
    },
    expected: {
      ascSign: 11,  // Kumbha
      ascDeg: 21.560,
      planets: {
        sun:     { sign: 6, deg: 24.4199 },
        moon:    { sign: 7, deg: 10.9048 },
        mars:    { sign: 6, deg: 22.6283 },
        mercury: { sign: 6, deg: 23.6053, retro: true },
        jupiter: { sign: 4, deg: 0.5388 },
        venus:   { sign: 6, deg: 15.2389 },
        saturn:  { sign: 2, deg: 19.2273, retro: true },
        rahu:    { sign: 5, deg: 8.7747, retro: true },
        ketu:    { sign: 11, deg: 8.7747, retro: true },
      },
      charaKarakas: [
        { planet: "sun", karaka: "AK" },
        { planet: "mercury", karaka: "AmK" },
        { planet: "mars", karaka: "BK" },
        { planet: "rahu", karaka: "MK" },
        { planet: "saturn", karaka: "PK" },
        { planet: "venus", karaka: "GK" },
        { planet: "moon", karaka: "DK" },
        { planet: "jupiter", karaka: "Karaka8" },
      ],
      // Chara Dasha (KN Rao, 9th-house even-footed direction, PVN Rao co-lord)
      // 9th from Kumbha = Tula (not even-footed) → FORWARD
      charaDasha: [
        { sign: 11, durationYears: 9 },   // Kumbha: stronger=Saturn@2, EF → 11−2=9
        { sign: 12, durationYears: 8 },   // Meena: Jupiter@4, EF → 12−4=8
        { sign: 1, durationYears: 5 },    // Mesha: Mars@6, not-EF → 6−1=5
        { sign: 2, durationYears: 4 },    // Vrishabha: Venus@6, not-EF → 6−2=4
        { sign: 3, durationYears: 3 },    // Mithuna: Mercury@6, not-EF → 6−3=3
        { sign: 4, durationYears: 9 },    // Karka: Moon@7, EF → 4−7+12=9
        { sign: 5, durationYears: 11 },   // Simha: Sun@6, EF → 5−6+12=11
        { sign: 6, durationYears: 12 },   // Kanya: Mercury@6, own sign
        { sign: 7, durationYears: 11 },   // Tula: Venus@6, not-EF → 6−7+12=11
        { sign: 8, durationYears: 10 },   // Vrischika: stronger=Mars@6, not-EF → 6−8+12=10
        { sign: 9, durationYears: 7 },    // Dhanu: Jupiter@4, not-EF → 4−9+12=7
        { sign: 10, durationYears: 8 },   // Makara: Saturn@2, EF → 10−2=8
      ],
      placidusCusps: [
        { cusp: 1, sign: 11, deg: 21.560 },
        { cusp: 2, sign: 1, deg: 0.322 },
        { cusp: 3, sign: 2, deg: 1.152 },
        { cusp: 4, sign: 2, deg: 26.579 },
        { cusp: 5, sign: 3, deg: 20.656 },
        { cusp: 6, sign: 4, deg: 17.429 },
        { cusp: 7, sign: 5, deg: 21.560 },
        { cusp: 8, sign: 7, deg: 0.322 },
        { cusp: 9, sign: 8, deg: 1.152 },
        { cusp: 10, sign: 8, deg: 26.579 },
        { cusp: 11, sign: 9, deg: 20.656 },
        { cusp: 12, sign: 10, deg: 17.429 },
      ],
      // JHora (PyJHora v4.8.5, Lahiri) — authoritative reference
      shadbalaRupas: { sun: 7.28, moon: 4.45, mars: 4.20, mercury: 7.54, jupiter: 8.03, venus: 5.86, saturn: 7.77 },
      shadbalaRank: ["jupiter", "saturn", "mercury", "sun", "venus", "moon", "mars"],
      // PyJHora v4.8.5 (Lahiri) — Bhava Bala (house strength in Rupas)
      bhavaBalaRupas: { 1: 8.76, 2: 8.73, 3: 4.36, 4: 6.01, 5: 7.87, 6: 5.13, 7: 7.78, 8: 7.71, 9: 6.44, 10: 4.80, 11: 9.03, 12: 8.10 },
      bhavaBalaRank: [11, 1, 2, 12, 5, 7, 8, 9, 4, 6, 10, 3],
      yoginiDasha: {
        first3: [
          { planet: "Sun",     durationYears: 2 },
          { planet: "Jupiter", durationYears: 3 },
          { planet: "Mars",    durationYears: 4 },
        ],
        currentMahaLord: "Mercury",
      },
      ashtottariDasha: {
        first3: [
          { planet: "Mars",    durationYears: 8 },
          { planet: "Mercury", durationYears: 17 },
          { planet: "Saturn",  durationYears: 10 },
        ],
        currentMahaLord: "Sun",
      },
      // Chara Dasha antardasha — KN Rao rule: rotate maha progression by 1
      // Progression: [11,12,1,2,3,4,5,6,7,8,9,10] → antardasha starts at index 1
      charaDashaAntar: {
        firstMahaAntarSigns: [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        antarDurationYears: 9 / 12,  // 0.75
      },
    },
  },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

function signName(n: number): string {
  const names = [
    "", "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena",
  ];
  return names[n] ?? "?";
}

// ─── Tests ──────────────────────────────────────────────────────────────────

for (const ref of REFERENCE_CHARTS) {
  const chart = calculateKundli(ref.birthDetails);
  const d1 = chart.divisionalCharts.find(c => c.varga === "D1")!;

  // ── Ascendant sign ──────────────────────────────────────────────────────
  Deno.test(`[${ref.label}] Ascendant sign = ${signName(ref.expected.ascSign)}`, () => {
    assertEquals(
      chart.ascendant.signNumber,
      ref.expected.ascSign,
      `Expected ${signName(ref.expected.ascSign)}, got ${signName(chart.ascendant.signNumber)}`,
    );
  });

  Deno.test(`[${ref.label}] Ascendant degree ≈ ${ref.expected.ascDeg.toFixed(2)}°`, () => {
    assertAlmostEquals(chart.ascendant.signDegree, ref.expected.ascDeg, ASC_TOLERANCE_DEG);
  });

  // ── Planet signs ────────────────────────────────────────────────────────
  for (const [pName, exp] of Object.entries(ref.expected.planets)) {
    const actual = d1.planets.find(p => p.planet === pName);

    Deno.test(`[${ref.label}] ${pName} sign = ${signName(exp.sign)}`, () => {
      assertEquals(
        actual?.signNumber,
        exp.sign,
        `${pName}: expected ${signName(exp.sign)}, got ${signName(actual?.signNumber ?? 0)}`,
      );
    });

    const tol = pName === "moon" ? MOON_TOLERANCE_DEG : POS_TOLERANCE_DEG;
    Deno.test(`[${ref.label}] ${pName} degree ≈ ${exp.deg.toFixed(2)}° (±${tol}°)`, () => {
      assertAlmostEquals(actual!.signDegree, exp.deg, tol);
    });

    if (exp.retro !== undefined) {
      Deno.test(`[${ref.label}] ${pName} retrograde = ${exp.retro}`, () => {
        assertEquals(actual?.isRetrograde, exp.retro);
      });
    }
  }

  // ── Chara Karakas (exact match) ─────────────────────────────────────────
  Deno.test(`[${ref.label}] Chara Karakas — ranking matches SwissEph`, () => {
    const karakas = chart.jaimini!.charaKarakas;
    for (const exp of ref.expected.charaKarakas) {
      const actual = karakas.find(k => k.karaka === exp.karaka);
      assertEquals(
        actual?.planet,
        exp.planet,
        `Karaka ${exp.karaka}: expected ${exp.planet}, got ${actual?.planet}`,
      );
    }
  });

  // ── Chara Dasha (when implemented — sign + duration exact) ─────────────
  if (ref.expected.charaDasha) {
    Deno.test(`[${ref.label}] Chara Dasha timeline (if implemented)`, () => {
      const timeline = chart.jaimini?.charaDasha?.timeline;
      if (!timeline) {
        // Stubbed — skip but note it. This is expected before Workstream 3.
        console.log(`  ⊘ Chara Dasha not yet implemented — skipping parity check`);
        return;
      }
      assertEquals(timeline.length, 12, "Expected 12 maha-sign dashas");
      for (let i = 0; i < ref.expected.charaDasha!.length; i++) {
        const exp = ref.expected.charaDasha![i];
        const act = timeline[i];
        assertEquals(
          act.sign,
          exp.sign,
          `Dasha #${i + 1}: expected sign ${exp.sign} (${signName(exp.sign)}), got ${act.sign} (${signName(act.sign)})`,
        );
        assertEquals(
          act.durationYears,
          exp.durationYears,
          `Dasha #${i + 1} (${signName(exp.sign)}): expected ${exp.durationYears} yrs, got ${act.durationYears} yrs`,
        );
      }
    });
  }

  // ── Chara Dasha antardasha (first Maha's 12 sub-periods) ───────────────
  if (ref.expected.charaDashaAntar) {
    Deno.test(`[${ref.label}] Chara Dasha first-Maha antardasha sequence`, () => {
      const timeline = chart.jaimini?.charaDasha?.timeline;
      if (!timeline) {
        console.log(`  ⊘ Chara Dasha not yet implemented — skipping`);
        return;
      }
      const firstMaha = timeline[0];
      assertEquals(firstMaha.children.length, 12, "First Maha should have 12 antardasha children");
      const expSigns = ref.expected.charaDashaAntar!.firstMahaAntarSigns;
      const expDur = ref.expected.charaDashaAntar!.antarDurationYears;
      for (let i = 0; i < 12; i++) {
        const a = firstMaha.children[i];
        assertEquals(
          a.sign,
          expSigns[i],
          `Antar #${i + 1}: expected sign ${expSigns[i]} (${signName(expSigns[i])}), got ${a.sign} (${signName(a.sign)})`,
        );
        assertAlmostEquals(
          a.durationYears,
          expDur,
          0.001,
          `Antar #${i + 1} (${signName(expSigns[i])}): expected ~${expDur.toFixed(4)} yrs, got ${a.durationYears} yrs`,
        );
      }
    });

    Deno.test(`[${ref.label}] Chara Dasha all Mahas have 12 antardashas`, () => {
      const timeline = chart.jaimini?.charaDasha?.timeline;
      if (!timeline) return;
      for (const maha of timeline) {
        assertEquals(
          maha.children.length,
          12,
          `${signName(maha.sign)} Maha should have 12 antardasha children, got ${maha.children.length}`,
        );
      }
    });
  }

  // ── Placidus cusps (when implemented — sign exact, degree within tolerance)
  if (ref.expected.placidusCusps) {
    Deno.test(`[${ref.label}] Placidus cusps (if implemented)`, () => {
      // cuspalSubLords is an optional field added by Workstream 2
      const kpData = chart.kp as Record<string, unknown> | undefined;
      const cusps = kpData?.cuspalSubLords as Array<{
        cusp: number; longitude: number; signLord: string; starLord: string; subLord: string;
      }> | undefined;
      if (!cusps) {
        console.log(`  ⊘ Placidus cusps not yet implemented — skipping parity check`);
        return;
      }
      for (const exp of ref.expected.placidusCusps!) {
        const act = cusps.find(c => c.cusp === exp.cusp);
        const actSign = act ? Math.floor(act.longitude / 30) + 1 : 0;
        assertEquals(
          actSign,
          exp.sign,
          `Cusp ${exp.cusp}: expected sign ${signName(exp.sign)}, got ${signName(actSign)}`,
        );
        const actDeg = act ? act.longitude % 30 : 0;
        assertAlmostEquals(actDeg, exp.deg, POS_TOLERANCE_DEG);
      }
    });
  }

  // ── Arudha Padas (existence and valid range) ───────────────────────────
  Deno.test(`[${ref.label}] Arudha Padas are computed and in range`, () => {
    const padas = chart.jaimini!.arudhaPadas;
    assertEquals(padas.length, 4);
    for (const ap of padas) {
      assertEquals(ap.sign >= 1 && ap.sign <= 12, true, `${ap.label} sign out of range`);
    }
  });

  // ── KP sub-lords (existence check — 9 planets) ────────────────────────
  Deno.test(`[${ref.label}] KP planet sub-lords computed for 9 planets`, () => {
    const kp = chart.kp!;
    assertEquals(kp.planetSubLords.length, 9);
    for (const k of kp.planetSubLords) {
      assertEquals(!!k.signLord, true, `${k.planet}: missing signLord`);
      assertEquals(!!k.starLord, true, `${k.planet}: missing starLord`);
      assertEquals(!!k.subLord, true, `${k.planet}: missing subLord`);
    }
  });

  // ── Snapshot version ──────────────────────────────────────────────────
  Deno.test(`[${ref.label}] Snapshot version is set`, () => {
    assertEquals(typeof chart.snapshotVersion, "number");
    assertEquals(chart.snapshotVersion! >= 2, true, "Snapshot version should be ≥ 2");
  });

  // ── Shadbala (six-source, Parashari/BPHS) ─────────────────────────────
  Deno.test(`[${ref.label}] Shadbala is computed for 7 grahas`, () => {
    const sb = chart.shadbala as { planets: Record<string, { totalRupas: number; sthanaBala: number; digBala: number; kalaBala: number; cheshtaBala: number; naisargikaBala: number; drikBala: number; required: number; ratio: number }>; rank: string[] };
    assertEquals(typeof sb, "object", "shadbala should be an object");
    assertEquals(typeof sb.planets, "object", "shadbala.planets should be an object");
    const planets = Object.keys(sb.planets);
    assertEquals(planets.length, 7, `Expected 7 grahas, got ${planets.length}`);
    for (const p of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) {
      assertEquals(planets.includes(p), true, `Missing planet ${p}`);
      const data = sb.planets[p];
      assertEquals(data.totalRupas > 0, true, `${p} totalRupas should be > 0`);
      assertEquals(data.required > 0, true, `${p} required should be > 0`);
    }
    assertEquals(sb.rank.length, 7, "rank should have 7 entries");
  });

  if (ref.expected.shadbalaRank) {
    Deno.test(`[${ref.label}] Shadbala rank matches JHora`, () => {
      const sb = chart.shadbala as { planets: Record<string, { totalRupas: number }>; rank: string[] };
      const expectedRank = ref.expected.shadbalaRank!;
      for (let i = 0; i < expectedRank.length; i++) {
        assertEquals(
          sb.rank[i],
          expectedRank[i],
          `Rank position ${i + 1}: expected ${expectedRank[i]}, got ${sb.rank[i]}`,
        );
      }
    });
  }

  // ── Shadbala Rupas parity with JHora (±0.5 Rupa tolerance) ────────────
  if (ref.expected.shadbalaRupas) {
    const SHADBALA_TOLERANCE_RUPAS = 0.5;
    Deno.test(`[${ref.label}] Shadbala Rupas within ±${SHADBALA_TOLERANCE_RUPAS}R of JHora`, () => {
      const sb = chart.shadbala as { planets: Record<string, { totalRupas: number }> };
      for (const [planet, jhoraRupas] of Object.entries(ref.expected.shadbalaRupas!)) {
        assertAlmostEquals(
          sb.planets[planet].totalRupas,
          jhoraRupas,
          SHADBALA_TOLERANCE_RUPAS,
          `${planet}: engine ${sb.planets[planet].totalRupas.toFixed(2)}R vs JHora ${jhoraRupas}R`,
        );
      }
    });
  }

  // ── Bhava Bala (house strength) ─────────────────────────────────────
  Deno.test(`[${ref.label}] Bhava Bala is computed for 12 houses`, () => {
    const bb = chart.bhavaBala as { houses: Array<{ house: number; totalRupas: number }>; rank: number[] };
    assertEquals(typeof bb, "object", "bhavaBala should be an object");
    assertEquals(bb.houses.length, 12, `Expected 12 houses, got ${bb.houses.length}`);
    for (let h = 1; h <= 12; h++) {
      const hd = bb.houses.find((x: { house: number }) => x.house === h);
      assertEquals(!!hd, true, `Missing house ${h}`);
      assertEquals(hd!.totalRupas > 0, true, `House ${h} totalRupas should be > 0`);
    }
    assertEquals(bb.rank.length, 12, "rank should have 12 entries");
  });

  // ── Bhava Bala Rupas parity with JHora (±0.5 Rupa tolerance) ──────
  if (ref.expected.bhavaBalaRupas) {
    const BHAVA_BALA_TOLERANCE_RUPAS = 0.5;
    Deno.test(`[${ref.label}] Bhava Bala Rupas within ±${BHAVA_BALA_TOLERANCE_RUPAS}R of JHora`, () => {
      const bb = chart.bhavaBala as { houses: Array<{ house: number; totalRupas: number }> };
      for (const [houseStr, jhoraRupas] of Object.entries(ref.expected.bhavaBalaRupas!)) {
        const houseNum = Number(houseStr);
        const hd = bb.houses.find((x: { house: number }) => x.house === houseNum);
        assertAlmostEquals(
          hd!.totalRupas,
          jhoraRupas,
          BHAVA_BALA_TOLERANCE_RUPAS,
          `House ${houseNum}: engine ${hd!.totalRupas.toFixed(2)}R vs JHora ${jhoraRupas}R`,
        );
      }
    });
  }

  if (ref.expected.bhavaBalaRank) {
    const BB_RANK_TOLERANCE_RUPAS = 0.5;
    Deno.test(`[${ref.label}] Bhava Bala rank matches JHora`, () => {
      const bb = chart.bhavaBala as { houses: Array<{ house: number; totalRupas: number }>; rank: number[] };
      const expectedRank = ref.expected.bhavaBalaRank!;
      const rupasOf = (h: number) => bb.houses.find(x => x.house === h)!.totalRupas;
      for (let i = 0; i < expectedRank.length; i++) {
        if (bb.rank[i] !== expectedRank[i]) {
          // Allow transposition of adjacent-ranked houses whose Rupas are within tolerance
          const j = bb.rank.indexOf(expectedRank[i]);
          const swapOk = Math.abs(rupasOf(bb.rank[i]) - rupasOf(expectedRank[i])) < BB_RANK_TOLERANCE_RUPAS;
          assertEquals(
            swapOk,
            true,
            `Rank position ${i + 1}: expected H${expectedRank[i]}, got H${bb.rank[i]} (delta ${Math.abs(rupasOf(bb.rank[i]) - rupasOf(expectedRank[i])).toFixed(2)}R > ${BB_RANK_TOLERANCE_RUPAS}R)`,
          );
        }
      }
    });
  }

  // ── Yogini Dasha parity (PyJHora v4.8.5, Lahiri) ─────────────────────
  if (ref.expected.yoginiDasha) {
    Deno.test(`[${ref.label}] Yogini Dasha — first 3 Maha lords + durations`, () => {
      const yogini = chart.dashas.find((d: { system: string }) => d.system === "yogini");
      assertEquals(!!yogini, true, "Yogini dasha system not found");
      const timeline = yogini!.timeline;
      for (let i = 0; i < ref.expected.yoginiDasha!.first3.length; i++) {
        const exp = ref.expected.yoginiDasha!.first3[i];
        assertEquals(
          timeline[i].planet,
          exp.planet,
          `Yogini Maha #${i + 1}: expected ${exp.planet}, got ${timeline[i].planet}`,
        );
        assertEquals(
          timeline[i].durationYears,
          exp.durationYears,
          `Yogini Maha #${i + 1} (${exp.planet}): expected ${exp.durationYears} yrs, got ${timeline[i].durationYears} yrs`,
        );
      }
    });

    Deno.test(`[${ref.label}] Yogini Dasha — current Maha lord`, () => {
      const yogini = chart.dashas.find((d: { system: string }) => d.system === "yogini");
      assertEquals(
        yogini!.currentMahaDasha.planet,
        ref.expected.yoginiDasha!.currentMahaLord,
        `Current Yogini Maha: expected ${ref.expected.yoginiDasha!.currentMahaLord}, got ${yogini!.currentMahaDasha.planet}`,
      );
    });
  }

  // ── Ashtottari Dasha parity (PyJHora v4.8.5, Lahiri) ─────────────────
  if (ref.expected.ashtottariDasha) {
    Deno.test(`[${ref.label}] Ashtottari Dasha — first 3 Maha lords + durations`, () => {
      const ashto = chart.dashas.find((d: { system: string }) => d.system === "ashtottari");
      assertEquals(!!ashto, true, "Ashtottari dasha system not found");
      const timeline = ashto!.timeline;
      for (let i = 0; i < ref.expected.ashtottariDasha!.first3.length; i++) {
        const exp = ref.expected.ashtottariDasha!.first3[i];
        assertEquals(
          timeline[i].planet,
          exp.planet,
          `Ashtottari Maha #${i + 1}: expected ${exp.planet}, got ${timeline[i].planet}`,
        );
        assertEquals(
          timeline[i].durationYears,
          exp.durationYears,
          `Ashtottari Maha #${i + 1} (${exp.planet}): expected ${exp.durationYears} yrs, got ${timeline[i].durationYears} yrs`,
        );
      }
    });

    Deno.test(`[${ref.label}] Ashtottari Dasha — current Maha lord`, () => {
      const ashto = chart.dashas.find((d: { system: string }) => d.system === "ashtottari");
      assertEquals(
        ashto!.currentMahaDasha.planet,
        ref.expected.ashtottariDasha!.currentMahaLord,
        `Current Ashtottari Maha: expected ${ref.expected.ashtottariDasha!.currentMahaLord}, got ${ashto!.currentMahaDasha.planet}`,
      );
    });
  }
}

// ─── Varshphal (Annual Tajik Chart) Parity Tests ────────────────────────────
// Validated against SwissEph (Lahiri) via PyJHora v4.8.5.
// Fixed reference year: the Varsha containing 2026-06-01.
// years is 1-indexed: years=N → the Nth solar return from birth.

import { computeVarshphal } from "./varshphal.ts";

interface VarshphalReference {
  label: string;
  birthDetails: BirthDetails;
  years: number;
  expected: {
    annualAscSign: number;
    annualAscDeg: number;
    planets: Array<{ planet: string; sign: number; deg: number }>;
    munthaSign: number;
    munthaHouse: number;
    yearLord: string;
  };
}

const VARSHPHAL_REFS: VarshphalReference[] = [
  {
    label: "Dev Chart",
    birthDetails: REFERENCE_CHARTS[0].birthDetails,
    years: 43, // Solar return ~Aug 2025 (Varsha containing 2026-06-01)
    expected: {
      annualAscSign: 6,   // Kanya
      annualAscDeg: 22.21,
      planets: [
        { planet: "sun",     sign: 5,  deg: 6.10 },
        { planet: "moon",    sign: 5,  deg: 5.17 },
        { planet: "mars",    sign: 6,  deg: 16.01 },
        { planet: "mercury", sign: 4,  deg: 18.24 },
        { planet: "jupiter", sign: 3,  deg: 22.02 },
        { planet: "venus",   sign: 4,  deg: 2.80 },
        { planet: "saturn",  sign: 12, deg: 6.39 },
        { planet: "rahu",    sign: 11, deg: 24.89 },
        { planet: "ketu",    sign: 5,  deg: 24.89 },
      ],
      munthaSign: 4,    // Karka
      munthaHouse: 11,
      yearLord: "sun",
    },
  },
  {
    label: "Rajiv Gandhi",
    birthDetails: REFERENCE_CHARTS[1].birthDetails,
    years: 82, // Solar return ~Aug 2025
    expected: {
      annualAscSign: 3,   // Mithuna
      annualAscDeg: 8.26,
      planets: [
        { planet: "sun",     sign: 5,  deg: 3.87 },
        { planet: "moon",    sign: 4,  deg: 4.37 },
        { planet: "mars",    sign: 6,  deg: 14.54 },
        { planet: "mercury", sign: 4,  deg: 15.40 },
        { planet: "jupiter", sign: 3,  deg: 21.57 },
        { planet: "venus",   sign: 4,  deg: 0.05 },
        { planet: "saturn",  sign: 12, deg: 6.53 },
        { planet: "rahu",    sign: 11, deg: 25.01 },
        { planet: "ketu",    sign: 5,  deg: 25.01 },
      ],
      munthaSign: 3,    // Mithuna
      munthaHouse: 1,
      yearLord: "sun",
    },
  },
  {
    label: "Amitabh Bachchan",
    birthDetails: REFERENCE_CHARTS[2].birthDetails,
    years: 84, // Solar return ~Oct 2025
    expected: {
      annualAscSign: 3,   // Mithuna
      annualAscDeg: 16.32,
      planets: [
        { planet: "sun",     sign: 6,  deg: 24.43 },
        { planet: "moon",    sign: 2,  deg: 27.74 },
        { planet: "mars",    sign: 7,  deg: 19.00 },
        { planet: "mercury", sign: 7,  deg: 13.19 },
        { planet: "jupiter", sign: 3,  deg: 29.42 },
        { planet: "venus",   sign: 6,  deg: 3.09 },
        { planet: "saturn",  sign: 12, deg: 2.77 },
        { planet: "rahu",    sign: 11, deg: 22.26 },
        { planet: "ketu",    sign: 5,  deg: 22.26 },
      ],
      munthaSign: 11,   // Kumbha
      munthaHouse: 9,
      yearLord: "saturn",
    },
  },
];

const VP_DEG_TOLERANCE = 0.1;   // ≤0.1° for most planets
const VP_NODE_TOLERANCE = 1.0;  // Rahu/Ketu: mean node divergence up to ~1°

for (const ref of VARSHPHAL_REFS) {
  const vp = computeVarshphal(ref.birthDetails, ref.years);

  Deno.test(`[${ref.label}] Varshphal — annual ascendant sign`, () => {
    assertEquals(vp.annualAscSign, ref.expected.annualAscSign,
      `Annual Asc sign: expected ${ref.expected.annualAscSign}, got ${vp.annualAscSign}`);
  });

  Deno.test(`[${ref.label}] Varshphal — annual ascendant degree (±${VP_DEG_TOLERANCE}°)`, () => {
    assertAlmostEquals(vp.annualAscDeg, ref.expected.annualAscDeg, VP_DEG_TOLERANCE,
      `Annual Asc deg: expected ${ref.expected.annualAscDeg}, got ${vp.annualAscDeg}`);
  });

  for (const ep of ref.expected.planets) {
    const actual = vp.planets.find(p => p.planet === ep.planet);
    const tol = (ep.planet === "rahu" || ep.planet === "ketu") ? VP_NODE_TOLERANCE : VP_DEG_TOLERANCE;

    Deno.test(`[${ref.label}] Varshphal — ${ep.planet} sign`, () => {
      assertEquals(actual!.signNumber, ep.sign,
        `${ep.planet} sign: expected ${ep.sign}, got ${actual!.signNumber}`);
    });

    Deno.test(`[${ref.label}] Varshphal — ${ep.planet} degree (±${tol}°)`, () => {
      assertAlmostEquals(actual!.signDegree, ep.deg, tol,
        `${ep.planet} deg: expected ${ep.deg}, got ${actual!.signDegree}`);
    });
  }

  Deno.test(`[${ref.label}] Varshphal — Muntha sign`, () => {
    assertEquals(vp.munthaSign, ref.expected.munthaSign,
      `Muntha sign: expected ${ref.expected.munthaSign}, got ${vp.munthaSign}`);
  });

  Deno.test(`[${ref.label}] Varshphal — Muntha house`, () => {
    assertEquals(vp.munthaHouse, ref.expected.munthaHouse,
      `Muntha house: expected ${ref.expected.munthaHouse}, got ${vp.munthaHouse}`);
  });

  Deno.test(`[${ref.label}] Varshphal — Year Lord`, () => {
    assertEquals(vp.yearLord, ref.expected.yearLord,
      `Year Lord: expected ${ref.expected.yearLord}, got ${vp.yearLord}`);
  });
}

// ─── Tajik Yogas Parity Tests ───────────────────────────────────────────────
// Validated against PyJHora v4.8.5 tajaka_yoga.py on the same annual charts.
// Same fixed reference years as the Varshphal tests above.

import { detectTajikYogas } from "./tajik_yogas.ts";

interface TajikYogaReference {
  label: string;
  birthDetails: BirthDetails;
  years: number;
  expected: {
    ithasala: Array<{ planet1: string; planet2: string; ithasalaType: 1 | 2 | 3 }>;
    eesarpha: Array<{ planet1: string; planet2: string }>;
    ishkavala: boolean;
    induvara: boolean;
    nakta: Array<{ mediator: string; planet1: string; planet2: string }>;
    yamaya: Array<{ mediator: string; planet1: string; planet2: string }>;
  };
}

const TAJIK_YOGA_REFS: TajikYogaReference[] = [
  {
    label: "Dev Chart",
    birthDetails: REFERENCE_CHARTS[0].birthDetails,
    years: 43,
    expected: {
      ithasala: [
        { planet1: "sun", planet2: "moon", ithasalaType: 2 },
        { planet1: "sun", planet2: "venus", ithasalaType: 1 },
        { planet1: "mars", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "mercury", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "venus", planet2: "saturn", ithasalaType: 1 },
      ],
      eesarpha: [
        { planet1: "moon", planet2: "venus" },
        { planet1: "mars", planet2: "mercury" },
      ],
      ishkavala: false,
      induvara: false,
      nakta: [],
      yamaya: [],
    },
  },
  {
    label: "Rajiv Gandhi",
    birthDetails: REFERENCE_CHARTS[1].birthDetails,
    years: 82,
    expected: {
      ithasala: [
        { planet1: "sun", planet2: "venus", ithasalaType: 1 },
        { planet1: "moon", planet2: "saturn", ithasalaType: 1 },
        { planet1: "mars", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "mercury", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "venus", planet2: "saturn", ithasalaType: 1 },
      ],
      eesarpha: [
        { planet1: "sun", planet2: "moon" },
        { planet1: "moon", planet2: "venus" },
        { planet1: "mars", planet2: "mercury" },
        { planet1: "mars", planet2: "saturn" },
      ],
      ishkavala: false,
      induvara: false,
      nakta: [],
      yamaya: [],
    },
  },
  {
    label: "Amitabh Bachchan",
    birthDetails: REFERENCE_CHARTS[2].birthDetails,
    years: 84,
    expected: {
      ithasala: [
        { planet1: "sun", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "moon", planet2: "jupiter", ithasalaType: 1 },
        { planet1: "mars", planet2: "mercury", ithasalaType: 1 },
      ],
      eesarpha: [
        { planet1: "sun", planet2: "moon" },
        { planet1: "sun", planet2: "mars" },
        { planet1: "venus", planet2: "saturn" },
      ],
      ishkavala: false,
      induvara: false,
      nakta: [],
      yamaya: [],
    },
  },
];

for (const ref of TAJIK_YOGA_REFS) {
  const vp = computeVarshphal(ref.birthDetails, ref.years);
  const tajik = detectTajikYogas(vp.planets, vp.annualAscSign);

  Deno.test(`[${ref.label}] Tajik — Ishkavala`, () => {
    assertEquals(tajik.ishkavala, ref.expected.ishkavala,
      `Ishkavala: expected ${ref.expected.ishkavala}, got ${tajik.ishkavala}`);
  });

  Deno.test(`[${ref.label}] Tajik — Induvara`, () => {
    assertEquals(tajik.induvara, ref.expected.induvara,
      `Induvara: expected ${ref.expected.induvara}, got ${tajik.induvara}`);
  });

  Deno.test(`[${ref.label}] Tajik — Ithasala pairs match PyJHora`, () => {
    const actual = tajik.ithasala.map(y => `${y.planet1}-${y.planet2}`).sort();
    const expected = ref.expected.ithasala.map(y => `${y.planet1}-${y.planet2}`).sort();
    assertEquals(actual, expected,
      `Ithasala pairs: expected [${expected}], got [${actual}]`);
  });

  Deno.test(`[${ref.label}] Tajik — Ithasala types match PyJHora`, () => {
    for (const exp of ref.expected.ithasala) {
      const act = tajik.ithasala.find(
        y => y.planet1 === exp.planet1 && y.planet2 === exp.planet2,
      );
      assertEquals(act?.ithasalaType, exp.ithasalaType,
        `Ithasala ${exp.planet1}-${exp.planet2}: expected type ${exp.ithasalaType}, got ${act?.ithasalaType}`);
    }
  });

  Deno.test(`[${ref.label}] Tajik — Eesarpha pairs match PyJHora`, () => {
    const actual = tajik.eesarpha.map(y => `${y.planet1}-${y.planet2}`).sort();
    const expected = ref.expected.eesarpha.map(y => `${y.planet1}-${y.planet2}`).sort();
    assertEquals(actual, expected,
      `Eesarpha pairs: expected [${expected}], got [${actual}]`);
  });

  Deno.test(`[${ref.label}] Tajik — Nakta triples match PyJHora`, () => {
    const actual = tajik.nakta.map(y => `${y.mediator}:${y.planet1}-${y.planet2}`).sort();
    const expected = ref.expected.nakta.map(y => `${y.mediator}:${y.planet1}-${y.planet2}`).sort();
    assertEquals(actual, expected,
      `Nakta triples: expected [${expected}], got [${actual}]`);
  });

  Deno.test(`[${ref.label}] Tajik — Yamaya triples match PyJHora`, () => {
    const actual = tajik.yamaya.map(y => `${y.mediator}:${y.planet1}-${y.planet2}`).sort();
    const expected = ref.expected.yamaya.map(y => `${y.mediator}:${y.planet1}-${y.planet2}`).sort();
    assertEquals(actual, expected,
      `Yamaya triples: expected [${expected}], got [${actual}]`);
  });
}
