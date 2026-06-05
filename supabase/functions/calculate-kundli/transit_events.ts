/**
 * Transit & dasha event detection engine.
 *
 * Pure function — given a KundliData snapshot and a look-ahead window,
 * returns upcoming astrologically significant events.
 *
 * Categories:
 * 1. Sade Sati phase transitions (Saravali Ch. 35)
 * 2. Ashtama Shani — Saturn transiting natal 8th house
 * 3. Major planet sign changes (Saturn / Jupiter / Rahu / Ketu ingresses)
 * 4. Guru Bala — Jupiter in kendras/trines from natal Moon (Phaladeepika Ch. 26)
 * 5. Major retrograde stations — Saturn / Jupiter direction reversals
 * 6. Eclipse activations — eclipses within ±10° of natal planet/angle
 * 7. Vimshottari dasha transitions — Maha or Antar lord change within window
 */

import {
  julianDay, julianCenturies, tropicalPositions,
  isRetrograde, norm360, sunLongitude, moonLongitude,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName,
  type AyanamsaKey,
} from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TransitEvent {
  chartId: string;
  eventKey: string;
  type: 'sade_sati' | 'ashtama_shani' | 'sign_ingress' | 'guru_bala' | 'retrograde' | 'eclipse' | 'dasha_transition';
  severity: 'high' | 'medium' | 'low';
  starts: string;
  ends?: string;
  title: string;
  description: string;
  citation: string;
  affectedHouses?: number[];
}

interface KundliSnapshot {
  id: string;
  birthDetails: {
    ayanamsa: AyanamsaKey;
    dateOfBirth: string;
    timeOfBirth?: string;
    placeOfBirth: { latitude: number; longitude: number; timezoneOffset: number };
    nodeType?: 'true' | 'mean';
  };
  ascendant: { signNumber: number; longitude: number };
  divisionalCharts: Array<{
    varga: string;
    planets: Array<{ planet: string; signNumber: number; longitude: number }>;
  }>;
  dashas: Array<{
    system: string;
    timeline: Array<{
      level: string;
      planet: string;
      startDate: string;
      endDate: string;
      durationYears?: number;
      children?: Array<{
        level: string;
        planet: string;
        startDate: string;
        endDate: string;
      }>;
    }>;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAJOR_PLANETS = ['saturn', 'jupiter', 'rahu', 'ketu'] as const;

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

function houseFrom(transitSign: number, natalSign: number): number {
  return ((transitSign - natalSign + 12) % 12) + 1;
}

function getD1Planets(chart: KundliSnapshot) {
  const d1 = chart.divisionalCharts.find(d => d.varga === 'D1');
  return d1?.planets ?? [];
}

function getNatalMoonSign(chart: KundliSnapshot): number {
  const moon = getD1Planets(chart).find(p => p.planet === 'moon');
  return moon?.signNumber ?? 0;
}

// ─── Per-scan ephemeris cache ─────────────────────────────────────────────────
// tropicalPositions(jd) is chart-independent here — it's always called with fixed
// lat/lon = 0 and nodeType 'true', and the detectors read only planet longitudes
// (never the ascendant, which would need the birth place). Yet a single
// detectUpcomingEvents run invokes seven detectors over overlapping jd grids and
// siderealPosAt recomputes the FULL planet set on every call even though each call
// reads one planet — e.g. the sign-ingress detector asks for all four major planets
// at the same jd (4 calls → 4 full VSOP87 computes). Memoizing tropicalPositions by
// jd for the duration of one scan collapses that to a single compute per unique jd.
// Pure memoization (identical input → identical output), so detected events are
// byte-identical to the un-cached path. (Same idea as the Saturn lifetime-scan
// memoization, #96, which the roadmap flags as the remedy for WORKER_RESOURCE_LIMIT.)
type RawPositions = ReturnType<typeof tropicalPositions>;
let activeCache: Map<number, RawPositions> | null = null;

function tropicalAt(jd: number): RawPositions {
  if (!activeCache) return tropicalPositions(jd, 0, 0, 'true');
  const hit = activeCache.get(jd);
  if (hit) return hit;
  const computed = tropicalPositions(jd, 0, 0, 'true');
  activeCache.set(jd, computed);
  return computed;
}

function siderealPosAt(
  planet: string, jd: number, ayaKey: AyanamsaKey,
): { sign: number; longitude: number } {
  const trop = tropicalAt(jd);
  const tropLon = (trop as unknown as Record<string, number>)[planet];
  if (tropLon === undefined) return { sign: 0, longitude: 0 };
  const aya = ayanamsa(ayaKey, jd);
  const sid = toSidereal(tropLon, aya);
  return { sign: signNumber(sid), longitude: sid };
}

// ─── Detection Functions ────────────────────────────────────────────────────

function detectSadeSatiEvents(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const moonSign = getNatalMoonSign(chart);
  if (!moonSign) return events;

  const step = 4; // days
  let prevPhase: number | null = null;

  for (let jd = startJd; jd <= endJd; jd += step) {
    const sat = siderealPosAt('saturn', jd, ayaKey);
    const diff = ((sat.sign - moonSign + 12) % 12);
    let phase = -1;
    if (diff === 11) phase = 1;
    else if (diff === 0) phase = 2;
    else if (diff === 1) phase = 3;

    if (phase !== -1 && phase !== prevPhase) {
      const d = jdToDate(jd);
      const labels: Record<number, string> = {
        1: 'Rising (12th from Moon)',
        2: 'Peak (over natal Moon)',
        3: 'Setting (2nd from Moon)',
      };
      events.push({
        chartId: chart.id,
        eventKey: `sade_sati_phase${phase}:${fmtDate(d)}`,
        type: 'sade_sati',
        severity: phase === 2 ? 'high' : 'medium',
        starts: d.toISOString(),
        title: `Sade Sati — ${labels[phase]}`,
        description: `Saturn enters ${labels[phase].toLowerCase()} phase of Sade Sati. Natal Moon in ${signName(moonSign)}, transit Saturn in ${signName(sat.sign)}.`,
        citation: 'Saravali Ch. 35',
        affectedHouses: [houseFrom(sat.sign, chart.ascendant.signNumber)],
      });
    }
    prevPhase = phase;
  }
  return events;
}

function detectAshtamaShani(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const moonSign = getNatalMoonSign(chart);
  if (!moonSign) return events;

  const step = 4;
  let wasIn8th = false;

  for (let jd = startJd; jd <= endJd; jd += step) {
    const sat = siderealPosAt('saturn', jd, ayaKey);
    const diff = ((sat.sign - moonSign + 12) % 12);
    const isIn8th = diff === 7;

    if (isIn8th && !wasIn8th) {
      const d = jdToDate(jd);
      events.push({
        chartId: chart.id,
        eventKey: `ashtama_shani:${fmtDate(d)}`,
        type: 'ashtama_shani',
        severity: 'high',
        starts: d.toISOString(),
        title: `Ashtama Shani begins`,
        description: `Saturn transiting 8th house from natal Moon (${signName(moonSign)}). Transit Saturn enters ${signName(sat.sign)} — period of stress, obstacles, and transformation.`,
        citation: 'Phaladeepika Ch. 26; Saravali Ch. 35',
        affectedHouses: [8],
      });
    }
    wasIn8th = isIn8th;
  }
  return events;
}

function detectSignIngresses(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const step = 2;
  const ascSign = chart.ascendant.signNumber;

  const prevSigns: Record<string, number> = {};
  for (const planet of MAJOR_PLANETS) {
    const pos = siderealPosAt(planet, startJd, ayaKey);
    prevSigns[planet] = pos.sign;
  }

  for (let jd = startJd + step; jd <= endJd; jd += step) {
    for (const planet of MAJOR_PLANETS) {
      const pos = siderealPosAt(planet, jd, ayaKey);
      if (pos.sign !== prevSigns[planet]) {
        const d = jdToDate(jd);
        const pLabel = planet.charAt(0).toUpperCase() + planet.slice(1);
        const house = houseFrom(pos.sign, ascSign);
        events.push({
          chartId: chart.id,
          eventKey: `sign_ingress:${planet}:${signName(pos.sign)}:${fmtDate(d)}`,
          type: 'sign_ingress',
          severity: (planet === 'saturn' || planet === 'jupiter') ? 'high' : 'medium',
          starts: d.toISOString(),
          title: `${pLabel} enters ${signName(pos.sign)}`,
          description: `${pLabel} sign change: enters ${signName(pos.sign)} (${house}${ordinal(house)} house from Lagna). Previous sign: ${signName(prevSigns[planet])}.`,
          citation: 'Brihat Parashara Hora Shastra Ch. 65 (Gochara)',
          affectedHouses: [house],
        });
        prevSigns[planet] = pos.sign;
      }
    }
  }
  return events;
}

function detectGuruBala(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const moonSign = getNatalMoonSign(chart);
  if (!moonSign) return events;

  const kendras = [1, 4, 7, 10];
  const trines = [1, 5, 9];
  const step = 4;
  let prevHouse = 0;

  for (let jd = startJd; jd <= endJd; jd += step) {
    const jup = siderealPosAt('jupiter', jd, ayaKey);
    const house = houseFrom(jup.sign, moonSign);

    if (house !== prevHouse) {
      const isKendra = kendras.includes(house);
      const isTrine = trines.includes(house);
      if (isKendra || isTrine) {
        const d = jdToDate(jd);
        const type = isKendra && isTrine ? 'kendra & trine' : isKendra ? 'kendra' : 'trine';
        events.push({
          chartId: chart.id,
          eventKey: `guru_bala:${house}:${fmtDate(d)}`,
          type: 'guru_bala',
          severity: 'low',
          starts: d.toISOString(),
          title: `Jupiter enters ${ordinal(house)} from Moon (${type})`,
          description: `Jupiter transiting ${signName(jup.sign)} — the ${ordinal(house)} house from natal Moon (${signName(moonSign)}). Guru Bala: auspicious transit strengthening the Moon's significations.`,
          citation: 'Phaladeepika Ch. 26',
          affectedHouses: [house],
        });
      }
    }
    prevHouse = house;
  }
  return events;
}

function detectRetrogrades(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const step = 2;
  const planets = ['saturn', 'jupiter'] as const;
  const ascSign = chart.ascendant.signNumber;

  const prevRetro: Record<string, boolean> = {};
  for (const planet of planets) {
    const T = julianCenturies(startJd);
    prevRetro[planet] = isRetrograde(planet, T);
  }

  for (let jd = startJd + step; jd <= endJd; jd += step) {
    const T = julianCenturies(jd);
    for (const planet of planets) {
      const retro = isRetrograde(planet, T);
      if (retro !== prevRetro[planet]) {
        const d = jdToDate(jd);
        const pos = siderealPosAt(planet, jd, ayaKey);
        const pLabel = planet.charAt(0).toUpperCase() + planet.slice(1);
        const direction = retro ? 'retrograde' : 'direct';
        const house = houseFrom(pos.sign, ascSign);
        events.push({
          chartId: chart.id,
          eventKey: `retrograde:${planet}:${direction}:${fmtDate(d)}`,
          type: 'retrograde',
          severity: 'medium',
          starts: d.toISOString(),
          title: `${pLabel} turns ${direction} in ${signName(pos.sign)}`,
          description: `${pLabel} stations ${direction} at ${pos.longitude.toFixed(1)}° sidereal (${signName(pos.sign)}, ${ordinal(house)} house from Lagna). Stationary planets intensify their significations.`,
          citation: 'Brihat Parashara Hora Shastra Ch. 28 (Graha Gati)',
          affectedHouses: [house],
        });
      }
      prevRetro[planet] = retro;
    }
  }
  return events;
}

function detectEclipseActivations(
  chart: KundliSnapshot, startJd: number, endJd: number, ayaKey: AyanamsaKey,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const d1Planets = getD1Planets(chart);
  if (d1Planets.length === 0) return events;

  // Scan for eclipses: new/full Moon within orb of Rahu/Ketu axis
  const eclipseOrb = 11.5; // degrees — standard eclipse orb for lunar nodes
  const activationOrb = 10; // degrees from natal planet
  const step = 1; // daily scan for eclipses

  for (let jd = startJd; jd <= endJd; jd += step) {
    const T = julianCenturies(jd);
    const aya = ayanamsa(ayaKey, jd);

    const sunTrop = sunLongitude(T);
    const moonTrop = moonLongitude(T);
    const sunSid = toSidereal(sunTrop, aya);
    const moonSid = toSidereal(moonTrop, aya);

    // Check Sun-Moon elongation for New Moon (solar eclipse) or Full Moon (lunar eclipse)
    let diff = norm360(moonTrop - sunTrop);
    if (diff > 180) diff = 360 - diff;
    const isNewMoon = diff < 5; // solar eclipse candidate
    const isFullMoon = Math.abs(diff - 180) < 5 || Math.abs(diff + 180) < 5;
    if (!isNewMoon && !isFullMoon) continue;

    // Check proximity to Rahu/Ketu
    const trop = tropicalAt(jd);
    const rahuSid = toSidereal(trop.rahu, aya);
    let rahuDiff = Math.abs(norm360(sunSid - rahuSid));
    if (rahuDiff > 180) rahuDiff = 360 - rahuDiff;
    const ketuSid = norm360(rahuSid + 180);
    let ketuDiff = Math.abs(norm360(sunSid - ketuSid));
    if (ketuDiff > 180) ketuDiff = 360 - ketuDiff;

    if (rahuDiff > eclipseOrb && ketuDiff > eclipseOrb) continue;

    // This is an eclipse — check activation of natal planets
    const eclipseLon = isNewMoon ? sunSid : moonSid;
    const eclipseType = isNewMoon ? 'Solar' : 'Lunar';

    for (const np of d1Planets) {
      if (np.planet === 'rahu' || np.planet === 'ketu') continue;
      let actDiff = Math.abs(norm360(eclipseLon - np.longitude));
      if (actDiff > 180) actDiff = 360 - actDiff;
      if (actDiff <= activationOrb) {
        const d = jdToDate(jd);
        events.push({
          chartId: chart.id,
          eventKey: `eclipse:${eclipseType.toLowerCase()}:${np.planet}:${fmtDate(d)}`,
          type: 'eclipse',
          severity: 'high',
          starts: d.toISOString(),
          title: `${eclipseType} eclipse activates natal ${np.planet}`,
          description: `${eclipseType} eclipse at ${eclipseLon.toFixed(1)}° (${signName(signNumber(eclipseLon))}) within ${actDiff.toFixed(1)}° of natal ${np.planet} (${np.longitude.toFixed(1)}° ${signName(np.signNumber)}). Eclipses near natal planets signal karmic turning points.`,
          citation: 'Surya Siddhanta; Brihat Samhita Ch. 5 (Grahana)',
        });
      }
    }
  }

  // Deduplicate — eclipses span a few days so same activation may fire multiple days
  const seen = new Set<string>();
  return events.filter(e => {
    if (seen.has(e.eventKey)) return false;
    seen.add(e.eventKey);
    return true;
  });
}

function detectDashaTransitions(
  chart: KundliSnapshot, windowStart: Date, windowEnd: Date,
): TransitEvent[] {
  const events: TransitEvent[] = [];
  const vim = chart.dashas.find(d => d.system === 'vimshottari');
  if (!vim) return events;

  const wsMs = windowStart.getTime();
  const weMs = windowEnd.getTime();

  // Maha dasha transitions
  for (const period of vim.timeline) {
    const startMs = new Date(period.startDate).getTime();
    if (startMs >= wsMs && startMs <= weMs) {
      const d = new Date(period.startDate);
      events.push({
        chartId: chart.id,
        eventKey: `dasha_maha:${period.planet}:${fmtDate(d)}`,
        type: 'dasha_transition',
        severity: 'high',
        starts: d.toISOString(),
        title: `Maha Dasha changes to ${period.planet}`,
        description: `Vimshottari Maha Dasha lord changes to ${period.planet} — a major life-cycle shift lasting ${period.durationYears?.toFixed(1) ?? '?'} years. Re-evaluate priorities, health, and direction under the new planetary ruler.`,
        citation: 'Brihat Parashara Hora Shastra Ch. 46 (Dasha Phala)',
      });
    }

    // Antar dasha transitions
    if (period.children) {
      for (const antar of period.children) {
        const antarMs = new Date(antar.startDate).getTime();
        if (antarMs >= wsMs && antarMs <= weMs) {
          const d = new Date(antar.startDate);
          events.push({
            chartId: chart.id,
            eventKey: `dasha_antar:${period.planet}:${antar.planet}:${fmtDate(d)}`,
            type: 'dasha_transition',
            severity: 'medium',
            starts: d.toISOString(),
            title: `Antar Dasha changes to ${antar.planet} (in ${period.planet} Maha)`,
            description: `Vimshottari Antar Dasha lord changes to ${antar.planet} within ${period.planet} Maha Dasha — sub-period shift influencing events at a finer time scale.`,
            citation: 'Brihat Parashara Hora Shastra Ch. 46 (Dasha Phala)',
          });
        }
      }
    }
  }
  return events;
}

// ─── Ordinal helper ─────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Optional shared state for scanning many charts in one pass (e.g. transit-scan).
 * tropicalPositions(jd) is chart-independent here, so passing ONE cache across all
 * charts makes the ephemeris cost O(unique jds) for the whole scan instead of
 * O(charts × jds) — each day's planet set is computed once no matter how many
 * charts are scanned. `now` MUST be shared too: otherwise each chart's jd grid
 * differs by the per-call clock delta and the cache never hits across charts.
 */
export interface ScanContext {
  now?: Date;
  ephemerisCache?: Map<number, ReturnType<typeof tropicalPositions>>;
}

export function detectUpcomingEvents(
  chart: KundliSnapshot,
  lookAheadDays = 30,
  ctx?: ScanContext,
): TransitEvent[] {
  // Memoize the ephemeris for the span of this scan (see tropicalAt). Save and
  // restore any outer cache so a nested call can never clobber an in-flight one.
  // A caller scanning many charts passes a shared cache + a shared `now` via ctx
  // so the ephemeris is computed once per jd for the entire scan, not per chart.
  const prevCache = activeCache;
  activeCache = ctx?.ephemerisCache ?? new Map();
  try {
    const now = ctx?.now ?? new Date();
    const end = new Date(now.getTime() + lookAheadDays * 86_400_000);
    const startJd = dateToJd(now);
    const endJd = dateToJd(end);
    const ayaKey = chart.birthDetails.ayanamsa ?? 'lahiri';

    const events: TransitEvent[] = [
      ...detectSadeSatiEvents(chart, startJd, endJd, ayaKey),
      ...detectAshtamaShani(chart, startJd, endJd, ayaKey),
      ...detectSignIngresses(chart, startJd, endJd, ayaKey),
      ...detectGuruBala(chart, startJd, endJd, ayaKey),
      ...detectRetrogrades(chart, startJd, endJd, ayaKey),
      ...detectEclipseActivations(chart, startJd, endJd, ayaKey),
      ...detectDashaTransitions(chart, now, end),
    ];

    // Sort by start date
    events.sort((a, b) => new Date(a.starts).getTime() - new Date(b.starts).getTime());
    return events;
  } finally {
    activeCache = prevCache;
  }
}
