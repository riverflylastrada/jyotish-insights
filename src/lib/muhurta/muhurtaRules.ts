/**
 * Data-driven Muhurta scoring rules — client-side mirror of the engine table
 * at supabase/functions/calculate-kundli/muhurta_rules.ts.
 *
 * Keep these two files in sync. This is the single data-driven table that
 * determines how each activity is scored by Tithi, Nakshatra, Vara, and Karana.
 */

export interface ActivityRule {
  key: string;
  label: string;
  labelHi: string;
  description: string;
  favourTithis: string[];
  avoidTithis: string[];
  favourNakshatras: string[];
  avoidNakshatras: string[];
  favourVaras: number[];   // JS weekday: 0=Sun…6=Sat
  avoidVaras: number[];
  avoidKaranas: string[];
}

const GENERIC: ActivityRule = {
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
  favourVaras: [1, 3, 4, 5],
  avoidVaras: [2, 6],
  avoidKaranas: ['Vishti'],
};

const VIVAH: ActivityRule = {
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
  favourVaras: [1, 3, 4, 5],
  avoidVaras: [2, 6, 0],
  avoidKaranas: ['Vishti'],
};

const GRIHA_PRAVESH: ActivityRule = {
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
  favourVaras: [1, 3, 4, 5],
  avoidVaras: [2, 6],
  avoidKaranas: ['Vishti'],
};

const BUSINESS: ActivityRule = {
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

const TRAVEL: ActivityRule = {
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

export const ACTIVITY_RULES: ActivityRule[] = [GENERIC, VIVAH, GRIHA_PRAVESH, BUSINESS, TRAVEL];

export function getActivityRule(key: string): ActivityRule | undefined {
  return ACTIVITY_RULES.find((r) => r.key === key);
}
