/**
 * Avasthas Test — validates Baladi, Jagradadi, and Deeptadi planetary states
 * (BPHS Ch. 45) against the 3 reference charts used by the parity harness.
 *
 * Run with: deno test supabase/functions/calculate-kundli/avasthas_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";

// ─── Reference chart birth details (mirrors parity_test.ts) ─────────────────

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

const RAJIV_GANDHI: BirthDetails = {
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

// ─── Expected avasthas per chart ────────────────────────────────────────────

interface ExpectedAvasthas {
  baladi: string;
  jagradadi: string;
  deeptadi: string;
}

/**
 * Dev Chart (Dhanu Lagna):
 *   Sun   @ Simha  6.09° → odd sign: 6-12°=Kumara | mooltrikona→Jagrat | Swastha
 *   Moon  @ Kumbha 3.85° → odd sign: 0-6°=Bala    | neutral→Swapna     | Shanta
 *   Mars  @ Karka 12.63° → even sign: 12-18°=Yuva | debilitated→Sushupti | Khala
 *   Mercury @ Kanya 3.05° → even sign: 0-6°=Mrita | exalted→Jagrat     | Deepta
 *   Jupiter @ Vrischika 8.39° → even sign: 6-12°=Vriddha | friend→Swapna | Dina (conj Ketu)
 *   Venus @ Simha  8.89° → odd sign: 6-12°=Kumara | enemy→Sushupti     | Vikala (combust)
 *   Saturn @ Tula  6.29° → odd sign: 6-12°=Kumara | exalted→Jagrat     | Deepta
 */
const DEV_EXPECTED: Record<string, ExpectedAvasthas> = {
  sun:     { baladi: 'kumara',  jagradadi: 'jagrat',   deeptadi: 'swastha' },
  moon:    { baladi: 'bala',    jagradadi: 'swapna',   deeptadi: 'shanta' },
  mars:    { baladi: 'yuva',    jagradadi: 'sushupti', deeptadi: 'khala' },
  mercury: { baladi: 'mrita',   jagradadi: 'jagrat',   deeptadi: 'deepta' },
  jupiter: { baladi: 'vriddha', jagradadi: 'swapna',   deeptadi: 'dina' },
  venus:   { baladi: 'kumara',  jagradadi: 'sushupti', deeptadi: 'vikala' },
  saturn:  { baladi: 'kumara',  jagradadi: 'jagrat',   deeptadi: 'deepta' },
};

/**
 * Rajiv Gandhi (Simha Lagna):
 *   Sun   @ Simha  3.86° → odd sign: 0-6°=Bala      | mooltrikona→Jagrat | Swastha
 *   Moon  @ Simha 17.64° → odd sign: 12-18°=Yuva     | friend→Swapna      | Dina (conj Sun, natural malefic)
 *   Mars  @ Kanya  1.22° → even sign: 0-6°=Mrita     | enemy→Sushupti     | Peedita (enemy, alone in sign)
 *   Mercury @ Simha 28.58° → odd sign: 24-30°=Mrita  | friend→Swapna      | Dina (conj Sun)
 *   Jupiter @ Simha 12.21° → odd sign: 12-18°=Yuva   | friend→Swapna      | Vikala (combust, 8.35° < 11° orb)
 *   Venus @ Simha 18.70° → odd sign: 18-24°=Vriddha  | enemy→Sushupti     | Dina (conj Sun, not combust)
 *   Saturn @ Mithuna 14.22° → odd sign: 12-18°=Yuva  | friend→Swapna      | Pramudita (friend)
 */
const RAJIV_EXPECTED: Record<string, ExpectedAvasthas> = {
  sun:     { baladi: 'bala',    jagradadi: 'jagrat',  deeptadi: 'swastha' },
  moon:    { baladi: 'yuva',    jagradadi: 'swapna',  deeptadi: 'dina' },
  mars:    { baladi: 'mrita',   jagradadi: 'sushupti', deeptadi: 'peedita' },
  mercury: { baladi: 'mrita',   jagradadi: 'swapna',  deeptadi: 'dina' },
  jupiter: { baladi: 'yuva',    jagradadi: 'swapna',  deeptadi: 'vikala' },
  venus:   { baladi: 'vriddha', jagradadi: 'sushupti', deeptadi: 'dina' },
  saturn:  { baladi: 'yuva',    jagradadi: 'swapna',  deeptadi: 'pramudita' },
};

/**
 * Amitabh Bachchan (Kumbha Lagna):
 *   Sun   @ Kanya 24.42° → even sign: 24-30°=Bala   | neutral→Swapna    | Dina (conj Mars, natural malefic)
 *   Moon  @ Tula  10.90° → odd sign: 6-12°=Kumara    | neutral→Swapna    | Shanta (neutral)
 *   Mars  @ Kanya 22.63° → even sign: 18-24°=Kumara  | enemy→Sushupti    | Vikala (combust, 1.79° < 17° orb)
 *   Mercury @ Kanya 23.61° → even sign: 18-24°=Kumara| exalted→Jagrat    | Deepta (exalted overrides combust)
 *   Jupiter @ Karka  0.54° → even sign: 0-6°=Mrita   | exalted→Jagrat    | Deepta (exalted)
 *   Venus @ Kanya 15.24° → even sign: 12-18°=Yuva    | debilitated→Sushupti | Khala (debilitated)
 *   Saturn @ Vrishabha 19.23° → even sign: 18-24°=Kumara | friend→Swapna | Shakta (retro)
 */
const AMITABH_EXPECTED: Record<string, ExpectedAvasthas> = {
  sun:     { baladi: 'bala',    jagradadi: 'swapna',  deeptadi: 'dina' },
  moon:    { baladi: 'kumara',  jagradadi: 'swapna',  deeptadi: 'shanta' },
  mars:    { baladi: 'kumara',  jagradadi: 'sushupti', deeptadi: 'vikala' },
  mercury: { baladi: 'kumara',  jagradadi: 'jagrat',  deeptadi: 'deepta' },
  jupiter: { baladi: 'mrita',   jagradadi: 'jagrat',  deeptadi: 'deepta' },
  venus:   { baladi: 'yuva',    jagradadi: 'sushupti', deeptadi: 'khala' },
  saturn:  { baladi: 'kumara',  jagradadi: 'swapna',  deeptadi: 'shakta' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVEN_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("Avasthas: Dev Chart — all 7 planets", async () => {
  const result = await calculateKundli(DEV_CHART);
  const d1 = result.divisionalCharts.find((c: { varga: string }) => c.varga === 'D1')!;

  for (const pName of SEVEN_PLANETS) {
    const planet = d1.planets.find((p: { planet: string }) => p.planet === pName);
    if (!planet) throw new Error(`Planet ${pName} not found in D1`);
    const av = planet.avasthas;
    if (!av) throw new Error(`Planet ${pName} has no avasthas`);
    const exp = DEV_EXPECTED[pName];

    assertEquals(av.baladi, exp.baladi, `${pName} baladi: expected ${exp.baladi}, got ${av.baladi}`);
    assertEquals(av.jagradadi, exp.jagradadi, `${pName} jagradadi: expected ${exp.jagradadi}, got ${av.jagradadi}`);
    assertEquals(av.deeptadi, exp.deeptadi, `${pName} deeptadi: expected ${exp.deeptadi}, got ${av.deeptadi}`);
  }
});

Deno.test("Avasthas: Rajiv Gandhi — all 7 planets", async () => {
  const result = await calculateKundli(RAJIV_GANDHI);
  const d1 = result.divisionalCharts.find((c: { varga: string }) => c.varga === 'D1')!;

  for (const pName of SEVEN_PLANETS) {
    const planet = d1.planets.find((p: { planet: string }) => p.planet === pName);
    if (!planet) throw new Error(`Planet ${pName} not found in D1`);
    const av = planet.avasthas;
    if (!av) throw new Error(`Planet ${pName} has no avasthas`);
    const exp = RAJIV_EXPECTED[pName];

    assertEquals(av.baladi, exp.baladi, `${pName} baladi: expected ${exp.baladi}, got ${av.baladi}`);
    assertEquals(av.jagradadi, exp.jagradadi, `${pName} jagradadi: expected ${exp.jagradadi}, got ${av.jagradadi}`);
    assertEquals(av.deeptadi, exp.deeptadi, `${pName} deeptadi: expected ${exp.deeptadi}, got ${av.deeptadi}`);
  }
});

Deno.test("Avasthas: Amitabh Bachchan — all 7 planets", async () => {
  const result = await calculateKundli(AMITABH);
  const d1 = result.divisionalCharts.find((c: { varga: string }) => c.varga === 'D1')!;

  for (const pName of SEVEN_PLANETS) {
    const planet = d1.planets.find((p: { planet: string }) => p.planet === pName);
    if (!planet) throw new Error(`Planet ${pName} not found in D1`);
    const av = planet.avasthas;
    if (!av) throw new Error(`Planet ${pName} has no avasthas`);
    const exp = AMITABH_EXPECTED[pName];

    assertEquals(av.baladi, exp.baladi, `${pName} baladi: expected ${exp.baladi}, got ${av.baladi}`);
    assertEquals(av.jagradadi, exp.jagradadi, `${pName} jagradadi: expected ${exp.jagradadi}, got ${av.jagradadi}`);
    assertEquals(av.deeptadi, exp.deeptadi, `${pName} deeptadi: expected ${exp.deeptadi}, got ${av.deeptadi}`);
  }
});

Deno.test("Avasthas: Rahu/Ketu return undefined", async () => {
  const result = await calculateKundli(DEV_CHART);
  const d1 = result.divisionalCharts.find((c: { varga: string }) => c.varga === 'D1')!;

  for (const node of ['rahu', 'ketu']) {
    const planet = d1.planets.find((p: { planet: string }) => p.planet === node);
    if (!planet) throw new Error(`${node} not found in D1`);
    assertEquals(planet.avasthas, undefined, `${node} should have undefined avasthas`);
  }
});

Deno.test("Avasthas: citations are non-empty strings", async () => {
  const result = await calculateKundli(DEV_CHART);
  const d1 = result.divisionalCharts.find((c: { varga: string }) => c.varga === 'D1')!;

  for (const pName of SEVEN_PLANETS) {
    const planet = d1.planets.find((p: { planet: string }) => p.planet === pName);
    if (!planet?.avasthas) throw new Error(`${pName} missing avasthas`);
    const av = planet.avasthas;
    assertEquals(typeof av.baladiCitation, 'string');
    assertEquals(typeof av.jagradadiCitation, 'string');
    assertEquals(typeof av.deeptadiCitation, 'string');
    assertEquals(av.baladiCitation.length > 0, true, `${pName} baladiCitation empty`);
    assertEquals(av.jagradadiCitation.length > 0, true, `${pName} jagradadiCitation empty`);
    assertEquals(av.deeptadiCitation.length > 0, true, `${pName} deeptadiCitation empty`);
  }
});
