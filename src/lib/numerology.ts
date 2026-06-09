/**
 * Numerology engine — deterministic, no LLM, no network.
 *
 * Uses the Pythagorean system (the most common in Indian/Western practice).
 * Master numbers 11, 22 and 33 are preserved (not reduced) where they arise, per
 * standard convention. Letter values operate on A–Z, so names are taken in their
 * Latin transliteration (how most users type them).
 *
 * Bilingual meaning tables (EN + HI) so the same data serves /numerology and
 * /hi/numerology.
 */

export type CoreNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

const MASTERS = new Set([11, 22, 33]);

/** Pythagorean letter → digit (A=1 … I=9, J=1 …). */
const LETTER_VALUE: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Reduce a number to a single digit, preserving master numbers 11/22/33. */
export function reduceNumber(n: number, keepMasters = true): number {
  let x = Math.abs(n);
  while (x > 9 && !(keepMasters && MASTERS.has(x))) {
    x = String(x).split('').reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

/** Life Path = reduce(day) + reduce(month) + reduce(year), then reduce. */
export function lifePathNumber(dateStr: string): CoreNumber {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const parts = [reduceNumber(d), reduceNumber(m), reduceNumber(y)];
  return reduceNumber(parts.reduce((s, p) => s + p, 0)) as CoreNumber;
}

function lettersOnly(name: string): string[] {
  return name.toLowerCase().split('').filter((c) => LETTER_VALUE[c] !== undefined);
}

/** Destiny / Expression number — all letters of the full name. */
export function destinyNumber(name: string): CoreNumber {
  const sum = lettersOnly(name).reduce((s, c) => s + LETTER_VALUE[c], 0);
  return (sum ? reduceNumber(sum) : 1) as CoreNumber;
}

/** Soul Urge (Heart's Desire) — vowels only. */
export function soulUrgeNumber(name: string): CoreNumber {
  const sum = lettersOnly(name).filter((c) => VOWELS.has(c)).reduce((s, c) => s + LETTER_VALUE[c], 0);
  return (sum ? reduceNumber(sum) : 1) as CoreNumber;
}

/** Personality number — consonants only. */
export function personalityNumber(name: string): CoreNumber {
  const sum = lettersOnly(name).filter((c) => !VOWELS.has(c)).reduce((s, c) => s + LETTER_VALUE[c], 0);
  return (sum ? reduceNumber(sum) : 1) as CoreNumber;
}

export interface NumberMeaning {
  keywords: string[];
  keywordsHi: string[];
  en: string;
  hi: string;
  luckyColor: string;
  luckyColorHi: string;
  luckyDay: string;
  luckyDayHi: string;
  planet: string;   // Indian numerology associates each number with a graha
  planetHi: string;
}

export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    keywords: ['Leadership', 'Independence', 'Initiative'], keywordsHi: ['नेतृत्व', 'स्वतंत्रता', 'पहल'],
    en: 'The pioneer. Number 1 is self-reliant, ambitious and original — a born leader who thrives by starting things and standing on their own.',
    hi: 'अग्रणी। अंक 1 आत्मनिर्भर, महत्वाकांक्षी और मौलिक होता है — एक जन्मजात नेता जो नई शुरुआत और आत्मबल से आगे बढ़ता है।',
    luckyColor: 'Gold / Orange', luckyColorHi: 'सुनहरा / नारंगी', luckyDay: 'Sunday', luckyDayHi: 'रविवार', planet: 'Sun', planetHi: 'सूर्य',
  },
  2: {
    keywords: ['Harmony', 'Sensitivity', 'Partnership'], keywordsHi: ['सामंजस्य', 'संवेदनशीलता', 'साझेदारी'],
    en: 'The diplomat. Number 2 is cooperative, intuitive and gentle — gifted at relationships, balance and quiet, patient persuasion.',
    hi: 'कूटनीतिज्ञ। अंक 2 सहयोगी, सहज-बोध से युक्त और कोमल होता है — संबंध, संतुलन और धैर्यपूर्ण समझ में निपुण।',
    luckyColor: 'White / Cream', luckyColorHi: 'सफ़ेद / क्रीम', luckyDay: 'Monday', luckyDayHi: 'सोमवार', planet: 'Moon', planetHi: 'चंद्र',
  },
  3: {
    keywords: ['Expression', 'Creativity', 'Optimism'], keywordsHi: ['अभिव्यक्ति', 'रचनात्मकता', 'आशावाद'],
    en: 'The communicator. Number 3 is expressive, social and creative — full of ideas, words and a natural, uplifting charm.',
    hi: 'संवादक। अंक 3 अभिव्यक्तिशील, मिलनसार और रचनात्मक होता है — विचारों, शब्दों और स्वाभाविक उत्साह से भरपूर।',
    luckyColor: 'Yellow', luckyColorHi: 'पीला', luckyDay: 'Thursday', luckyDayHi: 'गुरुवार', planet: 'Jupiter', planetHi: 'गुरु',
  },
  4: {
    keywords: ['Stability', 'Discipline', 'Endurance'], keywordsHi: ['स्थिरता', 'अनुशासन', 'सहनशीलता'],
    en: 'The builder. Number 4 is practical, disciplined and dependable — values structure, hard work and lasting foundations.',
    hi: 'निर्माता। अंक 4 व्यावहारिक, अनुशासित और भरोसेमंद होता है — व्यवस्था, परिश्रम और स्थायी नींव को महत्व देता है।',
    luckyColor: 'Grey / Blue', luckyColorHi: 'धूसर / नीला', luckyDay: 'Saturday', luckyDayHi: 'शनिवार', planet: 'Rahu', planetHi: 'राहु',
  },
  5: {
    keywords: ['Freedom', 'Change', 'Adventure'], keywordsHi: ['स्वतंत्रता', 'परिवर्तन', 'रोमांच'],
    en: 'The explorer. Number 5 is curious, versatile and restless — loves freedom, travel, variety and quick adaptation.',
    hi: 'अन्वेषक। अंक 5 जिज्ञासु, बहुमुखी और चंचल होता है — स्वतंत्रता, यात्रा, विविधता और शीघ्र अनुकूलन पसंद करता है।',
    luckyColor: 'Green', luckyColorHi: 'हरा', luckyDay: 'Wednesday', luckyDayHi: 'बुधवार', planet: 'Mercury', planetHi: 'बुध',
  },
  6: {
    keywords: ['Responsibility', 'Love', 'Nurture'], keywordsHi: ['उत्तरदायित्व', 'प्रेम', 'पोषण'],
    en: 'The nurturer. Number 6 is caring, responsible and harmonious — devoted to family, beauty, service and healing.',
    hi: 'पोषक। अंक 6 स्नेही, उत्तरदायी और सामंजस्यपूर्ण होता है — परिवार, सौंदर्य, सेवा और उपचार के प्रति समर्पित।',
    luckyColor: 'Pink / White', luckyColorHi: 'गुलाबी / सफ़ेद', luckyDay: 'Friday', luckyDayHi: 'शुक्रवार', planet: 'Venus', planetHi: 'शुक्र',
  },
  7: {
    keywords: ['Wisdom', 'Spirituality', 'Analysis'], keywordsHi: ['ज्ञान', 'आध्यात्म', 'विश्लेषण'],
    en: 'The seeker. Number 7 is introspective, analytical and spiritual — drawn to truth, solitude, study and inner depth.',
    hi: 'साधक। अंक 7 अंतर्मुखी, विश्लेषणात्मक और आध्यात्मिक होता है — सत्य, एकांत, अध्ययन और आंतरिक गहराई की ओर आकर्षित।',
    luckyColor: 'Violet / Sea-green', luckyColorHi: 'बैंगनी / समुद्री-हरा', luckyDay: 'Monday', luckyDayHi: 'सोमवार', planet: 'Ketu', planetHi: 'केतु',
  },
  8: {
    keywords: ['Power', 'Ambition', 'Material mastery'], keywordsHi: ['शक्ति', 'महत्वाकांक्षा', 'भौतिक सफलता'],
    en: 'The achiever. Number 8 is ambitious, authoritative and disciplined — built for business, power and material accomplishment.',
    hi: 'उपलब्धिकर्ता। अंक 8 महत्वाकांक्षी, आधिकारिक और अनुशासित होता है — व्यापार, सत्ता और भौतिक सफलता के लिए बना।',
    luckyColor: 'Dark Blue / Black', luckyColorHi: 'गहरा नीला / काला', luckyDay: 'Saturday', luckyDayHi: 'शनिवार', planet: 'Saturn', planetHi: 'शनि',
  },
  9: {
    keywords: ['Compassion', 'Idealism', 'Courage'], keywordsHi: ['करुणा', 'आदर्शवाद', 'साहस'],
    en: 'The humanitarian. Number 9 is compassionate, courageous and idealistic — driven to serve, lead and give for a larger cause.',
    hi: 'मानवतावादी। अंक 9 करुणामय, साहसी और आदर्शवादी होता है — बड़े उद्देश्य के लिए सेवा, नेतृत्व और त्याग को प्रेरित।',
    luckyColor: 'Red', luckyColorHi: 'लाल', luckyDay: 'Tuesday', luckyDayHi: 'मंगलवार', planet: 'Mars', planetHi: 'मंगल',
  },
  11: {
    keywords: ['Intuition', 'Inspiration', 'Vision'], keywordsHi: ['अंतर्ज्ञान', 'प्रेरणा', 'दूरदृष्टि'],
    en: 'Master number 11 — the inspired visionary. A heightened 2: deeply intuitive, idealistic and spiritually attuned, here to inspire others.',
    hi: 'मास्टर अंक 11 — प्रेरित द्रष्टा। 2 का उन्नत रूप: गहन अंतर्ज्ञानी, आदर्शवादी और आध्यात्मिक रूप से जागृत, दूसरों को प्रेरित करने के लिए।',
    luckyColor: 'Silver / Pearl', luckyColorHi: 'चाँदी / मोती', luckyDay: 'Monday', luckyDayHi: 'सोमवार', planet: 'Moon', planetHi: 'चंद्र',
  },
  22: {
    keywords: ['Master builder', 'Manifestation', 'Legacy'], keywordsHi: ['महानिर्माता', 'सिद्धि', 'विरासत'],
    en: 'Master number 22 — the master builder. A heightened 4: turns grand visions into lasting, large-scale reality through discipline and purpose.',
    hi: 'मास्टर अंक 22 — महानिर्माता। 4 का उन्नत रूप: अनुशासन और उद्देश्य से बड़े सपनों को स्थायी, विशाल वास्तविकता में बदलता है।',
    luckyColor: 'Gold / Cream', luckyColorHi: 'सुनहरा / क्रीम', luckyDay: 'Saturday', luckyDayHi: 'शनिवार', planet: 'Rahu', planetHi: 'राहु',
  },
  33: {
    keywords: ['Master teacher', 'Compassion', 'Service'], keywordsHi: ['महागुरु', 'करुणा', 'सेवा'],
    en: 'Master number 33 — the master teacher. A heightened 6: selfless, nurturing and devoted to uplifting humanity through love and service.',
    hi: 'मास्टर अंक 33 — महागुरु। 6 का उन्नत रूप: निःस्वार्थ, पोषक और प्रेम व सेवा से मानवता के उत्थान को समर्पित।',
    luckyColor: 'Pink / Gold', luckyColorHi: 'गुलाबी / सुनहरा', luckyDay: 'Friday', luckyDayHi: 'शुक्रवार', planet: 'Venus', planetHi: 'शुक्र',
  },
};

export interface NumerologyProfile {
  lifePath: CoreNumber;
  destiny?: CoreNumber;
  soulUrge?: CoreNumber;
  personality?: CoreNumber;
}

export function computeProfile(dateStr: string, name?: string): NumerologyProfile {
  const profile: NumerologyProfile = { lifePath: lifePathNumber(dateStr) };
  if (name && lettersOnly(name).length > 0) {
    profile.destiny = destinyNumber(name);
    profile.soulUrge = soulUrgeNumber(name);
    profile.personality = personalityNumber(name);
  }
  return profile;
}

export const NUMEROLOGY_CITATION = 'Pythagorean numerology; graha associations per the Indian (Cheiro/Vedic-aligned) tradition. Master numbers 11/22/33 preserved.';
