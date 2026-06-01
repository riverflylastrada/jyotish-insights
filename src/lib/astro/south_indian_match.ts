/**
 * South-Indian 10-Porutham marriage compatibility engine (client-side).
 *
 * Computes the 10 South-Indian poruthams (Dina, Gana, Mahendra, Stree-Dheerga,
 * Yoni, Rasi, Rajju, Vedha, Vasya, Nadi) from boy/girl Moon nakshatra + pada.
 * Pure O(1) nakshatra/rasi math — no ephemeris calls.
 *
 * Parity oracle: PyJHora 4.8.6 `jhora.horoscope.match.compatibility`
 * (`Ashtakoota` class with `method='South'` and individual `*_porutham_south`
 * methods). Each constant array below mirrors the corresponding PyJHora data
 * structure; every algorithm reproduces the exact PyJHora logic so that results
 * match the pre-computed `all_nak_pad_boy_girl_south.csv` row-for-row.
 *
 * Classical source: South-Indian Jyotish texts (Tamil Panchangam tradition).
 */

// ─── Shared helpers ────────────────────────────────────────────────────────

const countStars = (from: number, to: number): number =>
  ((27 + (to - from)) % 27) + 1;

const countRasis = (from: number, to: number): number =>
  ((12 + (to - from)) % 12) + 1;

function rasiFromNakshatraPada(nak: number, pada: number): number {
  const nakDur = 360 / 27;
  const rasiDur = 360 / 12;
  const padaDur = nakDur / 4;
  const totalDur = (nak - 1) * nakDur + (pada - 1) * padaDur + 0.5 * padaDur;
  return Math.floor(totalDur / rasiDur) + 1;
}

// ─── Gana (South) ──────────────────────────────────────────────────────────

const GANA_SOUTH_DEVA = new Set([1, 5, 7, 8, 13, 15, 17, 22, 27]);
const GANA_SOUTH_MANUSHYA = new Set([2, 4, 6, 8, 11, 12, 20, 21, 25, 26]);
const GANA_SOUTH_RAKSHASA = new Set([3, 9, 10, 14, 16, 18, 19, 23, 24]);
const GANA_THRESHOLD_SOUTH = 14;

function ganaLabel(nak: number): string {
  if (GANA_SOUTH_DEVA.has(nak)) return 'Deva';
  if (GANA_SOUTH_MANUSHYA.has(nak)) return 'Manushya';
  return 'Rakshasa';
}

function ganaPoruthamSouth(boyNak: number, girlNak: number): boolean {
  if (GANA_SOUTH_DEVA.has(boyNak) && GANA_SOUTH_DEVA.has(girlNak)) return true;
  if (
    (GANA_SOUTH_MANUSHYA.has(boyNak) && GANA_SOUTH_MANUSHYA.has(girlNak)) ||
    (GANA_SOUTH_DEVA.has(boyNak) && GANA_SOUTH_MANUSHYA.has(girlNak))
  ) return true;
  if (GANA_SOUTH_MANUSHYA.has(boyNak) && GANA_SOUTH_DEVA.has(girlNak)) return true;
  if (
    GANA_SOUTH_RAKSHASA.has(boyNak) &&
    GANA_SOUTH_RAKSHASA.has(girlNak) &&
    girlNak > GANA_THRESHOLD_SOUTH
  ) return true;
  return false;
}

// ─── Dina (South) ──────────────────────────────────────────────────────────

function dinaPoruthamSouth(
  boyNak: number, boyPada: number, boyRasi: number,
  girlNak: number, girlPada: number, girlRasi: number,
): boolean {
  const count = countStars(boyNak, girlNak);
  if ([2, 4, 6, 8, 9, 11, 13, 15, 17, 18, 20, 21, 24, 25, 26].includes(count))
    return true;
  const exceptionDict: Record<number, number[]> = { 12: [2, 3, 4], 14: [1, 2, 3], 16: [1, 2, 4] };
  for (const [k, vl] of Object.entries(exceptionDict)) {
    if (girlNak === Number(k) && vl.includes(girlPada)) return true;
  }
  if (girlNak === boyNak) {
    if (
      [1, 3, 5, 10, 13, 15, 20, 23].includes(girlNak) &&
      (girlRasi < boyRasi || girlPada < boyPada)
    ) return true;
    if (girlRasi !== boyRasi && boyRasi < girlRasi) return true;
  }
  if (girlRasi === boyRasi && boyNak < girlNak) return true;
  const exc22: [number, number][] = [
    [4, 25], [7, 1], [8, 2], [10, 4], [12, 6], [13, 7],
    [14, 8], [17, 11], [21, 15], [25, 19], [26, 20], [27, 21],
  ];
  for (const [b, g] of exc22) {
    if (boyNak === b && girlNak === g) return true;
  }
  return false;
}

// ─── Mahendra ──────────────────────────────────────────────────────────────

const MAHENDRA_ARRAY = [4, 7, 10, 13, 16, 19, 22, 25];

function mahendraPorutham(boyNak: number, girlNak: number): boolean {
  return MAHENDRA_ARRAY.includes(countStars(girlNak, boyNak));
}

// ─── Stree-Dheerga ─────────────────────────────────────────────────────────

const STREE_DHEERGA_THRESHOLD_SOUTH = 7;

function streeDheergaPorutham(boyNak: number, girlNak: number): boolean {
  return countStars(girlNak, boyNak) > STREE_DHEERGA_THRESHOLD_SOUTH;
}

// ─── Yoni (South) ──────────────────────────────────────────────────────────

const YONI_MAPPINGS: number[] = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];

const YONI_ANIMAL_NAMES = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat',
  'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion',
];

const YONI_ENEMIES_SOUTH: [number, number][] = [
  [0, 8], [1, 13], [2, 11], [3, 12], [3, 6], [4, 10],
  [5, 6], [6, 3], [6, 5], [7, 9], [8, 0], [9, 7],
  [10, 4], [11, 2], [12, 3], [13, 1],
];

function yoniPoruthamSouth(boyNak: number, girlNak: number): boolean {
  const ga = YONI_MAPPINGS[girlNak - 1];
  const ba = YONI_MAPPINGS[boyNak - 1];
  return !YONI_ENEMIES_SOUTH.some(([a, e]) => ga === a && ba === e);
}

// ─── Rasi (South) ──────────────────────────────────────────────────────────

const RASI_THRESHOLD_SOUTH = 6;

function rasiPoruthamSouth(boyRasi: number, girlRasi: number): boolean {
  return countRasis(girlRasi, boyRasi) > RASI_THRESHOLD_SOUTH;
}

// ─── Rajju (South) ─────────────────────────────────────────────────────────

const FOOT_AAROGA = [1, 10, 19];
const WAIST_AAROGA = [2, 11, 20];
const STOMACH_AAROGA = [3, 12, 21];
// PyJHora bug: neck_aaroga_rajju = [413, 22] — we replicate to match oracle.
const NECK_AAROGA = [413, 22];
const HEAD_RAJJU = [5, 14, 23];
const NECK_RAJJU = [4, 6, 13, 15, 22, 24];
const STOMACH_RAJJU = [3, 7, 12, 16, 21, 25];
const WAIST_RAJJU = [2, 8, 11, 17, 20, 26];
const FOOT_RAJJU = [1, 9, 10, 18, 19, 27];

const ALL_AAROGA = [...NECK_AAROGA, ...FOOT_AAROGA, ...WAIST_AAROGA, ...STOMACH_AAROGA];

function rajjuPoruthamSouth(boyNak: number, girlNak: number): boolean {
  const bnAaroga = ALL_AAROGA.includes(boyNak);
  const gnAaroga = ALL_AAROGA.includes(girlNak);
  if ((bnAaroga && !gnAaroga) || (gnAaroga && !bnAaroga)) return true;
  const sameBodyPart =
    (HEAD_RAJJU.includes(boyNak) && HEAD_RAJJU.includes(girlNak)) ||
    (NECK_RAJJU.includes(boyNak) && NECK_RAJJU.includes(girlNak)) ||
    (STOMACH_RAJJU.includes(boyNak) && STOMACH_RAJJU.includes(girlNak)) ||
    (WAIST_RAJJU.includes(boyNak) && WAIST_RAJJU.includes(girlNak)) ||
    (FOOT_RAJJU.includes(boyNak) && FOOT_RAJJU.includes(girlNak));
  return !sameBodyPart;
}

// ─── Vedha ─────────────────────────────────────────────────────────────────

const VEDHA_PAIR_SUM = [19, 28, 37];

function vedhaPorutham(boyNak: number, girlNak: number): boolean {
  return !VEDHA_PAIR_SUM.includes(boyNak + girlNak);
}

// ─── Vasya (South) ─────────────────────────────────────────────────────────

const VASYA_LIST: number[][] = [
  [4, 7], [3, 6], [5], [7, 8], [6], [2, 11], [5, 9], [3], [11], [0, 10], [0], [9],
];

function vasyaPoruthamSouth(boyRasi: number, girlRasi: number): boolean {
  return VASYA_LIST[girlRasi - 1].includes(boyRasi - 1);
}

// ─── Nadi ──────────────────────────────────────────────────────────────────

const NADI_MAP: number[] = [
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2,
];
const NADI_NAMES = ['Adi (Vata)', 'Madhya (Pitta)', 'Antya (Kapha)'];

function nadiPorutham(boyNak: number, girlNak: number): boolean {
  return NADI_MAP[boyNak - 1] !== NADI_MAP[girlNak - 1];
}

// ─── Public interface ──────────────────────────────────────────────────────

export interface PoruthamResult {
  name: string;
  nameTamil: string;
  met: boolean;
  reason: string;
  citation: string;
}

export interface SouthIndianMatchResult {
  poruthams: PoruthamResult[];
  metCount: number;
  total: number;
  verdict: string;
  citation: string;
}

const RASI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const RAJJU_BODY_PARTS: Record<string, number[]> = {
  Foot: FOOT_RAJJU,
  Waist: WAIST_RAJJU,
  Stomach: STOMACH_RAJJU,
  Neck: NECK_RAJJU,
  Head: HEAD_RAJJU,
};

function rajjuBodyPart(nak: number): string {
  for (const [part, list] of Object.entries(RAJJU_BODY_PARTS)) {
    if (list.includes(nak)) return part;
  }
  return 'Unknown';
}

export function computeSouthIndianMatch(
  boyNak: number, boyPada: number,
  girlNak: number, girlPada: number,
): SouthIndianMatchResult {
  const boyRasi = rasiFromNakshatraPada(boyNak, boyPada);
  const girlRasi = rasiFromNakshatraPada(girlNak, girlPada);

  const boyNakName = NAKSHATRA_NAMES[boyNak - 1] ?? `Nak ${boyNak}`;
  const girlNakName = NAKSHATRA_NAMES[girlNak - 1] ?? `Nak ${girlNak}`;
  const boyRasiName = RASI_NAMES[boyRasi - 1] ?? `Rasi ${boyRasi}`;
  const girlRasiName = RASI_NAMES[girlRasi - 1] ?? `Rasi ${girlRasi}`;

  const dina = dinaPoruthamSouth(boyNak, boyPada, boyRasi, girlNak, girlPada, girlRasi);
  const gana = ganaPoruthamSouth(boyNak, girlNak);
  const mahendra = mahendraPorutham(boyNak, girlNak);
  const streeDheerga = streeDheergaPorutham(boyNak, girlNak);
  const yoni = yoniPoruthamSouth(boyNak, girlNak);
  const rasi = rasiPoruthamSouth(boyRasi, girlRasi);
  const rajju = rajjuPoruthamSouth(boyNak, girlNak);
  const vedha = vedhaPorutham(boyNak, girlNak);
  const vasya = vasyaPoruthamSouth(boyRasi, girlRasi);
  const nadi = nadiPorutham(boyNak, girlNak);

  const countFromBoy = countStars(boyNak, girlNak);
  const countFromGirl = countStars(girlNak, boyNak);
  const boyGana = ganaLabel(boyNak);
  const girlGana = ganaLabel(girlNak);
  const boyYoni = YONI_ANIMAL_NAMES[YONI_MAPPINGS[boyNak - 1]];
  const girlYoni = YONI_ANIMAL_NAMES[YONI_MAPPINGS[girlNak - 1]];
  const boyNadi = NADI_NAMES[NADI_MAP[boyNak - 1]];
  const girlNadi = NADI_NAMES[NADI_MAP[girlNak - 1]];

  const poruthams: PoruthamResult[] = [
    {
      name: 'Dina', nameTamil: 'திணம்', met: dina,
      reason: dina
        ? `Star count from boy (${boyNakName}) = ${countFromBoy} — auspicious position`
        : `Star count from boy (${boyNakName}) = ${countFromBoy} — inauspicious position`,
      citation: 'Tamil Panchangam — Dina Porutham (daily health & longevity)',
    },
    {
      name: 'Gana', nameTamil: 'கணம்', met: gana,
      reason: gana
        ? `Boy ${boyGana} + Girl ${girlGana} — temperaments are compatible`
        : `Boy ${boyGana} + Girl ${girlGana} — temperament mismatch`,
      citation: 'Tamil Panchangam — Gana Porutham (Deva / Manushya / Rakshasa)',
    },
    {
      name: 'Mahendra', nameTamil: 'மகேந்திரம்', met: mahendra,
      reason: mahendra
        ? `Boy's star is at position ${countFromGirl} from girl's — one of {4,7,10,13,16,19,22,25}`
        : `Boy's star is at position ${countFromGirl} from girl's — not in Mahendra set`,
      citation: 'Tamil Panchangam — Mahendra Porutham (wealth & progeny)',
    },
    {
      name: 'Stree-Dheerga', nameTamil: 'ஸ்திரீதீர்க்கம்', met: streeDheerga,
      reason: streeDheerga
        ? `Boy's star count from girl = ${countFromGirl} (> ${STREE_DHEERGA_THRESHOLD_SOUTH})`
        : `Boy's star count from girl = ${countFromGirl} (≤ ${STREE_DHEERGA_THRESHOLD_SOUTH})`,
      citation: 'Tamil Panchangam — Stree-Dheerga Porutham (marital longevity)',
    },
    {
      name: 'Yoni', nameTamil: 'யோனி', met: yoni,
      reason: yoni
        ? `Boy ${boyYoni} + Girl ${girlYoni} — no enmity`
        : `Boy ${boyYoni} + Girl ${girlYoni} — yoni enmity exists`,
      citation: 'Tamil Panchangam — Yoni Porutham (physical & intimate compatibility)',
    },
    {
      name: 'Rasi', nameTamil: 'ராசி', met: rasi,
      reason: rasi
        ? `Girl ${girlRasiName} → Boy ${boyRasiName}: rasi count ${countRasis(girlRasi, boyRasi)} > ${RASI_THRESHOLD_SOUTH}`
        : `Girl ${girlRasiName} → Boy ${boyRasiName}: rasi count ${countRasis(girlRasi, boyRasi)} ≤ ${RASI_THRESHOLD_SOUTH}`,
      citation: 'Tamil Panchangam — Rasi Porutham (Moon-sign harmony)',
    },
    {
      name: 'Rajju', nameTamil: 'ரஜ்ஜு', met: rajju,
      reason: rajju
        ? `Boy ${rajjuBodyPart(boyNak)} + Girl ${rajjuBodyPart(girlNak)} — different body-part or aaroga/avaroga exception`
        : `Boy ${rajjuBodyPart(boyNak)} + Girl ${rajjuBodyPart(girlNak)} — same Rajju body-part (dosha)`,
      citation: 'Tamil Panchangam — Rajju Porutham (longevity & widowhood protection)',
    },
    {
      name: 'Vedha', nameTamil: 'வேதை', met: vedha,
      reason: vedha
        ? `Star sum ${boyNak + girlNak} not in vedha pairs {19,28,37}`
        : `Star sum ${boyNak + girlNak} is a vedha pair — obstruction`,
      citation: 'Tamil Panchangam — Vedha Porutham (mutual obstruction check)',
    },
    {
      name: 'Vasya', nameTamil: 'வஸ்யம்', met: vasya,
      reason: vasya
        ? `Boy rasi ${boyRasiName} is vasya to girl rasi ${girlRasiName}`
        : `Boy rasi ${boyRasiName} is not vasya to girl rasi ${girlRasiName}`,
      citation: 'Tamil Panchangam — Vasya Porutham (mutual attraction & dominance)',
    },
    {
      name: 'Nadi', nameTamil: 'நாடி', met: nadi,
      reason: nadi
        ? `Boy ${boyNadi} ≠ Girl ${girlNadi} — different nadis (good)`
        : `Boy ${boyNadi} = Girl ${girlNadi} — same nadi (Nadi dosha)`,
      citation: 'Tamil Panchangam — Nadi Porutham (health & genetic compatibility)',
    },
  ];

  const metCount = poruthams.filter(p => p.met).length;

  let verdict: string;
  if (metCount >= 8) {
    verdict = 'Excellent match — highly recommended (Uthama Porutham)';
  } else if (metCount >= 6) {
    verdict = 'Good match — suitable for marriage (Madhyama Porutham)';
  } else if (metCount >= 4) {
    verdict = 'Average match — remedies recommended (Adhama Porutham)';
  } else {
    verdict = 'Poor match — significant incompatibilities present';
  }

  return {
    poruthams,
    metCount,
    total: 10,
    verdict,
    citation:
      'South-Indian 10-Porutham system · Tamil Panchangam tradition · ' +
      'Validated against PyJHora 4.8.6 (jhora.horoscope.match.compatibility)',
  };
}
