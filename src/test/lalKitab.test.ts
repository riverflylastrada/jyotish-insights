import { describe, it, expect } from "vitest";
import { LAL_KITAB, selectLalKitab, type LalKitabEntry } from "@/lib/astro/lalKitab";
import type { Graha, HouseNumber } from "@/lib/astro/planetInHouse";
import type { DivisionalChart, PlanetPosition } from "@/lib/astro/types";

const GRAHAS: Graha[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
const HOUSES: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe("LAL_KITAB data", () => {
  it("covers all 9 grahas × 12 houses (108 cells)", () => {
    for (const g of GRAHAS) {
      expect(LAL_KITAB[g], `missing graha ${g}`).toBeDefined();
      for (const h of HOUSES) {
        expect(LAL_KITAB[g][h], `missing ${g} in house ${h}`).toBeDefined();
      }
    }
    const total = GRAHAS.reduce((n, g) => n + Object.keys(LAL_KITAB[g]).length, 0);
    expect(total).toBe(108);
  });

  it("every entry has a non-empty effect, at least one remedy, and a citation", () => {
    for (const g of GRAHAS) {
      for (const h of HOUSES) {
        const e: LalKitabEntry = LAL_KITAB[g][h];
        expect(e.effect.trim().length, `${g} H${h} effect`).toBeGreaterThan(0);
        expect(e.remedies.length, `${g} H${h} remedies`).toBeGreaterThan(0);
        expect(e.remedies.every((r) => r.trim().length > 0), `${g} H${h} empty remedy`).toBe(true);
        expect(e.citation.trim().length, `${g} H${h} citation`).toBeGreaterThan(0);
        expect(["benefic", "malefic", "mixed"]).toContain(e.nature);
      }
    }
  });
});

function planet(name: PlanetPosition["planet"], houseNumber: number): PlanetPosition {
  return {
    planet: name,
    longitude: 0,
    signNumber: 1,
    signName: "Mesha",
    signDegree: 0,
    nakshatra: "Ashwini",
    nakshatraPada: 1,
    houseNumber,
    isRetrograde: false,
    isCombust: false,
  };
}

describe("selectLalKitab", () => {
  const d1: DivisionalChart = {
    varga: "D1",
    vargaName: "Rasi",
    significance: "",
    ascendantSign: 1,
    planets: [
      planet("ascendant", 1), // must be excluded
      planet("sun", 7), // malefic in our map
      planet("jupiter", 9), // benefic
      planet("saturn", 1), // malefic
    ],
  };

  it("excludes the ascendant and maps each planet to its house entry", () => {
    const out = selectLalKitab(d1);
    expect(out.map((p) => p.planet)).not.toContain("ascendant");
    expect(out).toHaveLength(3);
    const sun = out.find((p) => p.planet === "sun")!;
    expect(sun.house).toBe(7);
    expect(sun.entry).toBe(LAL_KITAB.sun[7]);
  });

  it("orders challenging (malefic) placements before supportive ones", () => {
    const out = selectLalKitab(d1);
    const lastMalefic = Math.max(...out.map((p, i) => (p.entry.nature === "malefic" ? i : -1)));
    const firstBenefic = out.findIndex((p) => p.entry.nature === "benefic");
    expect(lastMalefic).toBeLessThan(firstBenefic);
  });

  it("clamps out-of-range house numbers into 1–12", () => {
    const odd: DivisionalChart = { ...d1, planets: [planet("moon", 0), planet("mars", 13)] };
    const out = selectLalKitab(odd);
    const moon = out.find((p) => p.planet === "moon")!;
    const mars = out.find((p) => p.planet === "mars")!;
    expect(moon.house).toBe(1);
    expect(mars.house).toBe(12);
  });
});
