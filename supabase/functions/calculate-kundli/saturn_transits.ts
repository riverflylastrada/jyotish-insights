/**
 * Comprehensive Saturn Transit engine.
 *
 * Computes ALL Sade Sati periods across a lifetime (past, active, future),
 * Kantaka Shani (Saturn in 4th/10th from Moon & Lagna),
 * and Ashtama Shani (Saturn in 8th from Moon & Lagna).
 *
 * Two modes:
 *   - Sign-based: Saturn in 12th/1st/2nd signs from natal Moon (classical).
 *   - Degree-based: Saturn within ±45° orb from natal Moon longitude.
 *
 * References:
 *   - BPHS Ch. 65 (Gochara)
 *   - Saravali Ch. 35 (Saturn transits)
 *   - Phaladeepika Ch. 26
 *
 * @module saturn_transits
 */

import {
  julianDay, julianCenturies, tropicalPositions, norm360,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName,
  type AyanamsaKey,
} from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SadeSatiPeriod {
  phase: 1 | 2 | 3;
  phaseLabel: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  saturnSign: number;
  saturnSignName: string;
  /** 'sign' or 'degree' basis */
  basis: 'sign' | 'degree';
  isActive: boolean;
}

export interface SaturnTransitPeriod {
  type: 'kantaka' | 'ashtama';
  reference: 'moon' | 'ascendant';
  houseFromRef: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  saturnSign: number;
  saturnSignName: string;
  isActive: boolean;
}

export interface SaturnTransitsData {
  natalMoonSign: number;
  natalMoonSignName: string;
  natalMoonLongitude: number;
  natalAscSign: number;
  natalAscSignName: string;
  sadeSatiSign: SadeSatiPeriod[];
  sadeSatiDegree: SadeSatiPeriod[];
  kantakaMoon: SaturnTransitPeriod[];
  kantakaAsc: SaturnTransitPeriod[];
  ashtamaMoon: SaturnTransitPeriod[];
  ashtamaAsc: SaturnTransitPeriod[];
  citation: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateToJd(d: Date): number {
  return julianDay(
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
  );
}

function jdToDate(jd: number): Date {
  return new Date((jd - 2_440_587.5) * 86_400_000);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Call-scoped cache: keyed by Math.round(jd), set in computeSaturnTransits. */
let _saturnLonCache: Map<number, number> | null = null;

function saturnSiderealLon(jd: number, ayaKey: AyanamsaKey): number {
  const key = Math.round(jd);
  if (_saturnLonCache) {
    const cached = _saturnLonCache.get(key);
    if (cached !== undefined) return cached;
  }
  const trop = tropicalPositions(jd, 0, 0, 'true');
  const aya = ayanamsa(ayaKey, jd);
  const lon = toSidereal(trop.saturn, aya);
  if (_saturnLonCache) _saturnLonCache.set(key, lon);
  return lon;
}

function saturnSiderealSign(jd: number, ayaKey: AyanamsaKey): number {
  return signNumber(saturnSiderealLon(jd, ayaKey));
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ─── Coarse-scan + binary-search segment finder ─────────────────────────────

interface Segment { state: number; startJd: number; endJd: number }

/**
 * Identify contiguous segments where `classify(jd)` returns the same non-(-1)
 * state.  Uses a coarse scan followed by binary-search refinement at each
 * detected transition (~1-day precision, ~5 evals per boundary).
 */
function findSegments(
  startJd: number,
  endJd: number,
  classify: (jd: number) => number,
  coarseStep = 90,
): Segment[] {
  // Phase 1 — coarse scan
  const jds: number[] = [];
  const states: number[] = [];
  for (let jd = startJd; jd <= endJd; jd += coarseStep) {
    jds.push(jd);
    states.push(classify(jd));
  }
  if (jds.length === 0 || jds[jds.length - 1] < endJd) {
    jds.push(endJd);
    states.push(classify(endJd));
  }

  // Phase 2 — binary-search each transition to ~1-day precision
  function refine(lo: number, hi: number): number {
    const loState = classify(lo);
    while (hi - lo > 1.0) {
      const mid = (lo + hi) / 2;
      if (classify(mid) === loState) lo = mid; else hi = mid;
    }
    return hi;
  }

  // Build ordered boundary list: [{jd, state starting here}]
  const boundaries: { jd: number; state: number }[] = [
    { jd: jds[0], state: states[0] },
  ];
  for (let i = 1; i < jds.length; i++) {
    if (states[i] !== states[i - 1]) {
      const bJd = refine(jds[i - 1], jds[i]);
      boundaries.push({ jd: bJd, state: states[i] });
    }
  }

  // Phase 3 — assemble segments, skipping state === -1
  const segments: Segment[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    if (boundaries[i].state === -1) continue;
    const segEnd = i + 1 < boundaries.length ? boundaries[i + 1].jd : endJd;
    segments.push({ state: boundaries[i].state, startJd: boundaries[i].jd, endJd: segEnd });
  }
  return segments;
}

// ─── Cycle merger ───────────────────────────────────────────────────────────

/**
 * Merge fragmented Sade Sati segments (caused by retrograde sign-crossings)
 * into clean cycles with one entry per phase.
 *
 * Algorithm:
 * 1. Group raw segments into "cycles" — consecutive segments with no gap > MAX_GAP_DAYS.
 * 2. Within each cycle, merge all segments of the same phase into one
 *    (earliest start → latest end).
 * 3. Order phases within each cycle as 1→2→3.
 */
function mergeSadeSatiCycles(raw: SadeSatiPeriod[]): SadeSatiPeriod[] {
  if (raw.length === 0) return [];

  const MAX_GAP_DAYS = 365 * 5; // > 5 year gap = new cycle

  // Split into cycle groups
  const cycles: SadeSatiPeriod[][] = [];
  let currentGroup: SadeSatiPeriod[] = [raw[0]];

  for (let i = 1; i < raw.length; i++) {
    const prevEnd = new Date(raw[i - 1].endDate).getTime();
    const currStart = new Date(raw[i].startDate).getTime();
    const gapDays = (currStart - prevEnd) / 86_400_000;

    if (gapDays > MAX_GAP_DAYS) {
      cycles.push(currentGroup);
      currentGroup = [raw[i]];
    } else {
      currentGroup.push(raw[i]);
    }
  }
  cycles.push(currentGroup);

  // Merge phases within each cycle
  const merged: SadeSatiPeriod[] = [];
  for (const cycle of cycles) {
    for (const phase of [1, 2, 3] as const) {
      const segs = cycle.filter(s => s.phase === phase);
      if (segs.length === 0) continue;

      const earliest = segs.reduce((a, b) =>
        new Date(a.startDate) < new Date(b.startDate) ? a : b);
      const latest = segs.reduce((a, b) =>
        new Date(a.endDate) > new Date(b.endDate) ? a : b);

      merged.push({
        ...earliest,
        endDate: latest.endDate,
        durationDays: daysBetween(earliest.startDate, latest.endDate),
        isActive: earliest.isActive || latest.isActive ||
          segs.some(s => s.isActive),
      });
    }
  }

  return merged;
}

// ─── Sign-based Sade Sati ───────────────────────────────────────────────────

const SIGN_PHASE_LABELS: Record<number, string> = {
  1: 'Rising (12th from Moon)',
  2: 'Peak (over natal Moon)',
  3: 'Setting (2nd from Moon)',
};

function detectSignSadeSatiRaw(
  moonSign: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  const classify = (jd: number): number => {
    const diff = (saturnSiderealSign(jd, ayaKey) - moonSign + 12) % 12;
    if (diff === 11) return 1;
    if (diff === 0) return 2;
    if (diff === 1) return 3;
    return -1;
  };

  return findSegments(startJd, endJd, classify).map(seg => {
    const start = fmtDate(jdToDate(seg.startJd));
    const end = fmtDate(jdToDate(seg.endJd));
    const satSign = saturnSiderealSign(seg.startJd, ayaKey);
    return {
      phase: seg.state as 1 | 2 | 3,
      phaseLabel: SIGN_PHASE_LABELS[seg.state],
      startDate: start,
      endDate: end,
      durationDays: daysBetween(start, end),
      saturnSign: satSign,
      saturnSignName: signName(satSign),
      basis: 'sign' as const,
      isActive: new Date(start) <= now && now < new Date(end),
    };
  });
}

function detectSignSadeSati(
  moonSign: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  return mergeSadeSatiCycles(detectSignSadeSatiRaw(moonSign, startJd, endJd, ayaKey, now));
}

// ─── Degree-based Sade Sati (±45° orb) ─────────────────────────────────────

const DEG_PHASE_LABELS: Record<number, string> = {
  1: 'Rising (approaching Moon)',
  2: 'Peak (conjunct Moon)',
  3: 'Setting (departing Moon)',
};

function detectDegreeSadeSatiRaw(
  moonLon: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  const ORB = 45;
  const classify = (jd: number): number => {
    let diff = saturnSiderealLon(jd, ayaKey) - moonLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) > ORB) return -1;
    if (diff < -15) return 1;
    if (diff <= 15) return 2;
    return 3;
  };

  return findSegments(startJd, endJd, classify).map(seg => {
    const start = fmtDate(jdToDate(seg.startJd));
    const end = fmtDate(jdToDate(seg.endJd));
    const satSign = saturnSiderealSign(seg.startJd, ayaKey);
    return {
      phase: seg.state as 1 | 2 | 3,
      phaseLabel: DEG_PHASE_LABELS[seg.state],
      startDate: start,
      endDate: end,
      durationDays: daysBetween(start, end),
      saturnSign: satSign,
      saturnSignName: signName(satSign),
      basis: 'degree' as const,
      isActive: new Date(start) <= now && now < new Date(end),
    };
  });
}

function detectDegreeSadeSati(
  moonLon: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  return mergeSadeSatiCycles(detectDegreeSadeSatiRaw(moonLon, startJd, endJd, ayaKey, now));
}

// ─── Generic house-transit detector ─────────────────────────────────────────

function detectHouseTransit(
  refSign: number,
  targetHouses: number[],
  type: 'kantaka' | 'ashtama',
  reference: 'moon' | 'ascendant',
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SaturnTransitPeriod[] {
  const classify = (jd: number): number => {
    const satSign = saturnSiderealSign(jd, ayaKey);
    const house = ((satSign - refSign + 12) % 12) + 1;
    return targetHouses.includes(house) ? house : -1;
  };

  return findSegments(startJd, endJd, classify).map(seg => {
    const start = fmtDate(jdToDate(seg.startJd));
    const end = fmtDate(jdToDate(seg.endJd));
    const satSign = saturnSiderealSign(seg.startJd, ayaKey);
    return {
      type,
      reference,
      houseFromRef: seg.state,
      startDate: start,
      endDate: end,
      durationDays: daysBetween(start, end),
      saturnSign: satSign,
      saturnSignName: signName(satSign),
      isActive: new Date(start) <= now && now < new Date(end),
    };
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Compute comprehensive Saturn transits across a lifetime window.
 * Default: 30 years before birth to 100 years after birth.
 */
export function computeSaturnTransits(
  natalMoonLon: number,
  natalMoonSign: number,
  ascSign: number,
  birthDateStr: string,
  ayaKey: AyanamsaKey,
): SaturnTransitsData {
  const birthDate = new Date(birthDateStr + 'T00:00:00Z');
  const now = new Date();

  // Scan window: 5 years before birth → 90 years after birth
  const scanStart = new Date(birthDate);
  scanStart.setUTCFullYear(scanStart.getUTCFullYear() - 5);
  const scanEnd = new Date(birthDate);
  scanEnd.setUTCFullYear(scanEnd.getUTCFullYear() + 90);

  const startJd = dateToJd(scanStart);
  const endJd = dateToJd(scanEnd);

  // Memoize Saturn's sidereal longitude for the duration of this call
  _saturnLonCache = new Map();
  try {
    const sadeSatiSign = detectSignSadeSati(natalMoonSign, startJd, endJd, ayaKey, now);
    const sadeSatiDegree = detectDegreeSadeSati(natalMoonLon, startJd, endJd, ayaKey, now);

    const kantakaMoon = detectHouseTransit(natalMoonSign, [4, 10], 'kantaka', 'moon', startJd, endJd, ayaKey, now);
    const kantakaAsc = detectHouseTransit(ascSign, [4, 10], 'kantaka', 'ascendant', startJd, endJd, ayaKey, now);

    const ashtamaMoon = detectHouseTransit(natalMoonSign, [8], 'ashtama', 'moon', startJd, endJd, ayaKey, now);
    const ashtamaAsc = detectHouseTransit(ascSign, [8], 'ashtama', 'ascendant', startJd, endJd, ayaKey, now);

    return {
      natalMoonSign,
      natalMoonSignName: signName(natalMoonSign),
      natalMoonLongitude: natalMoonLon,
      natalAscSign: ascSign,
      natalAscSignName: signName(ascSign),
      sadeSatiSign,
      sadeSatiDegree,
      kantakaMoon,
      kantakaAsc,
      ashtamaMoon,
      ashtamaAsc,
      citation: 'BPHS Ch. 65 (Gochara); Saravali Ch. 35; Phaladeepika Ch. 26',
    };
  } finally {
    _saturnLonCache = null;
  }
}
