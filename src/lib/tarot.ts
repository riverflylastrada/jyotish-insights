/**
 * Tarot engine — deterministic, no LLM, no network.
 *
 * Full 78-card deck (22 Major Arcana + 56 Minor Arcana). The Majors carry
 * hand-authored bilingual upright/reversed meanings; the Minors are composed from
 * per-suit (element/theme) and per-rank (archetype) bilingual descriptors so every
 * card has a coherent reading without 56 hand-written essays.
 *
 * Draws are SEEDED (date for the daily card; question+date for a spread) via a
 * small PRNG, so the same input always yields the same cards — reproducible and
 * shareable, and avoiding the banned Math.random().
 */

import type { Locale } from '@/lib/i18n/locale';

export interface TarotCard {
  id: string;
  arcana: 'major' | 'minor';
  name: string;
  nameHi: string;
  uprightEn: string;
  uprightHi: string;
  reversedEn: string;
  reversedHi: string;
  keywords: string[];
}

/* ── Major Arcana (22) ── */
const MAJORS: Omit<TarotCard, 'arcana'>[] = [
  { id: 'major-0', name: 'The Fool', nameHi: 'मूर्ख (नवारंभ)', keywords: ['beginnings', 'spontaneity', 'faith'], uprightEn: 'New beginnings, a leap of faith, innocence and unlimited potential. Step forward with an open heart.', uprightHi: 'नई शुरुआत, विश्वास की छलांग, निर्दोषता और असीम संभावनाएँ। खुले मन से आगे बढ़ें।', reversedEn: 'Recklessness, hesitation, or fear of the unknown. Look before you leap.', reversedHi: 'लापरवाही, झिझक या अनजान का भय। छलांग से पहले सोचें।' },
  { id: 'major-1', name: 'The Magician', nameHi: 'जादूगर', keywords: ['will', 'skill', 'manifestation'], uprightEn: 'You have the tools and willpower to manifest your goals. Focused action turns intention into reality.', uprightHi: 'लक्ष्य साकार करने के साधन व इच्छाशक्ति आपके पास हैं। केंद्रित कर्म संकल्प को वास्तविकता बनाता है।', reversedEn: 'Untapped talent, manipulation, or scattered energy. Align your means with honest intent.', reversedHi: 'अप्रयुक्त प्रतिभा, छल या बिखरी ऊर्जा। साधनों को सच्चे उद्देश्य से जोड़ें।' },
  { id: 'major-2', name: 'The High Priestess', nameHi: 'महायाजिका', keywords: ['intuition', 'mystery', 'inner voice'], uprightEn: 'Trust your intuition and inner wisdom. Hidden knowledge is surfacing — listen quietly.', uprightHi: 'अपने अंतर्ज्ञान व आंतरिक ज्ञान पर भरोसा करें। गुप्त ज्ञान उभर रहा है — शांत होकर सुनें।', reversedEn: 'Ignored intuition, secrets, or disconnection from your inner self.', reversedHi: 'उपेक्षित अंतर्ज्ञान, रहस्य या आत्म से विच्छेद।' },
  { id: 'major-3', name: 'The Empress', nameHi: 'साम्राज्ञी', keywords: ['abundance', 'nurture', 'creativity'], uprightEn: 'Abundance, fertility, nurturing and creative flourishing. Beauty and growth surround you.', uprightHi: 'समृद्धि, उर्वरता, पोषण और रचनात्मक विकास। सौंदर्य व वृद्धि आपके चारों ओर।', reversedEn: 'Creative block, dependence, or neglect of self-care.', reversedHi: 'रचनात्मक अवरोध, निर्भरता या आत्म-उपेक्षा।' },
  { id: 'major-4', name: 'The Emperor', nameHi: 'सम्राट', keywords: ['authority', 'structure', 'stability'], uprightEn: 'Authority, structure, discipline and protection. Lead with steady, fatherly command.', uprightHi: 'अधिकार, व्यवस्था, अनुशासन व संरक्षण। स्थिर, पितृवत नेतृत्व करें।', reversedEn: 'Domination, rigidity, or loss of control.', reversedHi: 'दबंगई, कठोरता या नियंत्रण की हानि।' },
  { id: 'major-5', name: 'The Hierophant', nameHi: 'धर्मगुरु', keywords: ['tradition', 'guidance', 'faith'], uprightEn: 'Tradition, spiritual guidance and learning from established wisdom or a mentor.', uprightHi: 'परंपरा, आध्यात्मिक मार्गदर्शन और स्थापित ज्ञान या गुरु से सीख।', reversedEn: 'Rebellion, unconventional paths, or questioning dogma.', reversedHi: 'विद्रोह, अपरंपरागत मार्ग या रूढ़ियों पर प्रश्न।' },
  { id: 'major-6', name: 'The Lovers', nameHi: 'प्रेमी', keywords: ['love', 'union', 'choice'], uprightEn: 'Love, harmony, partnership and a meaningful choice made from the heart and values.', uprightHi: 'प्रेम, सामंजस्य, साझेदारी और हृदय व मूल्यों से लिया गया सार्थक निर्णय।', reversedEn: 'Disharmony, imbalance, or a misaligned choice.', reversedHi: 'असामंजस्य, असंतुलन या गलत चुनाव।' },
  { id: 'major-7', name: 'The Chariot', nameHi: 'रथ', keywords: ['willpower', 'victory', 'control'], uprightEn: 'Determination and self-control carry you to victory. Steer opposing forces toward one goal.', uprightHi: 'दृढ़ संकल्प व आत्म-नियंत्रण आपको विजय दिलाते हैं। विरोधी शक्तियों को एक लक्ष्य की ओर मोड़ें।', reversedEn: 'Lack of direction, scattered effort, or loss of control.', reversedHi: 'दिशाहीनता, बिखरा प्रयास या नियंत्रण की हानि।' },
  { id: 'major-8', name: 'Strength', nameHi: 'शक्ति', keywords: ['courage', 'patience', 'inner strength'], uprightEn: 'Quiet courage, patience and compassion master raw force. Strength is gentle, not harsh.', uprightHi: 'शांत साहस, धैर्य व करुणा कच्ची शक्ति पर विजय पाते हैं। बल कोमल है, कठोर नहीं।', reversedEn: 'Self-doubt, low confidence, or unchecked impulses.', reversedHi: 'आत्म-संदेह, कम आत्मविश्वास या अनियंत्रित आवेग।' },
  { id: 'major-9', name: 'The Hermit', nameHi: 'संन्यासी', keywords: ['introspection', 'solitude', 'guidance'], uprightEn: 'A time for introspection, solitude and seeking inner truth. The answer is within.', uprightHi: 'आत्मनिरीक्षण, एकांत व आंतरिक सत्य की खोज का समय। उत्तर भीतर है।', reversedEn: 'Isolation, withdrawal, or refusing needed guidance.', reversedHi: 'अलगाव, पीछे हटना या आवश्यक मार्गदर्शन से इनकार।' },
  { id: 'major-10', name: 'Wheel of Fortune', nameHi: 'भाग्यचक्र', keywords: ['cycles', 'destiny', 'change'], uprightEn: 'Cycles turn in your favour — destiny, luck and a positive change of fortune.', uprightHi: 'भाग्यचक्र आपके पक्ष में घूम रहा है — नियति, सौभाग्य व अनुकूल परिवर्तन।', reversedEn: 'Bad luck, resistance to change, or a downturn in cycles.', reversedHi: 'दुर्भाग्य, परिवर्तन का प्रतिरोध या चक्र का प्रतिकूल मोड़।' },
  { id: 'major-11', name: 'Justice', nameHi: 'न्याय', keywords: ['fairness', 'truth', 'accountability'], uprightEn: 'Fairness, truth and accountability. Decisions are weighed honestly; cause meets effect.', uprightHi: 'निष्पक्षता, सत्य व उत्तरदायित्व। निर्णय ईमानदारी से तौले जाते हैं; कर्म का फल मिलता है।', reversedEn: 'Injustice, dishonesty, or avoiding responsibility.', reversedHi: 'अन्याय, बेईमानी या उत्तरदायित्व से बचना।' },
  { id: 'major-12', name: 'The Hanged Man', nameHi: 'लटका व्यक्ति', keywords: ['surrender', 'new perspective', 'pause'], uprightEn: 'Surrender, pause and see things from a new angle. Letting go brings insight.', uprightHi: 'समर्पण, ठहराव और नए दृष्टिकोण से देखना। छोड़ देना अंतर्दृष्टि देता है।', reversedEn: 'Stalling, resistance, or needless sacrifice.', reversedHi: 'देरी, प्रतिरोध या व्यर्थ त्याग।' },
  { id: 'major-13', name: 'Death', nameHi: 'मृत्यु (परिवर्तन)', keywords: ['transformation', 'endings', 'renewal'], uprightEn: 'A profound ending makes way for transformation and renewal. Release what is complete.', uprightHi: 'एक गहरा अंत परिवर्तन व नवीनीकरण का मार्ग खोलता है। जो पूर्ण हो चुका, उसे छोड़ें।', reversedEn: 'Resisting change, stagnation, or holding on too long.', reversedHi: 'परिवर्तन का प्रतिरोध, ठहराव या अधिक देर तक पकड़े रहना।' },
  { id: 'major-14', name: 'Temperance', nameHi: 'संयम', keywords: ['balance', 'moderation', 'patience'], uprightEn: 'Balance, moderation and patient blending of opposites. The middle path heals.', uprightHi: 'संतुलन, संयम व विपरीतताओं का धैर्यपूर्ण मेल। मध्यम मार्ग उपचार करता है।', reversedEn: 'Excess, imbalance, or impatience.', reversedHi: 'अति, असंतुलन या अधीरता।' },
  { id: 'major-15', name: 'The Devil', nameHi: 'शैतान (बंधन)', keywords: ['bondage', 'attachment', 'temptation'], uprightEn: 'Bondage to attachment, habit or material craving. See the chains you can choose to drop.', uprightHi: 'आसक्ति, आदत या भौतिक लालसा का बंधन। उन जंजीरों को देखें जिन्हें आप त्याग सकते हैं।', reversedEn: 'Breaking free, releasing addiction, reclaiming power.', reversedHi: 'मुक्ति, व्यसन से छुटकारा, शक्ति की पुनःप्राप्ति।' },
  { id: 'major-16', name: 'The Tower', nameHi: 'मीनार (विध्वंस)', keywords: ['upheaval', 'revelation', 'awakening'], uprightEn: 'Sudden upheaval shatters false structures. Painful, but it clears the way for truth.', uprightHi: 'अचानक उथल-पुथल झूठी संरचनाओं को तोड़ देती है। कष्टकर, पर सत्य का मार्ग खोलती है।', reversedEn: 'Averting disaster, fear of change, or delayed reckoning.', reversedHi: 'संकट टालना, परिवर्तन का भय या स्थगित हिसाब।' },
  { id: 'major-17', name: 'The Star', nameHi: 'तारा (आशा)', keywords: ['hope', 'healing', 'inspiration'], uprightEn: 'Hope, healing and renewed faith after hardship. Inspiration lights your way.', uprightHi: 'कठिनाई के बाद आशा, उपचार व नवजात विश्वास। प्रेरणा आपका मार्ग रोशन करती है।', reversedEn: 'Discouragement, lost faith, or disconnection from hope.', reversedHi: 'निराशा, खोया विश्वास या आशा से विच्छेद।' },
  { id: 'major-18', name: 'The Moon', nameHi: 'चंद्र (भ्रम)', keywords: ['illusion', 'intuition', 'uncertainty'], uprightEn: 'Illusion, uncertainty and deep intuition. Not all is as it seems — trust your instincts.', uprightHi: 'भ्रम, अनिश्चितता व गहन अंतर्ज्ञान। सब वैसा नहीं जैसा दिखता — अपनी सूझ पर भरोसा करें।', reversedEn: 'Confusion lifting, truth revealed, or released fear.', reversedHi: 'भ्रम छँटना, सत्य प्रकट होना या भय से मुक्ति।' },
  { id: 'major-19', name: 'The Sun', nameHi: 'सूर्य (आनंद)', keywords: ['joy', 'success', 'vitality'], uprightEn: 'Joy, success, warmth and vitality. A bright, optimistic time of clarity and achievement.', uprightHi: 'आनंद, सफलता, ऊष्मा व जीवनी-शक्ति। स्पष्टता व उपलब्धि का उज्ज्वल, आशावादी समय।', reversedEn: 'Temporary clouds, low energy, or dimmed optimism.', reversedHi: 'अस्थायी बादल, कम ऊर्जा या मंद आशावाद।' },
  { id: 'major-20', name: 'Judgement', nameHi: 'निर्णय (पुनर्जागरण)', keywords: ['reckoning', 'awakening', 'renewal'], uprightEn: 'A reckoning and awakening — rise renewed, answer a higher calling, forgive the past.', uprightHi: 'हिसाब व जागृति — नवीन होकर उठें, उच्च आह्वान का उत्तर दें, अतीत को क्षमा करें।', reversedEn: 'Self-doubt, avoidance, or refusing the call.', reversedHi: 'आत्म-संदेह, टालमटोल या आह्वान से इनकार।' },
  { id: 'major-21', name: 'The World', nameHi: 'संसार (पूर्णता)', keywords: ['completion', 'fulfilment', 'wholeness'], uprightEn: 'Completion, fulfilment and wholeness. A cycle closes in success — celebrate, then begin anew.', uprightHi: 'पूर्णता, परिपूर्णता व समग्रता। एक चक्र सफलता में पूरा होता है — उत्सव मनाएँ, फिर नई शुरुआत करें।', reversedEn: 'Incompletion, loose ends, or delayed closure.', reversedHi: 'अपूर्णता, अधूरे कार्य या विलंबित समापन।' },
];

/* ── Minor Arcana, composed from suit + rank ── */
interface SuitDef { name: string; nameHi: string; element: string; themeEn: string; themeHi: string; }
const SUITS: SuitDef[] = [
  { name: 'Wands', nameHi: 'दण्ड', element: 'Fire', themeEn: 'energy, ambition, action and inspiration', themeHi: 'ऊर्जा, महत्वाकांक्षा, कर्म व प्रेरणा' },
  { name: 'Cups', nameHi: 'प्याले', element: 'Water', themeEn: 'emotion, love, relationships and intuition', themeHi: 'भावना, प्रेम, संबंध व अंतर्ज्ञान' },
  { name: 'Swords', nameHi: 'तलवार', element: 'Air', themeEn: 'intellect, conflict, truth and communication', themeHi: 'बुद्धि, संघर्ष, सत्य व संवाद' },
  { name: 'Pentacles', nameHi: 'सिक्के', element: 'Earth', themeEn: 'work, money, health and the material world', themeHi: 'कार्य, धन, स्वास्थ्य व भौतिक जगत' },
];

interface RankDef { name: string; nameHi: string; archEn: string; archHi: string; }
const RANKS: RankDef[] = [
  { name: 'Ace', nameHi: 'इक्का', archEn: 'a fresh beginning and pure potential', archHi: 'नई शुरुआत व शुद्ध संभावना' },
  { name: 'Two', nameHi: 'द्वि', archEn: 'choice, balance and partnership', archHi: 'चुनाव, संतुलन व साझेदारी' },
  { name: 'Three', nameHi: 'त्रि', archEn: 'growth, collaboration and first results', archHi: 'वृद्धि, सहयोग व पहले परिणाम' },
  { name: 'Four', nameHi: 'चतुः', archEn: 'stability, rest and consolidation', archHi: 'स्थिरता, विश्राम व सुदृढ़ीकरण' },
  { name: 'Five', nameHi: 'पंच', archEn: 'challenge, loss or conflict to overcome', archHi: 'चुनौती, हानि या संघर्ष जिसे पार करना है' },
  { name: 'Six', nameHi: 'षट्', archEn: 'recovery, harmony and moving forward', archHi: 'पुनरुद्धार, सामंजस्य व आगे बढ़ना' },
  { name: 'Seven', nameHi: 'सप्त', archEn: 'assessment, perseverance and choices', archHi: 'मूल्यांकन, दृढ़ता व विकल्प' },
  { name: 'Eight', nameHi: 'अष्ट', archEn: 'movement, mastery and swift progress', archHi: 'गति, निपुणता व तीव्र प्रगति' },
  { name: 'Nine', nameHi: 'नव', archEn: 'near-completion, resilience and reward', archHi: 'लगभग पूर्णता, सहनशीलता व पुरस्कार' },
  { name: 'Ten', nameHi: 'दश', archEn: 'culmination, fullness and a cycle ending', archHi: 'परिणति, परिपूर्णता व चक्र का अंत' },
  { name: 'Page', nameHi: 'सेवक', archEn: 'a curious student, news and fresh learning', archHi: 'जिज्ञासु शिक्षार्थी, समाचार व नई सीख' },
  { name: 'Knight', nameHi: 'अश्वारोही', archEn: 'bold action and single-minded pursuit', archHi: 'साहसी कर्म व एकाग्र प्रयास' },
  { name: 'Queen', nameHi: 'रानी', archEn: 'mature mastery, nurture and inner authority', archHi: 'परिपक्व निपुणता, पोषण व आंतरिक अधिकार' },
  { name: 'King', nameHi: 'राजा', archEn: 'leadership, command and outward mastery', archHi: 'नेतृत्व, अधिकार व बाह्य निपुणता' },
];

function buildMinors(): Omit<TarotCard, 'arcana'>[] {
  const cards: Omit<TarotCard, 'arcana'>[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `minor-${suit.name.toLowerCase()}-${rank.name.toLowerCase()}`,
        name: `${rank.name} of ${suit.name}`,
        nameHi: `${suit.nameHi} का ${rank.nameHi}`,
        keywords: [suit.element, rank.name],
        uprightEn: `${rank.archEn} in the realm of ${suit.themeEn} (${suit.element}).`,
        uprightHi: `${suit.themeHi} (${suit.element}) के क्षेत्र में ${rank.archHi}।`,
        reversedEn: `Blocked or excessive energy around ${rank.archEn} in ${suit.themeEn}.`,
        reversedHi: `${suit.themeHi} में ${rank.archHi} से जुड़ी अवरुद्ध या अति ऊर्जा।`,
      });
    }
  }
  return cards;
}

export const DECK: TarotCard[] = [
  ...MAJORS.map((c) => ({ ...c, arcana: 'major' as const })),
  ...buildMinors().map((c) => ({ ...c, arcana: 'minor' as const })),
];

/* ── Seeded PRNG + draw ── */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
}

/** Draw `count` distinct cards deterministically from a string seed. */
export function drawCards(seed: string, count: number): DrawnCard[] {
  const rand = mulberry32(hashString(seed));
  const indices = DECK.map((_, i) => i);
  // Fisher–Yates with the seeded PRNG.
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((idx) => ({
    card: DECK[idx],
    reversed: rand() < 0.5,
  }));
}

export function meaning(d: DrawnCard, locale: Locale): string {
  if (locale === 'hi') return d.reversed ? d.card.reversedHi : d.card.uprightHi;
  return d.reversed ? d.card.reversedEn : d.card.uprightEn;
}

export const TAROT_CITATION = 'Rider–Waite–Smith tradition. Draws are seeded by date/question for reproducibility; readings are for reflection, not prediction.';
