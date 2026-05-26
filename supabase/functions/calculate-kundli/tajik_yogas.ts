/**
 * Tajik Yogas — inter-planetary aspect yogas for the annual (Varshphal) chart.
 *
 * Implements: Ithasala, Eesarpha, Ishkavala, Induvara, Nakta, Yamaya.
 * Validated against PyJHora v4.8.5 (jhora/horoscope/transit/tajaka_yoga.py).
 */

import type { VarshphalPlanet } from "./varshphal.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TajikPairYoga {
  yoga: "ithasala" | "eesarpha";
  planet1: string;
  planet2: string;
  /** 1 = Varthamaana, 2 = Poorna, 3 = Bhavishya (Ithasala only). */
  ithasalaType?: 1 | 2 | 3;
}

export interface TajikTripleYoga {
  yoga: "nakta" | "yamaya";
  mediator: string;
  planet1: string;
  planet2: string;
}

export interface TajikChartYoga {
  yoga: "ishkavala" | "induvara";
  present: boolean;
}

export interface TajikYogaResult {
  ithasala: TajikPairYoga[];
  eesarpha: TajikPairYoga[];
  nakta: TajikTripleYoga[];
  yamaya: TajikTripleYoga[];
  ishkavala: boolean;
  induvara: boolean;
}

// ─── Constants (matching PyJHora) ───────────────────────────────────────────

const SUN_TO_SATURN = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

/** Deeptamsa orbs for Sun–Saturn (PyJHora const.deeptaamsa_of_planets). */
const DEEPTAMSA: Record<string, number> = {
  sun: 15, moon: 12, mars: 8, mercury: 7, jupiter: 9, venus: 7, saturn: 9,
};

/**
 * Planet speed ranking — lower index = slower.
 * PyJHora: order_of_planets_by_speed = [6,7,8,4,2,0,5,3,1]
 * (Saturn slowest → Moon fastest). We only need Sun–Saturn (indices 0–6).
 */
const SPEED_RANK: Record<string, number> = {
  saturn: 0, jupiter: 3, mars: 4, sun: 5, venus: 6, mercury: 7, moon: 8,
};

// ─── Tajik Aspect Geometry ──────────────────────────────────────────────────

type AspectKind = "benefic" | "malefic" | "neutral" | null;

/**
 * Classify the Tajik aspect between two signs (1-indexed).
 * Returns null if no aspect (d=5 or d=7 in 0-indexed, i.e. 6th/8th house).
 */
function tajikAspect(sign1: number, sign2: number): AspectKind {
  const d = ((sign2 - sign1) % 12 + 12) % 12;
  if (d === 0) return "malefic";                   // conjunction
  if (d === 1 || d === 11) return "neutral";       // semi-sextile
  if (d === 2 || d === 10) return "benefic";       // sextile
  if (d === 3 || d === 9) return "malefic";        // square
  if (d === 4 || d === 8) return "benefic";        // trine
  if (d === 6) return "malefic";                   // opposition
  return null;                                     // d=5 or d=7 → no aspect
}

function planetsHaveAspect(sign1: number, sign2: number): boolean {
  return tajikAspect(sign1, sign2) !== null;
}

// ─── Deeptamsa (orb) check ──────────────────────────────────────────────────

/**
 * Check whether two planets are within each other's deeptamsa orb.
 * Returns [withinOrb, ithasalaType] matching PyJHora's both_planets_within_their_deeptamsa.
 *
 * The check uses the longitude WITHIN the rasi (signDegree, 0–30).
 * Each planet has a personal orb (deeptamsa). Planet A is "within B's deeptamsa"
 * when A's in-sign longitude falls in [B_lon - B_deeptamsa, B_lon + B_deeptamsa],
 * and vice versa. Both must hold (symmetric).
 *
 * ithasalaType:
 *  1 = Varthamaana (both strictly within each other's orb)
 *  2 = Poorna (longitudes within 1° of each other, regardless of orb)
 *  3 = Bhavishya (one is within, the other is within 1° of the orb boundary)
 */
function deeptamsaCheck(
  p1: string, p1Deg: number,
  p2: string, p2Deg: number,
): [boolean, 1 | 2 | 3 | null] {
  const d1 = DEEPTAMSA[p1];
  const d2 = DEEPTAMSA[p2];
  if (d1 === undefined || d2 === undefined) return [false, null];

  const p1InP2 = p1Deg >= (p2Deg - d2) && p1Deg <= (p2Deg + d2);
  const p2InP1 = p2Deg >= (p1Deg - d1) && p2Deg <= (p1Deg + d1);

  const p1NearP2 = !p1InP2 && (
    Math.abs(p1Deg - (p2Deg - d2)) <= 1.0 || Math.abs(p1Deg - (p2Deg + d2)) <= 1.0
  );
  const p2NearP1 = !p2InP1 && (
    Math.abs(p2Deg - (p1Deg - d1)) <= 1.0 || Math.abs(p2Deg - (p1Deg + d1)) <= 1.0
  );

  let within = false;
  let itype: 1 | 2 | 3 | null = null;

  if (p1InP2 && p2InP1) {
    within = true;
    itype = 1; // Varthamaana
  } else if ((p1InP2 && p2NearP1) || (p2InP1 && p1NearP2)) {
    within = true;
    itype = 3; // Bhavishya
  }

  // Poorna override: longitudes within 1°
  if (Math.abs(p1Deg - p2Deg) <= 1.0) {
    itype = 2; // Poorna
    // Poorna doesn't require the general orb check to have passed,
    // but per PyJHora it's set as a flag after the orb check. The orb
    // check must still pass for ithasala to fire (see line 601 in tajaka.py:
    // ithasala_type=2 is set *after* the return value is decided).
    // So we only return true for Poorna if we already found withinOrb = true
    // OR if both are within each other's orbs. In practice, if |deg| ≤ 1,
    // both planets are always within each other's deeptamsa (all orbs ≥ 7).
    within = true;
  }

  return [within, itype];
}

// ─── Approaching check ─────────────────────────────────────────────────────

/**
 * Check if two planets are approaching each other (Ithasala condition).
 * The faster planet must be LESS advanced in longitude within its rasi
 * than the slower planet.
 *
 * PyJHora logic (tajaka.both_planets_approaching):
 * - Determine which planet is faster by const.order_of_planets_by_speed
 * - Determine which planet is more advanced by in-sign longitude
 * - Approaching if: (faster is less advanced) OR (faster is more advanced and is also faster)
 *   Simplified: faster planet's deg < slower planet's deg → approaching
 *   OR slower planet's deg < faster planet's deg → approaching
 *   Actually: chk3_1 = (advanced==p2 && faster==p1) || (advanced==p1 && faster==p2)
 *   This means: approaching iff faster planet ≠ more-advanced planet.
 *   i.e. the faster planet is at a lower longitude → it's "behind" and catching up.
 */
function isApproaching(p1: string, p1Deg: number, p2: string, p2Deg: number): boolean {
  const speed1 = SPEED_RANK[p1] ?? 0;
  const speed2 = SPEED_RANK[p2] ?? 0;

  const faster = speed1 > speed2 ? p1 : p2;
  const fasterDeg = faster === p1 ? p1Deg : p2Deg;
  const slowerDeg = faster === p1 ? p2Deg : p1Deg;

  // PyJHora: advanced = planet with higher in-sign longitude
  // approaching = (advanced != faster), i.e. faster planet has LOWER longitude
  return fasterDeg < slowerDeg;
}

// ─── Yoga detectors ─────────────────────────────────────────────────────────

function detectIthasala(planets: VarshphalPlanet[]): TajikPairYoga[] {
  const results: TajikPairYoga[] = [];
  const sunToSat = planets.filter(p => SUN_TO_SATURN.includes(p.planet));

  for (let i = 0; i < sunToSat.length; i++) {
    for (let j = i + 1; j < sunToSat.length; j++) {
      const p1 = sunToSat[i];
      const p2 = sunToSat[j];

      // Check 1: Tajik aspect exists
      if (!planetsHaveAspect(p1.signNumber, p2.signNumber)) continue;

      // Check 2: Both within each other's deeptamsa
      const [withinOrb, itype] = deeptamsaCheck(
        p1.planet, p1.signDegree,
        p2.planet, p2.signDegree,
      );
      if (!withinOrb || itype === null) continue;

      // Check 3: Faster planet is approaching (less advanced)
      if (!isApproaching(p1.planet, p1.signDegree, p2.planet, p2.signDegree)) continue;

      results.push({
        yoga: "ithasala",
        planet1: p1.planet,
        planet2: p2.planet,
        ithasalaType: itype,
      });
    }
  }
  return results;
}

function detectEesarpha(planets: VarshphalPlanet[]): TajikPairYoga[] {
  const results: TajikPairYoga[] = [];
  const sunToSat = planets.filter(p => SUN_TO_SATURN.includes(p.planet));

  for (let i = 0; i < sunToSat.length; i++) {
    for (let j = i + 1; j < sunToSat.length; j++) {
      const p1 = sunToSat[i];
      const p2 = sunToSat[j];

      if (!planetsHaveAspect(p1.signNumber, p2.signNumber)) continue;

      const [withinOrb] = deeptamsaCheck(
        p1.planet, p1.signDegree,
        p2.planet, p2.signDegree,
      );
      if (!withinOrb) continue;

      // Eesarpha = within orb but NOT approaching (separating)
      if (isApproaching(p1.planet, p1.signDegree, p2.planet, p2.signDegree)) continue;

      results.push({
        yoga: "eesarpha",
        planet1: p1.planet,
        planet2: p2.planet,
      });
    }
  }
  return results;
}

function detectIshkavala(planets: VarshphalPlanet[], annualAscSign: number): boolean {
  // All planets (excluding ascendant and Rahu/Ketu per PyJHora convention)
  // must be in kendras or panapharas only — apoklimas must be empty.
  const kp = new Set<number>();
  for (const h of [1, 2, 4, 5, 7, 8, 10, 11]) {
    kp.add(((annualAscSign - 1 + h - 1) % 12) + 1);
  }

  const grahas = planets.filter(p =>
    p.planet !== "ascendant" && p.planet !== "rahu" && p.planet !== "ketu"
  );
  // PyJHora excludes 'L' from values but uses it as asc_house
  return grahas.every(p => kp.has(p.signNumber));
}

function detectInduvara(planets: VarshphalPlanet[], annualAscSign: number): boolean {
  // All planets must be in apoklimas (3rd, 6th, 9th, 12th) only.
  const apo = new Set<number>();
  for (const h of [3, 6, 9, 12]) {
    apo.add(((annualAscSign - 1 + h - 1) % 12) + 1);
  }

  const grahas = planets.filter(p =>
    p.planet !== "ascendant" && p.planet !== "rahu" && p.planet !== "ketu"
  );
  return grahas.every(p => apo.has(p.signNumber));
}

/**
 * Build candidate triples for Nakta/Yamaya, matching PyJHora's _get_nakta_triples.
 *
 * Groups ithasala pairs separately by p1 (first element) and p2 (second element).
 * For each planet appearing 2+ times on the same side, creates all 2-combinations
 * of its partners as candidate triples (mediator, partnerA, partnerB).
 */
function buildMediationCandidates(
  ithasalaPairs: TajikPairYoga[],
): Array<{ mediator: string; p1: string; p2: string }> {
  const candidates: Array<{ mediator: string; p1: string; p2: string }> = [];

  // Group by first element (planet1)
  const byP1 = new Map<string, string[]>();
  for (const pair of ithasalaPairs) {
    if (!byP1.has(pair.planet1)) byP1.set(pair.planet1, []);
    byP1.get(pair.planet1)!.push(pair.planet2);
  }
  for (const [mediator, partners] of byP1) {
    if (partners.length < 2) continue;
    for (let i = 0; i < partners.length; i++) {
      for (let j = i + 1; j < partners.length; j++) {
        candidates.push({ mediator, p1: partners[i], p2: partners[j] });
      }
    }
  }

  // Group by second element (planet2)
  const byP2 = new Map<string, string[]>();
  for (const pair of ithasalaPairs) {
    if (!byP2.has(pair.planet2)) byP2.set(pair.planet2, []);
    byP2.get(pair.planet2)!.push(pair.planet1);
  }
  for (const [mediator, partners] of byP2) {
    if (partners.length < 2) continue;
    for (let i = 0; i < partners.length; i++) {
      for (let j = i + 1; j < partners.length; j++) {
        candidates.push({ mediator, p1: partners[i], p2: partners[j] });
      }
    }
  }

  return candidates;
}

/**
 * Nakta Yoga: planet P mediates between p1 and p2 where:
 * - p1 and p2 have no Tajik aspect between them
 * - P has Ithasala with both p1 and p2
 * - P's in-sign longitude < both p1's and p2's (P is the fastest/least advanced)
 *
 * PyJHora: get_nakta_yoga_planet_triples
 */
function detectNakta(
  planets: VarshphalPlanet[],
  ithasalaPairs: TajikPairYoga[],
): TajikTripleYoga[] {
  const results: TajikTripleYoga[] = [];
  const planetMap = new Map(
    planets.filter(p => SUN_TO_SATURN.includes(p.planet)).map(p => [p.planet, p]),
  );

  for (const { mediator, p1: p1Name, p2: p2Name } of buildMediationCandidates(ithasalaPairs)) {
    const med = planetMap.get(mediator)!;
    const p1 = planetMap.get(p1Name)!;
    const p2 = planetMap.get(p2Name)!;

    if (planetsHaveAspect(p1.signNumber, p2.signNumber)) continue;
    if (med.signDegree >= p1.signDegree || med.signDegree >= p2.signDegree) continue;

    results.push({ yoga: "nakta", mediator, planet1: p1Name, planet2: p2Name });
  }
  return results;
}

/**
 * Yamaya Yoga: planet P mediates between p1 and p2 where:
 * - p1 and p2 have no Tajik aspect between them
 * - P has Ithasala with both p1 and p2
 * - P's in-sign longitude > both p1's and p2's (P is the slowest/most advanced)
 *
 * PyJHora: get_yamaya_yoga_planet_triples
 */
function detectYamaya(
  planets: VarshphalPlanet[],
  ithasalaPairs: TajikPairYoga[],
): TajikTripleYoga[] {
  const results: TajikTripleYoga[] = [];
  const planetMap = new Map(
    planets.filter(p => SUN_TO_SATURN.includes(p.planet)).map(p => [p.planet, p]),
  );

  for (const { mediator, p1: p1Name, p2: p2Name } of buildMediationCandidates(ithasalaPairs)) {
    const med = planetMap.get(mediator)!;
    const p1 = planetMap.get(p1Name)!;
    const p2 = planetMap.get(p2Name)!;

    if (planetsHaveAspect(p1.signNumber, p2.signNumber)) continue;
    if (med.signDegree <= p1.signDegree || med.signDegree <= p2.signDegree) continue;

    results.push({ yoga: "yamaya", mediator, planet1: p1Name, planet2: p2Name });
  }
  return results;
}

// ─── Main entry ─────────────────────────────────────────────────────────────

/**
 * Detect all Tajik yogas on the annual (Varshphal) chart.
 * @param planets - The 9 planet positions from computeVarshphal().
 * @param annualAscSign - The annual ascendant sign (1–12).
 */
export function detectTajikYogas(
  planets: VarshphalPlanet[],
  annualAscSign: number,
): TajikYogaResult {
  const ithasala = detectIthasala(planets);
  const eesarpha = detectEesarpha(planets);
  const ishkavala = detectIshkavala(planets, annualAscSign);
  const induvara = detectInduvara(planets, annualAscSign);
  const nakta = detectNakta(planets, ithasala);
  const yamaya = detectYamaya(planets, ithasala);

  return { ithasala, eesarpha, nakta, yamaya, ishkavala, induvara };
}
