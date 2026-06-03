/**
 * Divisional chart (Varga) calculations — standard Parashari formulas
 * plus alternate schemes (Kashinatha, Parivrittitraya, Somanatha, Krishnamurthy).
 */

import { SIGN_NAMES, VARGA_META } from "./constants.ts";
import {
  signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada as nakPada,
  wholeSignHouse, dignity as getDignity, isCombust,
} from "./vedic.ts";

// ─── Divisional scheme types ─────────────────────────────────────────────────

/**
 * Supported calculation schemes for divisional charts.
 * - parashari: Standard BPHS (default, current behavior).
 * - kashinatha: Kashinatha Hora (D-2) — sign-lord-based hora assignment.
 * - parivrittitraya: Cyclic (Parivritti-traya) — continuous sign counting.
 * - somanatha: Somanatha Drekkana (D-3) — padas/sign-lord mapping.
 * - krishnamurthy: Krishnamurthy (KP) — sub-lord-based divisions.
 */
export type DivisionalScheme =
  | 'parashari'
  | 'kashinatha'
  | 'parivrittitraya'
  | 'somanatha'
  | 'krishnamurthy';

/** Which schemes are available for each varga that supports variants. */
export const VARGA_SCHEMES: Record<string, DivisionalScheme[]> = {
  D2: ['parashari', 'kashinatha', 'parivrittitraya', 'krishnamurthy'],
  D3: ['parashari', 'parivrittitraya', 'somanatha', 'krishnamurthy'],
  D4: ['parashari', 'parivrittitraya', 'krishnamurthy'],
  D8: ['parashari', 'parivrittitraya', 'krishnamurthy'],
};

/** Human-readable labels for schemes. */
export const SCHEME_LABELS: Record<DivisionalScheme, { en: string; hi: string; cite: string }> = {
  parashari:       { en: 'Parashari (BPHS)', hi: 'पाराशरी', cite: 'BPHS Ch. 7' },
  kashinatha:      { en: 'Kashinatha',       hi: 'काशीनाथ', cite: 'Kashinatha Hora — Jataka Parijata' },
  parivrittitraya: { en: 'Parivritti-traya', hi: 'परिवृत्ति-त्रय', cite: 'Parivritti-traya Drekkana tradition' },
  somanatha:       { en: 'Somanatha',        hi: 'सोमनाथ', cite: 'Somanatha Drekkana — Saravali' },
  krishnamurthy:   { en: 'Krishnamurthy (KP)', hi: 'कृष्णमूर्ति', cite: 'KP Reader 1 — Prof. K.S. Krishnamurthy' },
};

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

// ─── Sign lordship (for Kashinatha / Somanatha schemes) ─────────────────────

/** Lord of each sign (1-indexed). Returns planet key. */
function signLord(sign: number): string {
  const lords = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
                 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  return lords[(sign - 1) % 12];
}

/** Sign owned by a planet (first own sign). Used by Kashinatha D-2. */
function lordSign(planet: string): number {
  const map: Record<string, number> = {
    sun: 5, moon: 4, mars: 1, mercury: 3, jupiter: 9, venus: 2, saturn: 10,
  };
  return map[planet] ?? 1;
}

// ─── Alternate-scheme D-2 implementations ───────────────────────────────────

/**
 * D-2 Kashinatha Hora: each half (0–15°, 15–30°) is assigned to the
 * lord of the sign; the resulting sign = own sign of that lord.
 * Odd signs: 1st half → sign lord, 2nd half → lord of 7th.
 * Even signs: 1st half → lord of 7th, 2nd half → sign lord.
 * Ref: Jataka Parijata / Kashinatha tradition; PyJHora hora_chart(chart_method='kashinatha').
 */
function d2Kashinatha(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const lord1 = signLord(origSign);
  const lord7 = signLord(wrap(origSign + 6));
  const isOdd = origSign % 2 === 1;
  const lord = degInSign < 15
    ? (isOdd ? lord1 : lord7)
    : (isOdd ? lord7 : lord1);
  return lordSign(lord);
}

/**
 * D-2 Parivritti (cyclic): continuous count — sign × 2 + part index.
 * Part 0 → (origSign-1)*2 + 1; Part 1 → (origSign-1)*2 + 2; mod 12.
 * Ref: Parivritti-dwaya tradition; PyJHora hora_chart(chart_method='parivritti-dwaya').
 */
function d2Parivritti(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = degInSign < 15 ? 0 : 1;
  return wrap((origSign - 1) * 2 + 1 + part);
}

/**
 * D-2 Krishnamurthy (KP): same division as Parashari (Sun/Moon hora)
 * but mapped to Leo (5) for Sun-hora and Cancer (4) for Moon-hora,
 * regardless of odd/even — the KP system always uses Sun → Leo, Moon → Cancer.
 * 0–15° → Sun hora → Leo; 15–30° → Moon hora → Cancer.
 * Ref: KP Reader 1; PyJHora hora_chart(chart_method='kp').
 */
function d2Krishnamurthy(_origSign: number, degInSign: number): number {
  return degInSign < 15 ? 5 : 4;
}

// ─── Alternate-scheme D-3 implementations ───────────────────────────────────

/**
 * D-3 Parivritti-traya Drekkana: cyclic count through all 36 decanates.
 * Formula: ((origSign-1)*3 + part) mod 12 + 1.
 * Ref: Parivritti-traya tradition; PyJHora drekkana_chart(chart_method='parivritti-traya').
 */
function d3Parivritti(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 10);
  return wrap((origSign - 1) * 3 + 1 + part);
}

/**
 * D-3 Somanatha Drekkana: based on sign triplicities (movable/fixed/dual).
 * 1st decanate → same sign.
 * 2nd decanate → sign that is 12th from it (previous sign).
 * 3rd decanate → sign that is 11th from it (2 signs back).
 * Alternative interpretation: counting backwards from the sign.
 * Ref: Saravali / Somanatha tradition; PyJHora drekkana_chart(chart_method='somanatha').
 */
function d3Somanatha(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 10);
  // Somanatha: 1st=same, 2nd=12th from sign, 3rd=11th from sign
  const offsets = [0, 11, 10]; // 0, -1, -2 mod 12 → +0, +11, +10
  return wrap(origSign + offsets[part]);
}

/**
 * D-3 Krishnamurthy (KP): same as Parashari in division structure
 * but maps via nakshatra sub-lord assignments. For computational
 * purposes, KP uses the same 1st/5th/9th formula as Parashari.
 * Ref: KP Reader 1; equivalent to Parashari for D-3 divisions.
 */
function d3Krishnamurthy(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 10);
  const offsets = [0, 4, 8];
  return wrap(origSign + offsets[part]);
}

// ─── Alternate-scheme D-4 implementations ───────────────────────────────────

/**
 * D-4 Parivritti Chaturthamsa: cyclic count through all 48 quarters.
 * Formula: ((origSign-1)*4 + part) mod 12 + 1.
 * Ref: Parivritti tradition; PyJHora chaturthamsa_chart(chart_method='parivritti').
 */
function d4Parivritti(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 7.5);
  return wrap((origSign - 1) * 4 + 1 + part);
}

/**
 * D-4 Krishnamurthy (KP): same formula as Parashari for D-4
 * (sign + 0/3/6/9). KP does not diverge for Chaturthamsa.
 * Ref: KP Reader 1.
 */
function d4Krishnamurthy(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 7.5);
  const offsets = [0, 3, 6, 9];
  return wrap(origSign + offsets[part]);
}

// ─── Alternate-scheme D-8 implementations ───────────────────────────────────

/**
 * D-8 Parivritti Ashtamsa: cyclic count through all 96 octants.
 * Formula: ((origSign-1)*8 + part) mod 12 + 1.
 * Ref: Parivritti tradition; PyJHora ashtamsa_chart(chart_method='parivritti').
 */
function d8Parivritti(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 3.75);
  return wrap((origSign - 1) * 8 + 1 + part);
}

/**
 * D-8 Krishnamurthy (KP): same as Parashari (quality-based start).
 * KP does not diverge for Ashtamsa.
 * Ref: KP Reader 1.
 */
function d8Krishnamurthy(origSign: number, degInSign: number): number {
  const wrap = (s: number) => ((s - 1) % 12) + 1;
  const part = Math.floor(degInSign / 3.75);
  const starts8 = [1, 9, 5]; // movable, fixed, dual
  return wrap(starts8[quality(origSign)] + part);
}

// ─── Master dispatch for scheme variants ────────────────────────────────────

/**
 * Compute varga sign with an explicit scheme. Falls back to `vargaSign` for
 * 'parashari' or for vargas that don't support alternate schemes.
 */
export function vargaSignWithScheme(
  code: string,
  origSign: number,
  degInSign: number,
  scheme: DivisionalScheme = 'parashari',
): number {
  if (scheme === 'parashari') return vargaSign(code, origSign, degInSign);

  switch (code) {
    case 'D2':
      if (scheme === 'kashinatha') return d2Kashinatha(origSign, degInSign);
      if (scheme === 'parivrittitraya') return d2Parivritti(origSign, degInSign);
      if (scheme === 'krishnamurthy') return d2Krishnamurthy(origSign, degInSign);
      break;
    case 'D3':
      if (scheme === 'parivrittitraya') return d3Parivritti(origSign, degInSign);
      if (scheme === 'somanatha') return d3Somanatha(origSign, degInSign);
      if (scheme === 'krishnamurthy') return d3Krishnamurthy(origSign, degInSign);
      break;
    case 'D4':
      if (scheme === 'parivrittitraya') return d4Parivritti(origSign, degInSign);
      if (scheme === 'krishnamurthy') return d4Krishnamurthy(origSign, degInSign);
      break;
    case 'D8':
      if (scheme === 'parivrittitraya') return d8Parivritti(origSign, degInSign);
      if (scheme === 'krishnamurthy') return d8Krishnamurthy(origSign, degInSign);
      break;
  }

  // Fallback to standard Parashari for unsupported scheme/varga combos
  return vargaSign(code, origSign, degInSign);
}

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

/**
 * Build a single divisional chart with an explicit scheme.
 * Used by the frontend when the user selects an alternate scheme.
 */
export function buildSingleDivisionalChart(
  code: string,
  d1Planets: PlanetPos[],
  ascSign: number,
  ascDeg: number,
  scheme: DivisionalScheme = 'parashari',
): DivChart {
  const meta = VARGA_META.find(v => v.code === code) ?? { code, name: code, sig: '', divisor: 1 };
  const ascVarga = vargaSignWithScheme(code, ascSign, ascDeg, scheme);
  const planets: PlanetPos[] = d1Planets.map(p => {
    const vs = vargaSignWithScheme(code, p.signNumber, p.signDegree, scheme);
    const vDeg = code === 'D1' ? p.signDegree : ((p.signDegree * meta.divisor) % 30);
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
  return { varga: code, vargaName: meta.name, significance: meta.sig, ascendantSign: ascVarga, planets };
}
