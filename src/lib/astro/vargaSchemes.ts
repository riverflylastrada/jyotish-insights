/**
 * Client-side varga sign computation with scheme support.
 * Mirrors the formulas in supabase/functions/calculate-kundli/divisional.ts
 * for D-2, D-3, D-4, D-8 alternate schemes. Used by the frontend to
 * recompute a divisional chart when the user selects a non-default scheme.
 */

import type { DivisionalScheme, DivisionalChart, VargaCode, PlanetPosition } from './types';

const wrap = (s: number) => ((s - 1) % 12) + 1;
const quality = (sign: number) => (sign - 1) % 3;

const SIGN_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

function signName(n: number): string { return SIGN_NAMES[(n - 1) % 12]; }

// Sign lords
function signLord(sign: number): string {
  const lords = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
                 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  return lords[(sign - 1) % 12];
}

function lordSign(planet: string): number {
  const map: Record<string, number> = {
    sun: 5, moon: 4, mars: 1, mercury: 3, jupiter: 9, venus: 2, saturn: 10,
  };
  return map[planet] ?? 1;
}

// ─── D-2 schemes ────────────────────────────────────────────────────────────

function d2Parashari(origSign: number, degInSign: number): number {
  const isOdd = origSign % 2 === 1;
  return degInSign < 15 ? (isOdd ? 5 : 4) : (isOdd ? 4 : 5);
}

function d2Kashinatha(origSign: number, degInSign: number): number {
  const lord1 = signLord(origSign);
  const lord7 = signLord(wrap(origSign + 6));
  const isOdd = origSign % 2 === 1;
  const lord = degInSign < 15
    ? (isOdd ? lord1 : lord7)
    : (isOdd ? lord7 : lord1);
  return lordSign(lord);
}

function d2Parivritti(origSign: number, degInSign: number): number {
  const part = degInSign < 15 ? 0 : 1;
  return wrap((origSign - 1) * 2 + 1 + part);
}

function d2Krishnamurthy(_origSign: number, degInSign: number): number {
  return degInSign < 15 ? 5 : 4;
}

// ─── D-3 schemes ────────────────────────────────────────────────────────────

function d3Parashari(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 10);
  const offsets = [0, 4, 8];
  return wrap(origSign + offsets[part]);
}

function d3Parivritti(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 10);
  return wrap((origSign - 1) * 3 + 1 + part);
}

function d3Somanatha(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 10);
  const offsets = [0, 11, 10];
  return wrap(origSign + offsets[part]);
}

function d3Krishnamurthy(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 10);
  const offsets = [0, 4, 8];
  return wrap(origSign + offsets[part]);
}

// ─── D-4 schemes ────────────────────────────────────────────────────────────

function d4Parashari(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 7.5);
  const offsets = [0, 3, 6, 9];
  return wrap(origSign + offsets[part]);
}

function d4Parivritti(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 7.5);
  return wrap((origSign - 1) * 4 + 1 + part);
}

function d4Krishnamurthy(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 7.5);
  const offsets = [0, 3, 6, 9];
  return wrap(origSign + offsets[part]);
}

// ─── D-8 schemes ────────────────────────────────────────────────────────────

function d8Parashari(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 3.75);
  const starts8 = [1, 9, 5];
  return wrap(starts8[quality(origSign)] + part);
}

function d8Parivritti(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 3.75);
  return wrap((origSign - 1) * 8 + 1 + part);
}

function d8Krishnamurthy(origSign: number, degInSign: number): number {
  const part = Math.floor(degInSign / 3.75);
  const starts8 = [1, 9, 5];
  return wrap(starts8[quality(origSign)] + part);
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

type SignFn = (origSign: number, degInSign: number) => number;

const SCHEME_DISPATCH: Record<string, Record<DivisionalScheme, SignFn>> = {
  D2: { parashari: d2Parashari, kashinatha: d2Kashinatha, parivrittitraya: d2Parivritti, somanatha: d2Parashari, krishnamurthy: d2Krishnamurthy },
  D3: { parashari: d3Parashari, kashinatha: d3Parashari, parivrittitraya: d3Parivritti, somanatha: d3Somanatha, krishnamurthy: d3Krishnamurthy },
  D4: { parashari: d4Parashari, kashinatha: d4Parashari, parivrittitraya: d4Parivritti, somanatha: d4Parashari, krishnamurthy: d4Krishnamurthy },
  D8: { parashari: d8Parashari, kashinatha: d8Parashari, parivrittitraya: d8Parivritti, somanatha: d8Parashari, krishnamurthy: d8Krishnamurthy },
};

/**
 * Compute the varga sign for a given planet using the specified scheme.
 * Returns the same result as the Deno engine's vargaSignWithScheme().
 */
export function computeVargaSign(
  code: VargaCode,
  origSign: number,
  degInSign: number,
  scheme: DivisionalScheme = 'parashari',
): number {
  const codeFns = SCHEME_DISPATCH[code];
  if (!codeFns) return origSign; // vargas without alternate schemes
  const fn = codeFns[scheme] ?? codeFns.parashari;
  return fn(origSign, degInSign);
}

/**
 * Recompute a divisional chart with an alternate scheme.
 * Takes the D1 planet positions from the original chart and recomputes placements.
 */
export function recomputeDivisionalChart(
  code: VargaCode,
  d1Chart: DivisionalChart,
  d1Asc: { signNumber: number; signDegree: number },
  scheme: DivisionalScheme,
  originalChart: DivisionalChart,
): DivisionalChart {
  if (scheme === 'parashari') return originalChart;
  if (!SCHEME_DISPATCH[code]) return originalChart;

  const ascVarga = computeVargaSign(code, d1Asc.signNumber, d1Asc.signDegree, scheme);

  const planets: PlanetPosition[] = d1Chart.planets.map(p => {
    const vs = computeVargaSign(code, p.signNumber, p.signDegree, scheme);
    return {
      ...p,
      signNumber: vs,
      signName: signName(vs),
      houseNumber: ((vs - ascVarga + 12) % 12) + 1,
    };
  });

  return {
    ...originalChart,
    ascendantSign: ascVarga,
    planets,
  };
}
