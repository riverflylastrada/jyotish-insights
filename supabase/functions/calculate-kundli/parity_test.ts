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
      // Chara Dasha (KN Rao): Scorpio→Ketu, Aquarius→Rahu
      charaDasha: [
        { sign: 9, durationYears: 11 },  // Dhanu: Jupiter in 8, fwd 11
        { sign: 10, durationYears: 3 },   // Makara: Saturn in 7, bwd 3
        { sign: 11, durationYears: 3 },   // Kumbha: Rahu in 2, fwd 3
        { sign: 12, durationYears: 4 },   // Meena: Jupiter in 8, bwd 4
        { sign: 1, durationYears: 3 },    // Mesha: Mars in 4, fwd 3
        { sign: 2, durationYears: 9 },    // Vrishabha: Venus in 5, bwd 9
        { sign: 3, durationYears: 3 },    // Mithuna: Mercury in 6, fwd 3
        { sign: 4, durationYears: 5 },    // Karka: Moon in 11, bwd 5
        { sign: 5, durationYears: 12 },   // Simha: Sun in 5, own sign
        { sign: 6, durationYears: 12 },   // Kanya: Mercury in 6, own sign
        { sign: 7, durationYears: 10 },   // Tula: Venus in 5, fwd 10
        { sign: 8, durationYears: 12 },   // Vrischika: Ketu in 8, own sign
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
      // Chara Dasha (KN Rao): Scorpio→Ketu, Aquarius→Rahu
      charaDasha: [
        { sign: 5, durationYears: 12 },   // Simha: Sun in 5, own sign
        { sign: 6, durationYears: 1 },    // Kanya: Mercury in 5, bwd 1
        { sign: 7, durationYears: 10 },   // Tula: Venus in 5, fwd 10
        { sign: 8, durationYears: 10 },   // Vrischika: Ketu in 10, bwd 10
        { sign: 9, durationYears: 8 },    // Dhanu: Jupiter in 5, fwd 8
        { sign: 10, durationYears: 7 },   // Makara: Saturn in 3, bwd 7
        { sign: 11, durationYears: 5 },   // Kumbha: Rahu in 4, fwd 5
        { sign: 12, durationYears: 7 },   // Meena: Jupiter in 5, bwd 7
        { sign: 1, durationYears: 5 },    // Mesha: Mars in 6, fwd 5
        { sign: 2, durationYears: 9 },    // Vrishabha: Venus in 5, bwd 9
        { sign: 3, durationYears: 2 },    // Mithuna: Mercury in 5, fwd 2
        { sign: 4, durationYears: 11 },   // Karka: Moon in 5, bwd 11
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
      // Chara Dasha (KN Rao): Scorpio→Ketu, Aquarius→Rahu
      charaDasha: [
        { sign: 11, durationYears: 6 },   // Kumbha: Rahu in 5, fwd 6
        { sign: 12, durationYears: 8 },   // Meena: Jupiter in 4, bwd 8
        { sign: 1, durationYears: 5 },    // Mesha: Mars in 6, fwd 5
        { sign: 2, durationYears: 8 },    // Vrishabha: Venus in 6, bwd 8
        { sign: 3, durationYears: 3 },    // Mithuna: Mercury in 6, fwd 3
        { sign: 4, durationYears: 9 },    // Karka: Moon in 7, bwd 9
        { sign: 5, durationYears: 1 },    // Simha: Sun in 6, fwd 1
        { sign: 6, durationYears: 12 },   // Kanya: Mercury in 6, own sign
        { sign: 7, durationYears: 11 },   // Tula: Venus in 6, fwd 11
        { sign: 8, durationYears: 9 },    // Vrischika: Ketu in 11, bwd 9
        { sign: 9, durationYears: 7 },    // Dhanu: Jupiter in 4, fwd 7
        { sign: 10, durationYears: 8 },   // Makara: Saturn in 2, bwd 8
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
}
