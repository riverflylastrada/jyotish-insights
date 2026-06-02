/**
 * Sahams (36 Arabic-Parts–style sensitive points) — Tajik/Varshphal.
 *
 * Each saham is computed from planet/lagna longitudes using the formula:
 *   Day birth: A − B + C  (with +30° correction when C is not between B→A)
 *   Night birth: B − A + C  (swapped, same correction)
 * Some sahams are invariant (same formula day or night).
 *
 * Validated against PyJHora v4.8.6 `jhora.horoscope.transit.saham`.
 * Classical source: Tajik Neelakanthi / Varshphal texts.
 */

import {
  signNumber, signName, nakshatraIndex, nakshatraName, wholeSignHouse, getSignLord,
} from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SahamResult {
  /** Saham identifier (e.g. 'punya', 'vidya'). */
  id: string;
  /** Display name. */
  name: string;
  /** Classical meaning. */
  meaning: string;
  /** Absolute sidereal longitude (0–360). */
  longitude: number;
  /** Sign number (1–12). */
  signNumber: number;
  /** Sign name. */
  signName: string;
  /** Degree within sign. */
  signDegree: number;
  /** Nakshatra name. */
  nakshatra: string;
  /** House placement in the chart (1–12). */
  houseNumber: number;
}

export interface SahamsData {
  sahams: SahamResult[];
  isDayBirth: boolean;
  citation: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize angle to [0, 360). */
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * PyJHora's _is_C_between_B_to_A: checks if C's rasi lies between
 * B's rasi and A's rasi (exclusive, going forward from B to A).
 * If true, no +30 correction is applied.
 */
function isCBetweenBToA(aLon: number, bLon: number, cLon: number): boolean {
  const aRasi = Math.floor(aLon / 30);
  const bRasi = Math.floor(bLon / 30);
  const cRasi = Math.floor(cLon / 30);
  for (let n = bRasi; n < bRasi + 11; n++) {
    const nextN = (n + 1) % 12;
    if (nextN === cRasi) return true;
    if (nextN === aRasi) break;
  }
  return false;
}

/**
 * Core saham calculation: A − B + C (day), B − A + C (night).
 * Applies +30° correction per PyJHora's logic.
 */
function sahamFormula(
  aLon: number, bLon: number, cLon: number, nightBirth: boolean,
): number {
  let result: number;
  if (!nightBirth) {
    result = aLon - bLon + cLon;
    if (!isCBetweenBToA(aLon, bLon, cLon)) result += 30;
  } else {
    result = bLon - aLon + cLon;
    if (!isCBetweenBToA(bLon, aLon, cLon)) result += 30;
  }
  return norm360(result);
}

/**
 * Same formula but invariant (no night swap).
 */
function sahamFormulaFixed(aLon: number, bLon: number, cLon: number): number {
  let result = aLon - bLon + cLon;
  if (!isCBetweenBToA(aLon, bLon, cLon)) result += 30;
  return norm360(result);
}

// ─── Planet longitude map type ──────────────────────────────────────────────

interface PlanetLons {
  ascendant: number;
  sun: number;
  moon: number;
  mars: number;
  mercury: number;
  jupiter: number;
  venus: number;
  saturn: number;
}

// ─── Sign lord index mapping ────────────────────────────────────────────────

/** Get longitude from PlanetLons by sign lord name. */
function signLordLongitude(sign: number, lons: PlanetLons): number {
  const lord = getSignLord(sign);
  const map: Record<string, number> = {
    sun: lons.sun,
    moon: lons.moon,
    mars: lons.mars,
    mercury: lons.mercury,
    jupiter: lons.jupiter,
    venus: lons.venus,
    saturn: lons.saturn,
  };
  return map[lord] ?? 0;
}

// ─── Main computation ───────────────────────────────────────────────────────

/**
 * Compute all 36 Sahams.
 * @param lons - Sidereal longitudes of planets (ascendant, sun..saturn)
 * @param ascSign - Ascendant sign (1-12) for house calculations
 * @param isDayBirth - true if Sun is above the horizon at birth
 */
export function computeSahams(
  lons: PlanetLons,
  ascSign: number,
  isDayBirth: boolean,
): SahamsData {
  const night = !isDayBirth;
  const L = lons.ascendant;

  // House cusps: kept unnormalized (may exceed 360°) to match PyJHora's
  // _is_C_between_B_to_A behavior where int(lon/30) > 11 is intentional.
  // The final result is normalized via % 360 in sahamFormula/sahamFormulaFixed.
  const house8 = L + 210; // 8th house cusp = asc + 7*30
  const house6 = L + 150; // 6th house cusp = asc + 5*30
  const house9 = L + 240; // 9th house cusp = asc + 8*30
  const house2 = L + 30;  // 2nd house cusp = asc + 1*30
  const house11 = L + 300; // 11th house cusp = asc + 10*30

  // Sign lords for special sahams
  const ascSignLord = signLordLongitude(ascSign, lons);
  const sunSign = Math.floor(lons.sun / 30) + 1;
  const moonSign = Math.floor(lons.moon / 30) + 1;
  const sunSignLordLon = signLordLongitude(sunSign, lons);
  const moonSignLordLon = signLordLongitude(moonSign, lons);

  // 2nd house sign and its lord
  const secondHouseSign = ((ascSign - 1 + 1) % 12) + 1;
  const secondLordLon = signLordLongitude(secondHouseSign, lons);

  // 9th house sign and its lord
  const ninthHouseSign = ((ascSign - 1 + 8) % 12) + 1;
  const ninthLordLon = signLordLongitude(ninthHouseSign, lons);

  // 11th house sign and its lord
  const eleventhHouseSign = ((ascSign - 1 + 10) % 12) + 1;
  const eleventhLordLon = signLordLongitude(eleventhHouseSign, lons);

  // #1 Punya: Moon − Sun + Lagna (day), Sun − Moon + Lagna (night)
  const punya = sahamFormula(lons.moon, lons.sun, L, night);

  // #2 Vidya: Sun − Moon + Lagna (day), Moon − Sun + Lagna (night)
  const vidya = sahamFormula(lons.sun, lons.moon, L, night);

  // #3 Yasas: Jupiter − Punya + Lagna
  const yasas = sahamFormula(lons.jupiter, punya, L, night);

  // #4 Mitra: Jupiter − Punya + Venus
  const mitra = sahamFormula(lons.jupiter, punya, lons.venus, night);

  // #5 Mahatmya: Punya − Mars + Lagna
  const mahatmya = sahamFormula(punya, lons.mars, L, night);

  // #6 Asha: Saturn − Mars + Lagna
  const asha = sahamFormula(lons.saturn, lons.mars, L, night);

  // #7 Samartha: Mars − LagnaLord + Lagna
  // Special: if Mars owns lagna, use Jupiter instead and swap day/night
  let samarthaNight = night;
  const samarthaA = lons.mars;
  let samarthaB = ascSignLord;
  if (getSignLord(ascSign) === 'mars') {
    samarthaB = lons.jupiter;
    samarthaNight = !night;
  }
  const samartha = sahamFormula(samarthaA, samarthaB, L, samarthaNight);

  // #8 Bhratri: Jupiter − Saturn + Lagna (same day & night)
  const bhratri = sahamFormulaFixed(lons.jupiter, lons.saturn, L);

  // #9 Gaurava: Jupiter − Moon + Sun
  const gaurava = sahamFormula(lons.jupiter, lons.moon, lons.sun, night);

  // #10 Pitri: Saturn − Sun + Lagna
  const pitri = sahamFormula(lons.saturn, lons.sun, L, night);

  // #11 Rajya: same as Pitri (PyJHora delegates to pithri_saham)
  const rajya = pitri;

  // #12 Matri: Moon − Venus + Lagna
  const matri = sahamFormula(lons.moon, lons.venus, L, night);

  // #13 Putra: Jupiter − Moon + Lagna
  const putra = sahamFormula(lons.jupiter, lons.moon, L, night);

  // #14 Jeeva: Saturn − Jupiter + Lagna
  const jeeva = sahamFormula(lons.saturn, lons.jupiter, L, night);

  // #15 Karma: Mars − Mercury + Lagna
  const karma = sahamFormula(lons.mars, lons.mercury, L, night);

  // #16 Roga: Lagna − Moon + Lagna (same day/night, no correction per PyJHora)
  const roga = norm360(L - lons.moon + L);

  // #17 Kali: Jupiter − Mars + Lagna
  const kali = sahamFormula(lons.jupiter, lons.mars, L, night);

  // #18 Sastra: Jupiter − Saturn + Mercury
  const sastra = sahamFormula(lons.jupiter, lons.saturn, lons.mercury, night);

  // #19 Bandhu: Mercury − Moon + Lagna
  const bandhu = sahamFormula(lons.mercury, lons.moon, L, night);

  // #20 Mrithyu: 8thHouse − Moon + Lagna (same day & night)
  const mrithyu = sahamFormulaFixed(house8, lons.moon, L);

  // #21 Paradesa: 9thHouse − 9thLord + Lagna (same day & night)
  const paradesa = sahamFormulaFixed(house9, ninthLordLon, L);

  // #22 Artha: 2ndHouse − 2ndLord + Lagna (same day & night)
  const artha = sahamFormulaFixed(house2, secondLordLon, L);

  // #23 Paradara: Venus − Sun + Lagna
  const paradara = sahamFormula(lons.venus, lons.sun, L, night);

  // #24 Vanika: Moon − Mercury + Lagna
  const vanika = sahamFormula(lons.moon, lons.mercury, L, night);

  // #25 Karyasiddhi: Saturn − Sun + SunSignLord (day), Saturn − Moon + MoonSignLord (night)
  let karyasiddhi: number;
  if (!night) {
    karyasiddhi = sahamFormulaFixed(lons.saturn, lons.sun, sunSignLordLon);
  } else {
    karyasiddhi = sahamFormulaFixed(lons.saturn, lons.moon, moonSignLordLon);
  }

  // #26 Vivaha: Venus − Saturn + Lagna
  const vivaha = sahamFormula(lons.venus, lons.saturn, L, night);

  // #27 Santapa: Saturn − Moon + 6thHouse
  const santapa = sahamFormula(lons.saturn, lons.moon, house6, night);

  // #28 Sraddha: Venus − Mars + Lagna
  const sraddha = sahamFormula(lons.venus, lons.mars, L, night);

  // #29 Preethi: Sastra − Punya + Lagna
  const preethi = sahamFormula(sastra, punya, L, night);

  // #30 Jadya: Mars − Saturn + Mercury
  const jadya = sahamFormula(lons.mars, lons.saturn, lons.mercury, night);

  // #31 Vyaapaara: Mars − Saturn + Lagna (same day & night)
  const vyaapaara = sahamFormulaFixed(lons.mars, lons.saturn, L);

  // #32 Sathru: Mars − Saturn + Lagna (day/night swapped)
  const sathru = sahamFormula(lons.mars, lons.saturn, L, night);

  // #33 Jalapatna: Cancer15° − Saturn + Lagna (Cancer 15° = 105°)
  const cancer15 = 105.0;
  const jalapatna = sahamFormula(cancer15, lons.saturn, L, night);

  // #34 Bandhana: Punya − Saturn + Lagna
  const bandhana = sahamFormula(punya, lons.saturn, L, night);

  // #35 Apamrithyu: 8thHouse − Mars + Lagna
  const apamrithyu = sahamFormula(house8, lons.mars, L, night);

  // #36 Laabha: 11thHouse − 11thLord + Lagna
  const laabha = sahamFormula(house11, eleventhLordLon, L, night);

  // Build result array
  const rawSahams: Array<{ id: string; name: string; meaning: string; lon: number }> = [
    { id: 'punya', name: 'Punya', meaning: 'Fortune / good deeds', lon: punya },
    { id: 'vidya', name: 'Vidya', meaning: 'Education / learning', lon: vidya },
    { id: 'yasas', name: 'Yasas', meaning: 'Fame / reputation', lon: yasas },
    { id: 'mitra', name: 'Mitra', meaning: 'Friends / alliances', lon: mitra },
    { id: 'mahatmya', name: 'Mahatmya', meaning: 'Greatness / importance', lon: mahatmya },
    { id: 'asha', name: 'Asha', meaning: 'Desires / hopes', lon: asha },
    { id: 'samartha', name: 'Samartha', meaning: 'Enterprise / ability', lon: samartha },
    { id: 'bhratri', name: 'Bhratri', meaning: 'Brothers / siblings', lon: bhratri },
    { id: 'gaurava', name: 'Gaurava', meaning: 'Respect / regard', lon: gaurava },
    { id: 'pitri', name: 'Pitri', meaning: 'Father', lon: pitri },
    { id: 'rajya', name: 'Rajya', meaning: 'Kingdom / authority', lon: rajya },
    { id: 'matri', name: 'Matri', meaning: 'Mother', lon: matri },
    { id: 'putra', name: 'Putra', meaning: 'Children', lon: putra },
    { id: 'jeeva', name: 'Jeeva', meaning: 'Life / vitality', lon: jeeva },
    { id: 'karma', name: 'Karma', meaning: 'Action / work', lon: karma },
    { id: 'roga', name: 'Roga', meaning: 'Disease / health', lon: roga },
    { id: 'kali', name: 'Kali', meaning: 'Great misfortune', lon: kali },
    { id: 'sastra', name: 'Sastra', meaning: 'Sciences / knowledge', lon: sastra },
    { id: 'bandhu', name: 'Bandhu', meaning: 'Relatives / kin', lon: bandhu },
    { id: 'mrithyu', name: 'Mrithyu', meaning: 'Death', lon: mrithyu },
    { id: 'paradesa', name: 'Paradesa', meaning: 'Foreign countries', lon: paradesa },
    { id: 'artha', name: 'Artha', meaning: 'Money / wealth', lon: artha },
    { id: 'paradara', name: 'Paradara', meaning: 'Adultery / extra-marital', lon: paradara },
    { id: 'vanika', name: 'Vanika', meaning: 'Commerce / trade', lon: vanika },
    { id: 'karyasiddhi', name: 'Karyasiddhi', meaning: 'Success in endeavours', lon: karyasiddhi },
    { id: 'vivaha', name: 'Vivaha', meaning: 'Marriage', lon: vivaha },
    { id: 'santapa', name: 'Santapa', meaning: 'Sadness / grief', lon: santapa },
    { id: 'sraddha', name: 'Sraddha', meaning: 'Devotion / sincerity', lon: sraddha },
    { id: 'preethi', name: 'Preethi', meaning: 'Love / attachment', lon: preethi },
    { id: 'jadya', name: 'Jadya', meaning: 'Chronic disease', lon: jadya },
    { id: 'vyaapaara', name: 'Vyaapaara', meaning: 'Business', lon: vyaapaara },
    { id: 'sathru', name: 'Sathru', meaning: 'Enemy', lon: sathru },
    { id: 'jalapatna', name: 'Jalapatna', meaning: 'Crossing an ocean / travel', lon: jalapatna },
    { id: 'bandhana', name: 'Bandhana', meaning: 'Imprisonment / bondage', lon: bandhana },
    { id: 'apamrithyu', name: 'Apamrithyu', meaning: 'Untimely death', lon: apamrithyu },
    { id: 'laabha', name: 'Laabha', meaning: 'Material gains / profit', lon: laabha },
  ];

  const sahams: SahamResult[] = rawSahams.map(({ id, name, meaning, lon }) => {
    const sn = signNumber(lon);
    return {
      id,
      name,
      meaning,
      longitude: lon,
      signNumber: sn,
      signName: signName(sn),
      signDegree: lon % 30,
      nakshatra: nakshatraName(nakshatraIndex(lon)),
      houseNumber: wholeSignHouse(sn, ascSign),
    };
  });

  return {
    sahams,
    isDayBirth,
    citation: 'Tajik Neelakanthi; Varshphal classical texts. Validated against PyJHora v4.8.6 jhora.horoscope.transit.saham.',
  };
}
