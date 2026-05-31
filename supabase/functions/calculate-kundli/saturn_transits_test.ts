/**
 * Parity test for Saturn Transits engine module.
 *
 * Reference: PyJHora v4.8.5 (Lahiri ayanamsa).
 * Dev Chart: Born 23 Aug 1983, 15:35 IST, Patan Gujarat (23.85N, 72.12E).
 *   Natal Moon: Kumbha (sign 11), ~3.85° in sign.
 *   Lagna: Dhanu (sign 9).
 *
 * Saturn Sade Sati periods (sign-based, PyJHora reference):
 *   Saturn enters Makara (12th from Moon) around late Jan 1990.
 *   Saturn enters Kumbha (over Moon) around early 1993.
 *   Saturn leaves Meena (2nd from Moon) around mid 1996.
 *   Next cycle: Saturn enters Makara again around Jan 2020.
 *
 * Kantaka Shani from Moon (4th/10th):
 *   4th from Kumbha = Vrishabha (sign 2) — Saturn transits ~mid 2000.
 *   10th from Kumbha = Vrischika (sign 8) — Saturn transits ~2014-2017.
 *
 * Ashtama Shani from Moon (8th):
 *   8th from Kumbha = Kanya (sign 6) — Saturn transits ~2009-2012.
 *
 * Run: deno test supabase/functions/calculate-kundli/saturn_transits_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSaturnTransits } from "./saturn_transits.ts";

// Dev chart natal data (Lahiri ayanamsa)
const MOON_LON = 303.854; // Kumbha ~3.85° = 300 + 3.854
const MOON_SIGN = 11;     // Kumbha
const ASC_SIGN = 9;       // Dhanu
const BIRTH_DATE = "1983-08-23";
const AYA_KEY = "lahiri" as const;

Deno.test("Saturn Transits — sign-based Sade Sati detects periods for Dev Chart", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  assertEquals(result.natalMoonSign, 11, "Moon sign should be 11 (Kumbha)");
  assertEquals(result.natalAscSign, 9, "Asc sign should be 9 (Dhanu)");

  // Should have at least 2 complete Sade Sati cycles (1990s + 2020s)
  const signPeriods = result.sadeSatiSign;
  const phase1Periods = signPeriods.filter(p => p.phase === 1);
  const phase2Periods = signPeriods.filter(p => p.phase === 2);
  const phase3Periods = signPeriods.filter(p => p.phase === 3);

  // At least 2 cycles of each phase
  assertEquals(phase1Periods.length >= 2, true,
    `Expected >=2 phase-1 (Rising) periods, got ${phase1Periods.length}`);
  assertEquals(phase2Periods.length >= 2, true,
    `Expected >=2 phase-2 (Peak) periods, got ${phase2Periods.length}`);
  assertEquals(phase3Periods.length >= 2, true,
    `Expected >=2 phase-3 (Setting) periods, got ${phase3Periods.length}`);

  // First Rising phase should start around 1990 (Saturn entering Makara = 12th from Kumbha)
  const firstRising = phase1Periods[0];
  const firstRisingYear = new Date(firstRising.startDate).getFullYear();
  assertEquals(firstRisingYear >= 1989 && firstRisingYear <= 1991, true,
    `First rising phase should start ~1990, got ${firstRising.startDate}`);

  // Phase 1 Saturn sign should be Makara (10) — 12th from Kumbha (11)
  assertEquals(firstRising.saturnSign, 10,
    `Rising phase Saturn sign should be 10 (Makara), got ${firstRising.saturnSign}`);
});

Deno.test("Saturn Transits — degree-based Sade Sati detects periods for Dev Chart", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);
  const degreePeriods = result.sadeSatiDegree;

  // Should have at least one complete cycle
  assertEquals(degreePeriods.length >= 3, true,
    `Expected >=3 degree-based periods, got ${degreePeriods.length}`);

  // All phases should be 1, 2, or 3
  for (const p of degreePeriods) {
    assertEquals([1, 2, 3].includes(p.phase), true,
      `Phase must be 1, 2, or 3, got ${p.phase}`);
    assertEquals(p.basis, 'degree');
  }
});

Deno.test("Saturn Transits — Kantaka Shani from Moon (4th/10th)", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  // Kantaka from Moon: 4th = Vrishabha (sign 2), 10th = Vrischika (sign 8)
  const kantaka = result.kantakaMoon;
  assertEquals(kantaka.length >= 2, true,
    `Expected >=2 Kantaka periods from Moon, got ${kantaka.length}`);

  // All should be type kantaka, reference moon
  for (const k of kantaka) {
    assertEquals(k.type, 'kantaka');
    assertEquals(k.reference, 'moon');
    assertEquals([4, 10].includes(k.houseFromRef), true,
      `Kantaka house should be 4 or 10, got ${k.houseFromRef}`);
  }
});

Deno.test("Saturn Transits — Kantaka Shani from Ascendant (4th/10th)", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  // Kantaka from Asc (Dhanu/9): 4th = Meena (12), 10th = Kanya (6)
  const kantaka = result.kantakaAsc;
  assertEquals(kantaka.length >= 2, true,
    `Expected >=2 Kantaka periods from Asc, got ${kantaka.length}`);

  for (const k of kantaka) {
    assertEquals(k.type, 'kantaka');
    assertEquals(k.reference, 'ascendant');
    assertEquals([4, 10].includes(k.houseFromRef), true);
  }
});

Deno.test("Saturn Transits — Ashtama Shani from Moon (8th house)", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  // 8th from Kumbha (11) = Kanya (6). Saturn was in Kanya ~2009-2012.
  const ashtama = result.ashtamaMoon;
  assertEquals(ashtama.length >= 1, true,
    `Expected >=1 Ashtama periods from Moon, got ${ashtama.length}`);

  for (const a of ashtama) {
    assertEquals(a.type, 'ashtama');
    assertEquals(a.reference, 'moon');
    assertEquals(a.houseFromRef, 8);
  }

  // One of the Ashtama periods should be in Kanya period (~2009-2012)
  // (earlier periods may exist pre-birth since we scan from birth-5)
  const ashtama2009 = ashtama.find(a => {
    const yr = new Date(a.startDate).getFullYear();
    return yr >= 2008 && yr <= 2013;
  });
  assertEquals(ashtama2009 !== undefined, true,
    `Expected an Ashtama period ~2009-2012, found: ${ashtama.map(a => a.startDate).join(', ')}`);
});

Deno.test("Saturn Transits — Ashtama Shani from Ascendant (8th house)", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  // 8th from Dhanu (9) = Karka (4). Saturn in Karka ~2005-2007.
  const ashtama = result.ashtamaAsc;
  assertEquals(ashtama.length >= 1, true,
    `Expected >=1 Ashtama periods from Asc, got ${ashtama.length}`);

  for (const a of ashtama) {
    assertEquals(a.type, 'ashtama');
    assertEquals(a.reference, 'ascendant');
    assertEquals(a.houseFromRef, 8);
  }
});

Deno.test("Saturn Transits — periods have valid dates and durations", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);

  const allPeriods = [
    ...result.sadeSatiSign,
    ...result.sadeSatiDegree,
    ...result.kantakaMoon,
    ...result.kantakaAsc,
    ...result.ashtamaMoon,
    ...result.ashtamaAsc,
  ];

  for (const p of allPeriods) {
    // Valid date format
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(p.startDate), true,
      `startDate should be YYYY-MM-DD format, got ${p.startDate}`);
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(p.endDate), true,
      `endDate should be YYYY-MM-DD format, got ${p.endDate}`);
    // End after start
    assertEquals(new Date(p.endDate) > new Date(p.startDate), true,
      `endDate should be after startDate: ${p.startDate} → ${p.endDate}`);
    // Positive duration
    assertEquals(p.durationDays > 0, true,
      `durationDays should be positive, got ${p.durationDays}`);
    // Valid sign
    assertEquals(p.saturnSign >= 1 && p.saturnSign <= 12, true,
      `saturnSign should be 1-12, got ${p.saturnSign}`);
  }
});

Deno.test("Saturn Transits — citation present", () => {
  const result = computeSaturnTransits(MOON_LON, MOON_SIGN, ASC_SIGN, BIRTH_DATE, AYA_KEY);
  assertEquals(typeof result.citation, 'string');
  assertEquals(result.citation.length > 0, true);
  assertEquals(result.citation.includes('BPHS'), true);
});
