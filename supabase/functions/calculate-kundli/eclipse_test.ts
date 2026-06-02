/**
 * Parity test for Eclipse engine module.
 *
 * Validated against PyJHora 4.8.6 `jhora.panchanga.eclipse`
 *   — next_solar_eclipse(jd, place, eclipse_location_type=1) (global)
 *   — next_lunar_eclipse(jd, place, eclipse_location_type=1) (global)
 *
 * Reference places:
 *   Patan, Gujarat: lat 23.85, lon 72.12, tz +5.5
 *   Delhi:          lat 28.61, lon 77.21, tz +5.5
 *
 * Tolerance: ±1 day on eclipse dates (spec requirement).
 *
 * Run: deno test supabase/functions/calculate-kundli/eclipse_test.ts
 */

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeEclipses, type EclipseRecord } from "./eclipse.ts";
import { julianDay } from "./astronomy.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  return new Date(iso);
}

/** Assert two dates are within ±toleranceDays of each other. */
function assertDateWithin(
  actual: EclipseRecord | null,
  expectedYear: number,
  expectedMonth: number,
  expectedDay: number,
  toleranceDays: number,
  msg: string,
) {
  assert(actual !== null, `${msg}: expected an eclipse but got null`);
  const actualDate = isoToDate(actual!.dateUtc);
  const expectedDate = new Date(Date.UTC(expectedYear, expectedMonth - 1, expectedDay));
  const diffDays = Math.abs(actualDate.getTime() - expectedDate.getTime()) / 86400000;
  assert(
    diffDays <= toleranceDays,
    `${msg}: expected ~${expectedYear}-${String(expectedMonth).padStart(2, "0")}-${String(expectedDay).padStart(2, "0")}, ` +
    `got ${actual!.dateUtc} (diff ${diffDays.toFixed(1)} days, tolerance ±${toleranceDays})`,
  );
}

// ─── PyJHora parity: solar eclipses ─────────────────────────────────────────

Deno.test("Eclipse — next solar from 2024-04-01 matches PyJHora ±1 day", () => {
  // PyJHora: next_solar_eclipse(JD 2024-04-01, Patan, global) = total, 2024-04-08
  const jd = julianDay(2024, 4, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  assertDateWithin(result.nextSolar, 2024, 4, 8, 1, "Solar eclipse from 2024-04-01");
});

Deno.test("Eclipse — next solar from 2025-01-01 matches PyJHora ±1 day", () => {
  // PyJHora: next_solar_eclipse(JD 2025-01-01, Patan, global) = partial, 2025-03-29
  const jd = julianDay(2025, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  assertDateWithin(result.nextSolar, 2025, 3, 29, 1, "Solar eclipse from 2025-01-01");
});

// ─── PyJHora parity: lunar eclipses ─────────────────────────────────────────

Deno.test("Eclipse — next lunar from 2024-04-01 matches PyJHora ±1 day", () => {
  // PyJHora: next_lunar_eclipse(JD 2024-04-01, Patan, global) = partial, 2024-09-18
  const jd = julianDay(2024, 4, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  assertDateWithin(result.nextLunar, 2024, 9, 18, 1, "Lunar eclipse from 2024-04-01");
});

Deno.test("Eclipse — next lunar from 2025-01-01 matches PyJHora ±1 day", () => {
  // PyJHora: next_lunar_eclipse(JD 2025-01-01, Patan, global) = total, 2025-03-14
  const jd = julianDay(2025, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  assertDateWithin(result.nextLunar, 2025, 3, 14, 1, "Lunar eclipse from 2025-01-01");
});

// ─── PyJHora parity: Delhi ──────────────────────────────────────────────────

Deno.test("Eclipse — next solar from 2025-01-01 Delhi matches PyJHora ±1 day", () => {
  // PyJHora: next_solar_eclipse(JD 2025-01-01, Delhi, global) = partial, 2025-03-29
  const jd = julianDay(2025, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 28.61, 77.21, "lahiri", 6);
  assertDateWithin(result.nextSolar, 2025, 3, 29, 1, "Solar eclipse from 2025-01-01 Delhi");
});

Deno.test("Eclipse — next lunar from 2025-01-01 Delhi matches PyJHora ±1 day", () => {
  // PyJHora: next_lunar_eclipse(JD 2025-01-01, Delhi, global) = total, 2025-03-14
  const jd = julianDay(2025, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 28.61, 77.21, "lahiri", 6);
  assertDateWithin(result.nextLunar, 2025, 3, 14, 1, "Lunar eclipse from 2025-01-01 Delhi");
});

// ─── Structure tests ────────────────────────────────────────────────────────

Deno.test("Eclipse — upcoming list is sorted by date", () => {
  const jd = julianDay(2024, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  for (let i = 1; i < result.upcoming.length; i++) {
    assert(
      result.upcoming[i].jdMax >= result.upcoming[i - 1].jdMax,
      `upcoming[${i}] should be >= upcoming[${i - 1}]`,
    );
  }
});

Deno.test("Eclipse — each record has required fields", () => {
  const jd = julianDay(2024, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  for (const e of result.upcoming) {
    assert(["solar", "lunar"].includes(e.kind), `kind: ${e.kind}`);
    assert(["total", "annular", "partial", "penumbral"].includes(e.type), `type: ${e.type}`);
    assert(typeof e.jdMax === "number" && e.jdMax > 0, "jdMax");
    assert(typeof e.dateUtc === "string" && e.dateUtc.length > 0, "dateUtc");
    assert(e.signNumber >= 1 && e.signNumber <= 12, "signNumber");
    assert(typeof e.signName === "string" && e.signName.length > 0, "signName");
    assert(typeof e.nakshatra === "string" && e.nakshatra.length > 0, "nakshatra");
    assert(typeof e.visibleFromPlace === "boolean", "visibleFromPlace");
  }
});

Deno.test("Eclipse — bounded: at most maxEclipses per type", () => {
  const jd = julianDay(2024, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 4);
  const solarCount = result.upcoming.filter(e => e.kind === "solar").length;
  const lunarCount = result.upcoming.filter(e => e.kind === "lunar").length;
  assert(solarCount <= 4, `solar count ${solarCount} exceeds cap 4`);
  assert(lunarCount <= 4, `lunar count ${lunarCount} exceeds cap 4`);
});

// ─── Upcoming list parity: check known 2024 eclipses appear ─────────────────

Deno.test("Eclipse — 2024 solar eclipses include Apr 8 total and Oct 2 annular", () => {
  // PyJHora lists: total 2024-04-08, annular 2024-10-02
  const jd = julianDay(2024, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  const solars = result.upcoming.filter(e => e.kind === "solar");

  // Apr 8 total
  const apr = solars.find(e => {
    const d = new Date(e.dateUtc);
    return d.getUTCFullYear() === 2024 && d.getUTCMonth() === 3 &&
      Math.abs(d.getUTCDate() - 8) <= 1;
  });
  assert(apr !== undefined, "Should find 2024-04-08 solar eclipse");

  // Oct 2 annular
  const oct = solars.find(e => {
    const d = new Date(e.dateUtc);
    return d.getUTCFullYear() === 2024 && d.getUTCMonth() === 9 &&
      Math.abs(d.getUTCDate() - 2) <= 1;
  });
  assert(oct !== undefined, "Should find 2024-10-02 solar eclipse");
});

Deno.test("Eclipse — 2024 lunar eclipses include Mar 25 penumbral and Sep 18 partial", () => {
  // PyJHora lists: penumbral 2024-03-25, partial 2024-09-18
  const jd = julianDay(2024, 1, 1, 0, 0, 0);
  const result = computeEclipses(jd, 23.85, 72.12, "lahiri", 6);
  const lunars = result.upcoming.filter(e => e.kind === "lunar");

  const mar = lunars.find(e => {
    const d = new Date(e.dateUtc);
    return d.getUTCFullYear() === 2024 && d.getUTCMonth() === 2 &&
      Math.abs(d.getUTCDate() - 25) <= 1;
  });
  assert(mar !== undefined, "Should find 2024-03-25 lunar eclipse");

  const sep = lunars.find(e => {
    const d = new Date(e.dateUtc);
    return d.getUTCFullYear() === 2024 && d.getUTCMonth() === 8 &&
      Math.abs(d.getUTCDate() - 18) <= 1;
  });
  assert(sep !== undefined, "Should find 2024-09-18 lunar eclipse");
});
