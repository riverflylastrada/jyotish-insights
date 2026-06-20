/**
 * Deno-pure port of the deterministic Rashifal (gochar) engine.
 *
 * The browser source `src/lib/astro/rashifal.ts` carries the same classical data
 * but imports `@/lib/i18n/locale` and `./types`, so a Deno edge function cannot
 * import it. This is a controlled DATA port — identical Phaladeepika Ch.26 gochar
 * tables and the same `relativeHouse` math — kept import-free for the edge runtime.
 *
 * Keep the two in sync when the classical tables change.
 */

export type Locale = "en" | "hi";
export type RashifalPeriod = "daily" | "monthly";
export type Quality = "good" | "neutral" | "challenging";

export interface RashiMeta {
  index: number; // 0..11, 0 = Mesha/Aries
  sanskrit: string;
  devanagari: string;
  western: string;
  symbol: string;
  lord: string;
  lordHi: string;
}

const SANSKRIT = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
const DEVANAGARI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
const WESTERN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const LORDS_HI = ["मंगल", "शुक्र", "बुध", "चंद्र", "सूर्य", "बुध", "शुक्र", "मंगल", "गुरु", "शनि", "शनि", "गुरु"];

export const RASHIS: RashiMeta[] = SANSKRIT.map((sanskrit, i) => ({
  index: i,
  sanskrit,
  devanagari: DEVANAGARI[i],
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

/** Chandra gochar — Moon transiting the Nth house from the janma rashi. */
const CHANDRA_GOCHARA: Record<number, GocharEntry> = {
  1: { quality: "neutral", en: "The Moon rides your own sign — emotions run close to the surface. Good for food, comfort and self-care; avoid impulsive decisions.", hi: "चंद्रमा आपकी राशि में — भावनाएँ प्रबल रहेंगी। भोजन, आराम और आत्म-देखभाल के लिए शुभ; जल्दबाज़ी में निर्णय न लें।" },
  2: { quality: "challenging", en: "A day to watch spending and speech. Money and family need patience; keep words gentle.", hi: "खर्च और वाणी पर संयम रखें। धन व पारिवारिक मामलों में धैर्य आवश्यक; मधुर बोलें।" },
  3: { quality: "good", en: "Courage and initiative are rewarded. Excellent for short trips, communication and bold first steps.", hi: "साहस और पहल का फल मिलेगा। छोटी यात्राओं, संवाद और नए कदमों के लिए उत्तम।" },
  4: { quality: "challenging", en: "Mood and home feel unsettled; rest rather than push. Postpone big moves.", hi: "मन व घर में बेचैनी; जोर लगाने के बजाय विश्राम करें। बड़े कार्य टालें।" },
  5: { quality: "challenging", en: "Mind may feel scattered. Go easy on speculation and romance; steady routine serves you best.", hi: "मन बिखरा-सा रहेगा। सट्टे व प्रेम-संबंधों में सावधानी; नियमित दिनचर्या सर्वोत्तम।" },
  6: { quality: "good", en: "You overcome rivals, debts and obstacles with ease. Strong for competition and finishing tasks.", hi: "शत्रु, ऋण व बाधाओं पर सहज विजय। प्रतिस्पर्धा व रुके कार्य पूरे करने के लिए बलवान दिन।" },
  7: { quality: "good", en: "Warmth in partnerships and travel. Favourable for relationships, deals and being among people.", hi: "साझेदारी व यात्रा में अनुकूलता। रिश्तों, सौदों और मेल-जोल के लिए शुभ।" },
  8: { quality: "challenging", en: "Energy dips and small anxieties surface. Guard health, avoid risk or confrontation.", hi: "ऊर्जा कम और छोटी चिंताएँ उभर सकती हैं। स्वास्थ्य का ध्यान रखें, जोखिम व टकराव से बचें।" },
  9: { quality: "challenging", en: "Plans may meet delays and fatigue. Not ideal for long journeys; move gently.", hi: "योजनाओं में विलंब व थकान संभव। लंबी यात्रा के लिए उपयुक्त नहीं — सहजता से चलें।" },
  10: { quality: "good", en: "Work and reputation get a lift. Productive for career action and decisions that move things forward.", hi: "कार्य व प्रतिष्ठा में वृद्धि। करियर व आगे बढ़ाने वाले निर्णयों के लिए फलदायी दिन।" },
  11: { quality: "good", en: "Gains, friends and fulfilled wishes. One of the best transits — networking and income bear fruit.", hi: "लाभ, मित्र और इच्छापूर्ति। श्रेष्ठ गोचरों में से एक — संपर्क व आय फल देंगे।" },
  12: { quality: "challenging", en: "Expenses and tiredness rise; energy turns inward. Good for rest and spiritual practice.", hi: "खर्च व थकान बढ़ेगी; ऊर्जा अंतर्मुखी। विश्राम व साधना के लिए शुभ — अधिक कार्यभार न लें।" },
};

/** Surya gochar — Sun transiting the Nth house from the janma rashi (monthly). */
const SURYA_GOCHARA: Record<number, GocharEntry> = {
  1: { quality: "challenging", en: "The month turns inward — watch health and ego clashes. Pace yourself.", hi: "महीना अंतर्मुखी — स्वास्थ्य व अहं-टकराव पर ध्यान। गति संयमित रखें।" },
  2: { quality: "challenging", en: "Finances and family need careful handling. Consolidate rather than expand.", hi: "धन व परिवार को सावधानी चाहिए। विस्तार के बजाय संचय पर ध्यान दें।" },
  3: { quality: "good", en: "A strong, assertive month. Courage, initiative and short travels pay off.", hi: "सशक्त व आत्मविश्वासी माह। साहस, पहल व छोटी यात्राएँ लाभकारी।" },
  4: { quality: "challenging", en: "Home, property and mood need tending. Seek balance between work and rest.", hi: "घर, संपत्ति व मन को संभालना होगा। कार्य व विश्राम में संतुलन रखें।" },
  5: { quality: "challenging", en: "Guard against strain with children, studies or speculation. Modest effort wins.", hi: "संतान, शिक्षा व सट्टे में तनाव से बचें। संयमित प्रयास श्रेष्ठ रहेगा।" },
  6: { quality: "good", en: "You gain the upper hand over rivals, debts and illness. Excellent for competition.", hi: "शत्रु, ऋण व रोग पर बढ़त। प्रतिस्पर्धा व विवाद-निपटान के लिए उत्तम माह।" },
  7: { quality: "challenging", en: "Partnerships and travel may feel demanding. Practise diplomacy.", hi: "साझेदारी व यात्रा माँग भरी रह सकती है। कूटनीति बरतें।" },
  8: { quality: "challenging", en: "A month for caution — health, change and hidden matters. Avoid risk.", hi: "सावधानी का माह — स्वास्थ्य, परिवर्तन व गुप्त मामले। जोखिम से बचें।" },
  9: { quality: "neutral", en: "Fortune and faith are highlighted. Good for learning, dharma and mentors.", hi: "भाग्य व आस्था प्रबल। शिक्षा, धर्म व मार्गदर्शकों के लिए शुभ।" },
  10: { quality: "good", en: "Career and status rise to the fore. Powerful for ambition and public success.", hi: "करियर व प्रतिष्ठा प्रमुख। महत्वाकांक्षा व सार्वजनिक सफलता के लिए प्रबल माह।" },
  11: { quality: "good", en: "Gains, recognition and fulfilled goals dominate. Income and networks move toward you.", hi: "लाभ, सम्मान व लक्ष्य-पूर्ति प्रमुख। आय व संपर्क आपकी ओर बढ़ेंगे।" },
  12: { quality: "challenging", en: "Expenses, travel abroad and letting-go are themes. Conserve energy and funds.", hi: "खर्च, विदेश-यात्रा व त्याग के विषय। ऊर्जा व धन बचाएँ।" },
};

export interface RashifalReading {
  rashi: RashiMeta;
  house: number; // 1..12
  quality: Quality;
  text: string;
  transitNote: string;
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

/** House (1..12) of the transit sign counted from the janma rashi. */
export function relativeHouse(janmaIndex: number, transitIndex: number): number {
  return ((transitIndex - janmaIndex + 12) % 12) + 1;
}

/** Reading for one rashi for the given period + transit position. */
export function getReading(period: RashifalPeriod, janmaIndex: number, transitIndex: number, locale: Locale): RashifalReading {
  const house = relativeHouse(janmaIndex, transitIndex);
  const table = period === "daily" ? CHANDRA_GOCHARA : SURYA_GOCHARA;
  const entry = table[house];
  const luminaryEn = period === "daily" ? "Moon" : "Sun";
  const luminaryHi = period === "daily" ? "चंद्रमा" : "सूर्य";
  const transitNote = locale === "hi" ? `${luminaryHi} आपके ${house}वें भाव में` : `${luminaryEn} in your ${ORDINAL[house]} house`;
  return { rashi: RASHIS[janmaIndex], house, quality: entry.quality, text: locale === "hi" ? entry.hi : entry.en, transitNote };
}

/** Readings for all 12 rashis. */
export function getAllReadings(period: RashifalPeriod, transitIndex: number, locale: Locale): RashifalReading[] {
  return RASHIS.map((r) => getReading(period, r.index, transitIndex, locale));
}

export const RASHIFAL_CITATION = "Gochara phala per Phaladeepika Ch. 26 & Brihat Jataka; positions from the in-house sidereal (Lahiri) engine.";
