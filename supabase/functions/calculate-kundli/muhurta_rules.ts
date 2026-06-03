/**
 * Data-driven Muhurta scoring rules.
 *
 * Each activity preset maps to sets of favourable/unfavourable
 * Tithis, Nakshatras, Varas, and Karanas. Adding a new preset
 * is config — just add another entry to ACTIVITY_RULES.
 *
 * Classical references:
 *  - Muhurta Chintamani, Ch. 4–8 (Marriage)
 *  - Dharma Sindhu (general auspicious-day selection)
 *  - Jyotish Ratnakar — Tithi/Nakshatra tables
 */

// ── Tithi indices (0-based, 0 = Shukla Pratipada … 29 = Amavasya) ──

export const TITHI_INDEX: Record<string, number> = {
  'Shukla Pratipada': 0, 'Shukla Dwitiya': 1, 'Shukla Tritiya': 2,
  'Shukla Chaturthi': 3, 'Shukla Panchami': 4, 'Shukla Shashthi': 5,
  'Shukla Saptami': 6, 'Shukla Ashtami': 7, 'Shukla Navami': 8,
  'Shukla Dashami': 9, 'Shukla Ekadashi': 10, 'Shukla Dwadashi': 11,
  'Shukla Trayodashi': 12, 'Shukla Chaturdashi': 13, 'Purnima': 14,
  'Krishna Pratipada': 15, 'Krishna Dwitiya': 16, 'Krishna Tritiya': 17,
  'Krishna Chaturthi': 18, 'Krishna Panchami': 19, 'Krishna Shashthi': 20,
  'Krishna Saptami': 21, 'Krishna Ashtami': 22, 'Krishna Navami': 23,
  'Krishna Dashami': 24, 'Krishna Ekadashi': 25, 'Krishna Dwadashi': 26,
  'Krishna Trayodashi': 27, 'Krishna Chaturdashi': 28, 'Amavasya': 29,
};

// ── Short name helpers (tithi names without paksha prefix) ──

export const TITHI_SHORTS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
] as const;

// ── Vara indices (JS weekday: 0 = Sun … 6 = Sat) ──

export type VaraIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const VARA_NAMES: Record<VaraIndex, string> = {
  0: 'Ravivara (Sunday)', 1: 'Somavara (Monday)', 2: 'Mangalavara (Tuesday)',
  3: 'Budhavara (Wednesday)', 4: 'Guruvara (Thursday)', 5: 'Shukravara (Friday)',
  6: 'Shanivara (Saturday)',
};

// ── Activity rule type ──────────────────────────────────────────────

export interface ActivityRule {
  key: string;
  label: string;        // EN
  labelHi: string;      // HI
  description: string;  // Short usage note
  /** Favourable tithi names (full form from panchang, e.g. "Shukla Panchami"). */
  favourTithis: string[];
  /** Tithis to avoid (full form). */
  avoidTithis: string[];
  /** Favourable nakshatra names. */
  favourNakshatras: string[];
  /** Nakshatras to avoid. */
  avoidNakshatras: string[];
  /** Favourable weekday indices (JS: 0=Sun…6=Sat). */
  favourVaras: number[];
  /** Weekdays to avoid. */
  avoidVaras: number[];
  /** Karana names to avoid. */
  avoidKaranas: string[];
}

// ── Generic (general auspicious) preset ─────────────────────────────
// Source: Dharma Sindhu; commonly accepted as universally good tithis/nakshatras.

const GENERIC_RULE: ActivityRule = {
  key: 'general',
  label: 'General Auspicious',
  labelHi: 'सामान्य शुभ',
  description: 'General auspicious day — good for most new beginnings',
  favourTithis: [
    'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Panchami',
    'Shukla Saptami', 'Shukla Dashami', 'Shukla Ekadashi',
    'Shukla Dwadashi', 'Shukla Trayodashi', 'Purnima',
  ],
  avoidTithis: [
    'Shukla Chaturthi', 'Shukla Navami', 'Shukla Chaturdashi',
    'Krishna Chaturthi', 'Krishna Ashtami', 'Krishna Navami',
    'Krishna Chaturdashi', 'Amavasya',
  ],
  favourNakshatras: [
    'Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya',
    'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana',
    'Dhanishtha', 'Revati',
  ],
  avoidNakshatras: [
    'Bharani', 'Ardra', 'Ashlesha', 'Magha', 'Jyeshtha',
    'Mula', 'Purva Bhadrapada',
  ],
  favourVaras: [1, 3, 4, 5],  // Mon, Wed, Thu, Fri
  avoidVaras: [2, 6],          // Tue, Sat
  avoidKaranas: ['Vishti'],    // Bhadra karana
};

// ── Vivah (marriage) preset ─────────────────────────────────────────
// Source: Muhurta Chintamani Ch. 4–8, Dharma Sindhu marriage-muhurta rules.

const VIVAH_RULE: ActivityRule = {
  key: 'vivah',
  label: 'Vivah (Marriage)',
  labelHi: 'विवाह',
  description: 'Marriage / engagement — traditional Vedic rules for Vivah Muhurta',
  favourTithis: [
    'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Panchami',
    'Shukla Saptami', 'Shukla Dashami', 'Shukla Ekadashi',
    'Shukla Dwadashi', 'Shukla Trayodashi',
  ],
  avoidTithis: [
    'Shukla Pratipada', 'Shukla Chaturthi', 'Shukla Shashthi',
    'Shukla Ashtami', 'Shukla Navami', 'Shukla Chaturdashi', 'Purnima',
    'Krishna Pratipada', 'Krishna Dwitiya', 'Krishna Tritiya',
    'Krishna Chaturthi', 'Krishna Panchami', 'Krishna Shashthi',
    'Krishna Saptami', 'Krishna Ashtami', 'Krishna Navami',
    'Krishna Dashami', 'Krishna Ekadashi', 'Krishna Dwadashi',
    'Krishna Trayodashi', 'Krishna Chaturdashi', 'Amavasya',
  ],
  favourNakshatras: [
    'Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta',
    'Swati', 'Anuradha', 'Mula', 'Uttara Ashadha', 'Shravana',
    'Dhanishtha', 'Uttara Bhadrapada', 'Revati',
  ],
  avoidNakshatras: [
    'Bharani', 'Ardra', 'Ashlesha', 'Purva Phalguni', 'Vishakha',
    'Jyeshtha', 'Purva Ashadha', 'Purva Bhadrapada', 'Krittika',
    'Shatabhisha',
  ],
  favourVaras: [1, 3, 4, 5],  // Mon, Wed, Thu, Fri
  avoidVaras: [2, 6, 0],       // Tue, Sat, Sun
  avoidKaranas: ['Vishti'],    // Bhadra/Vishti karana forbidden for marriage
};

// ── Griha Pravesh (housewarming) preset ─────────────────────────────
// Source: Muhurta Chintamani, Ch. 9–10.

const GRIHA_PRAVESH_RULE: ActivityRule = {
  key: 'griha_pravesh',
  label: 'Griha Pravesh (Housewarming)',
  labelHi: 'गृह प्रवेश',
  description: 'Entering a new home — auspicious tithis and nakshatras for housewarming',
  favourTithis: [
    'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Panchami',
    'Shukla Saptami', 'Shukla Dashami', 'Shukla Ekadashi',
    'Shukla Dwadashi', 'Shukla Trayodashi', 'Purnima',
  ],
  avoidTithis: [
    'Shukla Chaturthi', 'Shukla Ashtami', 'Shukla Navami',
    'Shukla Chaturdashi', 'Krishna Chaturthi', 'Krishna Ashtami',
    'Krishna Navami', 'Krishna Chaturdashi', 'Amavasya',
  ],
  favourNakshatras: [
    'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha',
    'Shravana', 'Dhanishtha', 'Shatabhisha', 'Uttara Bhadrapada', 'Revati',
  ],
  avoidNakshatras: [
    'Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula',
    'Purva Bhadrapada',
  ],
  favourVaras: [1, 3, 4, 5],  // Mon, Wed, Thu, Fri
  avoidVaras: [2, 6],          // Tue, Sat
  avoidKaranas: ['Vishti'],
};

// ── Business / Launch preset ────────────────────────────────────────

const BUSINESS_RULE: ActivityRule = {
  key: 'business',
  label: 'Business Launch',
  labelHi: 'व्यापार आरंभ',
  description: 'Starting a business, signing contracts, incorporating a company',
  favourTithis: [
    'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Panchami',
    'Shukla Saptami', 'Shukla Dashami', 'Shukla Ekadashi',
    'Shukla Dwadashi', 'Shukla Trayodashi', 'Purnima',
  ],
  avoidTithis: [
    'Shukla Chaturthi', 'Shukla Navami', 'Shukla Chaturdashi',
    'Krishna Chaturthi', 'Krishna Ashtami', 'Krishna Navami',
    'Krishna Chaturdashi', 'Amavasya',
  ],
  favourNakshatras: [
    'Ashwini', 'Rohini', 'Punarvasu', 'Pushya', 'Hasta',
    'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Revati',
  ],
  avoidNakshatras: [
    'Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula',
    'Purva Bhadrapada',
  ],
  favourVaras: [1, 3, 4, 5],
  avoidVaras: [2, 6],
  avoidKaranas: ['Vishti'],
};

// ── Travel preset ───────────────────────────────────────────────────

const TRAVEL_RULE: ActivityRule = {
  key: 'travel',
  label: 'Travel / Journey',
  labelHi: 'यात्रा',
  description: 'Beginning a journey — auspicious days for safe and fruitful travel',
  favourTithis: [
    'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Panchami',
    'Shukla Saptami', 'Shukla Dashami', 'Shukla Ekadashi',
    'Shukla Dwadashi', 'Shukla Trayodashi', 'Purnima',
  ],
  avoidTithis: [
    'Shukla Chaturthi', 'Shukla Navami', 'Shukla Chaturdashi',
    'Krishna Chaturthi', 'Krishna Ashtami', 'Krishna Navami',
    'Krishna Chaturdashi', 'Amavasya',
  ],
  favourNakshatras: [
    'Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta',
    'Anuradha', 'Shravana', 'Revati',
  ],
  avoidNakshatras: [
    'Bharani', 'Ardra', 'Ashlesha', 'Jyeshtha', 'Mula',
    'Purva Bhadrapada', 'Uttara Bhadrapada',
  ],
  favourVaras: [1, 3, 4, 5],
  avoidVaras: [2, 6],
  avoidKaranas: ['Vishti'],
};

// ── Master rules table ──────────────────────────────────────────────

export const ACTIVITY_RULES: ActivityRule[] = [
  GENERIC_RULE,
  VIVAH_RULE,
  GRIHA_PRAVESH_RULE,
  BUSINESS_RULE,
  TRAVEL_RULE,
];

export function getActivityRule(key: string): ActivityRule | undefined {
  return ACTIVITY_RULES.find((r) => r.key === key);
}
