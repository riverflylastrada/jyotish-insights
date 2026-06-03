/**
 * Golden-snapshot tests for yogas.ts — presence/absence + cancellation of key
 * classical yogas across 3 reference charts.
 *
 * Reference: Standard Parashari yoga definitions (BPHS) as coded in the engine,
 * cross-checked with AstroSage kundli for Amitabh Bachchan and JHora (PyJHora
 * v4.8.5, Lahiri) for Dev Chart. Planetary positions validated in parity_test.ts.
 *
 * Run with: deno test supabase/functions/calculate-kundli/yogas_test.ts
 */

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";
import type { Yoga } from "./yogas.ts";

// ─── Reference charts ───────────────────────────────────────────────────────

/** Dev Chart: Dhanu Lagna, Mars debilitated in Karka (H8), Mercury exalted in
 *  Kanya (H10), Saturn exalted in Tula (H11). Multiple Raja/Dhana yogas expected.
 *  Source: Swiss Ephemeris + AstroSage parity. */
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

/** Amitabh Bachchan: Kumbha Lagna, Jupiter exalted in Karka (H6), Venus
 *  debilitated in Kanya (H8), 4 planets in H8. Strong Gajakesari, Budhaditya.
 *  Source: AstroSage celebrity kundli (Kundli Sangraha, Bhat). */
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

/** Rajiv Gandhi: Simha Lagna, Sun + Moon + Mercury + Jupiter + Venus in Simha (H1).
 *  Strong Budhaditya Yoga, Raja Yogas from multiple kendra-trikona lord combinations.
 *  Source: Swiss Ephemeris + parity_test.ts (08:11 IST, Mumbai). */
const RAJIV: BirthDetails = {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function findYoga(yogas: Yoga[], name: string): Yoga | undefined {
  return yogas.find((y) => y.name === name);
}

function presentYogas(yogas: Yoga[]): string[] {
  return yogas.filter((y) => y.isPresent).map((y) => y.name);
}

// ─── Structural tests ───────────────────────────────────────────────────────

Deno.test("yogas: every yoga has required fields", async () => {
  const k = await calculateKundli(DEV_CHART);
  for (const y of k.yogas) {
    assert(typeof y.name === "string" && y.name.length > 0, "name");
    assert(typeof y.category === "string", "category");
    assert(typeof y.isPresent === "boolean", "isPresent");
    assert(["weak", "moderate", "strong"].includes(y.strength), `strength: ${y.strength}`);
    assert(Array.isArray(y.formedBy), "formedBy");
    assert(typeof y.explanation === "string", "explanation");
    assert(Array.isArray(y.effects), "effects");
  }
});

Deno.test("yogas: present yogas have non-empty formedBy", async () => {
  const k = await calculateKundli(DEV_CHART);
  for (const y of k.yogas.filter((y: Yoga) => y.isPresent)) {
    assert(y.formedBy.length > 0, `${y.name} formedBy should not be empty`);
  }
});

// ─── Dev Chart: specific yogas ──────────────────────────────────────────────

Deno.test("yogas: Dev Chart — Neechabhanga Raja Yoga present (Mars debilitated, cancelled)", async () => {
  // Mars debilitated in Karka (sign 4). Cancellation: exaltation lord Jupiter aspecting,
  // or debilitation lord Moon in kendra. Engine detects NBRY.
  // JHora confirms NBRY for this chart.
  const k = await calculateKundli(DEV_CHART);
  const nbry = findYoga(k.yogas, "Neechabhanga Raja Yoga");
  assert(nbry !== undefined, "NBRY should be detected");
  assertEquals(nbry!.isPresent, true);
  assertEquals(nbry!.strength, "strong");
});

Deno.test("yogas: Dev Chart — Bhadra Yoga present (Mercury in kendra in own/exalted sign)", async () => {
  // Mercury exalted in Kanya (sign 6, H10 = kendra). Bhadra is one of
  // Pancha Mahapurusha yogas: Mercury in kendra in own/exalted sign.
  const k = await calculateKundli(DEV_CHART);
  const bhadra = findYoga(k.yogas, "Bhadra Yoga");
  assert(bhadra !== undefined, "Bhadra Yoga should be detected");
  assertEquals(bhadra!.isPresent, true);
  assertEquals(bhadra!.category, "pancha_mahapurusha");
});

Deno.test("yogas: Dev Chart — Gajakesari Yoga present", async () => {
  // Jupiter in kendra from Moon: Jupiter H12, Moon H3. 12→3 = nthFrom(12,3) = 4 (kendra).
  const k = await calculateKundli(DEV_CHART);
  const gk = findYoga(k.yogas, "Gajakesari Yoga");
  assert(gk !== undefined, "Gajakesari should be detected");
  assertEquals(gk!.isPresent, true);
});

Deno.test("yogas: Dev Chart — Viparita Raja Yoga present", async () => {
  // Dusthana lord in another dusthana → Viparita Raja Yoga
  const k = await calculateKundli(DEV_CHART);
  const vry = findYoga(k.yogas, "Viparita Raja Yoga");
  assert(vry !== undefined);
  assertEquals(vry!.isPresent, true);
});

Deno.test("yogas: Dev Chart — Dhana Yoga present", async () => {
  const k = await calculateKundli(DEV_CHART);
  const dhana = findYoga(k.yogas, "Dhana Yoga");
  assert(dhana !== undefined);
  assertEquals(dhana!.isPresent, true);
  assertEquals(dhana!.category, "dhana");
});

// ─── Amitabh: specific yogas ────────────────────────────────────────────────

Deno.test("yogas: Amitabh — Gajakesari Yoga present", async () => {
  // Jupiter exalted in Karka (H6), Moon in Tula (H9).
  // nthFrom(6, 9) = 4 → kendra from Jupiter's house. Gajakesari applies.
  const k = await calculateKundli(AMITABH);
  const gk = findYoga(k.yogas, "Gajakesari Yoga");
  assert(gk !== undefined, "Gajakesari should be detected for Amitabh");
  assertEquals(gk!.isPresent, true);
});

Deno.test("yogas: Amitabh — Budhaditya Yoga present (Sun + Mercury in same sign)", async () => {
  // Sun and Mercury both in Kanya (sign 6). Budhaditya = Sun + Mercury conjunction.
  // AstroSage confirms Budhaditya for this chart.
  const k = await calculateKundli(AMITABH);
  const by = findYoga(k.yogas, "Budhaditya Yoga");
  assert(by !== undefined, "Budhaditya should be detected");
  assertEquals(by!.isPresent, true);
});

Deno.test("yogas: Amitabh — Akhanda Samrajya Yoga present", async () => {
  // Detected by engine for this chart configuration
  const k = await calculateKundli(AMITABH);
  const aks = findYoga(k.yogas, "Akhanda Samrajya Yoga");
  assert(aks !== undefined);
  assertEquals(aks!.isPresent, true);
});

// ─── Rajiv: specific yogas ──────────────────────────────────────────────────

Deno.test("yogas: Rajiv — Budhaditya Yoga present (Sun + Mercury in Simha H1)", async () => {
  // Sun in Simha (own sign) + Mercury in Simha in lagna → strong Budhaditya
  const k = await calculateKundli(RAJIV);
  const by = findYoga(k.yogas, "Budhaditya Yoga");
  assert(by !== undefined);
  assertEquals(by!.isPresent, true);
  assertEquals(by!.strength, "strong");
});

Deno.test("yogas: Rajiv — Raja Yoga present (kendra-trikona lord exchange)", async () => {
  const k = await calculateKundli(RAJIV);
  const ry = findYoga(k.yogas, "Raja Yoga");
  assert(ry !== undefined);
  assertEquals(ry!.isPresent, true);
});

Deno.test("yogas: Rajiv — Mahabhagya Yoga present", async () => {
  const k = await calculateKundli(RAJIV);
  const mby = findYoga(k.yogas, "Mahabhagya Yoga");
  assert(mby !== undefined);
  assertEquals(mby!.isPresent, true);
});

Deno.test("yogas: Rajiv — Saraswati Yoga present", async () => {
  // Jupiter, Venus, Mercury in kendra/trikona
  const k = await calculateKundli(RAJIV);
  const sw = findYoga(k.yogas, "Saraswati Yoga");
  assert(sw !== undefined);
  assertEquals(sw!.isPresent, true);
});

// ─── Absence tests ──────────────────────────────────────────────────────────

Deno.test("yogas: Dev Chart — no Hamsa/Malavya/Ruchaka (Pancha Mahapurusha)", async () => {
  // Hamsa: Jupiter in kendra in own/exalted. Jupiter is in H12 (not kendra) → absent.
  // Malavya: Venus in kendra in own/exalted. Venus is in H9 (not kendra) → absent.
  // Ruchaka: Mars in kendra in own/exalted. Mars debilitated → absent.
  const k = await calculateKundli(DEV_CHART);
  const hamsa = findYoga(k.yogas, "Hamsa Yoga");
  const malavya = findYoga(k.yogas, "Malavya Yoga");
  const ruchaka = findYoga(k.yogas, "Ruchaka Yoga");
  if (hamsa) assertEquals(hamsa.isPresent, false);
  if (malavya) assertEquals(malavya.isPresent, false);
  if (ruchaka) assertEquals(ruchaka.isPresent, false);
});

Deno.test("yogas: Amitabh — no Sasha Yoga (Saturn not in kendra in own/exalted)", async () => {
  // Saturn in Vrishabha (H4 = kendra) but in friend sign, not own/exalted → absent
  const k = await calculateKundli(AMITABH);
  const sasha = findYoga(k.yogas, "Sasha Yoga");
  if (sasha) assertEquals(sasha.isPresent, false);
});

// ─── Cross-chart comparison ─────────────────────────────────────────────────

Deno.test("yogas: yoga count is consistent (>= 20 yogas checked per chart)", async () => {
  const k1 = await calculateKundli(DEV_CHART);
  const k2 = await calculateKundli(AMITABH);
  assert(k1.yogas.length >= 20, `Dev yogas: ${k1.yogas.length}`);
  assert(k2.yogas.length >= 20, `Amitabh yogas: ${k2.yogas.length}`);
});

Deno.test("yogas: present yoga lists differ between charts (not trivially same)", async () => {
  const k1 = await calculateKundli(DEV_CHART);
  const k2 = await calculateKundli(AMITABH);
  const p1 = presentYogas(k1.yogas);
  const p2 = presentYogas(k2.yogas);
  // The two charts should not have identical yoga sets
  const same = p1.length === p2.length && p1.every((y) => p2.includes(y));
  assert(!same, "Different charts should produce different yoga sets");
});
