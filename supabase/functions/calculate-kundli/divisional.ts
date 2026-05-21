/**
 * Divisional chart (Varga) calculations — standard Parashari formulas.
 */

import { SIGN_NAMES, VARGA_META } from "./constants.ts";
import {
  signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada as nakPada,
  wholeSignHouse, dignity as getDignity, isCombust,
} from "./vedic.ts";

// ─── types re-exported for convenience ──────────────────────────────────────

export interface PlanetPos {
  planet: string;
  longitude: number;          // sidereal 0-360
  signNumber: number;
  signName: string;
  signDegree: number;
  nakshatra: string;
  nakshatraPada: 1 | 2 | 3 | 4;
  houseNumber: number;
  isRetrograde: boolean;
  isCombust: boolean;
  speed?: number;
  dignity?: string;
}

export interface DivChart {
  varga: string;
  vargaName: string;
  significance: string;
  ascendantSign: number;
  planets: PlanetPos[];
}

// ─── Generic varga sign mapper ──────────────────────────────────────────────

/** Element index of a sign (1-indexed): 0=Fire,1=Earth,2=Air,3=Water. */
function element(sign: number): number { return (sign - 1) % 4; }

/** Sign quality: 0=movable, 1=fixed, 2=dual. */
function quality(sign: number): number { return (sign - 1) % 3; }

/** Map a D1 planet position into a specific varga sign. */
function vargaSign(code: string, origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;

  switch (code) {
    case 'D1': return origSign;

    case 'D2': {
      const isOdd = origSign % 2 === 1;
      return degInSign < 15 ? (isOdd ? 5 : 4) : (isOdd ? 4 : 5);
    }

    case 'D3': {
      const part = Math.floor(degInSign / 10);
      const offsets = [0, 4, 8];
      return wrap(origSign + offsets[part]);
    }

    case 'D4': {
      const part = Math.floor(degInSign / 7.5);
      const offsets = [0, 3, 6, 9];
      return wrap(origSign + offsets[part]);
    }

    case 'D7': {
      const part = Math.floor(degInSign / (30 / 7));
      const start = origSign % 2 === 1 ? origSign : wrap(origSign + 6);
      return wrap(start + part);
    }

    case 'D9': {
      const part = Math.floor(degInSign / (30 / 9));
      const starts = [1, 10, 7, 4]; // fire, earth, air, water
      return wrap(starts[element(origSign)] + part);
    }

    case 'D10': {
      const part = Math.floor(degInSign / 3);
      const start = origSign % 2 === 1 ? origSign : wrap(origSign + 8);
      return wrap(start + part);
    }

    case 'D12': {
      const part = Math.floor(degInSign / 2.5);
      return wrap(origSign + part);
    }

    case 'D16': {
      const part = Math.floor(degInSign / (30 / 16));
      const starts = [1, 5, 9]; // movable, fixed, dual
      return wrap(starts[quality(origSign)] + part);
    }

    case 'D20': {
      const part = Math.floor(degInSign / 1.5);
      const starts = [1, 9, 5]; // movable, fixed, dual
      return wrap(starts[quality(origSign)] + part);
    }

    case 'D24': {
      const part = Math.floor(degInSign / 1.25);
      return wrap((origSign % 2 === 1 ? 5 : 4) + part);
    }

    case 'D27': {
      const part = Math.floor(degInSign / (30 / 27));
      const starts = [1, 4, 7, 10]; // fire, earth, air, water
      return wrap(starts[element(origSign)] + part);
    }

    case 'D30': {
      const isOdd = origSign % 2 === 1;
      const rulers = isOdd
        ? [[0, 5, 'mars'], [5, 10, 'saturn'], [10, 18, 'jupiter'], [18, 25, 'mercury'], [25, 30, 'venus']] as const
        : [[0, 5, 'venus'], [5, 12, 'mercury'], [12, 20, 'jupiter'], [20, 25, 'saturn'], [25, 30, 'mars']] as const;
      for (const [lo, hi, ruler] of rulers) {
        if (degInSign >= lo && degInSign < hi) {
          const moolSigns: Record<string, number> = { mars: 1, venus: 2, mercury: 3, moon: 4, sun: 5, jupiter: 9, saturn: 11 };
          return moolSigns[ruler] ?? 1;
        }
      }
      return 1;
    }

    case 'D40': {
      const part = Math.floor(degInSign / 0.75);
      return wrap((origSign % 2 === 1 ? 1 : 7) + part);
    }

    case 'D45': {
      const part = Math.floor(degInSign / (30 / 45));
      const starts = [1, 5, 9];
      return wrap(starts[quality(origSign)] + part);
    }

    case 'D60': {
      const part = Math.floor(degInSign / 0.5);
      return wrap((origSign % 2 === 1 ? 1 : 7) + part);
    }

    default: return origSign;
  }
}

// ─── Build all divisional charts ────────────────────────────────────────────

export function buildDivisionalCharts(
  d1Planets: PlanetPos[],
  ascSign: number,
  ascDeg: number,
): DivChart[] {
  return VARGA_META.map(({ code, name, sig }) => {
    const ascVarga = vargaSign(code, ascSign, ascDeg);
    const planets: PlanetPos[] = d1Planets.map(p => {
      const vs = vargaSign(code, p.signNumber, p.signDegree);
      const vDeg = code === 'D1' ? p.signDegree : ((p.signDegree * (VARGA_META.find(v => v.code === code)?.divisor ?? 1)) % 30);
      const nIdx = nakshatraIndex(((vs - 1) * 30 + vDeg));
      return {
        ...p,
        signNumber: vs,
        signName: signName(vs),
        signDegree: vDeg,
        nakshatra: nakshatraName(nIdx),
        nakshatraPada: nakPada(((vs - 1) * 30 + vDeg)),
        houseNumber: wholeSignHouse(vs, ascVarga),
        dignity: code === 'D1' ? p.dignity : undefined,
      };
    });
    return { varga: code, vargaName: name, significance: sig, ascendantSign: ascVarga, planets };
  });
}
