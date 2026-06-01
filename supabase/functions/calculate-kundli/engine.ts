/**
 * Main orchestrator — ties all modules together to produce a KundliData object.
 */

import {
  julianDay, julianCenturies, tropicalPositions,
  isRetrograde, planetSpeed, sunriseSunset,
  obliquity, lst, norm360,
  type NodeType,
} from "./astronomy.ts";
import {
  ayanamsa, toSidereal, signNumber, signName, signDegree,
  nakshatraIndex, nakshatraName, nakshatraPada, dignity, isCombust,
  wholeSignHouse,
  type AyanamsaKey,
} from "./vedic.ts";
import { buildDivisionalCharts, type PlanetPos } from "./divisional.ts";
import { buildVimshottari } from "./dashas.ts";
import { buildYoginiDasha } from "./yogini.ts";
import { buildAshtottariDasha } from "./ashtottari.ts";
import { detectYogas } from "./yogas.ts";
import { detectDoshas } from "./doshas.ts";
import { computeAshtakavarga } from "./ashtakavarga.ts";
import { computePanchang } from "./panchang.ts";
import { computeKpPlanetSubLords, computePlacidusCusps, computeKochCusps, computeEqualCusps, computeSripatiCusps, computeCuspalSubLords, computeRulingPlanets, computeHouseSignificators } from "./kp.ts";
import { computeCharaKarakas, karakamsa, computeArudhaPadas, computeCharaDasha } from "./jaimini.ts";
import { computeSpecialLagnas } from "./special_lagna.ts";
import { computeArgala } from "./argala.ts";
import { computeShadbala } from "./shadbala.ts";
import { computeBhavaBala } from "./bhavabala.ts";
import { computeVarshphal } from "./varshphal.ts";
import { detectTajikYogas } from "./tajik_yogas.ts";
import { computeVargeeyaBala } from "./vargeeya_bala.ts";
import { buildKalachakraDasha } from "./kalachakra.ts";
import { buildNarayanaDasha } from "./narayana.ts";
import { buildLagnaKendradiDasha } from "./lagna_kendradi.ts";
import { buildSudasaDasha } from "./sudasa.ts";
import { buildDrigdasa } from "./drigdasa.ts";
import { buildShoolaDasha } from "./shoola.ts";
import { buildDwisaptatiDasha } from "./dwisaptati.ts";
import { buildShatTrimsaDasha } from "./shat_trimsa.ts";
import { computeVimsopakaBala } from "./vimsopaka.ts";
import { kpHoraryLongitude } from "./kp_horary.ts";
import { computeAvasthas } from "./avasthas.ts";
import { computeSaturnTransits } from "./saturn_transits.ts";
import { computeSarvatobhadra } from "./sarvatobhadra.ts";

// ─── BirthDetails shape (mirrors frontend) ─────────────────────────────────

export type ChartBasis = 'rasi' | 'solar' | 'moon' | 'horary';

export interface BirthDetails {
  fullName: string;
  dateOfBirth: string;   // YYYY-MM-DD
  timeOfBirth?: string;  // HH:MM:SS  (optional for solar/moon/horary)
  placeOfBirth: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneOffset: number; // hours east of UTC (e.g. 5.5 for IST)
  };
  gender?: string;
  ayanamsa: AyanamsaKey;
  houseSystem: string;
  nodeType?: NodeType;
  /** Chart basis: how the Lagna is determined. Default 'rasi' (standard). */
  chartBasis?: ChartBasis;
  /** KP horary number 1-249 (required when chartBasis is 'horary'). */
  horaryNumber?: number;
}

// ─── Planet list ────────────────────────────────────────────────────────────

const PLANETS: Array<{ key: string; label: string }> = [
  { key: 'ascendant', label: 'ascendant' },
  { key: 'sun', label: 'sun' },
  { key: 'moon', label: 'moon' },
  { key: 'mars', label: 'mars' },
  { key: 'mercury', label: 'mercury' },
  { key: 'jupiter', label: 'jupiter' },
  { key: 'venus', label: 'venus' },
  { key: 'saturn', label: 'saturn' },
  { key: 'rahu', label: 'rahu' },
  { key: 'ketu', label: 'ketu' },
];

function kendras(h: number): boolean { return [1, 4, 7, 10].includes(h); }
function trikonas(h: number): boolean { return [1, 5, 9].includes(h); }
function dusthanas(h: number): boolean { return [6, 8, 12].includes(h); }

// ─── Main calculation ───────────────────────────────────────────────────────

export async function calculateKundli(details: BirthDetails) {
  const basis: ChartBasis = details.chartBasis ?? 'rasi';

  // Default time to noon UTC when birth time is unknown (solar/moon/horary)
  const effectiveTime = details.timeOfBirth || '12:00:00';
  const timeKnown = !!details.timeOfBirth;

  // Parse birth date/time → Julian Day in UT
  const [y, m, d] = details.dateOfBirth.split('-').map(Number);
  const timeParts = effectiveTime.split(':').map(Number);
  const hour = timeParts[0] ?? 0;
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;

  const tzOffset = details.placeOfBirth.timezoneOffset;
  const utHour = hour - tzOffset;
  const jd = julianDay(y, m, d, utHour, minute, second);
  const T = julianCenturies(jd);

  const lat = details.placeOfBirth.latitude;
  const lon = details.placeOfBirth.longitude;

  // Tropical positions
  const nodeType = details.nodeType ?? 'true';
  const trop = tropicalPositions(jd, lat, lon, nodeType);

  // Ayanamsa
  const aya = ayanamsa(details.ayanamsa, jd);

  // Build D1 planet positions
  let ascSid = toSidereal(trop.ascendant, aya);
  let ascSign = signNumber(ascSid);

  // Override ascendant based on chartBasis
  const sunSid = toSidereal(trop.sun, aya);
  const moonSidRaw = toSidereal(trop.moon, aya);

  let moonSignUncertain = false;

  if (basis === 'solar') {
    // Sun's sign becomes the 1st house; ascendant = start of Sun's sign
    ascSign = signNumber(sunSid);
    ascSid = (ascSign - 1) * 30;
  } else if (basis === 'moon') {
    // Moon's sign becomes the 1st house
    ascSign = signNumber(moonSidRaw);
    ascSid = (ascSign - 1) * 30;
    if (!timeKnown) moonSignUncertain = true;
  } else if (basis === 'horary') {
    const horaryLon = kpHoraryLongitude(details.horaryNumber ?? 0);
    if (horaryLon === null) throw new Error(`Invalid KP horary number: ${details.horaryNumber}`);
    ascSid = horaryLon;
    ascSign = signNumber(ascSid);
  }

  const d1Planets: PlanetPos[] = PLANETS.map(({ key }) => {
    // For non-rasi bases, override the ascendant entry with the derived Lagna
    const sidLon = key === 'ascendant' && basis !== 'rasi'
      ? ascSid
      : toSidereal((trop as unknown as Record<string, number>)[key], aya);
    const sn = signNumber(sidLon);
    const sd = signDegree(sidLon);
    const nIdx = nakshatraIndex(sidLon);
    const retro = isRetrograde(key, T);
    const comb = isCombust(key, sidLon, sunSid, retro);

    return {
      planet: key,
      longitude: sidLon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: sd,
      nakshatra: nakshatraName(nIdx),
      nakshatraPada: nakshatraPada(sidLon),
      houseNumber: wholeSignHouse(sn, ascSign),
      isRetrograde: retro,
      isCombust: comb,
      speed: planetSpeed(key, T),
      dignity: dignity(key, sn, sd),
    };
  });

  // Avasthas — Baladi, Jagradadi, Deeptadi planetary states (BPHS Ch. 45)
  // Must run before buildDivisionalCharts so D1 spread copies pick up avasthas.
  for (const p of d1Planets) {
    const av = computeAvasthas(p, d1Planets);
    if (av) p.avasthas = av;
  }

  // Divisional charts
  const ascDeg = signDegree(ascSid);
  const divCharts = buildDivisionalCharts(d1Planets, ascSign, ascDeg);

  // Vimshottari Dasha
  const moonSid = moonSidRaw;
  const birthDate = new Date(`${details.dateOfBirth}T${effectiveTime}`);
  // Jaimini AK sign (needed for Drigdasa / Shoola before the full Jaimini block)
  const earlyCharaKarakas = computeCharaKarakas(d1Planets);
  const earlyAk = earlyCharaKarakas.find((ck) => ck.karaka === 'AK');
  const akPlanet = earlyAk?.planet ?? 'sun';
  const akSign = d1Planets.find(p => p.planet === akPlanet)?.signNumber ?? ascSign;

  const dashas = [
    buildVimshottari(moonSid, birthDate),
    buildYoginiDasha(moonSid, birthDate),
    buildAshtottariDasha(moonSid, birthDate),
    buildKalachakraDasha(moonSid, birthDate),
    buildNarayanaDasha(d1Planets, ascSign, birthDate),
    buildLagnaKendradiDasha(d1Planets, ascSign, birthDate),
    buildSudasaDasha(d1Planets, ascSign, birthDate, divCharts),
    buildDrigdasa(d1Planets, ascSign, birthDate, akSign),
    buildShoolaDasha(d1Planets, ascSign, birthDate, akSign),
    buildDwisaptatiDasha(d1Planets, ascSign, moonSid, birthDate),
    buildShatTrimsaDasha(d1Planets, ascSign, moonSid, birthDate, akPlanet),
  ].filter((d): d is NonNullable<typeof d> => d !== null);

  // Yogas & Doshas
  const yogas = detectYogas(d1Planets);
  const doshas = detectDoshas(d1Planets);

  // Ashtakavarga
  const ashtakavarga = computeAshtakavarga(d1Planets);

  // Panchang
  const { sunrise, sunset } = sunriseSunset(jd, lat, lon);
  const panchang = computePanchang(trop.sun, trop.moon, moonSid, jd, sunrise, sunset);

  // Placidus cusps (needed by Shadbala, KP, and as base for Sripati)
  const eps = obliquity(T);
  const ramcDeg = lst(jd, lon);
  const tropCusps = computePlacidusCusps(jd, lat, eps, ramcDeg);
  const siderealCusps = tropCusps.map((c: number) => norm360(c - aya));

  // House system cusps — compute for the selected system
  const hs = details.houseSystem ?? 'whole_sign';
  let selectedTropCusps: number[];
  switch (hs) {
    case 'placidus':
      selectedTropCusps = tropCusps;
      break;
    case 'koch':
      selectedTropCusps = computeKochCusps(jd, lat, eps, ramcDeg);
      break;
    case 'equal':
      selectedTropCusps = computeEqualCusps(trop.ascendant);
      break;
    case 'sripati':
      selectedTropCusps = computeSripatiCusps(tropCusps);
      break;
    default: // 'whole_sign' or any unrecognized value
      selectedTropCusps = [];
      break;
  }
  const selectedSidCusps = selectedTropCusps.map((c: number) => norm360(c - aya));

  // Full six-source Shadbala (Parashari/BPHS)
  const shadbala = computeShadbala({
    d1Planets,
    divCharts,
    jd,
    lat,
    lon,
    tz: tzOffset,
    ayanamsaDeg: aya,
    siderealCusps,
    ascSign,
  });

  // Bhava Bala (house strength, reuses Shadbala)
  const bhavaBala = computeBhavaBala({
    d1Planets,
    siderealCusps,
    shadbala,
    ascSign,
    jd,
    lat,
    lon,
    tz: tzOffset,
    ayanamsaDeg: aya,
  });

  // KP sub-lords for all 9 planets
  const kpPlanetSubLords = computeKpPlanetSubLords(d1Planets);

  // KP cuspal sub-lords (reuse tropCusps from above)
  const cuspalSubLords = computeCuspalSubLords(tropCusps, aya);

  // KP Ruling Planets (at chart time)
  const rulingPlanets = computeRulingPlanets(ascSid, moonSid, birthDate);

  // KP 4-fold house significators
  const houseSignificators = computeHouseSignificators(d1Planets, ascSign);

  // Jaimini: Chara Karakas, Karakamsa, Arudha Padas, Chara Dasha
  // (reuse early computation from dasha block above)
  const charaKarakas = earlyCharaKarakas;
  const ak = earlyAk;
  const d9Chart = divCharts.find((c) => c.varga === 'D9');
  const karakamsaResult = ak && d9Chart
    ? karakamsa(ak.planet, d9Chart.planets)
    : { sign: 0, signName: 'Unknown' };
  const arudhaPadas = computeArudhaPadas(d1Planets, ascSign);
  const charaDashaTimeline = computeCharaDasha(d1Planets, ascSign, birthDate);

  // Jaimini: Special Lagnas & Argala
  const birthHours = hour + minute / 60 + second / 3600;
  const specialLagnas = computeSpecialLagnas(
    jd, lat, lon, tzOffset, aya, sunSid, moonSid, ascSid, birthHours,
  );
  const argala = computeArgala(d1Planets, ascSign);

  // Varshphal (annual Tajik chart for the current year)
  const varshphal = computeVarshphal(details);

  // Tajik yogas on the annual chart
  if (varshphal) {
    varshphal.tajikYogas = detectTajikYogas(varshphal.planets, varshphal.annualAscSign);
  }

  // Vargeeya Bala (divisional-chart strength)
  const vargeeyaBala = computeVargeeyaBala(d1Planets, divCharts);

  // Vimsopaka Bala (Shodhasavarga — 16-varga dignity score out of 20)
  const vimsopakaBala = computeVimsopakaBala(d1Planets, divCharts);

  // Saturn Transits — comprehensive Sade Sati + Kantaka + Ashtama
  const moonPlanet = d1Planets.find(p => p.planet === 'moon');
  const saturnTransits = moonPlanet
    ? computeSaturnTransits(
        moonPlanet.longitude,
        moonPlanet.signNumber,
        ascSign,
        details.dateOfBirth,
        details.ayanamsa,
      )
    : undefined;

  const result = {
    id: crypto.randomUUID(),
    // Engine output version. Bump when the snapshot shape gains new data
    // (e.g. new sections). Keep in sync with CURRENT_SNAPSHOT_VERSION in
    // src/lib/astro/types.ts — saved charts below this version auto-recalculate.
    snapshotVersion: 22,
    birthDetails: details,
    generatedAt: new Date().toISOString(),
    ascendant: d1Planets[0], // ascendant entry
    panchang,
    divisionalCharts: divCharts,
    dashas,
    doshas,
    yogas,
    ashtakavarga,
    shadbala,
    vimsopakaBala,
    bhavaBala,
    kp: { planetSubLords: kpPlanetSubLords, cuspalSubLords, rulingPlanets, houseSignificators },
    jaimini: {
      charaKarakas,
      atmakaraka: ak?.planet ?? 'unknown',
      karakamsa: karakamsaResult,
      arudhaPadas,
      charaDasha: charaDashaTimeline ? (() => {
        const now = new Date();
        const current = charaDashaTimeline.find(
          (d) => new Date(d.startDate) <= now && now < new Date(d.endDate),
        );
        const currentAntar = current?.children.find(
          (a) => new Date(a.startDate) <= now && now < new Date(a.endDate),
        );
        return {
          timeline: charaDashaTimeline,
          currentSign: current?.sign,
          currentSignName: current?.signName,
          currentAntarSign: currentAntar?.sign,
          currentAntarSignName: currentAntar?.signName,
        };
      })() : undefined,
      specialLagnas,
      argala,
    },
    varshphal,
    vargeeyaBala,
    saturnTransits,
    sarvatobhadra: computeSarvatobhadra(
      d1Planets.map(p => ({ planet: p.planet, longitude: p.longitude })),
      ascSid,
    ),
    houseCusps: selectedSidCusps.length > 0
      ? selectedSidCusps.map((lon, i) => ({
          cusp: i + 1,
          longitude: lon,
          sign: Math.floor(lon / 30) + 1,
          degree: lon % 30,
        }))
      : undefined,
    chartBasis: basis,
    moonSignUncertain: moonSignUncertain || undefined,
    raw: { source: 'calculate-kundli', ayanamsa: aya, julianDay: jd },
    // Auto-insights (optional AI enrichment) are generated SEPARATELY and
    // merged into the saved snapshot client-side — see useAutoInsights. They
    // must NOT be computed here: the LLM round-trip took ~25s and blocked the
    // (otherwise ~25ms) deterministic chart computation. Left undefined so the
    // UI renders the chart instantly and fills in insights when they arrive.
    // deno-lint-ignore no-explicit-any
    autoInsights: undefined as any,
  };

  return result;
}

// ─── Transit positions ─────────────────────────────────────────────────────

export function calculateTransits(details: BirthDetails) {
  const now = new Date();
  const jd = julianDay(
    now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
  );
  const T = julianCenturies(jd);
  const nodeType = details.nodeType ?? 'true';
  const trop = tropicalPositions(jd, details.placeOfBirth.latitude, details.placeOfBirth.longitude, nodeType);
  const aya = ayanamsa(details.ayanamsa, jd);
  const ascSid = toSidereal(trop.ascendant, aya);
  const ascSign = signNumber(ascSid);

  return PLANETS.filter(({ key }) => key !== 'ascendant').map(({ key }) => {
    const tropLon = (trop as unknown as Record<string, number>)[key];
    const sidLon = toSidereal(tropLon, aya);
    const sn = signNumber(sidLon);
    const sd = signDegree(sidLon);
    const nIdx = nakshatraIndex(sidLon);
    const retro = isRetrograde(key, T);
    return {
      planet: key,
      longitude: sidLon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: sd,
      nakshatra: nakshatraName(nIdx),
      nakshatraPada: nakshatraPada(sidLon),
      houseNumber: wholeSignHouse(sn, ascSign),
      isRetrograde: retro,
      isCombust: false,
      speed: planetSpeed(key, T),
    };
  });
}

/**
 * Approximate UTC date at which `planetKey` permanently leaves sidereal sign
 * `targetSign` (1–12), scanning forward from `fromDate`. Retrograde re-entries are
 * handled by returning shortly after the LAST time the planet is seen in the sign
 * within the horizon, so the result is the final egress — not a mid-retrograde dip.
 * Returns null if the planet is not in `targetSign` anywhere in the horizon (it has
 * already left, or won't reach it in time). Used for Sade Sati / Saturn-transit
 * end-date reporting. Planet longitude is geocentric, so observer lat/lon are
 * irrelevant and passed as 0.
 */
export function planetSignExitDate(
  planetKey: string,
  targetSign: number,
  fromDate: Date,
  ayanamsaKey: AyanamsaKey,
  opts: { horizonDays?: number; stepDays?: number } = {},
): Date | null {
  const horizonDays = opts.horizonDays ?? 3000; // ~8.2 yr — covers a full Sade Sati from its first phase
  const stepDays = opts.stepDays ?? 4;
  const startJd = fromDate.getTime() / 86_400_000 + 2_440_587.5;

  let lastInSignJd: number | null = null;
  for (let d = 0; d <= horizonDays; d += stepDays) {
    const jd = startJd + d;
    const lon = (tropicalPositions(jd, 0, 0, 'true') as unknown as Record<string, number>)[planetKey];
    if (lon === undefined) return null;
    const sid = toSidereal(lon, ayanamsa(ayanamsaKey, jd));
    if (signNumber(sid) === targetSign) lastInSignJd = jd;
  }
  if (lastInSignJd === null) return null;
  // True egress lies between the last in-sign sample and the next (out-of-sign) sample.
  const egressJd = lastInSignJd + stepDays / 2;
  return new Date((egressJd - 2_440_587.5) * 86_400_000);
}
