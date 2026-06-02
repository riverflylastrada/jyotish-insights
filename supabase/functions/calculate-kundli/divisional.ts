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

export interface AvasthasResult {
  baladi: 'bala' | 'kumara' | 'yuva' | 'vriddha' | 'mrita';
  baladiCitation: string;
  jagradadi: 'jagrat' | 'swapna' | 'sushupti';
  jagradadiCitation: string;
  deeptadi: 'deepta' | 'swastha' | 'pramudita' | 'shanta' | 'shakta' | 'peedita' | 'dina' | 'vikala' | 'khala';
  deeptadiCitation: string;
}

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
  avasthas?: AvasthasResult;
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
export function vargaSign(code: string, origSign: number, degInSign: number): number {
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

    case 'D5': {
      // D-5 Panchamsa — five unequal-ruler divisions of 6° each.
      // Odd signs → Ar, Aq, Sg, Ge, Li; even signs → Ta, Vi, Pi, Cp, Sc.
      // Ref: BPHS Ch. 7.8 — Panchamsa; validated vs PyJHora 4.8.6 panchamsa_chart().
      const part = Math.floor(degInSign / 6);
      const oddMap  = [1, 11, 9, 3, 7];  // Mesha, Kumbha, Dhanu, Mithuna, Tula
      const evenMap = [2, 6, 12, 10, 8]; // Vrishabha, Kanya, Meena, Makara, Vrischika
      return origSign % 2 === 1 ? oddMap[part] : evenMap[part];
    }

    case 'D6': {
      // D-6 Shashthamsa — 6 equal arcs of 5°.
      // Odd signs start from Aries (1); even signs start from Libra (7).
      // Ref: BPHS Ch. 7.9 — Shashthamsa; validated vs PyJHora 4.8.6 shashthamsa_chart().
      const part = Math.floor(degInSign / 5);
      return origSign % 2 === 1 ? (part + 1) : (part + 7);
    }

    case 'D7': {
      const part = Math.floor(degInSign / (30 / 7));
      const start = origSign % 2 === 1 ? origSign : wrap(origSign + 6);
      return wrap(start + part);
    }

    case 'D8': {
      // D-8 Ashtamsa — 8 equal arcs of 3°45′.
      // Movable signs → Aries; fixed → Sagittarius; dual → Leo.
      // Ref: BPHS Ch. 7.10 — Ashtamsa; validated vs PyJHora 4.8.6 ashtamsa_chart().
      const part = Math.floor(degInSign / 3.75);
      const starts8 = [1, 9, 5]; // movable, fixed, dual
      return wrap(starts8[quality(origSign)] + part);
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

    case 'D11': {
      // D-11 Rudramsa (Ekadasamsa) — 11 equal arcs of ≈2°43′38″.
      // Start sign = (12 − origSign_0idx) mod 12, then count forward by part.
      // Equivalent: wrap(14 − origSign + part).
      // Ref: BPHS Ch. 7.11 — Rudramsa; validated vs PyJHora 4.8.6 rudramsa_chart().
      const part = Math.floor(degInSign / (30 / 11));
      return wrap(14 - origSign + part);
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

    // ─── High-divisional vargas ───────────────────────────────────────

    /**
     * D-81 Nava-Navamsa — navamsa-of-navamsa.
     * Each sign → 81 sub-segments of 30°/81 ≈ 0°22′13.33″.
     * Scheme: compute D-9 sign for the planet's position, then apply
     * the D-9 mapping again within that sub-arc.
     *
     * Step 1: D-9 part index = floor(deg / (30/9)).
     * Step 2: D-9 sign = element-based start + part1.
     * Step 3: sub-degree within the D-9 arc = (deg mod (30/9)) * 9
     *         (scaled back to 0-30 range within that D-9 sign).
     * Step 4: apply D-9 formula again on the D-9 sign with sub-degree.
     *
     * Ref: BPHS Ch. 7; Sanjay Rath, "Vargas" treatise (navamsa-of-navamsa).
     */
    case 'D81': {
      const navArc = 30 / 9;
      const part1 = Math.floor(degInSign / navArc);
      const starts9 = [1, 10, 7, 4]; // fire, earth, air, water
      const d9Sign = wrap(starts9[element(origSign)] + part1);
      const subDeg = (degInSign - part1 * navArc) * 9; // 0–30 within D-9 arc
      const part2 = Math.floor(subDeg / navArc);
      return wrap(starts9[element(d9Sign)] + part2);
    }

    /**
     * D-108 Ashtottaramsa — each sign → 108 = 9 × 12 sub-segments.
     * Arc per segment: 30°/108 ≈ 0°16′40″.
     * Scheme: navamsa-of-dwadasamsa (D-9 applied to each D-12 arc).
     *
     * Step 1: D-12 part = floor(deg / 2.5), D-12 sign = origSign + part1.
     * Step 2: sub-degree within D-12 arc = (deg - part1*2.5) * 12 → 0-30.
     * Step 3: apply D-9 formula on the D-12 sign with sub-degree.
     *
     * Ref: BPHS Ch. 7 — Ashtottaramsa (used in Ashtottari-dasha contexts).
     */
    case 'D108': {
      const d12Arc = 2.5;
      const part1 = Math.floor(degInSign / d12Arc);
      const d12Sign = wrap(origSign + part1);
      const subDeg = (degInSign - part1 * d12Arc) * 12; // 0–30 within D-12 arc
      const navArc108 = 30 / 9;
      const part2 = Math.floor(subDeg / navArc108);
      const starts9_108 = [1, 10, 7, 4];
      return wrap(starts9_108[element(d12Sign)] + part2);
    }

    /**
     * D-144 Dwadas-Dwadasamsa — dwadasamsa-of-dwadasamsa (12-of-12).
     * Each sign → 144 sub-segments, arc = 30°/144 ≈ 0°12′30″.
     * Scheme: compute D-12 sign, then apply D-12 again.
     *
     * Step 1: D-12 part = floor(deg / 2.5), D-12 sign = origSign + part1.
     * Step 2: sub-degree = (deg - part1*2.5) * 12 → 0–30.
     * Step 3: D-12 part2 = floor(subDeg / 2.5), final sign = D-12 sign + part2.
     *
     * Ref: BPHS Ch. 7 — Dwadas-Dwadasamsa.
     */
    case 'D144': {
      const d12Arc144 = 2.5;
      const part1 = Math.floor(degInSign / d12Arc144);
      const d12Sign = wrap(origSign + part1);
      const subDeg = (degInSign - part1 * d12Arc144) * 12;
      const part2 = Math.floor(subDeg / d12Arc144);
      return wrap(d12Sign + part2);
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
