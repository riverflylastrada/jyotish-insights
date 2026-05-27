/**
 * Kalachakra Dasha calculation (PVR / traditional nakshatra-pada method).
 *
 * The 27 nakshatras are grouped into four "kalachakra" groups
 * (Savya-1, Savya-2, Apasavya-1, Apasavya-2). Each group × pada
 * maps to a 9-sign rasi cycle with fixed durations per sign.
 * The Moon's nakshatra-pada at birth determines the cycle, and the
 * fraction of the pada traversed gives the birth balance.
 *
 * Data tables from PyJHora v4.8.5 (const.kalachakra_rasis,
 * const.kalachakra_dhasa_duration, const.kalachakra_paramayush).
 *
 * Validated against PyJHora v4.8.5 (Lahiri ayanamsa, PVR method).
 */

import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import { SIGN_NAMES } from "./constants.ts";

// ─── Nakshatra group assignments (0-based nakshatra indices) ────────────────

const SAVYA_1:    ReadonlySet<number> = new Set([0, 2, 6, 8, 12, 14, 18, 20, 24]);
const SAVYA_2:    ReadonlySet<number> = new Set([1, 7, 13, 19, 25, 26]);
const APASAVYA_1: ReadonlySet<number> = new Set([3, 9, 15, 21]);
// APASAVYA_2 = everything else: [4,5,10,11,16,17,22,23]

function kcGroupForNak(nakIdx: number): number {
  if (SAVYA_1.has(nakIdx))    return 0;
  if (SAVYA_2.has(nakIdx))    return 1;
  if (APASAVYA_1.has(nakIdx)) return 2;
  return 3; // apasavya_2
}

// ─── Kalachakra rasi cycles (4 groups × 4 padas × 9 signs, 0-indexed) ──────

const KC_RASIS: number[][][] = [
  // Group 0: Savya-1
  [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 7, 6, 5, 3, 4, 2],
    [1, 0, 11, 10, 9, 8, 0, 1, 2],
    [3, 4, 5, 6, 7, 8, 9, 10, 11],
  ],
  // Group 1: Savya-2
  [
    [7, 6, 5, 3, 4, 2, 1, 0, 11],
    [10, 9, 8, 0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 7, 6, 5],
    [3, 4, 2, 1, 0, 11, 10, 9, 8],
  ],
  // Group 2: Apasavya-1
  [
    [8, 9, 10, 11, 0, 1, 2, 4, 3],
    [5, 6, 7, 11, 10, 9, 8, 7, 6],
    [5, 4, 3, 2, 1, 0, 8, 9, 10],
    [11, 0, 1, 2, 4, 3, 5, 6, 7],
  ],
  // Group 3: Apasavya-2
  [
    [11, 10, 9, 8, 7, 6, 5, 4, 3],
    [2, 1, 0, 8, 9, 10, 11, 0, 1],
    [2, 4, 3, 5, 6, 7, 11, 10, 9],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
  ],
];

/** Duration in years for each rasi (sign 0–11, 0-indexed). */
const SIGN_DURATION: readonly number[] = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10];

/** Paramayush (total cycle years) per group × pada. */
const PARAMAYUSH: number[][] = [
  [100, 85, 83, 86],
  [100, 85, 83, 86],
  [86, 83, 85, 100],
  [86, 83, 85, 100],
];

// ─── Sidereal year (matches PyJHora const.sidereal_year) ────────────────────

const SIDEREAL_YEAR_DAYS = 365.256364;

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}

function signDurations(signs: number[]): number[] {
  return signs.map(s => SIGN_DURATION[s]);
}

function cumulativeSum(arr: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of arr) { acc += v; out.push(acc); }
  return out;
}

/** Proportionally scale child durations within a parent period. */
function scaledChildren(parentYears: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => parentYears * (w / total));
}

// ─── Core: build Maha progression from Moon longitude ───────────────────────

interface MahaEntry {
  sign: number;           // 0-indexed sign
  durationYears: number;
  kcGroup: number;
  pada: number;
}

function buildMahaProgression(moonSidLon: number): MahaEntry[] {
  const oneNak = 360 / 27;
  const onePada = 360 / 108;

  const nakIdx = Math.floor(moonSidLon / oneNak);          // 0-based
  const padaInNak = Math.floor((moonSidLon % oneNak) / onePada); // 0-based 0..3

  const kcGroup = kcGroupForNak(nakIdx);
  const cycle0 = KC_RASIS[kcGroup][padaInNak];
  const param0 = PARAMAYUSH[kcGroup][padaInNak];
  const dur0 = signDurations(cycle0);
  const cum0 = cumulativeSum(dur0);

  // Fraction of pada elapsed
  const padaStartLon = nakIdx * oneNak + padaInNak * onePada;
  const nakFrac = (moonSidLon - padaStartLon) / onePada;
  const completed = nakFrac * param0;

  // Find birth sign index within cycle0
  let idxAtBirth = 0;
  for (let i = 0; i < cum0.length; i++) {
    if (cum0[i] > completed) { idxAtBirth = i; break; }
  }
  const mdRemaining = cum0[idxAtBirth] - completed;

  // Next cycle: same group unless pada==3 (flip between paired groups)
  let kcNext = kcGroup;
  const paNext = (padaInNak + 1) % 4;
  if (padaInNak === 3) {
    kcNext = [1, 0, 3, 2][kcGroup];
  }
  const cycle1 = KC_RASIS[kcNext][paNext];

  // Maha progression: remainder of cycle0 + wrap into cycle1
  const mdSigns = [...cycle0.slice(idxAtBirth), ...cycle1.slice(0, idxAtBirth)];
  const mdDurations = signDurations(mdSigns);
  mdDurations[0] = mdRemaining;

  const splitAt = cycle0.length - idxAtBirth;

  return mdSigns.map((sign, i) => ({
    sign,
    durationYears: mdDurations[i],
    kcGroup: i < splitAt ? kcGroup : kcNext,
    pada: i < splitAt ? padaInNak : paNext,
  }));
}

// ─── Build antar dashas for a Maha period ───────────────────────────────────

function buildAntarDashas(maha: MahaEntry): DashaPeriod[] {
  const cycle = KC_RASIS[maha.kcGroup][maha.pada];
  // Rotate cycle so the Maha sign is first
  const startIdx = cycle.indexOf(maha.sign);
  const rotated = startIdx >= 0
    ? [...cycle.slice(startIdx), ...cycle.slice(0, startIdx)]
    : [...cycle];

  const weights = signDurations(rotated);
  const years = scaledChildren(maha.durationYears, weights);

  let cursor = 0; // placeholder — populated by caller
  return rotated.map((sign, i) => ({
    level: 'antar' as const,
    planet: SIGN_NAMES[sign],
    startDate: '',   // filled in below
    endDate: '',
    durationYears: years[i],
  }));
}

// ─── Public: build full Kalachakra Dasha system ─────────────────────────────

export function buildKalachakraDasha(
  moonSiderealLon: number,
  birthDate: Date,
): DashaSystem {
  const mahaEntries = buildMahaProgression(moonSiderealLon);

  // Build Maha timeline
  let cursor = new Date(birthDate);
  const timeline: DashaPeriod[] = [];

  for (const entry of mahaEntries) {
    const durationDays = entry.durationYears * SIDEREAL_YEAR_DAYS;
    const start = new Date(cursor);
    const end = addDays(start, durationDays);
    timeline.push({
      level: 'maha',
      planet: SIGN_NAMES[entry.sign],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: Math.round(entry.durationYears * 10000) / 10000,
    });
    cursor = end;
  }

  // Find current Maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  // Build antar dashas for current Maha
  const mahaIdx = timeline.indexOf(current);
  const mahaEntry = mahaEntries[mahaIdx] ?? mahaEntries[0];
  const antarPeriods = buildAntarDashas(mahaEntry);

  // Assign dates to antar periods
  let antarCursor = new Date(current.startDate).getTime();
  current.children = antarPeriods.map(ad => {
    const adDays = ad.durationYears * SIDEREAL_YEAR_DAYS;
    const start = antarCursor;
    const end = start + adDays * 24 * 3600 * 1000;
    antarCursor = end;
    return {
      ...ad,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
    };
  });

  return {
    system: 'kalachakra',
    currentMahaDasha: current,
    timeline,
  };
}
