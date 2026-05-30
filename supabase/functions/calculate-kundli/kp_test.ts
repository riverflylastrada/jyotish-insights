/**
 * Unit tests for KP sub-lord engine and 4-fold house significators.
 *
 * Run with: deno test supabase/functions/calculate-kundli/kp_test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { kpLords, computeKpPlanetSubLords, computeRulingPlanets, computeHouseSignificators } from "./kp.ts";
import { calculateKundli } from "./engine.ts";
import type { BirthDetails } from "./engine.ts";
import type { NodeType } from "./astronomy.ts";
import { NAKSHATRA_LORDS } from "./constants.ts";
import { nakshatraIndex, getSignLord, wholeSignHouse } from "./vedic.ts";

// ─── kpLords basic tests ────────────────────────────────────────────────────

Deno.test("kpLords: 0° Aries → sign-lord Mars, star-lord Ketu", () => {
  const result = kpLords(0);
  assertEquals(result.signLord, "Mars");
  assertEquals(result.starLord, "Ketu");
});

Deno.test("kpLords: 13.333° (start of Bharani) → star-lord Venus", async () => {
  const result = kpLords(13.3334);
  assertEquals(result.starLord, "Venus");
});

Deno.test("kpLords: 26.667° (start of Krittika) → star-lord Sun", async () => {
  const result = kpLords(26.6668);
  assertEquals(result.starLord, "Sun");
});

Deno.test("kpLords: sub-lord is always one of the 9 Vimshottari planets", async () => {
  const vimPlanets = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  // Test a range of longitudes
  for (let lon = 0; lon < 360; lon += 5) {
    const result = kpLords(lon);
    assertExists(result.subLord, `Sub-lord missing at ${lon}°`);
    assertEquals(
      vimPlanets.includes(result.subLord),
      true,
      `Sub-lord '${result.subLord}' at ${lon}° is not a valid Vimshottari planet`,
    );
  }
});

Deno.test("kpLords: sign-lord changes at 30° boundary", async () => {
  const aries = kpLords(29.9);
  const taurus = kpLords(30.1);
  assertEquals(aries.signLord, "Mars");
  assertEquals(taurus.signLord, "Venus");
});

Deno.test("kpLords: Ashwini sub-lords start with Ketu (first sub in Ketu star)", async () => {
  // At 0° Aries (Ashwini), star lord = Ketu, and the first sub-lord should be Ketu
  const result = kpLords(0.01);
  assertEquals(result.starLord, "Ketu");
  assertEquals(result.subLord, "Ketu");
});

Deno.test("kpLords: handles longitude > 360 (normalization)", async () => {
  const a = kpLords(45);
  const b = kpLords(405); // 45 + 360
  assertEquals(a.signLord, b.signLord);
  assertEquals(a.starLord, b.starLord);
  assertEquals(a.subLord, b.subLord);
});

Deno.test("kpLords: handles negative longitude (normalization)", async () => {
  const a = kpLords(350);
  const b = kpLords(-10); // 360 - 10 = 350
  assertEquals(a.signLord, b.signLord);
  assertEquals(a.starLord, b.starLord);
  assertEquals(a.subLord, b.subLord);
});

// ─── computeKpPlanetSubLords ────────────────────────────────────────────────

Deno.test("computeKpPlanetSubLords: returns 9 entries (excludes ascendant)", async () => {
  const mockPlanets = [
    { planet: 'ascendant', longitude: 100, signNumber: 4, signName: 'Karka', signDegree: 10, nakshatra: 'Pushya', nakshatraPada: 1 as const, houseNumber: 1, isRetrograde: false, isCombust: false },
    { planet: 'sun', longitude: 120, signNumber: 5, signName: 'Simha', signDegree: 0, nakshatra: 'Magha', nakshatraPada: 1 as const, houseNumber: 2, isRetrograde: false, isCombust: false },
    { planet: 'moon', longitude: 45, signNumber: 2, signName: 'Vrishabha', signDegree: 15, nakshatra: 'Rohini', nakshatraPada: 3 as const, houseNumber: 11, isRetrograde: false, isCombust: false },
    { planet: 'mars', longitude: 200, signNumber: 7, signName: 'Tula', signDegree: 20, nakshatra: 'Swati', nakshatraPada: 4 as const, houseNumber: 4, isRetrograde: false, isCombust: false },
    { planet: 'mercury', longitude: 130, signNumber: 5, signName: 'Simha', signDegree: 10, nakshatra: 'Magha', nakshatraPada: 3 as const, houseNumber: 2, isRetrograde: false, isCombust: false },
    { planet: 'jupiter', longitude: 250, signNumber: 9, signName: 'Dhanu', signDegree: 10, nakshatra: 'Mula', nakshatraPada: 3 as const, houseNumber: 6, isRetrograde: false, isCombust: false },
    { planet: 'venus', longitude: 310, signNumber: 11, signName: 'Kumbha', signDegree: 10, nakshatra: 'Shatabhisha', nakshatraPada: 3 as const, houseNumber: 8, isRetrograde: false, isCombust: false },
    { planet: 'saturn', longitude: 330, signNumber: 11, signName: 'Kumbha', signDegree: 30, nakshatra: 'Purva Bhadrapada', nakshatraPada: 2 as const, houseNumber: 8, isRetrograde: false, isCombust: false },
    { planet: 'rahu', longitude: 60, signNumber: 3, signName: 'Mithuna', signDegree: 0, nakshatra: 'Mrigashira', nakshatraPada: 3 as const, houseNumber: 12, isRetrograde: true, isCombust: false },
    { planet: 'ketu', longitude: 240, signNumber: 9, signName: 'Dhanu', signDegree: 0, nakshatra: 'Mula', nakshatraPada: 1 as const, houseNumber: 6, isRetrograde: true, isCombust: false },
  ];
  const result = computeKpPlanetSubLords(mockPlanets);
  assertEquals(result.length, 9);
  assertEquals(result.every(r => r.signLord && r.starLord && r.subLord), true);
});

// ─── computeRulingPlanets ───────────────────────────────────────────────────

Deno.test("computeRulingPlanets: returns 5 valid fields", async () => {
  const now = new Date('2026-05-22T12:00:00Z'); // Friday = Venus
  const result = computeRulingPlanets(100, 45, now);
  assertExists(result.ascSignLord);
  assertExists(result.ascStarLord);
  assertExists(result.moonSignLord);
  assertExists(result.moonStarLord);
  assertEquals(result.dayLord, "Venus"); // Friday
});

Deno.test("computeRulingPlanets: Sunday → Sun as day lord", async () => {
  const sunday = new Date('2026-05-24T12:00:00Z'); // Sunday
  const result = computeRulingPlanets(0, 0, sunday);
  assertEquals(result.dayLord, "Sun");
});

// ─── computeHouseSignificators: hand-constructed rule tests ─────────────────

/**
 * Helper: build a minimal PlanetPos for testing.
 * Longitude determines star-lord, signNumber determines house/owner.
 */
function mkPlanet(planet: string, lon: number, signNumber: number, ascSign: number) {
  return {
    planet,
    longitude: lon,
    signNumber,
    signName: '',
    signDegree: lon % 30,
    nakshatra: '',
    nakshatraPada: 1 as const,
    houseNumber: wholeSignHouse(signNumber, ascSign),
    isRetrograde: false,
    isCombust: false,
  };
}

Deno.test("significators: returns 12 houses", async () => {
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 5, 1, asc),
    mkPlanet('moon', 35, 2, asc),
    mkPlanet('mars', 65, 3, asc),
    mkPlanet('mercury', 95, 4, asc),
    mkPlanet('jupiter', 125, 5, asc),
    mkPlanet('venus', 155, 6, asc),
    mkPlanet('saturn', 185, 7, asc),
    mkPlanet('rahu', 215, 8, asc),
    mkPlanet('ketu', 245, 9, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  assertEquals(result.length, 12);
  assertEquals(result[0].house, 1);
  assertEquals(result[11].house, 12);
});

Deno.test("significators: Level B — occupant is listed", async () => {
  // Sun in House 1 (sign 1, asc = 1) → Sun should be Level B for house 1
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 5, 1, asc),  // in Aries = H1
    mkPlanet('moon', 35, 2, asc),
    mkPlanet('mars', 65, 3, asc),
    mkPlanet('mercury', 95, 4, asc),
    mkPlanet('jupiter', 125, 5, asc),
    mkPlanet('venus', 155, 6, asc),
    mkPlanet('saturn', 185, 7, asc),
    mkPlanet('rahu', 215, 8, asc),
    mkPlanet('ketu', 35, 8, asc),  // same sign as rahu for simplicity
  ];
  const result = computeHouseSignificators(planets, asc);
  const h1 = result[0];
  assertEquals(h1.levelB.includes('sun'), true, 'Sun should be Level B of H1');
});

Deno.test("significators: Level A — planet in star of occupant", async () => {
  // Aries asc. Sun at 5° Aries → star-lord = Ketu (Ashwini).
  // If another planet's star-lord is Sun (e.g. Mercury at ~27° Aries → Krittika, star-lord Sun),
  // then Mercury is in the star of Sun. Sun occupies H1 → Mercury should be Level A of H1.
  // Actually let's be more precise: Sun at 5° = Ashwini = star-lord Ketu.
  // So planets whose star-lord is 'sun' are in Level A. Let's place Mercury at 27° (Krittika = Sun star).
  // Sun is in H1. Mercury's star-lord = Sun (occupant of H1) → Mercury is Level A of H1.
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 5, 1, asc),       // H1, star=Ketu
    mkPlanet('moon', 35, 2, asc),
    mkPlanet('mars', 65, 3, asc),
    mkPlanet('mercury', 27, 1, asc),  // H1, lon 27°→Krittika→star=Sun
    mkPlanet('jupiter', 125, 5, asc),
    mkPlanet('venus', 155, 6, asc),
    mkPlanet('saturn', 185, 7, asc),
    mkPlanet('rahu', 215, 8, asc),
    mkPlanet('ketu', 35, 2, asc),
  ];
  // Sun occupies H1. Mercury's star-lord is Sun.
  // So Mercury is "planet in star of occupant of H1" → Level A.
  const result = computeHouseSignificators(planets, asc);
  const h1 = result[0];
  assertEquals(h1.levelA.includes('mercury'), true, 'Mercury (in star of Sun, occupant of H1) should be Level A');
});

Deno.test("significators: Level D — house owner", async () => {
  // Aries asc → H1 sign = Aries → owner = Mars.
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 35, 2, asc),
    mkPlanet('moon', 65, 3, asc),
    mkPlanet('mars', 95, 4, asc),
    mkPlanet('mercury', 125, 5, asc),
    mkPlanet('jupiter', 155, 6, asc),
    mkPlanet('venus', 185, 7, asc),
    mkPlanet('saturn', 215, 8, asc),
    mkPlanet('rahu', 245, 9, asc),
    mkPlanet('ketu', 65, 9, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  assertEquals(result[0].levelD.includes('mars'), true, 'Mars is lord of Aries = H1');
  // H2 = Taurus → owner = Venus
  assertEquals(result[1].levelD.includes('venus'), true, 'Venus is lord of Taurus = H2');
});

Deno.test("significators: Level C — planet in star of owner", async () => {
  // Aries asc → H1 owner = Mars. Mars star = NAKSHATRA_LORDS for mars longitude.
  // We need a planet whose star-lord = mars (owner of H1).
  // Mars nakshatra lord positions: nakshatras 4(Mrigashira), 13(Chitra), 22(Dhanishtha) → index 4 mod 9 = 4.
  // Actually NAKSHATRA_LORDS = [Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury]
  // Mars is index 4 in the lord cycle. So nakshatras 4, 13, 22 (0-indexed) have Mars as lord.
  // Nakshatra 4 = Mrigashira (53.33°–66.67°). Place Jupiter at 60° → star-lord = Mars.
  // Then Jupiter is "in star of Mars" and Mars owns H1, so Jupiter → Level C of H1.
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 35, 2, asc),
    mkPlanet('moon', 95, 4, asc),
    mkPlanet('mars', 125, 5, asc),  // Mars in H5, not in H1
    mkPlanet('mercury', 155, 6, asc),
    mkPlanet('jupiter', 60, 3, asc),  // 60° = Mrigashira = star-lord Mars
    mkPlanet('venus', 185, 7, asc),
    mkPlanet('saturn', 215, 8, asc),
    mkPlanet('rahu', 245, 9, asc),
    mkPlanet('ketu', 65, 9, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  // Mars owns H1 (Aries). Jupiter's star-lord = Mars. So Jupiter should be Level C of H1.
  assertEquals(result[0].levelC.includes('jupiter'), true, 'Jupiter (in star of Mars, owner of H1) should be Level C');
});

Deno.test("significators: node agency — Rahu conjoined with a planet", async () => {
  // Aries asc. Rahu and Sun both in sign 5 (Simha, H5).
  // Sun occupies H5 → Sun is Level B of H5.
  // Rahu is conjoined with Sun → Rahu's agency includes Sun.
  // Sun occupies H5, Sun owns H5 (Leo) → Rahu acts for H5.
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 125, 5, asc),    // H5 (Simha)
    mkPlanet('moon', 35, 2, asc),
    mkPlanet('mars', 65, 3, asc),
    mkPlanet('mercury', 95, 4, asc),
    mkPlanet('jupiter', 155, 6, asc),
    mkPlanet('venus', 185, 7, asc),
    mkPlanet('saturn', 215, 8, asc),
    mkPlanet('rahu', 130, 5, asc),   // H5 (Simha), conjoined Sun
    mkPlanet('ketu', 310, 11, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  const h5 = result[4];
  assertEquals(h5.nodesActingFor.includes('rahu'), true, 'Rahu conjoined Sun in H5 should act for H5');
});

Deno.test("significators: node agency — dispositor route", async () => {
  // Aries asc. Rahu in sign 2 (Taurus). Dispositor = Venus (lord of Taurus).
  // Venus owns H2 (Taurus) and H7 (Libra). So Rahu should act for H2 and H7.
  // Also Venus occupies wherever it is placed — let's put Venus in H3 (Gemini, sign 3).
  // Then Rahu also acts for H3 (where Venus sits).
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 35, 2, asc),
    mkPlanet('moon', 95, 4, asc),
    mkPlanet('mars', 125, 5, asc),
    mkPlanet('mercury', 155, 6, asc),
    mkPlanet('jupiter', 215, 8, asc),
    mkPlanet('venus', 65, 3, asc),   // H3
    mkPlanet('saturn', 245, 9, asc),
    mkPlanet('rahu', 35, 2, asc),    // Taurus, dispositor = Venus
    mkPlanet('ketu', 215, 8, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  const rahuActsFor = new Set<number>();
  for (const h of result) {
    if (h.nodesActingFor.includes('rahu')) rahuActsFor.add(h.house);
  }
  // Venus occupies H3, owns H2 and H7 → Rahu acts for H2, H3, H7 (at minimum via dispositor)
  assertEquals(rahuActsFor.has(2), true, 'Rahu acts for H2 (Venus owns Taurus)');
  assertEquals(rahuActsFor.has(3), true, 'Rahu acts for H3 (Venus occupies H3)');
  assertEquals(rahuActsFor.has(7), true, 'Rahu acts for H7 (Venus owns Libra)');
});

Deno.test("significators: ordered is de-duplicated A→B→C→D", async () => {
  // If a planet appears in both Level A and Level B for the same house,
  // it should appear only once in ordered (at the A position).
  const asc = 1;
  // Sun at 5° Aries (H1), star-lord = Ketu. If Sun's star-lord is Ketu and Ketu
  // is in star-of-Sun scenario... Let's make a simpler test: a planet is both
  // occupant (B) and in star of another occupant (A).
  // Two planets in H1: Sun at 5° (star=Ketu), Mercury at 27° (star=Sun).
  // Mercury is in star of Sun (occupant) → Level A. Mercury is also occupant → Level B.
  // Mercury should appear in ordered only once (from A).
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 5, 1, asc),       // H1, star=Ketu
    mkPlanet('mercury', 27, 1, asc),  // H1, star=Sun (occupant of H1) → Level A + B
    mkPlanet('moon', 65, 3, asc),
    mkPlanet('mars', 95, 4, asc),
    mkPlanet('jupiter', 125, 5, asc),
    mkPlanet('venus', 155, 6, asc),
    mkPlanet('saturn', 185, 7, asc),
    mkPlanet('rahu', 215, 8, asc),
    mkPlanet('ketu', 35, 2, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  const h1 = result[0];
  // Mercury should be in both A and B
  assertEquals(h1.levelA.includes('mercury'), true);
  assertEquals(h1.levelB.includes('mercury'), true);
  // But ordered should list it only once
  const mercCount = h1.ordered.filter(p => p === 'mercury').length;
  assertEquals(mercCount, 1, 'Mercury appears exactly once in ordered');
});

Deno.test("significators: empty house has no occupant-based levels", async () => {
  // Aries asc. No planets in H12 (Pisces, sign 12).
  const asc = 1;
  const planets = [
    mkPlanet('ascendant', 0, 1, asc),
    mkPlanet('sun', 5, 1, asc),
    mkPlanet('moon', 35, 2, asc),
    mkPlanet('mars', 65, 3, asc),
    mkPlanet('mercury', 95, 4, asc),
    mkPlanet('jupiter', 125, 5, asc),
    mkPlanet('venus', 155, 6, asc),
    mkPlanet('saturn', 185, 7, asc),
    mkPlanet('rahu', 215, 8, asc),
    mkPlanet('ketu', 245, 9, asc),
  ];
  const result = computeHouseSignificators(planets, asc);
  const h12 = result[11]; // H12
  assertEquals(h12.levelA.length, 0, 'No Level A for empty house');
  assertEquals(h12.levelB.length, 0, 'No Level B for empty house');
  // H12 = Pisces → owner = Jupiter. Level D should have Jupiter.
  assertEquals(h12.levelD.includes('jupiter'), true);
  // Level C = planets in star of Jupiter
  assertEquals(h12.ordered.length > 0, true, 'Ordered should at least have the owner');
});

// ─── Cross-check: reference charts ─────────────────────────────────────────

/**
 * For each reference chart, independently derive expected significators from
 * the engine's own star-lords, occupants, and owners, then assert they match
 * the computeHouseSignificators output.
 */
function crossCheckSignificators(label: string, details: BirthDetails) {
  Deno.test(`significators cross-check: ${label}`, async () => {
    const kundli = await calculateKundli(details);
    const d1 = kundli.divisionalCharts.find(c => c.varga === 'D1')!;
    const planets = d1.planets;
    const ascSign = kundli.ascendant.signNumber;

    const grahas = planets.filter(p => p.planet !== 'ascendant');

    // Independently compute star-lords
    const starLordMap: Record<string, string> = {};
    for (const g of grahas) {
      const nIdx = nakshatraIndex(g.longitude);
      starLordMap[g.planet] = NAKSHATRA_LORDS[nIdx % 9].toLowerCase();
    }

    // House occupants
    const occupants: Record<number, string[]> = {};
    for (let h = 1; h <= 12; h++) occupants[h] = [];
    for (const g of grahas) {
      occupants[g.houseNumber].push(g.planet);
    }

    // House owners
    const houseOwner: Record<number, string> = {};
    for (let h = 1; h <= 12; h++) {
      const houseSign = ((ascSign - 1 + (h - 1)) % 12) + 1;
      houseOwner[h] = getSignLord(houseSign);
    }

    // Planets in star of X
    const planetsInStarOf: Record<string, string[]> = {};
    for (const g of grahas) planetsInStarOf[g.planet] = [];
    for (const g of grahas) {
      const sl = starLordMap[g.planet];
      if (planetsInStarOf[sl]) planetsInStarOf[sl].push(g.planet);
    }

    // Get engine output
    const sigs = kundli.kp!.houseSignificators!;
    assertEquals(sigs.length, 12);

    for (let h = 1; h <= 12; h++) {
      const sig = sigs[h - 1];
      assertEquals(sig.house, h);

      // Verify Level B = occupants
      const expectedB = occupants[h].sort();
      assertEquals([...sig.levelB].sort(), expectedB, `${label} H${h} Level B`);

      // Verify Level D = owner
      assertEquals(sig.levelD, [houseOwner[h]], `${label} H${h} Level D`);

      // Verify Level A = planets in star of occupants
      const expectedA = new Set<string>();
      for (const occ of occupants[h]) {
        for (const p of (planetsInStarOf[occ] ?? [])) {
          expectedA.add(p);
        }
      }
      assertEquals(new Set(sig.levelA), expectedA, `${label} H${h} Level A`);

      // Verify Level C = planets in star of owner
      const expectedC = new Set<string>();
      for (const p of (planetsInStarOf[houseOwner[h]] ?? [])) {
        expectedC.add(p);
      }
      assertEquals(new Set(sig.levelC), expectedC, `${label} H${h} Level C`);
    }
  });
}

// GJC 1983 chart
crossCheckSignificators("GJC 1983", {
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
});

// Rajiv Gandhi 1944 chart
crossCheckSignificators("Rajiv 1944", {
  fullName: "Rajiv Gandhi",
  dateOfBirth: "1944-08-20",
  timeOfBirth: "07:11:00",
  placeOfBirth: {
    name: "Mumbai, India",
    latitude: 18.9667,
    longitude: 72.8333,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
});

// Amitabh Bachchan 1942 chart
crossCheckSignificators("Amitabh 1942", {
  fullName: "Amitabh Bachchan",
  dateOfBirth: "1942-10-11",
  timeOfBirth: "16:00:00",
  placeOfBirth: {
    name: "Prayagraj, India",
    latitude: 25.4358,
    longitude: 81.8463,
    timezone: "Asia/Kolkata",
    timezoneOffset: 5.5,
  },
  ayanamsa: "lahiri",
  houseSystem: "whole_sign",
  nodeType: "mean" as NodeType,
});
