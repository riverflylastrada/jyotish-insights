/**
 * Shared fixtures and normalizer for golden snapshot tests.
 *
 * - Fixtures: the three reference BirthDetails used across the test suite.
 * - normalize(): strips non-deterministic fields and deep-rounds all numbers
 *   to 6 decimals so baselines are portable across Linux (CI) and macOS (dev).
 */

import type { BirthDetails } from "../engine.ts";
import type { NodeType } from "../astronomy.ts";

// ─── Reference chart fixtures ───────────────────────────────────────────────

export const DEV_CHART: BirthDetails = {
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

export const RAJIV_GANDHI: BirthDetails = {
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

export const AMITABH_BACHCHAN: BirthDetails = {
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

// ─── Normalizer ─────────────────────────────────────────────────────────────

/**
 * Strip non-deterministic / non-engine fields and deep-round every number
 * to 6 decimal places so the golden baseline is portable.
 *
 * Removed fields: id, generatedAt, autoInsights, raw.
 * Kept: snapshotVersion (it's the constant 24 — freezing it is desirable).
 */
export function normalize(k: unknown): unknown {
  // JSON round-trip produces a plain object we can safely manipulate
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(k));
  delete clone.id;
  delete clone.generatedAt;
  delete clone.autoInsights;
  delete clone.raw;
  return deepRound(clone);
}

function deepRound(value: unknown): unknown {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return value;
    return Math.round(value * 1e6) / 1e6;
  }
  if (Array.isArray(value)) {
    return value.map(deepRound);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = deepRound(obj[key]);
    }
    return result;
  }
  return value;
}
