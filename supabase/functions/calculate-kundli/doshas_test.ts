/**
 * Doshas Test — validates:
 *   (a) conditions[] match the rule on ≥3 reference charts
 *   (b) isPresent + severity byte-identical to pre-refactor output
 *
 * Run with: deno test supabase/functions/calculate-kundli/doshas_test.ts
 */

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";
import type { Dosha, DoshaCondition } from "./doshas.ts";

// ─── Reference charts (reuse from parity_test) ─────────────────────────────

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

const AMITABH_BACHCHAN: BirthDetails = {
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

// ─── Pre-refactor expected verdicts (isPresent + severity) ──────────────────
// These were frozen from the pre-refactor engine output. The refactor must
// produce byte-identical values.

interface DoshaVerdict {
  name: string;
  isPresent: boolean;
  severity: string | undefined;
}

const PRE_REFACTOR_VERDICTS: Record<string, DoshaVerdict[]> = {
  dev: [
    { name: "mangal", isPresent: true, severity: "low" },
    { name: "kaal_sarp", isPresent: false, severity: undefined },
    { name: "sade_sati", isPresent: false, severity: undefined },
    { name: "pitra", isPresent: false, severity: undefined },
    { name: "guru_chandal", isPresent: false, severity: undefined },
    { name: "shakat", isPresent: false, severity: undefined },
  ],
  rajiv: [
    { name: "mangal", isPresent: true, severity: "medium" },
    { name: "kaal_sarp", isPresent: false, severity: undefined },
    { name: "sade_sati", isPresent: false, severity: undefined },
    { name: "pitra", isPresent: false, severity: undefined },
    { name: "guru_chandal", isPresent: false, severity: undefined },
    { name: "shakat", isPresent: false, severity: undefined },
  ],
  amitabh: [
    { name: "mangal", isPresent: true, severity: "high" },
    { name: "kaal_sarp", isPresent: false, severity: undefined },
    { name: "sade_sati", isPresent: false, severity: undefined },
    { name: "pitra", isPresent: false, severity: undefined },
    { name: "guru_chandal", isPresent: false, severity: undefined },
    { name: "shakat", isPresent: false, severity: undefined },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function findDosha(doshas: Dosha[], name: string): Dosha {
  const d = doshas.find((x) => x.name === name);
  if (!d) throw new Error(`Dosha '${name}' not found`);
  return d;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("doshas: all doshas have conditions[] and cancellations[]", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  for (const d of kundli.doshas) {
    assert(
      Array.isArray(d.conditions),
      `${d.name}: conditions should be an array`,
    );
    assert(
      Array.isArray(d.cancellations),
      `${d.name}: cancellations should be an array`,
    );
    // Each condition must have rule + isMet
    for (const c of d.conditions!) {
      assert(typeof c.rule === "string" && c.rule.length > 0, `${d.name}: condition missing rule`);
      assert(typeof c.isMet === "boolean", `${d.name}: condition missing isMet`);
    }
    for (const c of d.cancellations!) {
      assert(typeof c.rule === "string" && c.rule.length > 0, `${d.name}: cancellation missing rule`);
      assert(typeof c.isMet === "boolean", `${d.name}: cancellation missing isMet`);
    }
  }
});

Deno.test("doshas: conditions correctness — Dev Chart (Mangal Dosha active)", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  const mangal = findDosha(kundli.doshas, "mangal");

  // Dev chart: Mars in H8 from Lagna (Dhanu) — Mangal Dosha present, mitigated by Jupiter
  assertEquals(mangal.isPresent, true);
  assertEquals(mangal.severity, "low");

  // Condition: Mars in mangal houses from Lagna should be met
  const condLagna = mangal.conditions!.find((c) => c.rule.includes("Lagna"));
  assert(condLagna !== undefined, "Should have Mars-from-Lagna condition");
  assertEquals(condLagna!.isMet, true);
  assert(condLagna!.evidence?.includes("House 8"), `evidence should mention House 8, got: ${condLagna!.evidence}`);

  // Check cancellations exist
  assert(mangal.cancellations!.length >= 2, "Should have at least 2 cancellation rules");
});

Deno.test("doshas: conditions correctness — Rajiv Gandhi (Mangal in H2)", async () => {
  const kundli = await calculateKundli(RAJIV_GANDHI);
  const mangal = findDosha(kundli.doshas, "mangal");

  // Rajiv: Mars@sign6 (Kanya), Asc@sign5 (Simha), house = 2 — mangal houses include 2
  assertEquals(mangal.isPresent, true);
  assertEquals(mangal.severity, "medium");
  const condLagna = mangal.conditions!.find((c) => c.rule.includes("Lagna"));
  assert(condLagna !== undefined, "Should have Mars-from-Lagna condition");
  assertEquals(condLagna!.isMet, true);
  assertEquals(mangal.isPresent, condLagna!.isMet);
});

Deno.test("doshas: conditions correctness — Amitabh Bachchan", async () => {
  const kundli = await calculateKundli(AMITABH_BACHCHAN);
  const mangal = findDosha(kundli.doshas, "mangal");
  const condLagna = mangal.conditions!.find((c) => c.rule.includes("Lagna"));
  assert(condLagna !== undefined, "Should have Mars-from-Lagna condition");
  assertEquals(mangal.isPresent, condLagna!.isMet);

  // Kaal Sarp: check conditions present
  const kaalSarp = findDosha(kundli.doshas, "kaal_sarp");
  assert(kaalSarp.conditions!.length >= 1, "Kaal Sarp should have at least 1 condition");
  assertEquals(kaalSarp.isPresent, kaalSarp.conditions![0].isMet);
});

Deno.test("doshas: Kaal Sarp conditions — all 3 charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const ks = findDosha(kundli.doshas, "kaal_sarp");
    assert(ks.conditions!.length >= 1, `${bd.fullName}: Kaal Sarp needs conditions`);
    const hemming = ks.conditions![0];
    assertEquals(hemming.rule, "All grahas hemmed between Rahu-Ketu axis");
    assert(typeof hemming.evidence === "string", `${bd.fullName}: Kaal Sarp needs evidence`);
    assert(hemming.citation === "Phaladeepika", `${bd.fullName}: Kaal Sarp citation`);
  }
});

Deno.test("doshas: Sade Sati conditions — all 3 charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const ss = findDosha(kundli.doshas, "sade_sati");
    assert(ss.conditions!.length === 3, `${bd.fullName}: Sade Sati needs 3 conditions (12th/1st/2nd)`);
    // At most one should be met (or none)
    const metCount = ss.conditions!.filter((c) => c.isMet).length;
    assert(metCount <= 1, `${bd.fullName}: at most one Sade Sati phase can be active`);
    assertEquals(ss.isPresent, metCount > 0);
  }
});

Deno.test("doshas: Pitra conditions — all 3 charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const pitra = findDosha(kundli.doshas, "pitra");
    assert(pitra.conditions!.length === 2, `${bd.fullName}: Pitra needs 2 conditions`);
    const anyMet = pitra.conditions!.some((c) => c.isMet);
    assertEquals(pitra.isPresent, anyMet);
  }
});

Deno.test("doshas: Guru Chandal conditions — all 3 charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const gc = findDosha(kundli.doshas, "guru_chandal");
    assert(gc.conditions!.length === 1, `${bd.fullName}: Guru Chandal needs 1 condition`);
    assertEquals(gc.conditions![0].rule, "Jupiter conjunct Rahu");
    assertEquals(gc.isPresent, gc.conditions![0].isMet);
  }
});

Deno.test("doshas: Shakat conditions — all 3 charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const shakat = findDosha(kundli.doshas, "shakat");
    assert(shakat.conditions!.length === 2, `${bd.fullName}: Shakat needs 2 conditions (6th/8th)`);
    const anyMet = shakat.conditions!.some((c) => c.isMet);
    assertEquals(shakat.isPresent, anyMet);
  }
});

// ─── Byte-identical verdict tests ───────────────────────────────────────────

Deno.test("doshas: verdict byte-identical — Dev Chart", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  for (const expected of PRE_REFACTOR_VERDICTS.dev) {
    const actual = findDosha(kundli.doshas, expected.name);
    assertEquals(actual.isPresent, expected.isPresent, `${expected.name}: isPresent mismatch`);
    assertEquals(actual.severity, expected.severity, `${expected.name}: severity mismatch`);
  }
});

Deno.test("doshas: verdict byte-identical — Rajiv Gandhi", async () => {
  const kundli = await calculateKundli(RAJIV_GANDHI);
  for (const expected of PRE_REFACTOR_VERDICTS.rajiv) {
    const actual = findDosha(kundli.doshas, expected.name);
    assertEquals(actual.isPresent, expected.isPresent, `${expected.name}: isPresent mismatch`);
    assertEquals(actual.severity, expected.severity, `${expected.name}: severity mismatch`);
  }
});

Deno.test("doshas: verdict byte-identical — Amitabh Bachchan", async () => {
  const kundli = await calculateKundli(AMITABH_BACHCHAN);
  for (const expected of PRE_REFACTOR_VERDICTS.amitabh) {
    const actual = findDosha(kundli.doshas, expected.name);
    assertEquals(actual.isPresent, expected.isPresent, `${expected.name}: isPresent mismatch`);
    assertEquals(actual.severity, expected.severity, `${expected.name}: severity mismatch`);
  }
});
