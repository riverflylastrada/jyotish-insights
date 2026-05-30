/**
 * Sudasa (Wealth Dasha) — computed from the D-2 (Hora) chart.
 *
 * Identifies the Hora-ascendant; the strongest of the 12 signs by sub-period
 * attribution becomes the starting maha-dasha. Each rasi runs for a duration
 * based on the 9th lord from Hora-Lagna placement. Used to time wealth periods.
 *
 * Duration: same signs-to-lord formula as Narayana/Padakrama, applied to the
 * D-2 chart. Lord-in-own-sign → 12.
 *
 * Cite: Jaimini Sutra Pada 4 + KN Rao "Astrology of Wealth Sudasa."
 */

import { SIGN_NAMES } from "./constants.ts";
import { getSignLord } from "./vedic.ts";
import type { DashaPeriod, DashaSystem } from "./dashas.ts";
import type { PlanetPos, DivChart } from "./divisional.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const SIDEREAL_YEAR_DAYS = 365.242198781;

function isOddSign(sign: number): boolean {
  return sign % 2 === 1;
}

function addSiderealYears(base: Date, years: number): Date {
  return new Date(base.getTime() + years * SIDEREAL_YEAR_DAYS * 86_400_000);
}

// ─── Sign distance ──────────────────────────────────────────────────────────

function signDistance(from: number, to: number, zodiacal: boolean): number {
  if (from === to) return 1;
  if (zodiacal) {
    return ((to - from + 12) % 12) || 12;
  }
  return ((from - to + 12) % 12) || 12;
}

// ─── Strength scoring for Sudasa ordering ───────────────────────────────────

/**
 * Simplified Jaimini sign strength for D-2 chart.
 * Factors: planet occupancy, exaltation/own-sign, odd sign bias.
 */
function horaSignStrength(
  sign: number,
  d2Planets: PlanetPos[],
): number {
  let score = 0;

  const planetsInSign = d2Planets.filter(
    p => p.planet !== 'ascendant' && p.signNumber === sign,
  );
  score += planetsInSign.length * 2;

  for (const p of planetsInSign) {
    if (p.dignity === 'exalted') score += 2;
    else if (p.dignity === 'own_sign' || p.dignity === 'mooltrikona') score += 1;
  }

  if (isOddSign(sign)) score += 0.5;

  return score;
}

// ─── Duration computation ───────────────────────────────────────────────────

function computeDuration(
  sign: number,
  planetSign: Record<string, number>,
): number {
  const lord = getSignLord(sign);
  const lordSign = planetSign[lord];
  if (lordSign === undefined) return 1;

  if (lordSign === sign) return 12;

  const dir = isOddSign(sign);
  const years = signDistance(sign, lordSign, dir);
  return Math.max(1, Math.min(12, years));
}

// ─── Core: build Sudasa Dasha ───────────────────────────────────────────────

export function buildSudasaDasha(
  d1Planets: PlanetPos[],
  ascSign: number,
  birthDate: Date,
  divCharts: DivChart[],
): DashaSystem {
  // Get D-2 (Hora) chart
  const d2Chart = divCharts.find(c => c.varga === 'D2');

  // Hora-Lagna ascendant sign
  const horaAsc = d2Chart?.ascendantSign ?? ascSign;
  const d2Planets = d2Chart?.planets ?? d1Planets;

  // Build planet → sign lookup from D2
  const d2PlanetSign: Record<string, number> = {};
  for (const p of d2Planets) {
    if (p.planet !== 'ascendant') {
      d2PlanetSign[p.planet] = p.signNumber;
    }
  }

  // Direction: odd Hora-Lagna → zodiacal, even → anti-zodiacal
  const zodiacal = isOddSign(horaAsc);

  // Build 12-sign progression from Hora-Lagna
  const baseProgression: number[] = [];
  for (let i = 0; i < 12; i++) {
    const sign = zodiacal
      ? ((horaAsc - 1 + i) % 12) + 1
      : ((horaAsc - 1 - i + 120) % 12) + 1;
    baseProgression.push(sign);
  }

  // Sort by Hora sign strength (strongest first within groups).
  // In Sudasa, the strongest sign from Hora-Lagna starts the dasha.
  // Group by kendra/panaphara/apoklima from Hora-Lagna, then sort.
  const kendraH = [1, 4, 7, 10];
  const panapharaH = [2, 5, 8, 11];
  const apoklimaH = [3, 6, 9, 12];

  const houseToSign = (h: number) => ((horaAsc - 1 + h - 1) % 12) + 1;

  const kendraSigns = kendraH.map(houseToSign);
  const panapharaSigns = panapharaH.map(houseToSign);
  const apoklimaSigns = apoklimaH.map(houseToSign);

  const sortByStrength = (signs: number[]) =>
    signs.sort((a, b) => horaSignStrength(b, d2Planets) - horaSignStrength(a, d2Planets));

  sortByStrength(kendraSigns);
  sortByStrength(panapharaSigns);
  sortByStrength(apoklimaSigns);

  // Progression: strongest kendra first, then panaphara, then apoklima
  const progression = [...kendraSigns, ...panapharaSigns, ...apoklimaSigns];

  // Compute durations based on D-2 planet positions
  const durationMap = progression.map(sign => computeDuration(sign, d2PlanetSign));

  // Build timeline
  const timeline: DashaPeriod[] = [];
  let cursor = new Date(birthDate);

  for (let i = 0; i < 12; i++) {
    const sign = progression[i];
    const years = durationMap[i];
    const start = new Date(cursor);
    const end = addSiderealYears(start, years);

    // Antar dashas
    const antarDuration = years / 12;
    const children: DashaPeriod[] = [];
    let antarCursor = new Date(start);

    for (let j = 0; j < 12; j++) {
      const antarSign = progression[(i + j) % 12];
      const antarStart = new Date(antarCursor);
      const antarEnd = addSiderealYears(antarStart, antarDuration);

      children.push({
        level: 'antar',
        planet: SIGN_NAMES[(antarSign - 1) % 12],
        startDate: antarStart.toISOString(),
        endDate: antarEnd.toISOString(),
        durationYears: Math.round(antarDuration * 10000) / 10000,
      });

      antarCursor = antarEnd;
    }

    timeline.push({
      level: 'maha',
      planet: SIGN_NAMES[(sign - 1) % 12],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationYears: years,
      children,
    });

    cursor = end;
  }

  // Current maha dasha
  const now = Date.now();
  const current = timeline.find(
    p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  ) ?? timeline[0];

  return {
    system: 'sudasa',
    currentMahaDasha: current,
    timeline,
  };
}
