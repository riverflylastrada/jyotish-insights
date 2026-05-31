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

function saturnSiderealLon(jd: number, ayaKey: AyanamsaKey): number {
  const trop = tropicalPositions(jd, 0, 0, 'true');
  const aya = ayanamsa(ayaKey, jd);
  return toSidereal(trop.saturn, aya);
}

function saturnSiderealSign(jd: number, ayaKey: AyanamsaKey): number {
  return signNumber(saturnSiderealLon(jd, ayaKey));
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ─── Sign-based Sade Sati ───────────────────────────────────────────────────

function detectSignSadeSati(
  moonSign: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  const periods: SadeSatiPeriod[] = [];
  const step = 3; // days

  const phaseForDiff = (diff: number): 1 | 2 | 3 | -1 => {
    if (diff === 11) return 1; // 12th from Moon
    if (diff === 0) return 2;  // over Moon
    if (diff === 1) return 3;  // 2nd from Moon
    return -1;
  };

  const PHASE_LABELS: Record<number, string> = {
    1: 'Rising (12th from Moon)',
    2: 'Peak (over natal Moon)',
    3: 'Setting (2nd from Moon)',
  };

  let currentPhase: 1 | 2 | 3 | -1 = -1;
  let phaseStartJd = startJd;

  for (let jd = startJd; jd <= endJd + step; jd += step) {
    const satSign = jd <= endJd ? saturnSiderealSign(jd, ayaKey) : -1;
    const diff = satSign >= 0 ? ((satSign - moonSign + 12) % 12) : -1;
    const phase = satSign >= 0 ? phaseForDiff(diff) : -1;

    if (phase !== currentPhase) {
      // close previous period
      if (currentPhase !== -1) {
        const start = fmtDate(jdToDate(phaseStartJd));
        const end = fmtDate(jdToDate(jd));
        const satAtStart = saturnSiderealSign(phaseStartJd, ayaKey);
        periods.push({
          phase: currentPhase,
          phaseLabel: PHASE_LABELS[currentPhase],
          startDate: start,
          endDate: end,
          durationDays: daysBetween(start, end),
          saturnSign: satAtStart,
          saturnSignName: signName(satAtStart),
          basis: 'sign',
          isActive: new Date(start) <= now && now < new Date(end),
        });
      }
      currentPhase = phase;
      phaseStartJd = jd;
    }
  }

  return periods;
}

// ─── Degree-based Sade Sati (±45° orb) ─────────────────────────────────────

function detectDegreeSadeSati(
  moonLon: number,
  startJd: number,
  endJd: number,
  ayaKey: AyanamsaKey,
  now: Date,
): SadeSatiPeriod[] {
  const periods: SadeSatiPeriod[] = [];
  const step = 3;
  const ORB = 45;

  const phaseForOrb = (satLon: number): 1 | 2 | 3 | -1 => {
    let diff = satLon - moonLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) > ORB) return -1;
    if (diff < -15) return 1;  // approaching
    if (diff <= 15) return 2;  // peak
    return 3;                   // departing
  };

  let currentPhase: 1 | 2 | 3 | -1 = -1;
  let phaseStartJd = startJd;

  for (let jd = startJd; jd <= endJd + step; jd += step) {
    const satLon = jd <= endJd ? saturnSiderealLon(jd, ayaKey) : -999;
    const phase = satLon >= 0 ? phaseForOrb(satLon) : -1;

    if (phase !== currentPhase) {
      if (currentPhase !== -1) {
        const start = fmtDate(jdToDate(phaseStartJd));
        const end = fmtDate(jdToDate(jd));
        const satSign = saturnSiderealSign(phaseStartJd, ayaKey);
        periods.push({
          phase: currentPhase,
          phaseLabel: currentPhase === 1 ? 'Rising (approaching Moon)'
            : currentPhase === 2 ? 'Peak (conjunct Moon)'
            : 'Setting (departing Moon)',
          startDate: start,
          endDate: end,
          durationDays: daysBetween(start, end),
          saturnSign: satSign,
          saturnSignName: signName(satSign),
          basis: 'degree',
          isActive: new Date(start) <= now && now < new Date(end),
        });
      }
      currentPhase = phase;
      phaseStartJd = jd;
    }
  }

  return periods;
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
  const periods: SaturnTransitPeriod[] = [];
  const step = 3;

  let inTransit = false;
  let transitStartJd = startJd;
  let currentHouse = 0;

  for (let jd = startJd; jd <= endJd + step; jd += step) {
    const satSign = jd <= endJd ? saturnSiderealSign(jd, ayaKey) : -1;
    const house = satSign >= 0 ? ((satSign - refSign + 12) % 12) + 1 : -1;
    const isTarget = targetHouses.includes(house);

    if (isTarget && !inTransit) {
      inTransit = true;
      transitStartJd = jd;
      currentHouse = house;
    } else if (!isTarget && inTransit) {
      const start = fmtDate(jdToDate(transitStartJd));
      const end = fmtDate(jdToDate(jd));
      const satSign2 = saturnSiderealSign(transitStartJd, ayaKey);
      periods.push({
        type,
        reference,
        houseFromRef: currentHouse,
        startDate: start,
        endDate: end,
        durationDays: daysBetween(start, end),
        saturnSign: satSign2,
        saturnSignName: signName(satSign2),
        isActive: new Date(start) <= now && now < new Date(end),
      });
      inTransit = false;
    } else if (isTarget && inTransit && house !== currentHouse) {
      // house changed within target set (e.g. 4th→10th for kantaka)
      const start = fmtDate(jdToDate(transitStartJd));
      const end = fmtDate(jdToDate(jd));
      const satSign2 = saturnSiderealSign(transitStartJd, ayaKey);
      periods.push({
        type,
        reference,
        houseFromRef: currentHouse,
        startDate: start,
        endDate: end,
        durationDays: daysBetween(start, end),
        saturnSign: satSign2,
        saturnSignName: signName(satSign2),
        isActive: new Date(start) <= now && now < new Date(end),
      });
      transitStartJd = jd;
      currentHouse = house;
    }
  }

  return periods;
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
}
