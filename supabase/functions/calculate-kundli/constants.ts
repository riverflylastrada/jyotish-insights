/** Shared constants for the Vedic calculation engine. */

export const DEG = Math.PI / 180;

export const SIGN_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
  'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const;

export const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury',
] as const;

/** Vimshottari dasha years in cycle order. */
export const VIMSHOTTARI_SEQUENCE: Array<[string, number]> = [
  ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7],
  ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17],
];
export const VIMSHOTTARI_TOTAL = 120;

/** Exaltation: planet → [signNumber (1-indexed), exact degree in sign]. */
export const EXALTATION: Record<string, [number, number]> = {
  sun: [1, 10], moon: [2, 3], mars: [10, 28], mercury: [6, 15],
  jupiter: [4, 5], venus: [12, 27], saturn: [7, 20],
};

/** Debilitation sign (opposite of exaltation sign). */
export const DEBILITATION: Record<string, number> = {
  sun: 7, moon: 8, mars: 4, mercury: 12,
  jupiter: 10, venus: 6, saturn: 1,
};

/** Own signs per planet. */
export const OWN_SIGNS: Record<string, number[]> = {
  sun: [5], moon: [4], mars: [1, 8], mercury: [3, 6],
  jupiter: [9, 12], venus: [2, 7], saturn: [10, 11],
};

/** Mooltrikona: planet → [sign, startDeg, endDeg]. */
export const MOOLTRIKONA: Record<string, [number, number, number]> = {
  sun: [5, 0, 20], moon: [2, 4, 20], mars: [1, 0, 12],
  mercury: [6, 16, 20], jupiter: [9, 0, 10], venus: [7, 0, 15],
  saturn: [11, 0, 20],
};

/** Combustion orbs (degrees from Sun). */
export const COMBUSTION_ORBS: Record<string, number> = {
  moon: 12, mars: 17, mercury: 14, jupiter: 11, venus: 10, saturn: 15,
};

/** Natural friendship table (Parashari). */
export const FRIENDSHIPS: Record<string, { friends: string[]; neutrals: string[]; enemies: string[] }> = {
  sun:     { friends: ['moon', 'mars', 'jupiter'], neutrals: ['mercury'], enemies: ['venus', 'saturn'] },
  moon:    { friends: ['sun', 'mercury'], neutrals: ['mars', 'jupiter', 'venus', 'saturn'], enemies: [] },
  mars:    { friends: ['sun', 'moon', 'jupiter'], neutrals: ['venus', 'saturn'], enemies: ['mercury'] },
  mercury: { friends: ['sun', 'venus'], neutrals: ['mars', 'jupiter', 'saturn'], enemies: ['moon'] },
  jupiter: { friends: ['sun', 'moon', 'mars'], neutrals: ['saturn'], enemies: ['mercury', 'venus'] },
  venus:   { friends: ['mercury', 'saturn'], neutrals: ['mars', 'jupiter'], enemies: ['sun', 'moon'] },
  saturn:  { friends: ['mercury', 'venus'], neutrals: ['jupiter'], enemies: ['sun', 'moon', 'mars'] },
};

/** Ashtakavarga bindu contribution tables (Parashari).
 *  Key = beneficiary planet, value = map of contributor → list of houses (1-indexed) from contributor that give a bindu. */
export const ASHTAK_TABLES: Record<string, Record<string, number[]>> = {
  sun: {
    sun: [1,2,4,7,8,9,10,11], moon: [3,6,10,11], mars: [1,2,4,7,8,9,10,11],
    mercury: [3,5,6,9,10,11,12], jupiter: [5,6,9,11], venus: [6,7,12],
    saturn: [1,2,4,7,8,9,10,11], ascendant: [3,4,6,10,11,12],
  },
  moon: {
    sun: [3,6,7,8,10,11], moon: [1,3,6,7,10,11], mars: [2,3,5,6,9,10,11],
    mercury: [1,3,4,5,7,8,10,11], jupiter: [1,4,7,8,10,11,12],
    venus: [3,4,5,7,9,10,11], saturn: [3,5,6,11], ascendant: [3,6,10,11],
  },
  mars: {
    sun: [3,5,6,10,11], moon: [3,6,11], mars: [1,2,4,7,8,10,11],
    mercury: [3,5,6,11], jupiter: [6,10,11,12], venus: [6,8,11,12],
    saturn: [1,4,7,8,9,10,11], ascendant: [1,3,6,10,11],
  },
  mercury: {
    sun: [5,6,9,11,12], moon: [2,4,6,8,10,11], mars: [1,2,4,7,8,9,10,11],
    mercury: [1,3,5,6,9,10,11,12], jupiter: [6,8,11,12],
    venus: [1,2,3,4,5,8,9,11], saturn: [1,2,4,7,8,9,10,11],
    ascendant: [1,2,4,6,8,10,11],
  },
  jupiter: {
    sun: [1,2,3,4,7,8,9,10,11], moon: [2,5,7,9,11],
    mars: [1,2,4,7,8,10,11], mercury: [1,2,4,5,6,9,10,11],
    jupiter: [1,2,3,4,7,8,10,11], venus: [2,5,6,9,10,11],
    saturn: [3,5,6,12], ascendant: [1,2,4,5,6,7,9,10,11],
  },
  venus: {
    sun: [8,11,12], moon: [1,2,3,4,5,8,9,11,12],
    mars: [3,4,6,8,9,11,12], mercury: [3,5,6,9,11],
    jupiter: [5,8,9,10,11], venus: [1,2,3,4,5,8,9,10,11],
    saturn: [3,4,5,8,9,10,11], ascendant: [1,2,3,4,5,8,9],
  },
  saturn: {
    sun: [1,2,4,7,8,10,11], moon: [3,6,11],
    mars: [3,5,6,10,11,12], mercury: [6,8,9,10,11,12],
    jupiter: [5,6,11,12], venus: [6,11,12],
    saturn: [3,5,6,11], ascendant: [1,3,4,6,10,11],
  },
};

/** Varga metadata: code, name, significance, divisor. */
export const VARGA_META: Array<{
  code: string; name: string; sig: string; divisor: number;
}> = [
  { code: 'D1',  name: 'Rasi',            sig: 'Body, overall life, self',       divisor: 1 },
  { code: 'D2',  name: 'Hora',            sig: 'Wealth, accumulation',           divisor: 2 },
  { code: 'D3',  name: 'Drekkana',        sig: 'Siblings, courage',             divisor: 3 },
  { code: 'D4',  name: 'Chaturthamsa',    sig: 'Property, fortune',             divisor: 4 },
  { code: 'D7',  name: 'Saptamsa',        sig: 'Children, progeny',             divisor: 7 },
  { code: 'D9',  name: 'Navamsha',        sig: 'Marriage, dharma, fruition',     divisor: 9 },
  { code: 'D10', name: 'Dasamsa',         sig: 'Career, public life',           divisor: 10 },
  { code: 'D12', name: 'Dwadasamsa',      sig: 'Parents, lineage',              divisor: 12 },
  { code: 'D16', name: 'Shodasamsa',      sig: 'Vehicles, comforts',            divisor: 16 },
  { code: 'D20', name: 'Vimsamsa',        sig: 'Spiritual practice',            divisor: 20 },
  { code: 'D24', name: 'Chaturvimsamsa',  sig: 'Education, learning',           divisor: 24 },
  { code: 'D27', name: 'Bhamsa',          sig: 'Strengths, weaknesses',         divisor: 27 },
  { code: 'D30', name: 'Trimsamsa',       sig: 'Misfortunes, evils',            divisor: 30 },
  { code: 'D40', name: 'Khavedamsa',      sig: 'Maternal legacy',               divisor: 40 },
  { code: 'D45', name: 'Akshavedamsa',    sig: 'Paternal legacy',               divisor: 45 },
  { code: 'D60', name: 'Shashtiamsa',     sig: 'Karmic refinement',             divisor: 60 },
];

/** Panchang yoga names (27). */
export const PANCHANG_YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi',
  'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata',
  'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const;

/** Tithi names (30). */
export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
] as const;

/** Karana names (11 repeating). */
export const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
] as const;

export const WEEKDAYS = [
  'Ravivara (Sunday)', 'Somavara (Monday)', 'Mangalavara (Tuesday)',
  'Budhavara (Wednesday)', 'Guruvara (Thursday)', 'Shukravara (Friday)',
  'Shanivara (Saturday)',
] as const;
