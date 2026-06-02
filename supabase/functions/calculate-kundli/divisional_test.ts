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
 * Run with: deno test supabase/functions/calculate-kundli/divisional_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";

// ─── Reference chart ────────────────────────────────────────────────────────

const REF_BIRTH: BirthDetails = {
  fullName: "Parity Ref (Patan 1983)",
  dateOfBirth: "1983-08-23",
  timeOfBirth: "15:35",
  placeOfBirth: {
    name: "Patan",
    latitude: 23.85,
    longitude: 72.12,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  gender: "male",
};

// ─── PyJHora expected varga signs (1-indexed) ───────────────────────────────
// Source: PyJHora 4.8.6, charts.divisional_chart(jd, place, divisional_chart_factor=N)
// Julian Day 2445570.1493055555
// Format: { planet: expected_sign_1indexed }
// Index in PyJHora result: [0]=Lagna, [1]=Sun, [2]=Moon, [3]=Mars,
//   [4]=Mercury, [5]=Jupiter, [6]=Venus, [7]=Saturn, [8]=Rahu, [9]=Ketu

const EXPECTED_D5: Record<string, number> = {
  ascendant: 11, // Kumbha
  sun: 1,        // Mesha
  moon: 1,       // Mesha
  mars: 6,       // Kanya
  mercury: 2,    // Vrishabha
  jupiter: 6,    // Kanya
  venus: 11,     // Kumbha
  saturn: 1,     // Mesha
  rahu: 8,       // Vrischika
  ketu: 8,       // Vrischika
};

const EXPECTED_D6: Record<string, number> = {
  ascendant: 2,  // Vrishabha
  sun: 2,        // Vrishabha
  moon: 1,       // Mesha
  mars: 9,       // Dhanu
  mercury: 7,    // Tula
  jupiter: 8,    // Vrischika
  venus: 2,      // Vrishabha
  saturn: 2,     // Vrishabha
  rahu: 12,      // Meena
  ketu: 12,      // Meena
};

const EXPECTED_D8: Record<string, number> = {
  ascendant: 7,  // Tula
  sun: 10,       // Makara
  moon: 9,       // Dhanu
  mars: 4,       // Karka
  mercury: 5,    // Simha
  jupiter: 11,   // Kumbha
  venus: 11,     // Kumbha
  saturn: 2,     // Vrishabha
  rahu: 4,       // Karka
  ketu: 4,       // Karka
};

const EXPECTED_D11: Record<string, number> = {
  ascendant: 8,  // Vrischika
  sun: 10,       // Makara
  moon: 4,       // Karka
  mars: 2,       // Vrishabha
  mercury: 8,    // Vrischika
  jupiter: 8,    // Vrischika
  venus: 11,     // Kumbha
  saturn: 8,     // Vrischika
  rahu: 10,      // Makara
  ketu: 4,       // Karka
};

// ─── Tests ──────────────────────────────────────────────────────────────────

const chart = await calculateKundli(REF_BIRTH);

function findDivChart(varga: string) {
  const dc = chart.divisionalCharts?.find((c) => c.varga === varga);
  if (!dc) throw new Error(`Divisional chart ${varga} not found in engine output`);
  return dc;
}

function assertVargaSigns(
  varga: string,
  expected: Record<string, number>,
) {
  const dc = findDivChart(varga);

  // Ascendant sign
  Deno.test(`[Parity] ${varga} ascendant sign matches PyJHora`, () => {
    assertEquals(
      dc.ascendantSign,
      expected.ascendant,
      `${varga} ascendant: engine=${dc.ascendantSign}, PyJHora=${expected.ascendant}`,
    );
  });

  // Planet signs
  for (const [planet, expectedSign] of Object.entries(expected)) {
    if (planet === "ascendant") continue;
    Deno.test(`[Parity] ${varga} ${planet} sign matches PyJHora`, () => {
      const p = dc.planets.find((pp) => pp.planet === planet);
      if (!p) throw new Error(`${varga}: planet ${planet} not found`);
      assertEquals(
        p.signNumber,
        expectedSign,
        `${varga} ${planet}: engine=${p.signNumber}, PyJHora=${expectedSign}`,
      );
    });
  }
}

assertVargaSigns("D5", EXPECTED_D5);
assertVargaSigns("D6", EXPECTED_D6);
assertVargaSigns("D8", EXPECTED_D8);
assertVargaSigns("D11", EXPECTED_D11);
