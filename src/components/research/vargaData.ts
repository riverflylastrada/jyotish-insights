import type { VargaCode, DivisionalScheme } from '@/lib/astro/types';

/** One-line varga purpose + division formula for Math Proof, cited to BPHS. */
export interface VargaMeta {
  code: VargaCode;
  name: string;
  /** One-line purpose shown at top of focused view. */
  purpose: string;
  /** Division factor (how many parts the sign is divided into). */
  factor: number;
  /** Arc span of each division in degrees. */
  arcDeg: string;
  /** Human-readable formula description for Math Proof. */
  formula: string;
  /** Classical source citation. */
  cite: string;
}

/** Metadata for a divisional scheme variant. */
export interface SchemeMeta {
  key: DivisionalScheme;
  en: string;
  hi: string;
  cite: string;
  formula: string;
}

/** Available schemes per varga code (only vargas with alternates are listed). */
export const VARGA_SCHEME_OPTIONS: Partial<Record<VargaCode, SchemeMeta[]>> = {
  D2: [
    { key: 'parashari', en: 'Parashari (BPHS)', hi: 'पाराशरी', cite: 'BPHS Ch. 7.2–3', formula: 'Odd signs: 0–15° → Leo (Sun hora), 15–30° → Cancer (Moon hora). Even signs: reversed.' },
    { key: 'kashinatha', en: 'Kashinatha', hi: 'काशीनाथ', cite: 'Jataka Parijata', formula: 'Hora lord = sign lord (odd 1st half) or 7th sign lord (odd 2nd half). Result = own sign of hora lord.' },
    { key: 'parivrittitraya', en: 'Parivritti-dwaya', hi: 'परिवृत्ति-द्वय', cite: 'Parivritti tradition', formula: 'Cyclic count: ((sign−1)×2 + part) mod 12 + 1. All 24 horas map uniquely to 12 signs (each sign appears twice).' },
    { key: 'krishnamurthy', en: 'Krishnamurthy (KP)', hi: 'कृष्णमूर्ति', cite: 'KP Reader 1', formula: '0–15° always → Leo (Sun hora); 15–30° always → Cancer (Moon hora), regardless of odd/even sign.' },
  ],
  D3: [
    { key: 'parashari', en: 'Parashari (BPHS)', hi: 'पाराशरी', cite: 'BPHS Ch. 7.4–5', formula: '1st decanate = same sign; 2nd = 5th from it; 3rd = 9th from it (trine-based).' },
    { key: 'parivrittitraya', en: 'Parivritti-traya', hi: 'परिवृत्ति-त्रय', cite: 'Parivritti-traya tradition', formula: 'Cyclic count: ((sign−1)×3 + part) mod 12 + 1. All 36 decanates map sequentially.' },
    { key: 'somanatha', en: 'Somanatha', hi: 'सोमनाथ', cite: 'Saravali / Somanatha', formula: '1st = same sign; 2nd = 12th from sign (1 back); 3rd = 11th from sign (2 back).' },
    { key: 'krishnamurthy', en: 'Krishnamurthy (KP)', hi: 'कृष्णमूर्ति', cite: 'KP Reader 1', formula: 'Same as Parashari: 1st/5th/9th trine formula.' },
  ],
  D4: [
    { key: 'parashari', en: 'Parashari (BPHS)', hi: 'पाराशरी', cite: 'BPHS Ch. 7.6', formula: 'Starting from the sign, then 4th, 7th, 10th signs (kendra offsets: 0/3/6/9).' },
    { key: 'parivrittitraya', en: 'Parivritti', hi: 'परिवृत्ति', cite: 'Parivritti tradition', formula: 'Cyclic count: ((sign−1)×4 + part) mod 12 + 1. All 48 quarters map sequentially.' },
    { key: 'krishnamurthy', en: 'Krishnamurthy (KP)', hi: 'कृष्णमूर्ति', cite: 'KP Reader 1', formula: 'Same as Parashari: kendra offsets 0/3/6/9.' },
  ],
  D8: [
    { key: 'parashari', en: 'Parashari (BPHS)', hi: 'पाराशरी', cite: 'BPHS Ch. 7.10', formula: 'Movable → Aries start; fixed → Sagittarius; dual → Leo; count 8 arcs of 3°45′.' },
    { key: 'parivrittitraya', en: 'Parivritti', hi: 'परिवृत्ति', cite: 'Parivritti tradition', formula: 'Cyclic count: ((sign−1)×8 + part) mod 12 + 1. All 96 octants map sequentially.' },
    { key: 'krishnamurthy', en: 'Krishnamurthy (KP)', hi: 'कृष्णमूर्ति', cite: 'KP Reader 1', formula: 'Same as Parashari: quality-based start (movable/fixed/dual).' },
  ],
};

export const VARGA_META: Record<VargaCode, VargaMeta> = {
  D1: {
    code: 'D1',
    name: 'Rasi',
    purpose: 'Overall life — the natal chart; foundation of all analysis.',
    factor: 1,
    arcDeg: '30°',
    formula: 'Each sign = 30° (undivided). The planet\u2019s sign placement is its Rasi position.',
    cite: 'BPHS Ch. 7.1 — "The Rasi chart is the root of all Vargas."',
  },
  D2: {
    code: 'D2',
    name: 'Hora',
    purpose: 'Wealth and financial prosperity.',
    factor: 2,
    arcDeg: '15°',
    formula: 'Each sign divided into 2 equal arcs of 15°. Odd signs → first half Sun (Leo), second half Moon (Cancer). Even signs → reversed.',
    cite: 'BPHS Ch. 7.2–3 — Hora division for wealth analysis.',
  },
  D3: {
    code: 'D3',
    name: 'Drekkana',
    purpose: 'Siblings, courage, and co-born.',
    factor: 3,
    arcDeg: '10°',
    formula: 'Each sign divided into 3 equal arcs of 10°. 1st decanate = same sign; 2nd = 5th from it; 3rd = 9th from it.',
    cite: 'BPHS Ch. 7.4–5 — Drekkana for siblings and valour.',
  },
  D4: {
    code: 'D4',
    name: 'Chaturthamsa',
    purpose: 'Property, fixed assets, and fortune.',
    factor: 4,
    arcDeg: '7°30′',
    formula: 'Each sign divided into 4 equal arcs of 7°30′. Starting from the sign itself, then 4th, 7th, 10th signs.',
    cite: 'BPHS Ch. 7.6 — Chaturthamsa for property and fortune.',
  },
  D5: {
    code: 'D5',
    name: 'Panchamsa',
    purpose: 'Fame, power, authority, and spiritual merit.',
    factor: 5,
    arcDeg: '6°',
    formula: 'Each sign divided into 5 equal arcs of 6°. Odd signs map to Ar → Aq → Sg → Ge → Li; even signs map to Ta → Vi → Pi → Cp → Sc.',
    cite: 'BPHS Ch. 7.8 — Panchamsa for fame and authority.',
  },
  D6: {
    code: 'D6',
    name: 'Shashthamsa',
    purpose: 'Health, disease, and enemies.',
    factor: 6,
    arcDeg: '5°',
    formula: 'Each sign divided into 6 equal arcs of 5°. Odd signs start from Aries (1–6); even signs start from Libra (7–12).',
    cite: 'BPHS Ch. 7.9 — Shashthamsa for health and disease.',
  },
  D7: {
    code: 'D7',
    name: 'Saptamsa',
    purpose: 'Children and progeny.',
    factor: 7,
    arcDeg: '4°17′8.57″',
    formula: 'Each sign divided into 7 equal arcs of ≈4°17′. Odd signs start from the same sign; even signs start from the 7th sign.',
    cite: 'BPHS Ch. 7.7–8 — Saptamsa for children.',
  },
  D8: {
    code: 'D8',
    name: 'Ashtamsa',
    purpose: 'Longevity, sudden events, and unexpected transformations.',
    factor: 8,
    arcDeg: '3°45′',
    formula: 'Each sign divided into 8 equal arcs of 3°45′. Movable signs start from Aries; fixed from Sagittarius; dual from Leo.',
    cite: 'BPHS Ch. 7.10 — Ashtamsa for longevity and sudden events.',
  },
  D9: {
    code: 'D9',
    name: 'Navamsa',
    purpose: 'Marriage, dharma, and spiritual path — the most important varga after D1.',
    factor: 9,
    arcDeg: '3°20′',
    formula: 'Each sign divided into 9 equal arcs of 3°20′. Fire signs start from Aries; Earth from Capricorn; Air from Libra; Water from Cancer.',
    cite: 'BPHS Ch. 7.9–12 — "The Navamsa reveals dharma and the spouse."',
  },
  D10: {
    code: 'D10',
    name: 'Dasamsa',
    purpose: 'Career, profession, and public standing.',
    factor: 10,
    arcDeg: '3°',
    formula: 'Each sign divided into 10 equal arcs of 3°. Odd signs start from the same sign; even signs start from the 9th sign.',
    cite: 'BPHS Ch. 7.13–14 — Dasamsa for karma and profession.',
  },
  D11: {
    code: 'D11',
    name: 'Rudramsa',
    purpose: 'Gains, death of desires, and destruction/renewal.',
    factor: 11,
    arcDeg: '2°43′38″',
    formula: 'Each sign divided into 11 equal arcs of ≈2°43′38″. Start sign = 12th from the sign (counting backwards), then count forward by division index.',
    cite: 'BPHS Ch. 7.11 — Rudramsa (Ekadasamsa) for gains and destruction.',
  },
  D12: {
    code: 'D12',
    name: 'Dwadasamsa',
    purpose: 'Parents and ancestral lineage.',
    factor: 12,
    arcDeg: '2°30′',
    formula: 'Each sign divided into 12 equal arcs of 2°30′, starting from the sign itself and cycling through all 12 signs.',
    cite: 'BPHS Ch. 7.15 — Dwadasamsa for parents.',
  },
  D16: {
    code: 'D16',
    name: 'Shodasamsa',
    purpose: 'Vehicles, comforts, and luxuries.',
    factor: 16,
    arcDeg: '1°52′30″',
    formula: 'Each sign divided into 16 equal arcs of 1°52′30″. Moveable signs start from Aries; fixed from Leo; dual from Sagittarius.',
    cite: 'BPHS Ch. 7.16–17 — Shodasamsa for vehicles and comforts.',
  },
  D20: {
    code: 'D20',
    name: 'Vimsamsa',
    purpose: 'Spiritual life, upasana, and religious devotion.',
    factor: 20,
    arcDeg: '1°30′',
    formula: 'Each sign divided into 20 equal arcs of 1°30′. Moveable signs start from Aries; fixed from Sagittarius; dual from Leo.',
    cite: 'BPHS Ch. 7.18–19 — Vimsamsa for spiritual pursuits.',
  },
  D24: {
    code: 'D24',
    name: 'Chaturvimsamsa',
    purpose: 'Education, learning, and academic achievements.',
    factor: 24,
    arcDeg: '1°15′',
    formula: 'Each sign divided into 24 equal arcs of 1°15′. Odd signs start from Leo; even signs start from Cancer.',
    cite: 'BPHS Ch. 7.20–21 — Chaturvimsamsa (Siddhamsa) for education.',
  },
  D27: {
    code: 'D27',
    name: 'Bhamsa',
    purpose: 'Physical strength, stamina, and vitality.',
    factor: 27,
    arcDeg: '1°6′40″',
    formula: 'Each sign divided into 27 equal arcs of 1°6′40″. Fire signs start from Aries; Earth from Cancer; Air from Libra; Water from Capricorn.',
    cite: 'BPHS Ch. 7.22–23 — Bhamsa (Nakshatramsa) for strength.',
  },
  D30: {
    code: 'D30',
    name: 'Trimsamsa',
    purpose: 'Arishtas — evils, misfortunes, and chronic afflictions.',
    factor: 30,
    arcDeg: 'Unequal (5°/5°/8°/7°/5°)',
    formula: 'Unequal division: odd signs → Mars 5°, Saturn 5°, Jupiter 8°, Mercury 7°, Venus 5°. Even signs → reversed order.',
    cite: 'BPHS Ch. 7.24–27 — Trimsamsa for misfortunes and arishtas.',
  },
  D40: {
    code: 'D40',
    name: 'Khavedamsa',
    purpose: 'Auspicious and inauspicious effects (matrilineal).',
    factor: 40,
    arcDeg: '0°45′',
    formula: 'Each sign divided into 40 equal arcs of 0°45′. Odd signs start from Aries; even signs start from Libra.',
    cite: 'BPHS Ch. 7.28 — Khavedamsa for matrilineal auspiciousness.',
  },
  D45: {
    code: 'D45',
    name: 'Akshavedamsa',
    purpose: 'Auspicious and inauspicious effects (patrilineal).',
    factor: 45,
    arcDeg: '0°40′',
    formula: 'Each sign divided into 45 equal arcs of 0°40′. Moveable signs start from Aries; fixed from Leo; dual from Sagittarius.',
    cite: 'BPHS Ch. 7.29 — Akshavedamsa for patrilineal auspiciousness.',
  },
  D60: {
    code: 'D60',
    name: 'Shashtiamsa',
    purpose: 'Karmic résumé — past-life karmas and their ripening; the finest varga.',
    factor: 60,
    arcDeg: '0°30′',
    formula: 'Each sign divided into 60 equal arcs of 0°30′. Each arc carries a named deity (Ghora, Rakshasa, Deva, Kubera, etc.) determining benefic/malefic nature.',
    cite: 'BPHS Ch. 7.30–33 — "Shashtiamsa is the ultimate test of planetary dignity."',
  },
  D81: {
    code: 'D81',
    name: 'Nava-Navamsa',
    purpose: 'Navamsa-of-navamsa — the finest marriage/dharma lens, refining D-9 analysis.',
    factor: 81,
    arcDeg: '0°22′13.33″',
    formula: 'Each sign divided into 81 sub-segments (9 × 9). Compute the D-9 sign, then apply the D-9 mapping again within that navamsa arc. Fire → Aries, Earth → Capricorn, Air → Libra, Water → Cancer start.',
    cite: 'BPHS Ch. 7 + Sanjay Rath "Vargas" treatise — navamsa-of-navamsa variant.',
  },
  D108: {
    code: 'D108',
    name: 'Ashtottaramsa',
    purpose: 'Deep karmic sub-layer used in Ashtottari-dasha contexts.',
    factor: 108,
    arcDeg: '0°16′40″',
    formula: 'Each sign divided into 108 sub-segments (9 × 12). Compute the D-12 sign (dwadasamsa), then apply the D-9 (navamsa) mapping within that dwadasamsa arc.',
    cite: 'BPHS Ch. 7 — Ashtottaramsa.',
  },
  D144: {
    code: 'D144',
    name: 'Dwadas-Dwadasamsa',
    purpose: 'Dwadasamsa-of-dwadasamsa — ancestral micro-lens for parental lineage.',
    factor: 144,
    arcDeg: '0°12′30″',
    formula: 'Each sign divided into 144 sub-segments (12 × 12). Compute the D-12 sign, then apply the D-12 mapping again within that dwadasamsa arc.',
    cite: 'BPHS Ch. 7 — Dwadas-Dwadasamsa.',
  },
};

/** All varga codes in standard order. */
export const VARGA_CODES: VargaCode[] = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12',
  'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
  'D81', 'D108', 'D144',
];
