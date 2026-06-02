/**
 * Sahams Parity Test — validates computeSahams against PyJHora v4.8.6
 * `jhora.horoscope.transit.saham` (punya_saham, vidya_saham, …).
 *
 * Reference chart: 23 Aug 1983, 15:35 IST, Patan (23.85, 72.12, +5.5), Lahiri.
 * Day birth (Sun in house 9 — above horizon).
 *
 * PyJHora values obtained by running each *_saham() with night_time_birth=False
 * on the rasi_chart for the reference chart.
 *
 * Run with: deno test supabase/functions/calculate-kundli/sahams_test.ts
 */

import {
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSahams } from "./sahams.ts";

// ─── Reference chart planet longitudes (from PyJHora rasi_chart) ────────────
// Format: sign*30 + degree-in-sign (0-indexed sign → absolute sidereal longitude)
// Lagna: sign 8 (Dhanu), 8.68° → 8*30 + 8.68 = 248.68
// Sun:   sign 4 (Simha), 5.22° → 4*30 + 5.22 = 125.22
// Moon:  sign 10 (Kumbha), 2.98° → 10*30 + 2.98 = 302.98
// Mars:  sign 3 (Karka), 11.76° → 3*30 + 11.76 = 101.76
// Mercury: sign 5 (Kanya), 2.17° → 5*30 + 2.17 = 152.17
// Jupiter: sign 7 (Vrischika/Tula), 7.51° → 7*30 + 7.51 = 217.51
// Venus: sign 4 (Simha), 8.01° → 4*30 + 8.01 = 128.01
// Saturn: sign 6 (Tula), 5.41° → 6*30 + 5.41 = 185.41

const REF_LONS = {
  ascendant: 248.6802,
  sun: 125.2156,
  moon: 302.9752,
  mars: 101.7597,
  mercury: 152.1714,
  jupiter: 217.5104,
  venus: 128.0132,
  saturn: 185.4121,
};

const ASC_SIGN = 9; // Dhanu (Sagittarius)
const IS_DAY_BIRTH = true; // Sun in house 9 (above horizon)

// ─── PyJHora expected values (night_time_birth=False) ───────────────────────
// Each entry: [sahamId, expectedLongitude, expectedSign]
const EXPECTED: Array<[string, number, number]> = [
  ['punya',       66.4398,  3],
  ['vidya',      100.9206,  4],
  ['yasas',       69.7507,  3],
  ['mitra',      279.0837, 10],
  ['mahatmya',   213.3603,  8],
  ['asha',         2.3326,  1],
  ['samartha',   132.9295,  5],
  ['bhratri',    310.7784, 11],
  ['gaurava',     39.7507,  2],
  ['pitri',      338.8768, 12],
  ['rajya',      338.8768, 12],
  ['matri',       63.6422,  3],
  ['putra',      193.2154,  7],
  ['jeeva',      216.5820,  8],
  ['karma',      198.2684,  7],
  ['roga',       194.3852,  7],
  ['kali',        34.4309,  2],
  ['sastra',     214.2697,  8],
  ['bandhu',     127.8765,  5],
  ['mrithyu',     44.3852,  2],
  ['paradesa',   252.1448,  9],
  ['artha',      341.9483, 12],
  ['paradara',   251.4778,  9],
  ['vanika',      39.4839,  2],
  ['karyasiddhi', 215.4121, 8],
  ['vivaha',     191.2813,  7],
  ['santapa',    311.1171, 11],
  ['sraddha',    304.9337, 11],
  ['preethi',     66.5101,  3],
  ['jadya',       98.5190,  4],
  ['vyaapaara',  165.0278,  6],
  ['sathru',     165.0278,  6],
  ['jalapatna',  168.2681,  6],
  ['bandhana',   129.7079,  5],
  ['apamrithyu', 245.6007,  9],
  ['laabha',     309.3472, 11],
];

// Tolerance: ±0.5° as specified in the feature spec
const TOLERANCE = 0.5;

Deno.test("Sahams: day/night determination", () => {
  const result = computeSahams(REF_LONS, ASC_SIGN, IS_DAY_BIRTH);
  assertEquals(result.isDayBirth, true);
});

Deno.test("Sahams: 36 sahams computed", () => {
  const result = computeSahams(REF_LONS, ASC_SIGN, IS_DAY_BIRTH);
  assertEquals(result.sahams.length, 36);
});

Deno.test("Sahams: parity with PyJHora v4.8.6 (±0.5°)", () => {
  const result = computeSahams(REF_LONS, ASC_SIGN, IS_DAY_BIRTH);
  const sahamMap = new Map(result.sahams.map(s => [s.id, s]));

  for (const [id, expectedLon, expectedSign] of EXPECTED) {
    const s = sahamMap.get(id);
    if (!s) {
      throw new Error(`Saham '${id}' not found in results`);
    }

    // Assert sign matches
    assertEquals(
      s.signNumber,
      expectedSign,
      `${id}: sign mismatch — got ${s.signNumber}, expected ${expectedSign}`,
    );

    // Assert longitude within tolerance
    assertAlmostEquals(
      s.longitude,
      expectedLon,
      TOLERANCE,
      `${id}: longitude mismatch — got ${s.longitude.toFixed(4)}, expected ${expectedLon.toFixed(4)} (±${TOLERANCE}°)`,
    );
  }
});
