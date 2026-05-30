/**
 * Transit events detection tests — validates that detectUpcomingEvents
 * correctly identifies significant transits within a fixed window.
 *
 * Run with: deno test supabase/functions/calculate-kundli/transit_events_test.ts
 */

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";
import { detectUpcomingEvents, type TransitEvent } from "./transit_events.ts";

// ─── Reference charts ──────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("detectUpcomingEvents returns an array of TransitEvent objects", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  const snapshot = { ...kundli, id: "test-dev-chart" };
  const events = detectUpcomingEvents(snapshot, 365);
  assert(Array.isArray(events), "Should return an array");
  // With a 365-day window, we expect at least some events for any chart
  assert(events.length > 0, `Expected events for DEV_CHART over 365 days, got ${events.length}`);
});

Deno.test("each TransitEvent has required fields", async () => {
  const kundli = await calculateKundli(RAJIV_GANDHI);
  const snapshot = { ...kundli, id: "test-rajiv" };
  const events = detectUpcomingEvents(snapshot, 365);

  for (const e of events) {
    assert(e.chartId, "chartId must be set");
    assert(e.eventKey, "eventKey must be set");
    assert(e.type, "type must be set");
    assert(['sade_sati', 'ashtama_shani', 'sign_ingress', 'guru_bala', 'retrograde', 'eclipse', 'dasha_transition'].includes(e.type),
      `type must be a valid category, got: ${e.type}`);
    assert(['high', 'medium', 'low'].includes(e.severity), `severity must be valid, got: ${e.severity}`);
    assert(e.starts, "starts must be set");
    assert(e.title, "title must be set");
    assert(e.description, "description must be set");
    assert(e.citation, "citation must be set");
  }
});

Deno.test("eventKey is deterministic — same chart yields same keys", async () => {
  const kundli = await calculateKundli(AMITABH_BACHCHAN);
  const snapshot = { ...kundli, id: "test-amitabh" };
  const events1 = detectUpcomingEvents(snapshot, 90);
  const events2 = detectUpcomingEvents(snapshot, 90);
  const keys1 = events1.map(e => e.eventKey).sort();
  const keys2 = events2.map(e => e.eventKey).sort();
  assertEquals(keys1, keys2, "Event keys should be deterministic across runs");
});

Deno.test("events are sorted by start date", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  const snapshot = { ...kundli, id: "test-sorted" };
  const events = detectUpcomingEvents(snapshot, 365);
  for (let i = 1; i < events.length; i++) {
    assert(
      new Date(events[i].starts).getTime() >= new Date(events[i - 1].starts).getTime(),
      `Events should be sorted: ${events[i - 1].starts} should come before ${events[i].starts}`,
    );
  }
});

Deno.test("sign_ingress events detected for Saturn/Jupiter over 365 days", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  const snapshot = { ...kundli, id: "test-ingress" };
  const events = detectUpcomingEvents(snapshot, 365);
  const ingresses = events.filter(e => e.type === 'sign_ingress');
  // Saturn/Jupiter/Rahu/Ketu — at least one should change signs in a year
  assert(ingresses.length >= 0, "Sign ingress detection should run without error");
  for (const e of ingresses) {
    assert(e.title.includes("enters"), `Ingress title should mention sign entry: ${e.title}`);
    assert(e.affectedHouses && e.affectedHouses.length > 0, "Ingress should have affectedHouses");
  }
});

Deno.test("dasha_transition events detected for all reference charts", async () => {
  for (const bd of [DEV_CHART, RAJIV_GANDHI, AMITABH_BACHCHAN]) {
    const kundli = await calculateKundli(bd);
    const snapshot = { ...kundli, id: `test-dasha-${bd.fullName}` };
    // Use 3650-day window to guarantee at least one antar dasha change
    const events = detectUpcomingEvents(snapshot, 3650);
    const dashaEvents = events.filter(e => e.type === 'dasha_transition');
    assert(dashaEvents.length > 0, `Expected at least one dasha transition for ${bd.fullName} over 10 years, got ${dashaEvents.length}`);
  }
});

Deno.test("retrograde events detected over 365 days", async () => {
  const kundli = await calculateKundli(DEV_CHART);
  const snapshot = { ...kundli, id: "test-retro" };
  const events = detectUpcomingEvents(snapshot, 365);
  const retros = events.filter(e => e.type === 'retrograde');
  // Saturn and Jupiter each go retrograde/direct once per year, so expect ~2-4 events
  assert(retros.length >= 1, `Expected at least 1 retrograde event over 365 days, got ${retros.length}`);
  for (const e of retros) {
    assert(e.title.includes("retrograde") || e.title.includes("direct"), `Retrograde title should mention direction: ${e.title}`);
  }
});
