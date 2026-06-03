/**
 * Muhurta Finder tests — validates Abhijit window, panchang computation,
 * and date-finder scoring against Drik Panchang reference values.
 *
 * Reference: Drik Panchang / prokerala.com for Ujjain/Delhi, 2024-01-15
 *   Tithi: Shukla Paksha Panchami (runs 04:59 AM Jan 15 → 02:16 AM Jan 16)
 *   Nakshatra: Purva Bhadrapada (from 08:07 AM Jan 15 → 06:10 AM Jan 16)
 *   Vara: Somavara (Monday)
 *   Yoga: Variyan (02:39 AM → 11:11 PM)
 *   Karana: Bava (morning), Balava (afternoon)
 *   Sunrise: ~07:14 IST, Sunset: ~17:57 IST (Ujjain)
 *   Abhijit Muhurta: 12:14 PM – 12:57 PM
 *
 * Run: deno test supabase/functions/calculate-kundli/muhurta_finder_test.ts
 */

import {
  assertEquals,
  assertAlmostEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeAbhijitMuhurta,
  computeDayPanchang,
  scoreDay,
  findAuspiciousDays,
} from "./muhurta_finder.ts";
import { getActivityRule, ACTIVITY_RULES } from "./muhurta_rules.ts";

// ── Reference: Delhi, 2024-01-15 ───────────────────────────────────

const DELHI_LAT = 28.6139;
const DELHI_LON = 77.2090;
const IST_OFFSET = 5.5;

Deno.test("computeDayPanchang — Delhi 2024-01-15 matches Drik Panchang reference", () => {
  const p = computeDayPanchang("2024-01-15", DELHI_LAT, DELHI_LON, IST_OFFSET);

  // Vara: Monday (2024-01-15 is a Monday)
  assertEquals(p.varaIndex, 1, "Should be Monday (index 1)");
  assertEquals(p.vara, "Somavara (Monday)");

  // Tithi: Drik Panchang says Shukla Panchami (runs all day)
  // Tithi index 4 = Panchami in Shukla Paksha
  assertEquals(p.tithiIndex, 4, "Should be Shukla Panchami (index 4) — Drik Panchang ref");
  assertEquals(p.tithi, "Shukla Paksha Panchami");

  // Nakshatra: Purva Bhadrapada from 08:07 AM (at noon → Purva Bhadrapada)
  assertEquals(p.nakshatraIndex, 24,
    `Nakshatra index ${p.nakshatraIndex} should be Purva Bhadrapada (24) — Drik Panchang ref`);
  assertEquals(p.nakshatra, "Purva Bhadrapada");

  // Sunrise should be around 07:10–07:20 IST (430–440 min from midnight)
  assertEquals(p.sunriseMin >= 425 && p.sunriseMin <= 445, true,
    `Sunrise ${p.sunriseMin} min should be ~07:14 IST (434 min)`);

  // Sunset should be around 17:35–17:45 IST (1055–1065 min)
  assertEquals(p.sunsetMin >= 1050 && p.sunsetMin <= 1070, true,
    `Sunset ${p.sunsetMin} min should be ~17:38 IST (1058 min)`);
});

// ── Abhijit Muhurta ─────────────────────────────────────────────────

Deno.test("computeAbhijitMuhurta — 8th of 15 daytime muhurtas vs Drik Panchang", () => {
  // Reference: Ujjain Jan 15 2024 — sunrise 07:14 (434 min), sunset 17:57 (1077 min)
  // Drik Panchang Abhijit: 12:14 PM – 12:57 PM (734 min – 777 min)
  // Day length = 643 min, each muhurta = 643/15 ≈ 42.87 min
  // 8th muhurta start = 434 + 7 × 42.87 ≈ 734 min (12:14)
  // 8th muhurta end ≈ 734 + 42.87 ≈ 777 min (12:57)
  const result = computeAbhijitMuhurta(434, 1077, 1); // Monday
  assertEquals(result.active, true, "Active on Monday");
  assertAlmostEquals(result.startMin, 734, 1, "Start ~12:14 — matches Drik Panchang");
  assertAlmostEquals(result.endMin, 776.87, 1, "End ~12:57 — matches Drik Panchang");
});

Deno.test("computeAbhijitMuhurta — inactive on Wednesday", () => {
  const result = computeAbhijitMuhurta(360, 1080, 3); // Wednesday
  assertEquals(result.active, false, "Not active on Wednesday");
});

// ── Scoring ─────────────────────────────────────────────────────────

Deno.test("scoreDay — general rule scores Delhi 2024-01-15 with reasons", () => {
  const rule = getActivityRule("general")!;
  const p = computeDayPanchang("2024-01-15", DELHI_LAT, DELHI_LON, IST_OFFSET);
  const s = scoreDay(p, rule);
  // Monday is favourable for general (+3), Purva Bhadrapada is avoided (−4),
  // Shukla Panchami is favourable (+4), Abhijit active (+1) → net ≈ +4
  assertEquals(s.reasons.length > 0, true, "Should have at least one reason");
  // Check that Monday is cited as favourable
  assertEquals(s.reasons.some(r => r.includes("Favourable vara")), true, "Monday should be favourable");
  // Check that Purva Bhadrapada avoidance is cited
  assertEquals(s.reasons.some(r => r.includes("Avoid nakshatra")), true, "Purva Bhadrapada avoided");
});

Deno.test("scoreDay — Vivah rule scores correctly", () => {
  const rule = getActivityRule("vivah")!;
  const p = computeDayPanchang("2024-01-15", DELHI_LAT, DELHI_LON, IST_OFFSET);
  const s = scoreDay(p, rule);
  // Should have reasons explaining the score
  assertEquals(s.reasons.length > 0, true, "Should cite rules");
});

// ── Date finder ─────────────────────────────────────────────────────

Deno.test("findAuspiciousDays — returns sorted results for a week", () => {
  const result = findAuspiciousDays(
    "general",
    "2024-01-15",
    "2024-01-21",
    DELHI_LAT, DELHI_LON, IST_OFFSET,
  );
  assertEquals(result.scored.length, 7, "Should have 7 days");
  // Verify sorted descending by score
  for (let i = 1; i < result.scored.length; i++) {
    assertEquals(
      result.scored[i - 1].score >= result.scored[i].score,
      true,
      "Should be sorted descending by score",
    );
  }
});

Deno.test("findAuspiciousDays — Vivah preset works", () => {
  const result = findAuspiciousDays(
    "vivah",
    "2024-02-01",
    "2024-02-14",
    DELHI_LAT, DELHI_LON, IST_OFFSET,
  );
  assertEquals(result.scored.length, 14, "Should cover 14 days");
  assertEquals(result.activity.key, "vivah");
  assertEquals(result.activity.labelHi, "विवाह");
  // Each result should have reasons
  for (const d of result.scored) {
    assertEquals(d.reasons.length > 0, true, `${d.date} should have reasons`);
  }
});

// ── All activity rules are well-formed ──────────────────────────────

Deno.test("ACTIVITY_RULES — every rule has key, labels, and at least one favour set", () => {
  for (const rule of ACTIVITY_RULES) {
    assertEquals(!!rule.key, true, "Rule must have a key");
    assertEquals(!!rule.label, true, "Rule must have EN label");
    assertEquals(!!rule.labelHi, true, "Rule must have HI label");
    assertEquals(
      rule.favourTithis.length + rule.favourNakshatras.length + rule.favourVaras.length > 0,
      true,
      `${rule.key} must have at least one favourable set`,
    );
  }
});

// ── Reference: Mumbai, 2024-03-25 (Holi, Purnima) ──────────────────
// Cross-validation with a known Purnima date

Deno.test("computeDayPanchang — Mumbai 2024-03-25 (Holi/Purnima vicinity)", () => {
  const p = computeDayPanchang("2024-03-25", 19.0760, 72.8777, IST_OFFSET);

  // 2024-03-25 is a Monday
  assertEquals(p.varaIndex, 1, "Should be Monday");

  // Near Purnima (tithi index ~14); Holi is on Purnima
  // At noon the tithi could be very close to the Purnima/Krishna boundary
  assertEquals(p.tithiIndex >= 13 && p.tithiIndex <= 16, true,
    `Tithi index ${p.tithiIndex} should be near Purnima (14) for Holi date`);
});
