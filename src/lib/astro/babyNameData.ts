/**
 * Vedic baby-naming (Namakarana) data.
 *
 * The classical practice fixes the auspicious FIRST SYLLABLE (akshara) of a
 * child's name from the Moon's nakshatra + pada at birth — four syllables per
 * nakshatra, one per pada (108 in all). This file holds that canonical syllable
 * map plus a curated, bilingual pool of names tagged by their starting syllable,
 * so we can suggest real names matching the computed pada.
 *
 * Keyed by the exact nakshatra names the engine emits (see NAKSHATRA_NAMES in
 * panchangLite / calculate-kundli constants).
 */

export interface PadaSyllable {
  roman: string;   // e.g. "Va/Ba"
  deva: string;    // e.g. "वा"
}

/** Four pada syllables per nakshatra, in pada order (1→4). */
export const PADA_SYLLABLES: Record<string, PadaSyllable[]> = {
  Ashwini: [{ roman: 'Chu', deva: 'चु' }, { roman: 'Che', deva: 'चे' }, { roman: 'Cho', deva: 'चो' }, { roman: 'La', deva: 'ला' }],
  Bharani: [{ roman: 'Lee', deva: 'ली' }, { roman: 'Lu', deva: 'लू' }, { roman: 'Le', deva: 'ले' }, { roman: 'Lo', deva: 'लो' }],
  Krittika: [{ roman: 'A', deva: 'अ' }, { roman: 'Ee', deva: 'ई' }, { roman: 'U', deva: 'उ' }, { roman: 'Ae', deva: 'ए' }],
  Rohini: [{ roman: 'O', deva: 'ओ' }, { roman: 'Va/Ba', deva: 'वा' }, { roman: 'Vi/Bi', deva: 'वी' }, { roman: 'Vu/Bu', deva: 'वू' }],
  Mrigashira: [{ roman: 'Ve/Be', deva: 'वे' }, { roman: 'Vo/Bo', deva: 'वो' }, { roman: 'Ka', deva: 'का' }, { roman: 'Ki', deva: 'की' }],
  Ardra: [{ roman: 'Ku', deva: 'कु' }, { roman: 'Gha', deva: 'घ' }, { roman: 'Ng', deva: 'ङ' }, { roman: 'Chha', deva: 'छ' }],
  Punarvasu: [{ roman: 'Ke', deva: 'के' }, { roman: 'Ko', deva: 'को' }, { roman: 'Ha', deva: 'हा' }, { roman: 'Hi', deva: 'ही' }],
  Pushya: [{ roman: 'Hu', deva: 'हु' }, { roman: 'He', deva: 'हे' }, { roman: 'Ho', deva: 'हो' }, { roman: 'Da', deva: 'डा' }],
  Ashlesha: [{ roman: 'Dee', deva: 'डी' }, { roman: 'Doo', deva: 'डू' }, { roman: 'De', deva: 'डे' }, { roman: 'Do', deva: 'डो' }],
  Magha: [{ roman: 'Ma', deva: 'मा' }, { roman: 'Mee', deva: 'मी' }, { roman: 'Mu', deva: 'मू' }, { roman: 'Me', deva: 'मे' }],
  'Purva Phalguni': [{ roman: 'Mo', deva: 'मो' }, { roman: 'Ta', deva: 'टा' }, { roman: 'Ti', deva: 'टी' }, { roman: 'Tu', deva: 'टू' }],
  'Uttara Phalguni': [{ roman: 'Te', deva: 'टे' }, { roman: 'To', deva: 'टो' }, { roman: 'Pa', deva: 'पा' }, { roman: 'Pi', deva: 'पी' }],
  Hasta: [{ roman: 'Pu', deva: 'पू' }, { roman: 'Sha', deva: 'ष' }, { roman: 'Na', deva: 'ण' }, { roman: 'Tha', deva: 'ठ' }],
  Chitra: [{ roman: 'Pe', deva: 'पे' }, { roman: 'Po', deva: 'पो' }, { roman: 'Ra', deva: 'रा' }, { roman: 'Ri', deva: 'री' }],
  Swati: [{ roman: 'Ru', deva: 'रू' }, { roman: 'Re', deva: 'रे' }, { roman: 'Ro', deva: 'रो' }, { roman: 'Ta', deva: 'ता' }],
  Vishakha: [{ roman: 'Ti', deva: 'ती' }, { roman: 'Tu', deva: 'तू' }, { roman: 'Te', deva: 'ते' }, { roman: 'To', deva: 'तो' }],
  Anuradha: [{ roman: 'Na', deva: 'ना' }, { roman: 'Ni', deva: 'नी' }, { roman: 'Nu', deva: 'नू' }, { roman: 'Ne', deva: 'ने' }],
  Jyeshtha: [{ roman: 'No', deva: 'नो' }, { roman: 'Ya', deva: 'या' }, { roman: 'Yi', deva: 'यी' }, { roman: 'Yu', deva: 'यू' }],
  Mula: [{ roman: 'Ye', deva: 'ये' }, { roman: 'Yo', deva: 'यो' }, { roman: 'Bha', deva: 'भा' }, { roman: 'Bhi', deva: 'भी' }],
  'Purva Ashadha': [{ roman: 'Bhu', deva: 'भू' }, { roman: 'Dha', deva: 'धा' }, { roman: 'Pha', deva: 'फा' }, { roman: 'Dha', deva: 'ढा' }],
  'Uttara Ashadha': [{ roman: 'Bhe', deva: 'भे' }, { roman: 'Bho', deva: 'भो' }, { roman: 'Ja', deva: 'जा' }, { roman: 'Ji', deva: 'जी' }],
  Shravana: [{ roman: 'Ju/Khi', deva: 'खी' }, { roman: 'Je/Khu', deva: 'खू' }, { roman: 'Jo/Khe', deva: 'खे' }, { roman: 'Gha/Kho', deva: 'खो' }],
  Dhanishtha: [{ roman: 'Ga', deva: 'गा' }, { roman: 'Gi', deva: 'गी' }, { roman: 'Gu', deva: 'गु' }, { roman: 'Ge', deva: 'गे' }],
  Shatabhisha: [{ roman: 'Go', deva: 'गो' }, { roman: 'Sa', deva: 'सा' }, { roman: 'Si', deva: 'सी' }, { roman: 'Su', deva: 'सू' }],
  'Purva Bhadrapada': [{ roman: 'Se', deva: 'से' }, { roman: 'So', deva: 'सो' }, { roman: 'Da', deva: 'दा' }, { roman: 'Di', deva: 'दी' }],
  'Uttara Bhadrapada': [{ roman: 'Du', deva: 'दू' }, { roman: 'Tha', deva: 'थ' }, { roman: 'Jha', deva: 'झ' }, { roman: 'Tra/Da', deva: 'ञ' }],
  Revati: [{ roman: 'De', deva: 'दे' }, { roman: 'Do', deva: 'दो' }, { roman: 'Cha', deva: 'चा' }, { roman: 'Chi', deva: 'ची' }],
};

export type Gender = 'boy' | 'girl';

export interface BabyName {
  /** Lowercased starting syllable token used for matching (e.g. "cha", "va"). */
  start: string;
  name: string;
  deva: string;
  gender: Gender;
  en: string;   // meaning
  hi: string;   // meaning (Hindi)
}

/**
 * Curated bilingual name pool, tagged by starting syllable. Not exhaustive — a
 * quality starter set covering common nakshatra syllables. Names are filtered to
 * the computed pada syllable (with nakshatra-level fallback) on the page.
 */
export const NAME_POOL: BabyName[] = [
  // Cha / Che / Cho
  { start: 'cha', name: 'Chaitanya', deva: 'चैतन्य', gender: 'boy', en: 'Consciousness, awareness', hi: 'चेतना, जागृति' },
  { start: 'cha', name: 'Charvi', deva: 'चार्वी', gender: 'girl', en: 'Beautiful, graceful', hi: 'सुंदर, सुशील' },
  { start: 'che', name: 'Chetan', deva: 'चेतन', gender: 'boy', en: 'Alive, conscious', hi: 'सजीव, सचेत' },
  // La / Lo / Lu / Lee
  { start: 'la', name: 'Lakshya', deva: 'लक्ष्य', gender: 'boy', en: 'Aim, goal', hi: 'लक्ष्य, उद्देश्य' },
  { start: 'la', name: 'Lavanya', deva: 'लावण्य', gender: 'girl', en: 'Grace, beauty', hi: 'सौंदर्य, लालित्य' },
  { start: 'lo', name: 'Lohit', deva: 'लोहित', gender: 'boy', en: 'Radiant red, of Mars', hi: 'लाल, मंगल-वर्ण' },
  // A / Ee / U / Ae (Krittika)
  { start: 'a', name: 'Aarav', deva: 'आरव', gender: 'boy', en: 'Peaceful, melodious', hi: 'शांत, मधुर ध्वनि' },
  { start: 'a', name: 'Anaya', deva: 'अनाया', gender: 'girl', en: 'Caring, without superior', hi: 'देखभाल करने वाली' },
  { start: 'u', name: 'Utkarsh', deva: 'उत्कर्ष', gender: 'boy', en: 'Advancement, excellence', hi: 'उन्नति, उत्कृष्टता' },
  { start: 'u', name: 'Urvi', deva: 'उर्वी', gender: 'girl', en: 'The earth', hi: 'पृथ्वी' },
  // O / Va / Vi / Vu (Rohini)
  { start: 'va', name: 'Varun', deva: 'वरुण', gender: 'boy', en: 'Lord of the waters', hi: 'जल के देवता' },
  { start: 'va', name: 'Vanya', deva: 'वान्या', gender: 'girl', en: 'Of the forest, gracious', hi: 'वन की, कृपालु' },
  { start: 'vi', name: 'Vivaan', deva: 'विवान', gender: 'boy', en: 'Full of life, dawn', hi: 'जीवंत, प्रातःकाल' },
  { start: 'va', name: 'Bhavya', deva: 'भव्य', gender: 'boy', en: 'Grand, splendid', hi: 'भव्य, शानदार' },
  // Ka / Ki / Ku / Ke / Ko
  { start: 'ka', name: 'Kabir', deva: 'कबीर', gender: 'boy', en: 'Great, noble', hi: 'महान, श्रेष्ठ' },
  { start: 'ka', name: 'Kavya', deva: 'काव्य', gender: 'girl', en: 'Poetry', hi: 'काव्य, कविता' },
  { start: 'ki', name: 'Kiaan', deva: 'कियान', gender: 'boy', en: 'Grace of God', hi: 'ईश्वर की कृपा' },
  { start: 'ke', name: 'Keya', deva: 'केया', gender: 'girl', en: 'A monsoon flower', hi: 'केवड़ा पुष्प' },
  { start: 'ku', name: 'Kunal', deva: 'कुणाल', gender: 'boy', en: 'Lotus, son of Ashoka', hi: 'कमल, अशोक-पुत्र' },
  // Ha / Hi / Hu / He / Ho
  { start: 'ha', name: 'Hardik', deva: 'हार्दिक', gender: 'boy', en: 'Heartfelt, sincere', hi: 'हार्दिक, सच्चा' },
  { start: 'ha', name: 'Hasini', deva: 'हसिनी', gender: 'girl', en: 'Cheerful, smiling', hi: 'हँसमुख, प्रसन्न' },
  { start: 'hi', name: 'Hiten', deva: 'हितेन', gender: 'boy', en: 'Well-wisher', hi: 'हितैषी' },
  // Da / Dee / De / Do
  { start: 'da', name: 'Daksh', deva: 'दक्ष', gender: 'boy', en: 'Skilled, capable', hi: 'कुशल, सक्षम' },
  { start: 'de', name: 'Devansh', deva: 'देवांश', gender: 'boy', en: 'Part of the divine', hi: 'ईश्वर का अंश' },
  { start: 'de', name: 'Devika', deva: 'देविका', gender: 'girl', en: 'Little goddess', hi: 'छोटी देवी' },
  { start: 'di', name: 'Divya', deva: 'दिव्या', gender: 'girl', en: 'Divine, brilliant', hi: 'दिव्य, तेजस्वी' },
  // Ma / Mee / Mu / Me / Mo
  { start: 'ma', name: 'Manas', deva: 'मानस', gender: 'boy', en: 'Mind, intellect', hi: 'मन, बुद्धि' },
  { start: 'ma', name: 'Mahika', deva: 'माहिका', gender: 'girl', en: 'The earth, dew', hi: 'पृथ्वी, ओस' },
  { start: 'me', name: 'Mehul', deva: 'मेहुल', gender: 'boy', en: 'Rain cloud', hi: 'बादल, वर्षा' },
  { start: 'mo', name: 'Mohit', deva: 'मोहित', gender: 'boy', en: 'Enchanted, charmed', hi: 'मोहित, आकर्षित' },
  // Ta / Ti / Tu / Te / To
  { start: 'ta', name: 'Tanish', deva: 'तनिष', gender: 'boy', en: 'Ambition, goddess of gold', hi: 'महत्वाकांक्षा' },
  { start: 'ti', name: 'Tisha', deva: 'तिशा', gender: 'girl', en: 'Auspicious, joyful', hi: 'शुभ, आनंदमयी' },
  // Pa / Pi / Pu / Pe / Po
  { start: 'pa', name: 'Parth', deva: 'पार्थ', gender: 'boy', en: 'Arjuna, prince', hi: 'अर्जुन, राजकुमार' },
  { start: 'pa', name: 'Pavni', deva: 'पावनी', gender: 'girl', en: 'Pure, holy', hi: 'पवित्र' },
  { start: 'pu', name: 'Purab', deva: 'पुरब', gender: 'boy', en: 'The east', hi: 'पूर्व दिशा' },
  // Ra / Ri / Ru / Re / Ro
  { start: 'ra', name: 'Raghav', deva: 'राघव', gender: 'boy', en: 'Of Raghu lineage, Rama', hi: 'रघुवंशी, राम' },
  { start: 'ra', name: 'Radhika', deva: 'राधिका', gender: 'girl', en: 'Beloved of Krishna', hi: 'राधा, कृष्ण-प्रिया' },
  { start: 'ri', name: 'Ridhi', deva: 'रिधि', gender: 'girl', en: 'Prosperity', hi: 'समृद्धि' },
  { start: 'ro', name: 'Rohan', deva: 'रोहन', gender: 'boy', en: 'Ascending, blossoming', hi: 'आरोही, विकसित' },
  // Na / Ni / Nu / Ne / No
  { start: 'na', name: 'Naksh', deva: 'नक्ष', gender: 'boy', en: 'Of the stars', hi: 'नक्षत्र संबंधी' },
  { start: 'na', name: 'Navya', deva: 'नव्या', gender: 'girl', en: 'New, youthful', hi: 'नई, युवा' },
  { start: 'ni', name: 'Nitya', deva: 'नित्या', gender: 'girl', en: 'Eternal, constant', hi: 'शाश्वत, सदैव' },
  // Ya / Yi / Yu / Ye / Yo
  { start: 'ya', name: 'Yash', deva: 'यश', gender: 'boy', en: 'Fame, glory', hi: 'कीर्ति, यश' },
  { start: 'ya', name: 'Yashvi', deva: 'यशवी', gender: 'girl', en: 'Glorious, successful', hi: 'यशस्वी, सफल' },
  // Bha / Bhi / Bhu / Bhe / Bho
  { start: 'bha', name: 'Bhavin', deva: 'भाविन', gender: 'boy', en: 'Winner, lively', hi: 'विजयी, जीवंत' },
  { start: 'bhu', name: 'Bhumi', deva: 'भूमि', gender: 'girl', en: 'The earth', hi: 'पृथ्वी' },
  // Ja / Ji / Ju
  { start: 'ja', name: 'Jay', deva: 'जय', gender: 'boy', en: 'Victory', hi: 'विजय' },
  { start: 'ji', name: 'Jiya', deva: 'जिया', gender: 'girl', en: 'Heart, sweetheart', hi: 'हृदय, प्रियतमा' },
  // Ga / Gi / Gu / Ge / Go
  { start: 'ga', name: 'Gaurav', deva: 'गौरव', gender: 'boy', en: 'Pride, honour', hi: 'गौरव, सम्मान' },
  { start: 'gi', name: 'Girish', deva: 'गिरीश', gender: 'boy', en: 'Lord of mountains (Shiva)', hi: 'पर्वतेश्वर (शिव)' },
  { start: 'go', name: 'Gokul', deva: 'गोकुल', gender: 'boy', en: "Krishna's village", hi: 'कृष्ण का गोकुल' },
  // Sa / Si / Su / Se / So
  { start: 'sa', name: 'Samar', deva: 'समर', gender: 'boy', en: 'Battle, the right path', hi: 'युद्ध, सही मार्ग' },
  { start: 'sa', name: 'Saanvi', deva: 'सान्वी', gender: 'girl', en: 'Goddess Lakshmi', hi: 'देवी लक्ष्मी' },
  { start: 'si', name: 'Siya', deva: 'सिया', gender: 'girl', en: 'Goddess Sita', hi: 'देवी सीता' },
  { start: 'su', name: 'Suhana', deva: 'सुहाना', gender: 'girl', en: 'Pleasant, lovely', hi: 'सुहावनी, मनोहर' },
  { start: 'se', name: 'Sevak', deva: 'सेवक', gender: 'boy', en: 'Devoted servant', hi: 'सेवक, भक्त' },
  { start: 'so', name: 'Soham', deva: 'सोहम', gender: 'boy', en: 'I am That (Self)', hi: 'सोऽहम् (आत्मबोध)' },
  // Te / To / Tha / Du
  { start: 'du', name: 'Dhruv', deva: 'ध्रुव', gender: 'boy', en: 'Pole star, steadfast', hi: 'ध्रुव तारा, अटल' },
];

function variants(roman: string): string[] {
  return roman.toLowerCase().split('/').map((s) => s.trim());
}

/** Names whose starting syllable matches one of the given pada syllables. */
export function suggestNames(syllables: PadaSyllable[], gender?: Gender): BabyName[] {
  const tokens = syllables.flatMap((s) => variants(s.roman));
  return NAME_POOL.filter((n) => {
    if (gender && n.gender !== gender) return false;
    return tokens.some((tok) => tok === n.start || tok.startsWith(n.start) || n.start.startsWith(tok));
  });
}

export const BABYNAME_CITATION = 'Namakarana akshara (nakshatra-pada syllables) per classical Vedic tradition; Moon nakshatra-pada from the in-house sidereal (Lahiri) engine.';
