/**
 * Divisional Charts (D-5/6/8/11) Parity Test — validates vargaSign() against
 * PyJHora v4.8.6 `charts.divisional_chart(jd, place, divisional_chart_factor=N)`.
 *
 * Reference chart: 23 Aug 1983, 15:35 IST, Patan (23.85, 72.12, +5.5), Lahiri.
 *
 * PyJHora module: jhora.horoscope.chart.charts — functions panchamsa_chart(),
 * shashthamsa_chart(), ashtamsa_chart(), rudramsa_chart() (Traditional Parasara,
 * chart_method=1). Values obtained via `charts.divisional_chart()` which
 * delegates to these named functions for standard factors.
 *
 * Strategy: feed PyJHora's own D1 (rasi) positions into vargaSign() and assert
 * the output matches PyJHora's divisional chart output. This isolates the
 * division formula from ephemeris differences.
 *
 * Run with: deno test supabase/functions/calculate-kundli/divisional_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { vargaSign } from "./divisional.ts";

// ─── PyJHora D1 (rasi) positions ─────────────────────────────────────────────
// Source: PyJHora 4.8.6 charts.rasi_chart(jd, place) for the reference chart.
// Julian Day 2445570.1493055555.
// Format: { planet: [sign_1indexed, degreeInSign] }

const D1: Record<string, [number, number]> = {
  ascendant: [9,  8.680197],
  sun:       [5,  5.215551],
  moon:      [11, 2.975166],
  mars:      [4, 11.759671],
  mercury:   [6,  2.171440],
  jupiter:   [8,  7.510355],
  venus:     [5,  8.013184],
  saturn:    [7,  5.412116],
  rahu:      [2, 28.294861],
  ketu:      [8, 28.294861],
};

// ─── PyJHora expected varga signs (1-indexed) ───────────────────────────────
// Source: PyJHora 4.8.6 charts.divisional_chart(jd, place, divisional_chart_factor=N)

const EXPECTED_D5: Record<string, number> = {
  ascendant: 11, sun: 1, moon: 1, mars: 6, mercury: 2,
  jupiter: 6, venus: 11, saturn: 1, rahu: 8, ketu: 8,
};

const EXPECTED_D6: Record<string, number> = {
  ascendant: 2, sun: 2, moon: 1, mars: 9, mercury: 7,
  jupiter: 8, venus: 2, saturn: 2, rahu: 12, ketu: 12,
};

const EXPECTED_D8: Record<string, number> = {
  ascendant: 7, sun: 10, moon: 9, mars: 4, mercury: 5,
  jupiter: 11, venus: 11, saturn: 2, rahu: 4, ketu: 4,
};

const EXPECTED_D11: Record<string, number> = {
  ascendant: 8, sun: 10, moon: 4, mars: 2, mercury: 8,
  jupiter: 8, venus: 11, saturn: 8, rahu: 10, ketu: 4,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

function assertVargaParity(
  varga: string,
  expected: Record<string, number>,
) {
  for (const [planet, expectedSign] of Object.entries(expected)) {
    Deno.test(`[Parity] ${varga} ${planet} sign matches PyJHora`, () => {
      const [origSign, degInSign] = D1[planet];
      const actual = vargaSign(varga, origSign, degInSign);
      assertEquals(
        actual,
        expectedSign,
        `${varga} ${planet}: vargaSign(${varga}, ${origSign}, ${degInSign.toFixed(4)}) = ${actual}, PyJHora = ${expectedSign}`,
      );
    });
  }
}

assertVargaParity("D5", EXPECTED_D5);
assertVargaParity("D6", EXPECTED_D6);
assertVargaParity("D8", EXPECTED_D8);
assertVargaParity("D11", EXPECTED_D11);
