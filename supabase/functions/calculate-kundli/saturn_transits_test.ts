/**
 * Parity test for Saturn Transits engine module.
 *
 * Validated against PyJHora 4.8.6 (Lahiri ayanamsa).
 *
 * Chart 1 (primary): Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *   Natal Moon: Kumbha (sign 11), ~3.85° in sign.
 *   Lagna: Dhanu (sign 9).
 *
 * Chart 2 (secondary): Born 15 Aug 1947, 00:00 IST, Delhi (28.61N, 77.21E).
 *   Natal Moon: Karka (sign 4), ~3.98° in sign.
 *   Lagna: Vrishabha (sign 2).
 *
 * JHora Sade Sati cycles for Chart 1 (Moon in Kumbha = sign 11):
 *   Cycle 1: start ~1990-03-20, end ~1998-04-17
 *   Cycle 2: start ~2020-01-24, end ~2027-03-27 (active cycle)
 *   Cycle 3: start ~2049-04-01
 *
 * JHora Sade Sati cycles for Chart 2 (Moon in Karka = sign 4):
 *   Cycle 1: start ~1973-06-17, end ~1982-09-15
 *   Cycle 2: start ~2002-07-30, end ~2011-11-14
 *
 * Run: deno test supabase/functions/calculate-kundli/saturn_transits_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSaturnTransits } from "./saturn_transits.ts";

function withinDays(actual: string, expected: string, tolerance: number): boolean {
  const diff = Math.abs(
    (new Date(actual).getTime() - new Date(expected).getTime()) / 86_400_000,
  );
  return diff <= tolerance;
}

// ─── Chart 1 data ───────────────────────────────────────────────────────────
const C1_MOON_LON = 303.854;
const C1_MOON_SIGN = 11;
const C1_ASC_SIGN = 9;
const C1_BIRTH = "1983-08-23";
const AYA = "lahiri" as const;

// ─── Chart 2 data ───────────────────────────────────────────────────────────
const C2_MOON_LON = 93.98;
const C2_MOON_SIGN = 4;
const C2_ASC_SIGN = 2;
const C2_BIRTH = "1947-08-15";

// ─── Sign-based Sade Sati — Chart 1 ────────────────────────────────────────

Deno.test("Saturn — Chart 1: merged sign-based Sade Sati has clean cycles", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  const periods = result.sadeSatiSign;

  // After merging, each cycle should have at most 3 phases (1,2,3)
  // and no consecutive segments with the same phase number
  for (let i = 1; i < periods.length; i++) {
    if (periods[i].phase === periods[i - 1].phase) {
      // Same phase consecutive means they're from DIFFERENT cycles
      // Verify there's a large gap between them
      const gap = Math.abs(
        (new Date(periods[i].startDate).getTime() -
         new Date(periods[i - 1].endDate).getTime()) / 86_400_000,
      );
      assertEquals(gap > 365 * 5, true,
        `Same phase ${periods[i].phase} segments should be in different cycles (gap=${gap} days)`);
    }
  }
});

Deno.test("Saturn — Chart 1: Cycle 1 start within ±10 days of JHora", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);

  // Cycle 1 starts with Phase 1 (Rising, Saturn in 12th from Moon = Makara)
  // JHora: ~1990-03-20
  const cycle1Phase1 = result.sadeSatiSign.find(p =>
    p.phase === 1 && new Date(p.startDate).getFullYear() >= 1989 &&
    new Date(p.startDate).getFullYear() <= 1991,
  );
  assertEquals(cycle1Phase1 !== undefined, true, "Should find Cycle 1 Phase 1");
  assertEquals(
    withinDays(cycle1Phase1!.startDate, "1990-03-20", 10),
    true,
    `Cycle 1 start: expected ~1990-03-20 (±10d), got ${cycle1Phase1!.startDate}`,
  );
});

Deno.test("Saturn — Chart 1: Cycle 1 end within ±10 days of JHora", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);

  // Cycle 1 ends with Phase 3 (Setting, Saturn in 2nd from Moon = Meena)
  // JHora: ~1998-04-17
  const cycle1Phase3 = result.sadeSatiSign.find(p =>
    p.phase === 3 && new Date(p.endDate).getFullYear() >= 1997 &&
    new Date(p.endDate).getFullYear() <= 1999,
  );
  assertEquals(cycle1Phase3 !== undefined, true, "Should find Cycle 1 Phase 3");
  assertEquals(
    withinDays(cycle1Phase3!.endDate, "1998-04-17", 10),
    true,
    `Cycle 1 end: expected ~1998-04-17 (±10d), got ${cycle1Phase3!.endDate}`,
  );
});

Deno.test("Saturn — Chart 1: active Cycle 2 start within ±10 days of JHora", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);

  // Cycle 2 starts with Phase 1 (Rising)
  // JHora: ~2020-01-24
  const cycle2Phase1 = result.sadeSatiSign.find(p =>
    p.phase === 1 && new Date(p.startDate).getFullYear() >= 2019 &&
    new Date(p.startDate).getFullYear() <= 2021,
  );
  assertEquals(cycle2Phase1 !== undefined, true, "Should find Cycle 2 Phase 1");
  assertEquals(
    withinDays(cycle2Phase1!.startDate, "2020-01-24", 10),
    true,
    `Cycle 2 start: expected ~2020-01-24 (±10d), got ${cycle2Phase1!.startDate}`,
  );
});

// ─── Sign-based Sade Sati — Chart 2 ────────────────────────────────────────

Deno.test("Saturn — Chart 2: Cycle 1 start within ±10 days of JHora", () => {
  const result = computeSaturnTransits(C2_MOON_LON, C2_MOON_SIGN, C2_ASC_SIGN, C2_BIRTH, AYA);

  // Cycle 1 Phase 1 for Moon in Karka (sign 4): Saturn in Mithuna (sign 3)
  // JHora: ~1973-09-09
  const cycle1Phase1 = result.sadeSatiSign.find(p =>
    p.phase === 1 && new Date(p.startDate).getFullYear() >= 1972 &&
    new Date(p.startDate).getFullYear() <= 1974,
  );
  assertEquals(cycle1Phase1 !== undefined, true, "Chart 2: Should find Cycle 1 Phase 1");
  assertEquals(
    withinDays(cycle1Phase1!.startDate, "1973-06-17", 10),
    true,
    `Chart 2 Cycle 1 start: expected ~1973-06-17 (±10d), got ${cycle1Phase1!.startDate}`,
  );
});

Deno.test("Saturn — Chart 2: Cycle 2 start within ±10 days of JHora", () => {
  const result = computeSaturnTransits(C2_MOON_LON, C2_MOON_SIGN, C2_ASC_SIGN, C2_BIRTH, AYA);

  // Cycle 2 Phase 1 for Moon in Karka (sign 4): Saturn in Mithuna (sign 3)
  // JHora: ~2002-06-07
  const cycle2Phase1 = result.sadeSatiSign.find(p =>
    p.phase === 1 && new Date(p.startDate).getFullYear() >= 2001 &&
    new Date(p.startDate).getFullYear() <= 2003,
  );
  assertEquals(cycle2Phase1 !== undefined, true, "Chart 2: Should find Cycle 2 Phase 1");
  assertEquals(
    withinDays(cycle2Phase1!.startDate, "2002-07-30", 10),
    true,
    `Chart 2 Cycle 2 start: expected ~2002-07-30 (±10d), got ${cycle2Phase1!.startDate}`,
  );
});

// ─── Kantaka & Ashtama structural tests ─────────────────────────────────────

Deno.test("Saturn — Kantaka Shani from Moon (4th/10th)", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  const kantaka = result.kantakaMoon;
  assertEquals(kantaka.length >= 2, true,
    `Expected >=2 Kantaka periods, got ${kantaka.length}`);
  for (const k of kantaka) {
    assertEquals(k.type, 'kantaka');
    assertEquals(k.reference, 'moon');
    assertEquals([4, 10].includes(k.houseFromRef), true);
  }
});

Deno.test("Saturn — Ashtama Shani from Moon (8th)", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  const ashtama = result.ashtamaMoon;
  assertEquals(ashtama.length >= 1, true,
    `Expected >=1 Ashtama periods, got ${ashtama.length}`);
  for (const a of ashtama) {
    assertEquals(a.type, 'ashtama');
    assertEquals(a.houseFromRef, 8);
  }
});

// ─── Valid dates ────────────────────────────────────────────────────────────

Deno.test("Saturn — all periods have valid dates and positive durations", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  const allPeriods = [
    ...result.sadeSatiSign,
    ...result.sadeSatiDegree,
    ...result.kantakaMoon,
    ...result.kantakaAsc,
    ...result.ashtamaMoon,
    ...result.ashtamaAsc,
  ];
  for (const p of allPeriods) {
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(p.startDate), true,
      `startDate format: ${p.startDate}`);
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(p.endDate), true,
      `endDate format: ${p.endDate}`);
    assertEquals(new Date(p.endDate) > new Date(p.startDate), true,
      `end > start: ${p.startDate} → ${p.endDate}`);
    assertEquals(p.durationDays > 0, true, `duration > 0`);
  }
});

// ─── Citation ───────────────────────────────────────────────────────────────

Deno.test("Saturn — citation present", () => {
  const result = computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  assertEquals(typeof result.citation, 'string');
  assertEquals(result.citation.includes('BPHS'), true);
});

// ─── Timing guard ───────────────────────────────────────────────────────────

Deno.test("Saturn — computeSaturnTransits completes in < 1500 ms", () => {
  // Warm-up run (JIT / module init)
  computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);

  const t0 = performance.now();
  computeSaturnTransits(C1_MOON_LON, C1_MOON_SIGN, C1_ASC_SIGN, C1_BIRTH, AYA);
  const elapsed = performance.now() - t0;

  console.log(`computeSaturnTransits elapsed: ${elapsed.toFixed(1)} ms`);
  assertEquals(
    elapsed < 1500,
    true,
    `Expected < 1500 ms, got ${elapsed.toFixed(1)} ms`,
  );
});
