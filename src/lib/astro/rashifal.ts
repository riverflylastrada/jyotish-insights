/**
 * Deterministic, classically-grounded Rashifal (zodiac horoscope) engine.
 *
 * Unlike the vague AI blurbs most apps ship, the public rashifal is computed from
 * real transits (gochar) using the same sidereal engine the rest of the app uses:
 *   • Daily   → Chandra gochar  (Moon's house from each janma-rashi)
 *   • Monthly → Surya gochar    (Sun's house from each janma-rashi)
 * Favorability follows the standard gochar results (Phaladeepika Ch. 26 / Brihat
 * Jataka). Personalised, chart-grounded rashifal (dasha + full transit set, AI) is
 * a separate in-app mode; this free public layer needs no LLM and no account.
 *
 * Bilingual (EN + HI) by construction so the same data serves /rashifal and
 * /hi/rashifal.
 */

import { SIGN_NAMES, SIGN_NAMES_DEVA } from './types';
import type { Locale } from '@/lib/i18n/locale';

export type RashifalPeriod = 'daily' | 'monthly';
export type Quality = 'good' | 'neutral' | 'challenging';

export interface RashiMeta {
  index: number;        // 0..11, 0 = Mesha/Aries
  sanskrit: string;     // Mesha
  devanagari: string;   // मेष
  western: string;      // Aries
  symbol: string;       // ♈
  lord: string;         // ruling planet (EN)
  lordHi: string;
}

const WESTERN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const LORDS_HI = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];

export const RASHIS: RashiMeta[] = SIGN_NAMES.map((sanskrit, i) => ({
  index: i,
  sanskrit,
  devanagari: SIGN_NAMES_DEVA[i],
  western: WESTERN[i],
  symbol: SYMBOLS[i],
  lord: LORDS[i],
  lordHi: LORDS_HI[i],
}));

interface GocharEntry {
  quality: Quality;
  en: string;
  hi: string;
}

/**
 * Chandra gochar — effect of the Moon transiting the Nth house from the janma rashi.
 * Favourable houses: 1, 3, 6, 7, 10, 11. (Phaladeepika, Gochara.)
 */
const CHANDRA_GOCHARA: Record<number, GocharEntry> = {
  1: { quality: 'neutral', en: 'The Moon rides your own sign — emotions run close to the surface. Good for food, comfort and self-care; avoid impulsive decisions while the mind wanders.', hi: 'चंद्रमा आपकी राशि में — भावनाएँ प्रबल रहेंगी। भोजन, आराम और आत्म-देखभाल के लिए शुभ; मन चंचल रहने से जल्दबाज़ी में निर्णय न लें।' },
  2: { quality: 'challenging', en: 'A day to watch spending and speech. Money and family matters need patience; nourish yourself well and keep words gentle.', hi: 'खर्च और वाणी पर संयम रखें। धन व पारिवारिक मामलों में धैर्य आवश्यक; अच्छा भोजन लें और मधुर बोलें।' },
  3: { quality: 'good', en: 'Courage and initiative are rewarded. Excellent for short trips, communication and bold first steps — your effort meets little resistance.', hi: 'साहस और पहल का फल मिलेगा। छोटी यात्राओं, संवाद और नए कदमों के लिए उत्तम — प्रयास सहज सफल होंगे।' },
  4: { quality: 'challenging', en: 'Mood and home feel unsettled; rest rather than push. Postpone big moves and tend to peace of mind and domestic comfort.', hi: 'मन व घर में बेचैनी; जोर लगाने के बजाय विश्राम करें। बड़े कार्य टालें, मानसिक शांति व घरेलू सुख पर ध्यान दें।' },
  5: { quality: 'challenging', en: 'Mind may feel scattered and stakes feel high. Go easy on speculation and with children/romance; steady routine serves you best.', hi: 'मन बिखरा-सा रहेगा। सट्टे, संतान व प्रेम-संबंधों में सावधानी रखें; नियमित दिनचर्या सर्वोत्तम रहेगी।' },
  6: { quality: 'good', en: 'You overcome rivals, debts and obstacles with ease. A strong day for competition, health routines and finishing pending tasks.', hi: 'शत्रु, ऋण व बाधाओं पर सहज विजय। प्रतिस्पर्धा, स्वास्थ्य-नियम और रुके कार्य पूरे करने के लिए बलवान दिन।' },
  7: { quality: 'good', en: 'Warmth in partnerships and travel. Favourable for relationships, deals and being out among people — connection flows.', hi: 'साझेदारी व यात्रा में अनुकूलता। रिश्तों, सौदों और लोगों से मेल-जोल के लिए शुभ — संबंध सहज बनेंगे।' },
  8: { quality: 'challenging', en: 'Energy dips and small anxieties surface. Guard health and avoid risk or confrontation; rest and caution carry the day.', hi: 'ऊर्जा कम और छोटी चिंताएँ उभर सकती हैं। स्वास्थ्य का ध्यान रखें, जोखिम व टकराव से बचें; विश्राम व सावधानी हितकर।' },
  9: { quality: 'challenging', en: 'Plans may meet delays and fatigue. Not ideal for long journeys or major commitments — keep faith and move gently.', hi: 'योजनाओं में विलंब व थकान संभव। लंबी यात्रा या बड़े वचन के लिए उपयुक्त नहीं — धैर्य रखें, सहजता से चलें।' },
  10: { quality: 'good', en: 'Work and reputation get a lift. A productive day for career action, public dealings and decisions that move things forward.', hi: 'कार्य व प्रतिष्ठा में वृद्धि। करियर, सार्वजनिक कार्यों और आगे बढ़ाने वाले निर्णयों के लिए फलदायी दिन।' },
  11: { quality: 'good', en: 'Gains, friends and fulfilled wishes. One of the best transits — networking, income and social efforts bear fruit.', hi: 'लाभ, मित्र और इच्छापूर्ति। श्रेष्ठ गोचरों में से एक — संपर्क, आय और सामाजिक प्रयास फल देंगे।' },
  12: { quality: 'challenging', en: 'Expenses and tiredness rise; energy turns inward. Good for rest, retreat and spiritual practice — avoid overcommitting.', hi: 'खर्च व थकान बढ़ेगी; ऊर्जा अंतर्मुखी। विश्राम, एकांत व साधना के लिए शुभ — अधिक कार्यभार न लें।' },
};

/**
 * Surya gochar — effect of the Sun transiting the Nth house from the janma rashi.
 * Favourable houses: 3, 6, 10, 11. (Phaladeepika, Gochara.) Sun stays ~one sign
 * per month, so this drives the monthly outlook.
 */
const SURYA_GOCHARA: Record<number, GocharEntry> = {
  1: { quality: 'challenging', en: 'The month turns inward — watch health and ego clashes. Pace yourself; vitality and patience are the themes to protect.', hi: 'महीना अंतर्मुखी — स्वास्थ्य व अहं-टकराव पर ध्यान। गति संयमित रखें; जीवनी-शक्ति व धैर्य की रक्षा करें।' },
  2: { quality: 'challenging', en: 'Finances and family need careful handling this month. Speak measuredly and consolidate rather than expand.', hi: 'इस माह धन व परिवार को सावधानी चाहिए। नपे-तुले बोलें और विस्तार के बजाय संचय पर ध्यान दें।' },
  3: { quality: 'good', en: 'A strong, assertive month. Courage, initiative and short travels pay off; your authority and effort are recognised.', hi: 'सशक्त व आत्मविश्वासी माह। साहस, पहल व छोटी यात्राएँ लाभकारी; आपके अधिकार व प्रयास की पहचान होगी।' },
  4: { quality: 'challenging', en: 'Home, property and mood need tending. Avoid major domestic upheavals; seek balance between work and rest.', hi: 'घर, संपत्ति व मन को संभालना होगा। बड़े घरेलू उथल-पुथल से बचें; कार्य व विश्राम में संतुलन रखें।' },
  5: { quality: 'challenging', en: 'Guard against strain with children, studies or speculation. Steady, modest effort outperforms big bets this month.', hi: 'संतान, शिक्षा व सट्टे में तनाव से बचें। इस माह स्थिर, संयमित प्रयास बड़े दांव से बेहतर रहेगा।' },
  6: { quality: 'good', en: 'You gain the upper hand over rivals, debts and illness. Excellent for competition, service and resolving disputes.', hi: 'शत्रु, ऋण व रोग पर बढ़त। प्रतिस्पर्धा, सेवा व विवाद-निपटान के लिए उत्तम माह।' },
  7: { quality: 'challenging', en: 'Partnerships and travel may feel demanding. Practise diplomacy; avoid power struggles with spouse or associates.', hi: 'साझेदारी व यात्रा माँग भरी रह सकती है। कूटनीति बरतें; जीवनसाथी या सहयोगियों से वर्चस्व-संघर्ष टालें।' },
  8: { quality: 'challenging', en: 'A month for caution — health, change and hidden matters. Avoid risk; rest, review and protect your reserves.', hi: 'सावधानी का माह — स्वास्थ्य, परिवर्तन व गुप्त मामले। जोखिम से बचें; विश्राम, समीक्षा व बचत की रक्षा करें।' },
  9: { quality: 'neutral', en: 'Fortune and faith are highlighted, though energy varies. Good for learning, dharma and mentors; pace bigger plans.', hi: 'भाग्य व आस्था प्रबल, पर ऊर्जा घटती-बढ़ती। शिक्षा, धर्म व मार्गदर्शकों के लिए शुभ; बड़ी योजनाएँ संभलकर।' },
  10: { quality: 'good', en: 'Career and status rise to the fore. A powerful month for ambition, authority and public success — act decisively.', hi: 'करियर व प्रतिष्ठा प्रमुख। महत्वाकांक्षा, अधिकार व सार्वजनिक सफलता के लिए प्रबल माह — निर्णायक बनें।' },
  11: { quality: 'good', en: 'Gains, recognition and fulfilled goals dominate. Income, networks and long-held wishes move toward you.', hi: 'लाभ, सम्मान व लक्ष्य-पूर्ति प्रमुख। आय, संपर्क व पुरानी इच्छाएँ आपकी ओर बढ़ेंगी।' },
  12: { quality: 'challenging', en: 'Expenses, travel abroad and letting-go are themes. Conserve energy and funds; favour rest and spiritual pursuits.', hi: 'खर्च, विदेश-यात्रा व त्याग के विषय। ऊर्जा व धन बचाएँ; विश्राम व आध्यात्मिक कार्यों को प्राथमिकता दें।' },
};

export interface RashifalReading {
  rashi: RashiMeta;
  /** 1..12 house of the transiting luminary from this janma rashi. */
  house: number;
  quality: Quality;
  text: string;        // in the requested locale
  transitNote: string; // e.g. "Moon in your 11th" — in the requested locale
}

/** House (1..12) of the transit sign counted from the janma rashi. */
export function relativeHouse(janmaIndex: number, transitIndex: number): number {
  return ((transitIndex - janmaIndex + 12) % 12) + 1;
}

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/** Compute the reading for one rashi for the given period + transit position. */
export function getReading(
  period: RashifalPeriod,
  janmaIndex: number,
  transitIndex: number,
  locale: Locale,
): RashifalReading {
  const house = relativeHouse(janmaIndex, transitIndex);
  const table = period === 'daily' ? CHANDRA_GOCHARA : SURYA_GOCHARA;
  const entry = table[house];
  const luminaryEn = period === 'daily' ? 'Moon' : 'Sun';
  const luminaryHi = period === 'daily' ? 'चंद्रमा' : 'सूर्य';
  const transitNote = locale === 'hi'
    ? `${luminaryHi} आपके ${house}वें भाव में`
    : `${luminaryEn} in your ${ORDINAL[house]} house`;
  return {
    rashi: RASHIS[janmaIndex],
    house,
    quality: entry.quality,
    text: locale === 'hi' ? entry.hi : entry.en,
    transitNote,
  };
}

/** Compute readings for all 12 rashis. */
export function getAllReadings(
  period: RashifalPeriod,
  transitIndex: number,
  locale: Locale,
): RashifalReading[] {
  return RASHIS.map((r) => getReading(period, r.index, transitIndex, locale));
}

export const RASHIFAL_CITATION = 'Gochara phala per Phaladeepika Ch. 26 (Mantreshwara) & Brihat Jataka; positions from the in-house sidereal (Lahiri) engine.';
