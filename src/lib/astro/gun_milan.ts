/**
 * 36-point Ashtakoota (Guna Milan) compatibility engine — frontend copy.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CANONICAL SOURCE: supabase/functions/calculate-kundli/gun_milan.ts │
 * │  This file mirrors it 1-for-1 so both server and client share      │
 * │  identical rules. If you change one, change the other.             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Pure O(1) nakshatra/rashi math — no ephemeris calls.
 */

// ─── Nakshatra / Rashi constants ────────────────────────────────────────────

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
  "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
  "Revati",
] as const;

export const RASHI_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

const RASHI_LORDS: Record<number, string> = {
  1: "mars", 2: "venus", 3: "mercury", 4: "moon", 5: "sun", 6: "mercury",
  7: "venus", 8: "mars", 9: "jupiter", 10: "saturn", 11: "saturn", 12: "jupiter",
};

// ─── Nadi ────────────────────────────────────────────────────────────────────

const NAKSHATRA_NADI: Record<string, number> = {
  ashwini: 1, bharani: 2, krittika: 3, rohini: 3, mrigashira: 2, ardra: 1,
  punarvasu: 1, pushya: 2, ashlesha: 3, magha: 3, purvaphalguni: 2,
  uttaraphalguni: 1, hasta: 1, chitra: 2, swati: 3, vishakha: 3,
  anuradha: 2, jyeshtha: 1, mula: 1, purvaashadha: 2, uttaraashadha: 3,
  shravana: 3, dhanishta: 2, shatabhisha: 1, purvabhadrapada: 1,
  uttarabhadrapada: 2, revati: 3,
};

const NADI_LABELS = ["", "Adi (Vata)", "Madhya (Pitta)", "Antya (Kapha)"];

// ─── Gana ────────────────────────────────────────────────────────────────────

const NAKSHATRA_GANA: Record<string, number> = {
  ashwini: 1, bharani: 2, krittika: 3, rohini: 2, mrigashira: 1, ardra: 2,
  punarvasu: 1, pushya: 1, ashlesha: 3, magha: 3, purvaphalguni: 2,
  uttaraphalguni: 2, hasta: 1, chitra: 2, swati: 1, vishakha: 3,
  anuradha: 1, jyeshtha: 3, mula: 3, purvaashadha: 2, uttaraashadha: 2,
  shravana: 1, dhanishta: 3, shatabhisha: 3, purvabhadrapada: 2,
  uttarabhadrapada: 2, revati: 1,
};

const GANA_LABELS = ["", "Deva", "Manushya", "Rakshasa"];

// ─── Yoni ────────────────────────────────────────────────────────────────────

const NAKSHATRA_YONI: Record<string, string> = {
  ashwini: "Horse", bharani: "Elephant", krittika: "Sheep", rohini: "Serpent",
  mrigashira: "Serpent", ardra: "Dog", punarvasu: "Cat", pushya: "Sheep",
  ashlesha: "Cat", magha: "Rat", purvaphalguni: "Rat",
  uttaraphalguni: "Cow", hasta: "Buffalo", chitra: "Tiger", swati: "Buffalo",
  vishakha: "Tiger", anuradha: "Deer", jyeshtha: "Deer", mula: "Dog",
  purvaashadha: "Monkey", uttaraashadha: "Mongoose", shravana: "Monkey",
  dhanishta: "Lion", shatabhisha: "Horse", purvabhadrapada: "Lion",
  uttarabhadrapada: "Cow", revati: "Elephant",
};

const YONI_FRIENDS: Record<string, string[]> = {
  Horse: ["Elephant", "Monkey"], Elephant: ["Horse", "Sheep", "Buffalo"],
  Sheep: ["Elephant", "Cow", "Deer"], Serpent: ["Cat", "Rat", "Deer"],
  Dog: ["Cat", "Monkey"], Cat: ["Serpent", "Dog", "Rat"],
  Rat: ["Cat", "Serpent", "Monkey"], Cow: ["Sheep", "Buffalo", "Deer"],
  Buffalo: ["Elephant", "Cow", "Horse"], Tiger: ["Lion"],
  Deer: ["Sheep", "Serpent", "Cow"], Monkey: ["Horse", "Dog", "Rat"],
  Lion: ["Tiger"], Mongoose: ["Deer", "Cat"],
};

const YONI_ENEMIES: Record<string, string> = {
  Horse: "Buffalo", Elephant: "Lion", Sheep: "Monkey",
  Serpent: "Mongoose", Dog: "Deer", Cat: "Rat", Cow: "Tiger",
};

const YONI_UNFRIENDLY: Record<string, string[]> = {
  Horse: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Elephant: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Sheep: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Serpent: ["Dog", "Tiger", "Lion", "Mongoose"],
  Dog: ["Horse", "Elephant", "Sheep", "Serpent", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Cat: ["Horse", "Elephant", "Sheep", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Rat: ["Horse", "Elephant", "Sheep", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Cow: ["Dog", "Cat", "Rat", "Buffalo", "Tiger", "Mongoose"],
  Buffalo: ["Dog", "Cat", "Rat", "Cow", "Tiger", "Mongoose"],
  Tiger: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Mongoose"],
  Lion: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Mongoose"],
  Mongoose: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Lion"],
};

// ─── Planetary friendships ──────────────────────────────────────────────────

const PLANET_RELATIONSHIPS: Record<string, { friends: string[]; enemies: string[] }> = {
  sun:     { friends: ["moon", "mars", "jupiter"], enemies: ["venus", "saturn"] },
  moon:    { friends: ["sun", "mercury"],          enemies: [] },
  mars:    { friends: ["sun", "moon", "jupiter"],  enemies: ["mercury"] },
  mercury: { friends: ["sun", "venus"],            enemies: ["moon"] },
  jupiter: { friends: ["sun", "moon", "mars"],     enemies: ["mercury", "venus"] },
  venus:   { friends: ["mercury", "saturn"],       enemies: ["sun", "moon"] },
  saturn:  { friends: ["mercury", "venus"],        enemies: ["sun", "moon", "mars"] },
};

// ─── Vasya ──────────────────────────────────────────────────────────────────

function vasyaType(rashi: number): { name: string; type: number } {
  if ([1, 2, 9].includes(rashi)) return { name: "Chatushpada", type: 1 };
  if (rashi === 5) return { name: "Vanachara", type: 4 };
  if (rashi === 8) return { name: "Keeta", type: 5 };
  if ([4, 10, 12].includes(rashi)) return { name: "Jalachara", type: 3 };
  return { name: "Manushya", type: 2 };
}

const VASYA_MATRIX: Record<number, Record<number, number>> = {
  1: { 1: 2, 2: 1,   3: 1,   4: 1.5, 5: 1 },
  2: { 1: 1, 2: 2,   3: 1.5, 4: 0,   5: 1 },
  3: { 1: 1, 2: 1.5, 3: 2,   4: 1,   5: 1 },
  4: { 1: 0, 2: 0,   3: 0,   4: 2,   5: 0 },
  5: { 1: 1, 2: 1,   3: 1,   4: 0,   5: 2 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function getNakshatraIndex(nakName: string): number {
  const norm = normalizeName(nakName);
  for (let i = 0; i < NAKSHATRAS.length; i++) {
    if (
      normalizeName(NAKSHATRAS[i]).includes(norm) ||
      norm.includes(normalizeName(NAKSHATRAS[i]))
    ) return i + 1;
  }
  return -1;
}

// ─── Individual Koota computations ──────────────────────────────────────────

function computeVarna(groomRashi: number, brideRashi: number) {
  const score = (r: number) => {
    if ([4, 8, 12].includes(r)) return 4;
    if ([1, 5, 9].includes(r))  return 3;
    if ([2, 6, 10].includes(r)) return 2;
    return 1;
  };
  const label = (s: number) =>
    s === 4 ? "Brahmin" : s === 3 ? "Kshatriya" : s === 2 ? "Vaishya" : "Shudra";
  const g = score(groomRashi);
  const b = score(brideRashi);
  return { points: g >= b ? 1 : 0, groomVarna: label(g), brideVarna: label(b) };
}

function computeVasya(groomRashi: number, brideRashi: number) {
  const g = vasyaType(groomRashi);
  const b = vasyaType(brideRashi);
  const points = VASYA_MATRIX[b.type]?.[g.type] ?? 0;
  return { points, groomVasya: g.name, brideVasya: b.name };
}

function computeTara(groomNakIdx: number, brideNakIdx: number) {
  const t1 = (brideNakIdx - groomNakIdx + 27) % 9;
  const t2 = (groomNakIdx - brideNakIdx + 27) % 9;
  const auspicious = [0, 1, 3, 5, 7, 8];
  const gOk = auspicious.includes(t1);
  const bOk = auspicious.includes(t2);
  const points = gOk && bOk ? 3 : gOk || bOk ? 1.5 : 0;
  return { points, groomTara: t1, brideTara: t2 };
}

function computeYoni(groomNorm: string, brideNorm: string) {
  const gYoni = NAKSHATRA_YONI[groomNorm] ?? "Serpent";
  const bYoni = NAKSHATRA_YONI[brideNorm] ?? "Serpent";
  let points: number;
  if (gYoni === bYoni) points = 4;
  else if (YONI_ENEMIES[gYoni] === bYoni || YONI_ENEMIES[bYoni] === gYoni) points = 0;
  else if (YONI_FRIENDS[gYoni]?.includes(bYoni) || YONI_FRIENDS[bYoni]?.includes(gYoni)) points = 3;
  else if (YONI_UNFRIENDLY[gYoni]?.includes(bYoni) || YONI_UNFRIENDLY[bYoni]?.includes(gYoni)) points = 1;
  else points = 2;
  return { points, groomYoni: gYoni, brideYoni: bYoni };
}

function computeGrahaMaitri(groomRashi: number, brideRashi: number) {
  const gLord = RASHI_LORDS[groomRashi] ?? "moon";
  const bLord = RASHI_LORDS[brideRashi] ?? "moon";
  let points: number;
  if (gLord === bLord) {
    points = 5;
  } else {
    const gRel = PLANET_RELATIONSHIPS[gLord];
    const bRel = PLANET_RELATIONSHIPS[bLord];
    const gIsFriend = gRel?.friends.includes(bLord) ?? false;
    const bIsFriend = bRel?.friends.includes(gLord) ?? false;
    const gIsEnemy = gRel?.enemies.includes(bLord) ?? false;
    const bIsEnemy = bRel?.enemies.includes(gLord) ?? false;
    if (gIsFriend && bIsFriend) points = 5;
    else if ((gIsFriend && !gIsEnemy && !bIsEnemy) || (bIsFriend && !gIsEnemy && !bIsEnemy)) points = 4;
    else if (!gIsEnemy && !bIsEnemy) points = 3;
    else if ((gIsFriend && bIsEnemy) || (bIsFriend && gIsEnemy)) points = 1;
    else points = 0;
  }
  return { points, groomLord: gLord, brideLord: bLord };
}

function computeGana(groomNorm: string, brideNorm: string) {
  const g = NAKSHATRA_GANA[groomNorm] ?? 2;
  const b = NAKSHATRA_GANA[brideNorm] ?? 2;
  let points: number;
  if (g === b) points = 6;
  else if ((g === 1 && b === 2) || (g === 2 && b === 1)) points = 5;
  else if ((g === 1 && b === 3) || (g === 3 && b === 1)) points = 1;
  else points = 0;
  return { points, groomGana: GANA_LABELS[g], brideGana: GANA_LABELS[b] };
}

function computeBhakoot(groomRashi: number, brideRashi: number) {
  const diff = (brideRashi - groomRashi + 12) % 12;
  const bDist = diff + 1;
  const inauspicious = [2, 12, 5, 9, 6, 8];
  const points = inauspicious.includes(bDist) ? 0 : 7;
  return { points, distance: bDist };
}

function computeNadi(groomNorm: string, brideNorm: string) {
  const g = NAKSHATRA_NADI[groomNorm] ?? 1;
  const b = NAKSHATRA_NADI[brideNorm] ?? 1;
  const points = g !== b ? 8 : 0;
  return { points, groomNadi: NADI_LABELS[g], brideNadi: NADI_LABELS[b] };
}

// ─── Public interface ───────────────────────────────────────────────────────

export interface KootaResult {
  name: string;
  nameHi: string;
  max: number;
  scored: number;
  description: string;
}

export interface GunMilanResult {
  kootas: KootaResult[];
  total: number;
  maxTotal: 36;
  verdict: string;
  verdictBand: "excellent" | "good" | "average" | "not_recommended";
}

export function computeGunMilan(
  groomNakshatra: string,
  groomRashi: number,
  brideNakshatra: string,
  brideRashi: number,
): GunMilanResult {
  const gNorm = normalizeName(groomNakshatra);
  const bNorm = normalizeName(brideNakshatra);
  const gNakIdx = getNakshatraIndex(groomNakshatra);
  const bNakIdx = getNakshatraIndex(brideNakshatra);

  const varna = computeVarna(groomRashi, brideRashi);
  const vasya = computeVasya(groomRashi, brideRashi);
  const tara  = computeTara(gNakIdx, bNakIdx);
  const yoni  = computeYoni(gNorm, bNorm);
  const graha = computeGrahaMaitri(groomRashi, brideRashi);
  const gana  = computeGana(gNorm, bNorm);
  const bhakoot = computeBhakoot(groomRashi, brideRashi);
  const nadi  = computeNadi(gNorm, bNorm);

  const total = varna.points + vasya.points + tara.points + yoni.points +
    graha.points + gana.points + bhakoot.points + nadi.points;

  let verdict: string;
  let verdictBand: GunMilanResult["verdictBand"];
  if (total >= 28) {
    verdict = "Excellent (Highly Auspicious)";
    verdictBand = "excellent";
  } else if (total >= 18) {
    verdict = "Good (Recommended)";
    verdictBand = "good";
  } else if (total >= 14) {
    verdict = "Average (Requires Remedies)";
    verdictBand = "average";
  } else {
    verdict = "Not Recommended";
    verdictBand = "not_recommended";
  }

  return {
    kootas: [
      { name: "Varna",        nameHi: "वर्ण",       max: 1, scored: varna.points,
        description: `Groom: ${varna.groomVarna} · Bride: ${varna.brideVarna}` },
      { name: "Vasya",        nameHi: "वश्य",       max: 2, scored: vasya.points,
        description: `Groom: ${vasya.groomVasya} · Bride: ${vasya.brideVasya}` },
      { name: "Tara",         nameHi: "तारा",       max: 3, scored: tara.points,
        description: `Groom tara=${tara.groomTara} · Bride tara=${tara.brideTara}` },
      { name: "Yoni",         nameHi: "योनि",       max: 4, scored: yoni.points,
        description: `Groom: ${yoni.groomYoni} · Bride: ${yoni.brideYoni}` },
      { name: "Graha Maitri", nameHi: "ग्रहमैत्री",  max: 5, scored: graha.points,
        description: `Groom lord: ${graha.groomLord} · Bride lord: ${graha.brideLord}` },
      { name: "Gana",         nameHi: "गण",         max: 6, scored: gana.points,
        description: `Groom: ${gana.groomGana} · Bride: ${gana.brideGana}` },
      { name: "Bhakoot",      nameHi: "भकूट",       max: 7, scored: bhakoot.points,
        description: `Rashi distance: ${bhakoot.distance}` },
      { name: "Nadi",         nameHi: "नाड़ी",       max: 8, scored: nadi.points,
        description: `Groom: ${nadi.groomNadi} · Bride: ${nadi.brideNadi}` },
    ],
    total,
    maxTotal: 36,
    verdict,
    verdictBand,
  };
}
