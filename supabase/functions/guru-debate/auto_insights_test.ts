/**
 * Deno tests for the auto-insights JSON schema validation.
 * Covers: valid shape acceptance, missing-field rejection, and partial-field
 * rejection to ensure the server-side validator gates bad LLM output.
 */

import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { validateAutoInsightsJson } from "./validate_auto_insights.ts";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makePlanets() {
  const keys = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const out: Record<string, { brief: string; full: string }> = {};
  for (const k of keys) {
    out[k] = { brief: `${k} brief`, full: `${k} full reading` };
  }
  return out;
}

function makeHouses() {
  const out: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) out[String(i)] = `House ${i} theme`;
  return out;
}

function makeValidPayload() {
  return {
    planets: makePlanets(),
    dashas: [
      { system: 'vimshottari', level: 'maha', lord: 'saturn', period: '2020-2039', reading: 'Saturn period reading' },
      { system: 'vimshottari', level: 'antar', lord: 'mercury', period: '2024-2026', reading: 'Mercury sub-period' },
    ],
    yogas: { 'Hamsa Yoga': 'Jupiter in kendra', 'Budhaditya': 'Sun-Mercury conjunction' },
    doshas: { mangal: 'Mars in 7th house' },
    houses: makeHouses(),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

Deno.test("auto-insights: validates a correct payload", () => {
  const payload = makeValidPayload();
  assertEquals(validateAutoInsightsJson(payload), true);
});

Deno.test("auto-insights: rejects null", () => {
  assertEquals(validateAutoInsightsJson(null), false);
});

Deno.test("auto-insights: rejects non-object", () => {
  assertEquals(validateAutoInsightsJson("string"), false);
  assertEquals(validateAutoInsightsJson(42), false);
});

Deno.test("auto-insights: rejects missing planets", () => {
  const p = makeValidPayload();
  delete (p as Record<string, unknown>).planets;
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects incomplete planets (missing ketu)", () => {
  const p = makeValidPayload();
  delete (p.planets as Record<string, unknown>).ketu;
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects planet with missing brief", () => {
  const p = makeValidPayload();
  (p.planets as Record<string, unknown>).sun = { full: "only full" };
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects non-array dashas", () => {
  const p = makeValidPayload();
  (p as Record<string, unknown>).dashas = "not an array";
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects dasha entry missing reading", () => {
  const p = makeValidPayload();
  p.dashas.push({ system: 'vimshottari', level: 'maha', lord: 'sun', period: '2039-2045' } as any);
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: accepts empty dashas array", () => {
  const p = makeValidPayload();
  p.dashas = [];
  assertEquals(validateAutoInsightsJson(p), true);
});

Deno.test("auto-insights: rejects missing yogas", () => {
  const p = makeValidPayload();
  delete (p as Record<string, unknown>).yogas;
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects non-string yoga value", () => {
  const p = makeValidPayload();
  (p.yogas as Record<string, unknown>)['Hamsa Yoga'] = 123;
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects missing houses", () => {
  const p = makeValidPayload();
  delete (p as Record<string, unknown>).houses;
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: rejects incomplete houses (missing house 12)", () => {
  const p = makeValidPayload();
  delete (p.houses as Record<string, unknown>)['12'];
  assertEquals(validateAutoInsightsJson(p), false);
});

Deno.test("auto-insights: accepts empty yogas/doshas", () => {
  const p = makeValidPayload();
  (p as Record<string, unknown>).yogas = {};
  (p as Record<string, unknown>).doshas = {};
  assertEquals(validateAutoInsightsJson(p), true);
});

Deno.test("auto-insights: rejects missing doshas", () => {
  const p = makeValidPayload();
  delete (p as Record<string, unknown>).doshas;
  assertEquals(validateAutoInsightsJson(p), false);
});
