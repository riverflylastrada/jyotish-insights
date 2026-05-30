/**
 * Shared Dasha utilities — functional benefic/malefic status, sign lords,
 * aspect logic, and Vimshottari / Yogini / Ashtottari math helpers.
 *
 * Canonical reference for functional status table:
 *   PVR Narasimha Rao, "Vedic Astrology: An Integrated Approach" (Sagar, 2001).
 */

import type { PlanetName } from './types';
import { SIGN_NAMES } from './types';

export type Graha = Exclude<PlanetName, 'ascendant'>;

/* ------------------------------------------------------------------ */
/*  Sign lordship                                                      */
/* ------------------------------------------------------------------ */

/** Sign rulerships (1 = Mesha … 12 = Meena). Rahu/Ketu own no sign. */
export const SIGN_LORDS: Record<number, Graha> = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon', 5: 'sun', 6: 'mercury',
  7: 'venus', 8: 'mars', 9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

/** Sign number for a given house, given the ascendant sign. */
export function signOfHouse(ascSign: number, house: number): number {
  return ((ascSign - 1 + house - 1) % 12) + 1;
}

/* ------------------------------------------------------------------ */
/*  Name mapping                                                       */
/* ------------------------------------------------------------------ */

/** Map capitalised dasha planet name → lowercase Graha key. */
export const PLANET_KEY: Record<string, Graha> = {
  Sun: 'sun', Moon: 'moon', Mars: 'mars', Mercury: 'mercury', Jupiter: 'jupiter',
  Venus: 'venus', Saturn: 'saturn', Rahu: 'rahu', Ketu: 'ketu',
};

const SIGN_NUMBER: Record<string, number> = {};
SIGN_NAMES.forEach((n, i) => { SIGN_NUMBER[n] = i + 1; SIGN_NUMBER[n.toLowerCase()] = i + 1; });
['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  .forEach((n, i) => { SIGN_NUMBER[n] = i + 1; SIGN_NUMBER[n.toLowerCase()] = i + 1; });

/** Resolve a dasha period's lord to a Graha key. For sign-based systems returns the sign lord. */
export function resolveDashaLord(planetField: string): Graha | null {
  if (PLANET_KEY[planetField]) return PLANET_KEY[planetField];
  const lower = planetField.toLowerCase();
  if (PLANET_KEY[lower]) return PLANET_KEY[lower];
  const signNum = SIGN_NUMBER[planetField] ?? SIGN_NUMBER[lower];
  if (signNum) return SIGN_LORDS[signNum];
  return null;
}

/** True for sign-based dasha systems (Chara, Kalachakra, Narayana, Lagna Kendradi, Sudasa). */
export function isSignBasedSystem(system: string): boolean {
  return system === 'char' || system === 'kalachakra' || system === 'narayana' || system === 'lagna_kendradi' || system === 'sudasa';
}

/* ------------------------------------------------------------------ */
/*  Graha drishti                                                      */
/* ------------------------------------------------------------------ */

export function aspectOffsets(p: Graha): number[] {
  switch (p) {
    case 'mars': return [3, 6, 7];
    case 'jupiter': return [4, 6, 8];
    case 'saturn': return [2, 6, 9];
    case 'rahu': case 'ketu': return [4, 6, 8];
    default: return [6];
  }
}

export const ASPECT_LABEL: Record<Graha, string> = {
  sun: '7th', moon: '7th', mercury: '7th', venus: '7th',
  mars: '4th, 7th & 8th', jupiter: '5th, 7th & 9th', saturn: '3rd, 7th & 10th',
  rahu: '5th, 7th & 9th', ketu: '5th, 7th & 9th',
};

/* ------------------------------------------------------------------ */
/*  Functional status (benefic / malefic / yogakaraka / neutral)       */
/* ------------------------------------------------------------------ */

export type FunctionalStatus = 'yogakaraka' | 'benefic' | 'malefic' | 'neutral';

/**
 * Compute functional benefic/malefic status for a planet given the lagna sign.
 *
 * Ref: PVR Narasimha Rao, "Vedic Astrology: An Integrated Approach."
 *  - Trikona lords (1, 5, 9) → benefic
 *  - Kendra lords (4, 7, 10) → neutral bias; if also trikona → yogakaraka
 *  - Dusthana lords (6, 8, 12) or trishadaya (3, 11) → malefic
 */
export function functionalStatus(planet: Graha, ascSign: number): FunctionalStatus {
  if (planet === 'rahu' || planet === 'ketu') return 'neutral';

  const houses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_LORDS[signOfHouse(ascSign, h)] === planet) houses.push(h);
  }
  if (houses.length === 0) return 'neutral';

  const trikonas = [1, 5, 9];
  const kendras = [4, 7, 10];
  const dusthanas = [3, 6, 8, 11, 12];

  const lordsTrikona = houses.some((h) => trikonas.includes(h));
  const lordsKendra = houses.some((h) => kendras.includes(h));
  const lordsDusthana = houses.some((h) => dusthanas.includes(h));

  if (lordsTrikona && lordsKendra) return 'yogakaraka';
  if (lordsTrikona) return 'benefic';
  if (lordsDusthana && !lordsKendra) return 'malefic';
  return 'neutral';
}

export const FUNCTIONAL_STATUS_LABEL: Record<FunctionalStatus, string> = {
  yogakaraka: 'Yogakaraka',
  benefic: 'Func. Benefic',
  malefic: 'Func. Malefic',
  neutral: 'Neutral',
};

export const FUNCTIONAL_STATUS_BORDER: Record<FunctionalStatus, string> = {
  yogakaraka: 'hsl(var(--semantic-positive))',
  benefic: 'hsl(var(--brand-gold))',
  malefic: 'hsl(var(--semantic-negative))',
  neutral: 'hsl(var(--text-muted))',
};

/* ------------------------------------------------------------------ */
/*  Dignity                                                            */
/* ------------------------------------------------------------------ */

export function dignityLabel(dignity?: string): string {
  if (!dignity) return '';
  return dignity.replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  House centroids for mini-D1 (North-Indian diamond, 400×400 box)    */
/* ------------------------------------------------------------------ */

export const HOUSE_CENTERS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 108 }, 2: { x: 108, y: 58 }, 3: { x: 58, y: 108 }, 4: { x: 108, y: 200 },
  5: { x: 58, y: 292 }, 6: { x: 108, y: 342 }, 7: { x: 200, y: 292 }, 8: { x: 292, y: 342 },
  9: { x: 342, y: 292 }, 10: { x: 292, y: 200 }, 11: { x: 342, y: 108 }, 12: { x: 292, y: 58 },
};

/* ------------------------------------------------------------------ */
/*  Vimshottari constants                                              */
/* ------------------------------------------------------------------ */

export const VIMSHOTTARI_SEQUENCE: Array<{ lord: string; years: number }> = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
];

/** Vimshottari dasha lord for a 1-based nakshatra index. */
export function vimshottariLordForNakshatra(nakshatraIndex: number): { lord: string; years: number } {
  return VIMSHOTTARI_SEQUENCE[(nakshatraIndex - 1) % 9];
}

/** 27 nakshatras in order. */
export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

/** Lookup nakshatra index (1-based) by name (case-insensitive partial match). */
export function nakshatraIndex(name: string): number {
  const lower = name.toLowerCase();
  const idx = NAKSHATRA_NAMES.findIndex((n) => n.toLowerCase() === lower || lower.startsWith(n.toLowerCase().split(' ')[0]));
  return idx >= 0 ? idx + 1 : 1;
}

/* ------------------------------------------------------------------ */
/*  Yogini constants                                                   */
/* ------------------------------------------------------------------ */

export const YOGINI_SEQUENCE: Array<{ yogini: string; lord: string; years: number }> = [
  { yogini: 'Mangala', lord: 'Moon', years: 1 },
  { yogini: 'Pingala', lord: 'Sun', years: 2 },
  { yogini: 'Dhanya', lord: 'Jupiter', years: 3 },
  { yogini: 'Bhramari', lord: 'Mars', years: 4 },
  { yogini: 'Bhadrika', lord: 'Mercury', years: 5 },
  { yogini: 'Ulka', lord: 'Saturn', years: 6 },
  { yogini: 'Siddha', lord: 'Venus', years: 7 },
  { yogini: 'Sankata', lord: 'Rahu', years: 8 },
];

/* ------------------------------------------------------------------ */
/*  Ashtottari constants                                               */
/* ------------------------------------------------------------------ */

export const ASHTOTTARI_SEQUENCE: Array<{ lord: string; years: number }> = [
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 15 },
  { lord: 'Mars', years: 8 },
  { lord: 'Mercury', years: 17 },
  { lord: 'Saturn', years: 10 },
  { lord: 'Jupiter', years: 19 },
  { lord: 'Rahu', years: 12 },
  { lord: 'Venus', years: 21 },
];
