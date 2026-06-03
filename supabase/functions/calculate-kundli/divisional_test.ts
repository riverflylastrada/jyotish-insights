/**
 * Divisional Charts Parity Test — validates vargaSign() and vargaSignWithScheme()
 * against PyJHora v4.8.6 `charts.divisional_chart(jd, place, factor, chart_method)`.
 *
 * Reference chart: 23 Aug 1983, 15:35 IST, Patan (23.85, 72.12, +5.5), Lahiri.
 *
 * PyJHora module: jhora.horoscope.chart.charts — functions hora_chart(),
 * drekkana_chart(), chaturthamsa_chart(), panchamsa_chart(), shashthamsa_chart(),
 * ashtamsa_chart(), rudramsa_chart() with chart_method parameter for scheme
 * selection. Values obtained via `charts.divisional_chart()`.
 *
 * Strategy: feed PyJHora's own D1 (rasi) positions into vargaSign() and assert
 * the output matches PyJHora's divisional chart output. This isolates the
 * division formula from ephemeris differences.
 *
 * Run with: deno test supabase/functions/calculate-kundli/divisional_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { vargaSign, vargaSignWithScheme, type DivisionalScheme } from "./divisional.ts";

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

// ─── PyJHora expected varga signs — Parashari (default) ─────────────────────
// Source: PyJHora 4.8.6 charts.divisional_chart(jd, place, factor, chart_method=1)

const EXPECTED_D2_PARASHARI: Record<string, number> = {
  ascendant: 5, sun: 5, moon: 5, mars: 4, mercury: 4,
  jupiter: 4, venus: 5, saturn: 5, rahu: 5, ketu: 5,
};

const EXPECTED_D3_PARASHARI: Record<string, number> = {
  ascendant: 9, sun: 5, moon: 11, mars: 8, mercury: 6,
  jupiter: 8, venus: 5, saturn: 7, rahu: 10, ketu: 4,
};

const EXPECTED_D4_PARASHARI: Record<string, number> = {
  ascendant: 12, sun: 5, moon: 11, mars: 7, mercury: 6,
  jupiter: 11, venus: 8, saturn: 7, rahu: 11, ketu: 5,
};

const EXPECTED_D5: Record<string, number> = {
  ascendant: 11, sun: 1, moon: 1, mars: 6, mercury: 2,
  jupiter: 6, venus: 11, saturn: 1, rahu: 8, ketu: 8,
};

const EXPECTED_D6: Record<string, number> = {
  ascendant: 2, sun: 2, moon: 1, mars: 9, mercury: 7,
  jupiter: 8, venus: 2, saturn: 2, rahu: 12, ketu: 12,
};

const EXPECTED_D8_PARASHARI: Record<string, number> = {
  ascendant: 7, sun: 10, moon: 9, mars: 4, mercury: 5,
  jupiter: 11, venus: 11, saturn: 2, rahu: 4, ketu: 4,
};

const EXPECTED_D11: Record<string, number> = {
  ascendant: 8, sun: 10, moon: 4, mars: 2, mercury: 8,
  jupiter: 8, venus: 11, saturn: 8, rahu: 10, ketu: 4,
};

// ─── PyJHora expected varga signs — Alternate schemes ───────────────────────
// Source: PyJHora 4.8.6 hora_chart(chart_method='kashinatha'),
// hora_chart(chart_method='parivritti-dwaya'), hora_chart(chart_method='kp'),
// drekkana_chart(chart_method='parivritti-traya'),
// drekkana_chart(chart_method='somanatha'),
// chaturthamsa_chart(chart_method='parivritti'),
// ashtamsa_chart(chart_method='parivritti').
//
// Formulas validated against documented algorithms:
// - Kashinatha D-2: hora lord = sign lord (odd 1st half) or 7th lord (odd 2nd half);
//   result = own sign of hora lord. Ref: Jataka Parijata.
// - Parivritti D-2: ((sign-1)*2 + part) % 12 + 1.
// - KP D-2: 0-15° → Leo(5), 15-30° → Cancer(4).
// - Parivritti-traya D-3: ((sign-1)*3 + part) % 12 + 1.
// - Somanatha D-3: 1st=same sign, 2nd=12th from, 3rd=11th from.
// - Parivritti D-4: ((sign-1)*4 + part) % 12 + 1.
// - Parivritti D-8: ((sign-1)*8 + part) % 12 + 1.

const EXPECTED_D2_KASHINATHA: Record<string, number> = {
  ascendant: 9, sun: 5, moon: 10, mars: 10, mercury: 9,
  jupiter: 2, venus: 5, saturn: 2, rahu: 2, ketu: 1,
};

const EXPECTED_D2_PARIVRITTI: Record<string, number> = {
  ascendant: 5, sun: 9, moon: 9, mars: 7, mercury: 11,
  jupiter: 3, venus: 9, saturn: 1, rahu: 4, ketu: 4,
};

const EXPECTED_D2_KP: Record<string, number> = {
  ascendant: 5, sun: 5, moon: 5, mars: 5, mercury: 5,
  jupiter: 5, venus: 5, saturn: 5, rahu: 4, ketu: 4,
};

const EXPECTED_D3_PARIVRITTI: Record<string, number> = {
  ascendant: 1, sun: 1, moon: 7, mars: 11, mercury: 4,
  jupiter: 10, venus: 1, saturn: 7, rahu: 6, ketu: 12,
};

const EXPECTED_D3_SOMANATHA: Record<string, number> = {
  ascendant: 9, sun: 5, moon: 11, mars: 3, mercury: 6,
  jupiter: 8, venus: 5, saturn: 7, rahu: 12, ketu: 6,
};

const EXPECTED_D4_PARIVRITTI: Record<string, number> = {
  ascendant: 10, sun: 5, moon: 5, mars: 2, mercury: 9,
  jupiter: 6, venus: 6, saturn: 1, rahu: 8, ketu: 8,
};

const EXPECTED_D8_PARIVRITTI: Record<string, number> = {
  ascendant: 7, sun: 10, moon: 9, mars: 4, mercury: 5,
  jupiter: 11, venus: 11, saturn: 2, rahu: 4, ketu: 4,
};

// ─── Tests: Parashari (default) ─────────────────────────────────────────────

function assertVargaParity(
  varga: string,
  expected: Record<string, number>,
) {
  for (const [planet, expectedSign] of Object.entries(expected)) {
    Deno.test(`[Parity] ${varga} Parashari ${planet} sign matches PyJHora`, () => {
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

assertVargaParity("D2", EXPECTED_D2_PARASHARI);
assertVargaParity("D3", EXPECTED_D3_PARASHARI);
assertVargaParity("D4", EXPECTED_D4_PARASHARI);
assertVargaParity("D5", EXPECTED_D5);
assertVargaParity("D6", EXPECTED_D6);
assertVargaParity("D8", EXPECTED_D8_PARASHARI);
assertVargaParity("D11", EXPECTED_D11);

// ─── Tests: Alternate schemes ───────────────────────────────────────────────

function assertSchemeParity(
  varga: string,
  scheme: DivisionalScheme,
  label: string,
  expected: Record<string, number>,
) {
  for (const [planet, expectedSign] of Object.entries(expected)) {
    Deno.test(`[Parity] ${varga} ${label} ${planet} sign matches PyJHora`, () => {
      const [origSign, degInSign] = D1[planet];
      const actual = vargaSignWithScheme(varga, origSign, degInSign, scheme);
      assertEquals(
        actual,
        expectedSign,
        `${varga} ${label} ${planet}: vargaSignWithScheme(${varga}, ${origSign}, ${degInSign.toFixed(4)}, '${scheme}') = ${actual}, PyJHora = ${expectedSign}`,
      );
    });
  }
}

// D-2 schemes
assertSchemeParity("D2", "kashinatha", "Kashinatha", EXPECTED_D2_KASHINATHA);
assertSchemeParity("D2", "parivrittitraya", "Parivritti", EXPECTED_D2_PARIVRITTI);
assertSchemeParity("D2", "krishnamurthy", "KP", EXPECTED_D2_KP);

// D-3 schemes
assertSchemeParity("D3", "parivrittitraya", "Parivritti-traya", EXPECTED_D3_PARIVRITTI);
assertSchemeParity("D3", "somanatha", "Somanatha", EXPECTED_D3_SOMANATHA);

// D-4 schemes
assertSchemeParity("D4", "parivrittitraya", "Parivritti", EXPECTED_D4_PARIVRITTI);

// D-8 schemes
assertSchemeParity("D8", "parivrittitraya", "Parivritti", EXPECTED_D8_PARIVRITTI);

// ─── Default byte-identity assertion ────────────────────────────────────────
// Verify vargaSignWithScheme('parashari') is identical to vargaSign() for all
// D-2/3/4/8 positions, proving the default path is unchanged.

Deno.test("[Identity] vargaSignWithScheme(parashari) === vargaSign() for D-2/3/4/8", () => {
  for (const code of ['D2', 'D3', 'D4', 'D8']) {
    for (const [planet, [sign, deg]] of Object.entries(D1)) {
      const fromDefault = vargaSign(code, sign, deg);
      const fromScheme = vargaSignWithScheme(code, sign, deg, 'parashari');
      assertEquals(
        fromScheme,
        fromDefault,
        `${code} ${planet}: parashari scheme (${fromScheme}) !== default (${fromDefault})`,
      );
    }
  }
});
