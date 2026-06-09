/**
 * Curated reference data for the 27 nakshatras (lunar mansions).
 *
 * Keyed by the exact English names the calculation engine emits into snapshots
 * (see NAKSHATRA_NAMES in supabase/functions/calculate-kundli/constants.ts). The
 * engine already computes each planet's `nakshatra` + `nakshatraPada`; this file
 * supplies the descriptive layer the reading UI renders.
 *
 * Attributes are drawn from classical Jyotish tradition (Vimshottari lord, deity,
 * symbol, gana, yoni, nadi, guna, element, shakti, zodiac span). Pada placement
 * (the navamsa each quarter falls in and its sub-lord) is COMPUTED deterministically
 * — see padaInfo() — rather than stored, so it is always internally consistent.
 * Prose is original and the tone is descriptive and non-fearful.
 */

export type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
export type Nadi = 'Aadi' | 'Madhya' | 'Antya';
export type Guna = 'Sattva' | 'Rajas' | 'Tamas';

export interface NakshatraInfo {
  /** Must match engine output exactly (the snapshot's `nakshatra` string). */
  name: string;
  /** Devanagari name — render with className="font-deva". */
  deva: string;
  /** Vimshottari dasha lord (ruling planet). */
  lord: string;
  /** Presiding deity. */
  deity: string;
  deityDeva: string;
  /** Traditional symbol. */
  symbol: string;
  gana: Gana;
  /** Animal symbol (yoni) used in compatibility. */
  yoni: string;
  nadi: Nadi;
  /** Predominant guna (mode of nature). */
  guna: Guna;
  /** Predominant tattva (element). */
  element: string;
  /** Sanskrit name of the nakshatra's shakti (its defining power). */
  shaktiName: string;
  /** Plain-language description of that power. */
  shakti: string;
  /** Life domains the nakshatra classically favours. */
  career: string[];
  /** Sidereal zodiac span (display only). */
  range: string;
  /** 1–2 sentence characterization of the birth star. */
  traits: string;
  strengths: string[];
  challenges: string[];
}

export const NAKSHATRA_INFO: Record<string, NakshatraInfo> = {
  Ashwini: {
    name: 'Ashwini', deva: 'अश्विनी', lord: 'Ketu',
    deity: 'Ashwini Kumaras', deityDeva: 'अश्विनी कुमार', symbol: "Horse's head",
    gana: 'Deva', yoni: 'Horse', nadi: 'Aadi', guna: 'Sattva', element: 'Earth',
    shaktiName: 'Shidhravyapani', shakti: 'the power to swiftly reach a goal and to heal',
    career: ['Healing & medicine', 'Athletics & racing', 'Transport & travel', 'Pioneering ventures'],
    range: '0°00′–13°20′ Mesha',
    traits: 'The star of the celestial physicians — pioneering, quick and youthful. A drive to initiate, heal and move first.',
    strengths: ['Initiative', 'Speed', 'Healing instinct'],
    challenges: ['Impatience', 'Restlessness'],
  },
  Bharani: {
    name: 'Bharani', deva: 'भरणी', lord: 'Venus',
    deity: 'Yama', deityDeva: 'यम', symbol: 'Yoni (womb)',
    gana: 'Manushya', yoni: 'Elephant', nadi: 'Madhya', guna: 'Rajas', element: 'Earth',
    shaktiName: 'Apabharani', shakti: 'the power to carry away and to cleanse',
    career: ['Birth & end-of-life work', 'Creative & performing arts', 'Entertainment', 'Disciplined craft'],
    range: '13°20′–26°40′ Mesha',
    traits: 'The star of restraint and transformation — creative and determined, it carries things through to completion and learns discipline along the way.',
    strengths: ['Endurance', 'Creativity', 'Willpower'],
    challenges: ['Extremes', 'Stubbornness'],
  },
  Krittika: {
    name: 'Krittika', deva: 'कृत्तिका', lord: 'Sun',
    deity: 'Agni', deityDeva: 'अग्नि', symbol: 'Razor / flame',
    gana: 'Rakshasa', yoni: 'Sheep', nadi: 'Antya', guna: 'Rajas', element: 'Earth',
    shaktiName: 'Dahana', shakti: 'the power to burn away impurity and purify',
    career: ['Critique & editing', 'Fire & cutting trades (chefs, surgeons, metalwork)', 'Teaching', 'Leadership & defence'],
    range: '26°40′ Mesha – 10°00′ Vrishabha',
    traits: 'The star of fire — sharp, purifying and ambitious. It cuts away the impure with focus and protective courage.',
    strengths: ['Focus', 'Courage', 'Drive'],
    challenges: ['Sharp temper', 'Over-criticism'],
  },
  Rohini: {
    name: 'Rohini', deva: 'रोहिणी', lord: 'Moon',
    deity: 'Brahma', deityDeva: 'ब्रह्मा', symbol: 'Chariot / ox-cart',
    gana: 'Manushya', yoni: 'Serpent', nadi: 'Antya', guna: 'Rajas', element: 'Earth',
    shaktiName: 'Rohana', shakti: 'the power to make things grow',
    career: ['Agriculture & food', 'Arts, fashion & beauty', 'Finance & banking', 'Luxury & hospitality'],
    range: '10°00′–23°20′ Vrishabha',
    traits: "The Moon's favourite — magnetic, fertile and artistic. A star of growth, beauty and material abundance.",
    strengths: ['Charm', 'Creativity', 'Material ease'],
    challenges: ['Possessiveness', 'Indulgence'],
  },
  Mrigashira: {
    name: 'Mrigashira', deva: 'मृगशिरा', lord: 'Mars',
    deity: 'Soma', deityDeva: 'सोम', symbol: "Deer's head",
    gana: 'Deva', yoni: 'Serpent', nadi: 'Madhya', guna: 'Tamas', element: 'Earth',
    shaktiName: 'Prinana', shakti: 'the power to give fulfilment',
    career: ['Writing & music', 'Research & exploration', 'Sales & marketing', 'Travel & design'],
    range: '23°20′ Vrishabha – 6°40′ Mithuna',
    traits: 'The searching star — gentle, curious and forever questing. An inquisitive seeker, sensitive and adaptable.',
    strengths: ['Curiosity', 'Gentleness', 'Adaptability'],
    challenges: ['Restlessness', 'Indecision'],
  },
  Ardra: {
    name: 'Ardra', deva: 'आर्द्रा', lord: 'Rahu',
    deity: 'Rudra', deityDeva: 'रुद्र', symbol: 'Teardrop / diamond',
    gana: 'Manushya', yoni: 'Dog', nadi: 'Aadi', guna: 'Tamas', element: 'Water',
    shaktiName: 'Yatna', shakti: 'the power to make effort toward a goal',
    career: ['Science & research', 'Electronics & IT', 'Pharmacology & chemistry', 'Investigation'],
    range: '6°40′–20°00′ Mithuna',
    traits: 'The storm star — emotional depth and intensity that clears the old to renew. Transformation through feeling.',
    strengths: ['Insight', 'Resolve', 'Capacity to transform'],
    challenges: ['Turbulence', 'Moodiness'],
  },
  Punarvasu: {
    name: 'Punarvasu', deva: 'पुनर्वसु', lord: 'Jupiter',
    deity: 'Aditi', deityDeva: 'अदिति', symbol: 'Bow & quiver',
    gana: 'Deva', yoni: 'Cat', nadi: 'Aadi', guna: 'Sattva', element: 'Water',
    shaktiName: 'Vasutva-prapana', shakti: 'the power to gain substance and renewal',
    career: ['Teaching & philosophy', 'Travel & hospitality', 'Publishing & writing', 'Home & construction'],
    range: '20°00′ Mithuna – 3°20′ Karka',
    traits: 'The star of return and renewal — optimistic and generous, a spirit that recovers and begins again with grace.',
    strengths: ['Resilience', 'Wisdom', 'Generosity'],
    challenges: ['Repetition', 'Scattered focus'],
  },
  Pushya: {
    name: 'Pushya', deva: 'पुष्य', lord: 'Saturn',
    deity: 'Brihaspati', deityDeva: 'बृहस्पति', symbol: "Cow's udder / lotus",
    gana: 'Deva', yoni: 'Sheep', nadi: 'Madhya', guna: 'Tamas', element: 'Water',
    shaktiName: 'Brahmavarchasa', shakti: 'the power to nourish spiritual energy',
    career: ['Nurturing & care professions', 'Food & dairy', 'Counselling & clergy', 'Public administration'],
    range: '3°20′–16°40′ Karka',
    traits: 'Among the most auspicious stars — nourishing, dutiful and spiritually inclined. A nature that supports and sustains.',
    strengths: ['Nurturing', 'Loyalty', 'Steadiness'],
    challenges: ['Rigidity', 'Over-caution'],
  },
  Ashlesha: {
    name: 'Ashlesha', deva: 'आश्लेषा', lord: 'Mercury',
    deity: 'Nagas', deityDeva: 'नाग', symbol: 'Coiled serpent',
    gana: 'Rakshasa', yoni: 'Cat', nadi: 'Antya', guna: 'Sattva', element: 'Water',
    shaktiName: 'Visasleshana', shakti: 'the power to penetrate, and to handle poison',
    career: ['Psychology & strategy', 'Chemistry & pharmacology', 'Research & intelligence', 'Negotiation'],
    range: '16°40′–30°00′ Karka',
    traits: 'The embracing star — penetrating, intuitive and hypnotic. The wisdom of the serpent, deep and focused.',
    strengths: ['Intuition', 'Cleverness', 'Concentration'],
    challenges: ['Secretiveness', 'Entanglement'],
  },
  Magha: {
    name: 'Magha', deva: 'मघा', lord: 'Ketu',
    deity: 'Pitris', deityDeva: 'पितृ', symbol: 'Royal throne',
    gana: 'Rakshasa', yoni: 'Rat', nadi: 'Antya', guna: 'Tamas', element: 'Water',
    shaktiName: 'Tyaga', shakti: 'the power to honour the ancestors and leave the body',
    career: ['Leadership & administration', 'Law & governance', 'Heritage, history & archaeology', 'Ceremony & ritual'],
    range: '0°00′–13°20′ Simha',
    traits: 'The throne star — regal and proud, it honours ancestry and tradition and carries a natural sense of dignity.',
    strengths: ['Leadership', 'Dignity', 'Loyalty to roots'],
    challenges: ['Pride', 'Attachment to status'],
  },
  'Purva Phalguni': {
    name: 'Purva Phalguni', deva: 'पूर्व फाल्गुनी', lord: 'Venus',
    deity: 'Bhaga', deityDeva: 'भग', symbol: 'Front legs of a bed',
    gana: 'Manushya', yoni: 'Rat', nadi: 'Madhya', guna: 'Rajas', element: 'Water',
    shaktiName: 'Prajanana', shakti: 'the power of procreation and creativity',
    career: ['Creative & performing arts', 'Entertainment & hospitality', 'Beauty & fashion', 'Counselling'],
    range: '13°20′–26°40′ Simha',
    traits: 'The star of pleasure and rest — warm, creative and sociable, drawn to enjoyment, relaxation and the good things in life.',
    strengths: ['Charm', 'Creativity', 'Warmth'],
    challenges: ['Indulgence', 'Vanity'],
  },
  'Uttara Phalguni': {
    name: 'Uttara Phalguni', deva: 'उत्तर फाल्गुनी', lord: 'Sun',
    deity: 'Aryaman', deityDeva: 'अर्यमा', symbol: 'Back legs of a bed',
    gana: 'Manushya', yoni: 'Cow', nadi: 'Aadi', guna: 'Rajas', element: 'Fire',
    shaktiName: 'Chayani', shakti: 'the power to accumulate prosperity through union',
    career: ['Leadership & management', 'Charity & social work', 'Teaching & advising', 'Diplomacy'],
    range: '26°40′ Simha – 10°00′ Kanya',
    traits: 'The star of patronage and friendship — generous, reliable and helpful, a dependable partner and ally.',
    strengths: ['Generosity', 'Dependability', 'Kindness'],
    challenges: ['Pride', 'Need for approval'],
  },
  Hasta: {
    name: 'Hasta', deva: 'हस्त', lord: 'Moon',
    deity: 'Savitar', deityDeva: 'सवितृ', symbol: 'Hand / fist',
    gana: 'Deva', yoni: 'Buffalo', nadi: 'Aadi', guna: 'Rajas', element: 'Fire',
    shaktiName: 'Hasta-sthapana', shakti: 'the power to place what one seeks into one’s own hands',
    career: ['Crafts & skilled handwork', 'Trade & business', 'Manual therapy & healing', 'Writing & comedy'],
    range: '10°00′–23°20′ Kanya',
    traits: 'The star of the hand — skilful, clever and resourceful. Real power lies in craft and dexterity.',
    strengths: ['Skill', 'Wit', 'Resourcefulness'],
    challenges: ['Restlessness', 'Manipulation'],
  },
  Chitra: {
    name: 'Chitra', deva: 'चित्रा', lord: 'Mars',
    deity: 'Tvashtar', deityDeva: 'त्वष्टा', symbol: 'Bright jewel / pearl',
    gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Madhya', guna: 'Tamas', element: 'Fire',
    shaktiName: 'Punya-chayani', shakti: 'the power to accumulate merit through good work',
    career: ['Design & architecture', 'Arts & fashion', 'Engineering & crafts', 'Media & advertising'],
    range: '23°20′ Kanya – 6°40′ Tula',
    traits: 'The star of the celestial architect — artistic, charismatic and a maker of beautiful things. Brilliance and design.',
    strengths: ['Creativity', 'Charisma', 'Craftsmanship'],
    challenges: ['Vanity', 'Self-display'],
  },
  Swati: {
    name: 'Swati', deva: 'स्वाति', lord: 'Rahu',
    deity: 'Vayu', deityDeva: 'वायु', symbol: 'Young shoot in the wind',
    gana: 'Deva', yoni: 'Buffalo', nadi: 'Antya', guna: 'Rajas', element: 'Fire',
    shaktiName: 'Pradhvamsa', shakti: 'the power to scatter and disperse like wind',
    career: ['Business & trade', 'Diplomacy & law', 'Aviation & travel', 'Independent enterprise'],
    range: '6°40′–20°00′ Tula',
    traits: 'The independent star — self-reliant, flexible and diplomatic. Like a reed in the wind, it bends without breaking.',
    strengths: ['Independence', 'Adaptability', 'Balance'],
    challenges: ['Restlessness', 'Indecision'],
  },
  Vishakha: {
    name: 'Vishakha', deva: 'विशाखा', lord: 'Jupiter',
    deity: 'Indra-Agni', deityDeva: 'इन्द्राग्नि', symbol: 'Triumphal archway',
    gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Antya', guna: 'Sattva', element: 'Fire',
    shaktiName: 'Vyapana', shakti: 'the power to achieve many and varied fruits',
    career: ['Goal-driven enterprise', 'Politics & leadership', 'Focused research', 'Sport'],
    range: '20°00′ Tula – 3°20′ Vrischika',
    traits: 'The star of purpose and triumph — goal-driven and determined, it reaches its aims through focused, sustained effort.',
    strengths: ['Ambition', 'Determination', 'Focus'],
    challenges: ['Impatience', 'Single-mindedness'],
  },
  Anuradha: {
    name: 'Anuradha', deva: 'अनुराधा', lord: 'Saturn',
    deity: 'Mitra', deityDeva: 'मित्र', symbol: 'Lotus',
    gana: 'Deva', yoni: 'Deer', nadi: 'Madhya', guna: 'Tamas', element: 'Fire',
    shaktiName: 'Radhana', shakti: 'the power of worship and devotion',
    career: ['Organisation & management', 'Research & occult study', 'Group & international work', 'Counselling'],
    range: '3°20′–16°40′ Vrischika',
    traits: 'The star of friendship and devotion — loyal and cooperative, it thrives through relationships and steady discipline.',
    strengths: ['Loyalty', 'Friendship', 'Perseverance'],
    challenges: ['Melancholy', 'Dependency'],
  },
  Jyeshtha: {
    name: 'Jyeshtha', deva: 'ज्येष्ठा', lord: 'Mercury',
    deity: 'Indra', deityDeva: 'इन्द्र', symbol: 'Circular amulet / umbrella',
    gana: 'Rakshasa', yoni: 'Deer', nadi: 'Aadi', guna: 'Sattva', element: 'Air',
    shaktiName: 'Arohana', shakti: 'the power to rise and prevail',
    career: ['Administration & policing', 'Media & broadcasting', 'Occult & research', 'Protective services'],
    range: '16°40′–30°00′ Vrischika',
    traits: 'The senior star — brave and responsible, a protector who naturally carries authority and looks after others.',
    strengths: ['Courage', 'Responsibility', 'Leadership'],
    challenges: ['Secrecy', 'Isolation'],
  },
  Mula: {
    name: 'Mula', deva: 'मूल', lord: 'Ketu',
    deity: 'Nirriti', deityDeva: 'निरृति', symbol: 'Bundle of roots',
    gana: 'Rakshasa', yoni: 'Dog', nadi: 'Aadi', guna: 'Tamas', element: 'Air',
    shaktiName: 'Barhana', shakti: 'the power to break things apart and reach the root',
    career: ['Research & investigation', 'Medicine & herbs', 'Philosophy & the occult', 'Reform & overhaul'],
    range: '0°00′–13°20′ Dhanu',
    traits: 'The root star — it goes straight to the heart of things. Investigative, intense and transformative, it seeks the truth beneath.',
    strengths: ['Depth', 'Honesty', 'Research instinct'],
    challenges: ['Bluntness', 'Upheaval'],
  },
  'Purva Ashadha': {
    name: 'Purva Ashadha', deva: 'पूर्वाषाढ़ा', lord: 'Venus',
    deity: 'Apas', deityDeva: 'आप', symbol: 'Fan / winnowing basket',
    gana: 'Manushya', yoni: 'Monkey', nadi: 'Madhya', guna: 'Rajas', element: 'Air',
    shaktiName: 'Varchograhana', shakti: 'the power of invigoration',
    career: ['Inspiration & motivation', 'Water & maritime work', 'Arts & entertainment', 'Debate & influence'],
    range: '13°20′–26°40′ Dhanu',
    traits: 'The invincible star — optimistic and persuasive, hard to defeat. It carries an unshakeable confidence and influence.',
    strengths: ['Optimism', 'Persuasion', 'Resilience'],
    challenges: ['Pride', 'Stubbornness'],
  },
  'Uttara Ashadha': {
    name: 'Uttara Ashadha', deva: 'उत्तराषाढ़ा', lord: 'Sun',
    deity: 'Vishwadevas', deityDeva: 'विश्वेदेवा', symbol: 'Elephant tusk',
    gana: 'Manushya', yoni: 'Mongoose', nadi: 'Antya', guna: 'Sattva', element: 'Air',
    shaktiName: 'Apradhrishya', shakti: 'the power of unchallengeable victory',
    career: ['Leadership & governance', 'Law & ethics', 'Pioneering & exploration', 'Teaching'],
    range: '26°40′ Dhanu – 10°00′ Makara',
    traits: 'The star of lasting victory — principled and persevering, it achieves enduring success built on integrity.',
    strengths: ['Integrity', 'Perseverance', 'Leadership'],
    challenges: ['Over-seriousness', 'Inflexibility'],
  },
  Shravana: {
    name: 'Shravana', deva: 'श्रवण', lord: 'Moon',
    deity: 'Vishnu', deityDeva: 'विष्णु', symbol: 'Ear / three footprints',
    gana: 'Deva', yoni: 'Monkey', nadi: 'Antya', guna: 'Rajas', element: 'Air',
    shaktiName: 'Samhanana', shakti: 'the power to connect and bind things together',
    career: ['Teaching & languages', 'Media & communication', 'Counselling', 'Knowledge & tradition'],
    range: '10°00′–23°20′ Makara',
    traits: 'The star of listening and learning — receptive and wise, it connects people through knowledge and careful attention.',
    strengths: ['Wisdom', 'Listening', 'Connection'],
    challenges: ['Over-sensitivity', 'Gossip'],
  },
  Dhanishtha: {
    name: 'Dhanishtha', deva: 'धनिष्ठा', lord: 'Mars',
    deity: 'Vasus', deityDeva: 'वसु', symbol: 'Drum (damaru)',
    gana: 'Rakshasa', yoni: 'Lion', nadi: 'Madhya', guna: 'Tamas', element: 'Ether',
    shaktiName: 'Khyapayitri', shakti: 'the power to give fame and abundance',
    career: ['Music & performance', 'Real estate & wealth', 'Sport', 'Group leadership'],
    range: '23°20′ Makara – 6°40′ Kumbha',
    traits: 'The star of rhythm and wealth — musical, prosperous and energetic, it marches to its own beat.',
    strengths: ['Talent', 'Prosperity', 'Vitality'],
    challenges: ['Restlessness', 'Materialism'],
  },
  Shatabhisha: {
    name: 'Shatabhisha', deva: 'शतभिषा', lord: 'Rahu',
    deity: 'Varuna', deityDeva: 'वरुण', symbol: 'Empty circle / 100 stars',
    gana: 'Rakshasa', yoni: 'Horse', nadi: 'Aadi', guna: 'Tamas', element: 'Ether',
    shaktiName: 'Bheshaja', shakti: 'the power of healing',
    career: ['Healing & medicine', 'Technology & electronics', 'Research, astronomy & astrology', 'Solitary or mystical work'],
    range: '6°40′–20°00′ Kumbha',
    traits: 'The star of a hundred healers — reclusive, scientific and mystical. A nature drawn to healing, research and mystery.',
    strengths: ['Insight', 'Healing', 'Independence'],
    challenges: ['Reclusiveness', 'Secrecy'],
  },
  'Purva Bhadrapada': {
    name: 'Purva Bhadrapada', deva: 'पूर्व भाद्रपदा', lord: 'Jupiter',
    deity: 'Aja Ekapada', deityDeva: 'अज एकपाद', symbol: 'Front of a funeral cot',
    gana: 'Manushya', yoni: 'Lion', nadi: 'Aadi', guna: 'Sattva', element: 'Ether',
    shaktiName: 'Yajamana-udyamana', shakti: 'the power to raise one’s spiritual fire',
    career: ['Research & technology', 'Occult & ascetic practice', 'Medicine & funerary work', 'Reform'],
    range: '20°00′ Kumbha – 3°20′ Meena',
    traits: 'The star of fire and vision — idealistic and intense, devoted to a higher purpose with unusual depth.',
    strengths: ['Idealism', 'Devotion', 'Depth'],
    challenges: ['Intensity', 'Anxiety'],
  },
  'Uttara Bhadrapada': {
    name: 'Uttara Bhadrapada', deva: 'उत्तर भाद्रपदा', lord: 'Saturn',
    deity: 'Ahir Budhnya', deityDeva: 'अहिर्बुध्न्य', symbol: 'Back of a funeral cot',
    gana: 'Manushya', yoni: 'Cow', nadi: 'Madhya', guna: 'Tamas', element: 'Ether',
    shaktiName: 'Varshodyamana', shakti: 'the power to bring rain and steady growth',
    career: ['Counselling & teaching', 'Research & the occult', 'Charity & welfare', 'Writing & the arts'],
    range: '3°20′–16°40′ Meena',
    traits: 'The star of depth and calm — wise, patient and compassionate, like deep still waters that run quiet and strong.',
    strengths: ['Wisdom', 'Patience', 'Compassion'],
    challenges: ['Withdrawal', 'Inertia'],
  },
  Revati: {
    name: 'Revati', deva: 'रेवती', lord: 'Mercury',
    deity: 'Pushan', deityDeva: 'पूषन्', symbol: 'Fish',
    gana: 'Deva', yoni: 'Elephant', nadi: 'Antya', guna: 'Sattva', element: 'Ether',
    shaktiName: 'Kshiradyapani', shakti: 'the power to nourish, as milk nourishes',
    career: ['Travel & transport', 'Arts & music', 'Care & hospitality', 'Spiritual & charitable work'],
    range: '16°40′–30°00′ Meena',
    traits: 'The final star — kind and protective, it guides others safely home. A nourishing, creative and gentle spirit.',
    strengths: ['Kindness', 'Protectiveness', 'Creativity'],
    challenges: ['Over-giving', 'Sensitivity'],
  },
};

/** Canonical nakshatra order (matches the engine's NAKSHATRA_NAMES). */
export const NAKSHATRA_ORDER: string[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
  'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

/** Lookup with graceful miss (engine name should always resolve). */
export function nakshatraInfo(name: string): NakshatraInfo | undefined {
  return NAKSHATRA_INFO[name];
}

// ─── Pada (navamsa) computation ─────────────────────────────────────────────
// Each pada is a quarter of a nakshatra (3°20′) and equals exactly one navamsa.
// Across the zodiac the 108 padas run through the navamsa signs in unbroken
// order, starting Ashwini pada 1 = Mesha. So a pada's navamsa sign, its lord and
// what it emphasises are fully determined by the (nakshatra, pada) pair.

const NAVAMSA_SIGNS = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];
const NAVAMSA_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];
const NAVAMSA_EMPHASIS = [
  'drive, initiative and pioneering action',          // Mesha
  'stability, resources and sensual grounding',       // Vrishabha
  'communication, wit and versatility',               // Mithuna
  'emotion, nurturing, home and roots',               // Karka
  'self-expression, pride and leadership',            // Simha
  'analysis, service and refinement of detail',       // Kanya
  'relationship, balance and aesthetics',             // Tula
  'intensity, depth and transformation',              // Vrischika
  'faith, ethics and expansion',                      // Dhanu
  'ambition, structure and material discipline',      // Makara
  'vision, detachment and the collective',            // Kumbha
  'compassion, imagination and spiritual surrender',  // Meena
];

export interface PadaInfo {
  pada: 1 | 2 | 3 | 4;
  /** Navamsa sign this quarter falls in. */
  navamsaSign: string;
  /** Lord of that navamsa sign (the pada's sub-ruler). */
  lord: string;
  /** What that navamsa emphasises in the native's expression. */
  emphasis: string;
}

/** Navamsa placement of a given pada — computed, always internally consistent. */
export function padaInfo(nakshatraName: string, pada: 1 | 2 | 3 | 4): PadaInfo | undefined {
  const nIdx = NAKSHATRA_ORDER.indexOf(nakshatraName);
  if (nIdx < 0 || pada < 1 || pada > 4) return undefined;
  const signIdx = (nIdx * 4 + (pada - 1)) % 12;
  return {
    pada,
    navamsaSign: NAVAMSA_SIGNS[signIdx],
    lord: NAVAMSA_LORDS[signIdx],
    emphasis: NAVAMSA_EMPHASIS[signIdx],
  };
}
