/**
 * Lal Kitab house-based remedies (totke / upay) for the D1 Rasi chart.
 *
 * Lal Kitab's defining feature is that a remedy follows the HOUSE a planet
 * occupies (which life-domain it colours), not its classical strength. This
 * 108-cell map gives, for each graha in each bhava, the Lal Kitab effect and
 * the traditional totka(s) to apply.
 *
 * House basis: whole-sign `houseNumber` from the D1 chart (the same basis the
 * rest of the app uses, via `wholeSignHouse`).
 *
 * Source & honesty:
 *  - Every cell is drawn from a single, citable English edition of the corpus:
 *    Lal Kitab — Pt. Radhakrishna Shrimali (Diamond Pocket Books, 2013,
 *    eISBN 978-93-5083-023-9), specifically the nine "<Planet> and the Effect
 *    of the Twelve Houses" chapters.
 *  - `effect` paraphrases that chapter's per-house reading; `remedies` use the
 *    book's house-specific "Remedial Measures" line where it gives one, and the
 *    planet's general remedies (same book) where it does not.
 *  - `citation` is pinned to the chapter + house it was read from. No verse-level
 *    citations are fabricated; no LLM calls — pure static data.
 *  - This content is educational folk astrology, suitable for astrologer review
 *    before being treated as authoritative; the page carries that disclaimer.
 */

import type { Graha, HouseNumber } from './planetInHouse';
import type { DivisionalChart, PlanetName } from './types';

export interface LalKitabEntry {
  /** Brief Lal Kitab effect of this planet in this house. */
  effect: string;
  /** How the planet tends to behave in this bhava per Lal Kitab. */
  nature: 'benefic' | 'malefic' | 'mixed';
  /** The totke / upay — 1–3 short, concrete actions. */
  remedies: string[];
  /** Optional "don't" — Lal Kitab leans heavily on cautions. */
  caution?: string;
  /** Optional Devanagari accent for the headline remedy. */
  deva?: string;
  /** Source chapter + house this entry was read from. */
  citation: string;
  /** Set only if a cell is an extrapolation, not read from the book. */
  unsourced?: true;
}

const BOOK = 'Lal Kitab — Pt. Radhakrishna Shrimali (Diamond Pocket Books, 2013)';
const TITLE: Record<Graha, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter',
  venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};
const ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
  'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];

function cite(g: Graha, h: HouseNumber): string {
  return `${BOOK}, "${TITLE[g]} and the Effect of the Twelve Houses" — ${TITLE[g]} in the ${ORD[h]} House`;
}

/** Per-cell content without the (programmatically pinned) citation. */
type Seed = Omit<LalKitabEntry, 'citation'>;

const SEED: Record<Graha, Record<HouseNumber, Seed>> = {
  sun: {
    1: { nature: 'benefic',
      effect: "Tall, healthy, and intelligent with strong character — high standing in government and self-made wealth.",
      remedies: ["Offer water (arghya) to the rising Sun and start work after a little jaggery and water.", "When the Sun troubles and the 7th house is vacant, an early marriage is advised."],
      caution: "Do not let pride strain ties with your father or with authority." },
    2: { nature: 'mixed',
      effect: "Generous, wealthy, and sweet-tongued with vehicles and rising family fortune; if the Sun sours, quarrels over a woman.",
      remedies: ["Donate coconut, almonds, and oil at a temple."],
      caution: "Do not accept wheat or maize free of cost." },
    3: { nature: 'benefic',
      effect: "Handsome, courageous, and gifted in mathematics and astrology — honour from government and wealth by self-effort.",
      remedies: ["Offer water to the rising Sun and share sweets with younger kin.", "Float a little jaggery in flowing water on Sundays."] },
    4: { nature: 'mixed',
      effect: "A self-charted path, kindness, and king-like comforts won by serving parents; if afflicted, friction with the father.",
      remedies: ["Feed the blind.", "Float jaggery in flowing water."] },
    5: { nature: 'benefic',
      effect: "Superior, subtle intellect and benefit from government; limited male progeny and a sacrificing nature for family.",
      remedies: ["Serve red-faced monkeys."] },
    6: { nature: 'benefic',
      effect: "Lean, quick-tempered, yet victorious over enemies and patient — work steadies after a son's birth.",
      remedies: ["Offer jaggery to monkeys; keep river water and silver at home.", "Donate at temples, and sleep with water kept at the head-side for the father's wellbeing."] },
    7: { nature: 'malefic',
      effect: "Charitable, with a respectable spouse; but the Sun is debilitated here — friction with partner and authority, interest straying to others.",
      remedies: ["Extinguish fire with milk at night.", "Bury a square piece of silver in the ground."],
      caution: "Curb ego with your spouse and in-laws." },
    8: { nature: 'mixed',
      effect: "Handsome and dedicated with strong life-force and long life if the eldest — uniquely, no one dies in their presence.",
      remedies: ["Eat a little jaggery and sip water before starting work.", "Donate 800g wheat and 800g jaggery at a temple for eight days from a Sunday."] },
    9: { nature: 'benefic',
      effect: "Lucky, vehicle-owning, truthful, and optimistic — government service or contracting runs in the family.",
      remedies: ["Do not take white objects; rather donate silver, rice, and milk."] },
    10: { nature: 'benefic',
      effect: "Righteous, courageous, and proud — scriptural knowledge brings a king-like position and fame, with full joy of father and vehicle.",
      remedies: ["Throw a copper coin into running water."],
      caution: "Do not wear black or blue clothes." },
    11: { nature: 'benefic',
      effect: "Fun-loving with beautiful eyes; luck improves through honest, satvik living and respect, honour, and glory follow.",
      remedies: ["Avoid non-vegetarian food, wine, gambling, and quarrels; never lie.", "Free a goat being taken for slaughter."] },
    12: { nature: 'mixed',
      effect: "Sound sleep, a religious mind, and wealth abroad; if an atheist, theft, penalty, and estrangement from the father.",
      remedies: ["Give jaggery to monkeys and observe dharma.", "Never be a false witness; avoid working with a brother-in-law or uncle."] },
  },
  moon: {
    1: { nature: 'benefic',
      effect: "A beautiful face, righteous and kind mind, the mother's deep affection, and foreign travel; moods can swing.",
      remedies: ["Throw a coin into a river or running water; wear silver for progeny.", "Do not drink milk from a glass tumbler; fix copper nails in the bed's four corners."],
      caution: "Marrying before 28 troubles the parents; building a house before 24 brings suffering." },
    2: { nature: 'benefic',
      effect: "Exalted here — a beautiful face, intelligence, property, the mother's blessings, and inherited wealth.",
      remedies: ["Keep silver or rice received from your mother, wrapped in white cloth.", "Donate green cloth to young girls for 43 days."] },
    3: { nature: 'benefic',
      effect: "Learned, pleasant, and devout, fond of scripture and poetry — joy from siblings and mastery of inner powers.",
      remedies: ["On a daughter's birth donate the Moon's objects; on a son's birth donate the Sun's."] },
    4: { nature: 'benefic',
      effect: "In its own bhava — generous, devout, and learned, with a fine home, vehicle, and full family contentment.",
      remedies: ["Offer milk (to flowing water or a deity)."] },
    5: { nature: 'benefic',
      effect: "Kind and judicious with a loyal wife and joy of children (more daughters); luck rises by raising them well.",
      remedies: ["On a Monday, float rice and a sugar cube wrapped in white cloth in running water."] },
    6: { nature: 'malefic',
      effect: "Inauspicious here — illness, intense appetites, humiliation, and loss by theft, with no progeny for the maternal uncle and aunt.",
      remedies: ["Help your father drink water from your hands.", "Set up a water-stand (pyau) for passers-by at a hospital or cremation ground."],
      caution: "Avoid milk after sunset when the Moon is weak." },
    7: { nature: 'benefic',
      effect: "Luck rises through wife and in-laws; soft-spoken and attentive with a good-looking spouse — but often under a woman's control.",
      remedies: ["Do not marry before the age of 24; keep good conduct."] },
    8: { nature: 'malefic',
      effect: "Debilitated here — benefit by marriage or a will, drawn to religion and yoga, but prone to many ailments and worry.",
      remedies: ["Accept rice and silver from your mother and preserve them carefully.", "If Rahu is in the 2nd, bury a bottle full of milk at a remote place."] },
    9: { nature: 'benefic',
      effect: "Devout and well-travelled, devoted to the guru, with comfort of family and vehicle and rising youthful luck.",
      remedies: ["Wear a pearl set in silver and serve your mother and elders.", "Float sugar wrapped in white cloth in running water on Mondays."] },
    10: { nature: 'mixed',
      effect: "Skilled in every trade, contented and successful (business over service); but inauspicious here, with obstacles in study.",
      remedies: ["Do not drink milk at night; donate Jupiter's objects."] },
    11: { nature: 'mixed',
      effect: "Never short of wealth, shrewd and lucky, helped by women and friends — yet inauspicious here, with the mother's health a concern.",
      remedies: ["Wear a pearl set in silver."] },
    12: { nature: 'malefic',
      effect: "Learned and charitable, spending on temples, schools, and the public, with foreign travel; a weak Moon brings eye trouble and needless grief.",
      remedies: ["Start work after sipping a little water.", "Do not let a well or hand-pump come under a roof in your premises."] },
  },
  mars: {
    1: { nature: 'mixed',
      effect: "Brave, energetic, and lion-proud with firm health, long life, and brothers; Manglik — a quick temper can ruin and trouble the spouse.",
      remedies: ["Recite the Hanuman Chalisa and worship Hanuman.", "Draw on the Sun and Moon's remedies; do Venus remedies for the 7th house."],
      caution: "Restrain anger — Mars here is Manglik for marriage." },
    2: { nature: 'mixed',
      effect: "Truthful and bold, earning abroad and prospering by helping brothers, skilled in debate; if weak, harsh speech and wealth lost to litigation.",
      remedies: ["Float rewari and batasha (sweets) in water.", "Grow your wealth by helping brothers and friends."] },
    3: { nature: 'benefic',
      effect: "Renowned, brave, and affluent, rising by hard work with a home full of wealth and ornaments and prosperous brothers.",
      remedies: ["Keep an elephant tusk (not a toy) at home.", "Recite the Hanuman Chalisa."] },
    4: { nature: 'malefic',
      effect: "Debilitated and Manglik — true-hearted but hot and intolerant; destitution can shadow the family and harm mother, mother-in-law, and wife.",
      remedies: ["Serve widowed women; float rewari in water.", "Wear a ring of mixed gold, silver, and copper; float milk-washed rice for 7 Tuesdays."],
      caution: "Manglik — guard the home and the women of the family." },
    5: { nature: 'benefic',
      effect: "Valiant, sharp in argument, and well-travelled — often a lawyer or doctor, famed as judicious; auspicious effects come fivefold.",
      remedies: ["Keep a pot of water by your head at night and pour it on plants and sacred spots in the morning."] },
    6: { nature: 'benefic',
      effect: "Well-built and sharp, a community chief who defeats enemies and regains lost wealth again and again.",
      remedies: ["Donate milk and silver to maids; do not adorn children with gold.", "Do Saturn remedies."] },
    7: { nature: 'malefic',
      effect: "Manglik — skilled and successful (police, surgery), but a hot temperament strikes directly at marriage and the spouse's wellbeing.",
      remedies: ["Offer red clothes to your sister and paternal aunt (bua).", "Keep a solid silver ball; do Saturn remedies."],
      caution: "Manglik — match carefully and cultivate patience in marriage." },
    8: { nature: 'malefic',
      effect: "Manglik — simple, hard-working, and long-lived with prosperity at home; if afflicted, restless conflict and serious ailments.",
      remedies: ["Offer dogs sweet bread cooked on one side only.", "Wear a ring of three metals and a silver chain; float rewari and batasha in water."] },
    9: { nature: 'benefic',
      effect: "Fortune through luck rather than labour, brilliant and judicious, prosperous and popular — luck rises after foreign travel.",
      remedies: ["Keep a red cloth with you; offer vermilion to Hanuman every Tuesday.", "Wear a ruby."] },
    10: { nature: 'benefic',
      effect: "Exalted here — valiant, disciplined, and revered, raising the family name by self-earning, with land, honour, and sons.",
      remedies: ["Revere and worship Hanuman; eat something sweet with meals."] },
    11: { nature: 'benefic',
      effect: "Virtuous, powerful, and rich with high standing; honoured for financial strength, often an engineer or doctor.",
      remedies: ["Offer vermilion to Hanuman; keep a black-and-white dog if you can."] },
    12: { nature: 'mixed',
      effect: "Manglik — bold-voiced, jovial, and well-travelled, famous by 26 and able even with enemies; if weak, harsh speech and injuries.",
      remedies: ["Distribute sweets among friends and laddoo prasad from a Hanuman temple.", "Keep no useless weapon at home; float jaggery in water for twelve days."] },
  },
  mercury: {
    1: { nature: 'benefic',
      effect: "Wipes out the chart's evils — a superior intellect, diplomacy, and many arts, respected and well-travelled.",
      remedies: ["Feed green fodder to a cow; keep your teeth clean and pierce the nose."],
      caution: "Avoid the colour green; do not keep your wife's sister (saali) in the house." },
    2: { nature: 'benefic',
      effect: "Sweet-toothed, a subtle thinker skilled in poetry and numbers — eminent and rich by effort, honoured among scholars.",
      remedies: ["Pierce the nose and keep silver for 96 days; make offerings to maids — and stay cheerful."] },
    3: { nature: 'malefic',
      effect: "Debilitated here — healthy, sharp-memoried, and well-connected, good as a doctor; if weak, rash acts and harm to uncle and siblings.",
      remedies: ["Clean your teeth with alum.", "Keep jaggery and a ruby in red cloth in a cupboard on the western wall, and red Sun-objects on the eastern wall."] },
    4: { nature: 'benefic',
      effect: "Learned, handsome, and persuasive — a raj-yogi with vehicles, servants, and access to high officials, earning by his own effort.",
      remedies: ["Wear a silver chain for peace of mind (a gold chain for riches).", "Apply a saffron tilak or take saffron daily for 43 days."] },
    5: { nature: 'benefic',
      effect: "A shrewd debater and guru-devotee earning by cleverness, drawn to mantra; the first child a daughter, but a son is sure.",
      remedies: ["Wear a copper coin around the neck to grow savings."] },
    6: { nature: 'benefic',
      effect: "Exalted here — confronts and defeats enemies, scholarly and honest, earning through farming, writing, and trade.",
      remedies: ["Hold a flower in your hand before setting out to work.", "Wear a silver ring on the right ring-finger."] },
    7: { nature: 'benefic',
      effect: "Truthful and well-mannered with a beautiful, learned wife from a good family; prospers in trade and a comfortable old age.",
      remedies: ["Serve a black cow."] },
    8: { nature: 'malefic',
      effect: "Disciplined and generous with a gift for justice (a potential judge); if weak, nerve and tongue disease and business losses.",
      remedies: ["Feed dogs 43 low-sugar mawa pedas, or float them in running water.", "Wash a yellow cloth at a river for 43 days; wear silver."] },
    9: { nature: 'mixed',
      effect: "Steeped in religious work, learned and benevolent, serving father and guru; luck rises in later years.",
      remedies: ["Pierce the nose; float yellow-coloured rice in a river for 43 days.", "Apply saffron on the forehead and wear silver."] },
    10: { nature: 'mixed',
      effect: "Good-looking, candid, and satvik, a raj-yogi earning by speech, craft, and writing; if weak, eye disease and ruin through wine.",
      remedies: ["Do Saturn remedies."] },
    11: { nature: 'mixed',
      effect: "Hale, learned, and lucky with great gains from in-laws — even profiting from enemies; if weak, earns by wrong means.",
      remedies: ["Wear a copper coin around the neck; keep a small red iron ball with you."] },
    12: { nature: 'malefic',
      effect: "Debilitated here — smart and promise-keeping with paternal property; if weak, lies, nerve trouble, and loss by over-talking.",
      remedies: ["Pierce the nose and wear a yellow thread; worship Ganesha.", "Float an empty earthen pitcher in water; keep a black-and-white dog."] },
  },
  jupiter: {
    1: { nature: 'benefic',
      effect: "Handsome, learned, and virtuous with king-like respect, higher education, and the joy of illustrious, long-lived sons.",
      remedies: ["Apply a saffron (kesar) tilak and keep the nose clean.", "Water a peepal tree; wear gold; use saffron in food."] },
    2: { nature: 'benefic',
      effect: "Rich, educated, and kind-hearted — a judge-like nature owning land, saving money, with a beautiful, well-spoken wife.",
      remedies: ["Wrap gram dal in yellow cloth and offer it at a temple; offer milk to a snake.", "Serve guests and do charitable work."] },
    3: { nature: 'mixed',
      effect: "Long-lived, brilliant, and determined with a thunderous voice and pilgrimages; if weak, miserliness and defeat by one's own wife.",
      remedies: ["Worship goddess Durga or serve young girls."] },
    4: { nature: 'benefic',
      effect: "Exalted here — illustrious, kind, and respected in government, a family chief leading a life of abundance like Indra.",
      remedies: ["Water a peepal tree; honour elders and teachers at home.", "Apply a saffron tilak and use saffron in food."] },
    5: { nature: 'benefic',
      effect: "Attractive, eminent, and wise — a skilled debater and writer, successful in teaching, with the joy of (often many) sons.",
      remedies: ["Worship Ganesha with devotion; keep a pet dog."] },
    6: { nature: 'malefic',
      effect: "Interest in music and tantra with a beautiful wife and victory over enemies; but inauspicious here — laziness and a domineering spouse.",
      remedies: ["Keep a pet dog and water a peepal tree.", "Offer gram dal at a temple for six days."] },
    7: { nature: 'malefic',
      effect: "Attractive and eloquent, popularising the family, with a virtuous wife — luck rises after marriage; if weak, no honour at home and worry over sons.",
      remedies: ["Worship Lord Shiva.", "For gains, keep seven kinds of gems wrapped in red cloth."] },
    8: { nature: 'mixed',
      effect: "Good-looking and long-lived, desires met and wealth from a will, with divine help in crises and a peaceful end at a pilgrimage.",
      remedies: ["Plant a peepal tree at a cremation ground.", "Offer raw turmeric at a temple for 8 days; donate to saints."] },
    9: { nature: 'benefic',
      effect: "Supreme placement — sagacious, learned, and generous, brightening the family with higher learning, leadership, and inner vision.",
      remedies: ["Visit a temple regularly."] },
    10: { nature: 'mixed',
      effect: "Debilitated here, yet clean-conducted, very rich, and famous — glory exceeding the forefathers; if weak, loss in travel and a short-lived father.",
      remedies: ["Drop a copper coin in running water and keep the nose clean.", "Donate Saturn's objects (almond, coconut, oil, black gram) during a solar eclipse."] },
    11: { nature: 'benefic',
      effect: "Powerful, healthy, and very rich (if not highly schooled), with an outstanding son and society's honour.",
      remedies: ["Donate a kafan (shroud cloth)."] },
    12: { nature: 'benefic',
      effect: "Deeply spiritual — fortune through yoga and charity, founding institutions, with a Lakshmi-like wife and a yogic, peaceful old age.",
      remedies: ["Irrigate a peepal tree; serve sages, Brahmins, and your father.", "Wear gold around the neck and keep the nose clean."] },
  },
  venus: {
    1: { nature: 'mixed',
      effect: "A radiant, long-lived, artistic nature loved by many with the joy of sons; but inauspicious here — wind, bile, and venereal trouble.",
      remedies: ["Do not have intimacy in the daytime; do not eat jaggery.", "Feed grass to a black cow."],
      caution: "Excess and relations with other women ruin this Venus." },
    2: { nature: 'benefic',
      effect: "Rich, refined, and sweet-spoken, honoured like a guru, earning through learning with a full treasury; luck rises after marriage.",
      remedies: ["Colour potatoes with turmeric and feed them to a cow.", "Offer cow's-milk ghee at a temple."] },
    3: { nature: 'benefic',
      effect: "Contented, refined, and fashionable with a loyal, hard-working wife and a happy family.",
      remedies: ["Feed grass to a cow; keep clean and wear clean clothes.", "Wear a diamond set in silver."] },
    4: { nature: 'benefic',
      effect: "Learned and mother-devoted with eminence, education, and a home rich with comforts and gardens; a weak Venus brings money-worry and the wife's ill health.",
      remedies: ["Donate Jupiter's objects or do Jupiter remedies."] },
    5: { nature: 'benefic',
      effect: "Wealthy, learned, and diplomatic with vehicles and the art of pleasure — a sure son and a beautiful, artistic first child.",
      remedies: ["Feed grass to a cow; wear a diamond set in silver.", "Keep clean and wear clean clothes properly."] },
    6: { nature: 'malefic',
      effect: "Debilitated here — born well but, if afflicted, beset by venereal disease, illicit relations, enemies, and ruin.",
      remedies: ["Apply white sandalwood to a stone and immerse it in water on a Friday."] },
    7: { nature: 'benefic',
      effect: "Attractive and pleasure-loving with travel and a chaste, lucky, beautiful wife; if weak, quarrels and even the spouse's death with evil planets.",
      remedies: ["Donate bronze utensils at a temple.", "Feed grass to a red-coloured cow."],
      caution: "Keep faith in marriage." },
    8: { nature: 'mixed',
      effect: "Large-eyed, long-lived, and wealthy, clearing the father's debt with a patient, good-natured wife; if weak, a controlling spouse and strain.",
      remedies: ["Throw a copper coin or flower into a dirty drain.", "Feed wheat-and-jaggery peda to a black cow for eight Fridays."] },
    9: { nature: 'mixed',
      effect: "A holy, kind, and lucky soul devoted to the guru, growing rich yet spending on charity; if weak, marriage is delayed or unconventional.",
      remedies: ["Put honey in a small silver box and bury it in the home's foundation."] },
    10: { nature: 'benefic',
      effect: "Clean-hearted, rich, and influential, earning fame through intelligence and honouring religion with yajna.",
      remedies: ["Do Saturn remedies and donate Saturn-related objects."] },
    11: { nature: 'benefic',
      effect: "Good-looking, capable, and contented with vehicles, land, and servants, earning through arts, pearls, and building.",
      remedies: ["Donate curd and cotton at a temple.", "Float oil in flowing water."] },
    12: { nature: 'benefic',
      effect: "Exalted here — rich and pleasure-loving with a loyal, pleasing wife; if weak, indulgence, debt, and estrangement.",
      remedies: ["Feed grass to a cow and practise moderation.", "Wear a diamond set in silver; keep clean clothes."] },
  },
  saturn: {
    1: { nature: 'malefic',
      effect: "Debilitated here — a serious, solitary leader who earns by confidence; if afflicted, poverty, body-ache, and devastation to the parents' home.",
      remedies: ["Feed gram to monkeys; bury black kajal for favour in business.", "Water a banyan tree's roots with milk and apply a tilak of its soil."] },
    2: { nature: 'benefic',
      effect: "Judicious and wealthy, honoured and prospering abroad (not at home), with paternal property and a turn to dharma.",
      remedies: ["Visit a temple barefoot for 43 consecutive days."] },
    3: { nature: 'benefic',
      effect: "Valiant, reticent, and wise, supporting many and conquering enemies, building fine property — more brothers if Saturn is strong.",
      remedies: ["Fix an iron nail at the threshold of the house.", "Keep your wealth and jewellery in a dark room of the house."] },
    4: { nature: 'malefic',
      effect: "Sincere and patient, earning abroad through employment; but inauspicious here — wind and heart disease, and harm to the mother if one builds a house oneself.",
      remedies: ["Offer milk to a snake; feed crows and buffaloes milk-rice (kheer).", "Donate oil, black gram, and black cloth."] },
    5: { nature: 'malefic',
      effect: "Very religious and long-lived, but Saturn obstructs education and delays children; a self-built house turns ominous.",
      remedies: ["Keep gold, silver, and copper at home.", "Keep moong (green gram) in a dark room of the house."] },
    6: { nature: 'benefic',
      effect: "Healthy, strong, and victorious — a prominent, debate-winning donor honoured even by enemies, with the joy of a son.",
      remedies: ["Look at your reflection in a bowl of oil, then float the oil in water.", "Keep a pet dog for progeny; give milk to a snake."] },
    7: { nature: 'benefic',
      effect: "Exalted here — kind and benevolent with sharp insight, profiting from government work, and a blissful, loving marriage.",
      remedies: ["Feed a black cow.", "If Saturn is asleep (1st house vacant), bury sugar filled in a flute at an isolated spot."] },
    8: { nature: 'malefic',
      effect: "Clever with intricate subjects, living abroad with financial progress after marriage; if weak, skin and eye disease, piles, and few sons.",
      remedies: ["Keep a rectangular piece of silver with you; wear silver."] },
    9: { nature: 'mixed',
      effect: "Kind and noble, doing excellent deeds with a beautiful family and turning to spirituality late in life; if weak, betrayal and a revengeful streak.",
      remedies: ["Do Jupiter remedies or donate Jupiter's objects."] },
    10: { nature: 'benefic',
      effect: "In its significator bhava — valiant, ambitious, and visionary, gaining government rank (even judge-like) and unlimited, hard-built wealth.",
      remedies: ["Float gram-pulse grains in running water for 43 consecutive days."] },
    11: { nature: 'benefic',
      effect: "Stable, healthy, and rich with long life, good friends, and benefit from father, state, and land.",
      remedies: ["Drop a water-thin liquid on the ground each morning for 43 days."] },
    12: { nature: 'mixed',
      effect: "A leader's placement — political standing and ease abroad; but if afflicted, cowardice, poor eyesight, enmity with kin, and even jail.",
      remedies: ["Wrap 12 almonds in black cloth in an iron vessel and keep it in a dark room forever."] },
  },
  rahu: {
    1: { nature: 'malefic',
      effect: "Valiant and ambitious, managing through others' influence with sudden wealth; if afflicted, a cheating, restless mind and harm to wife and progeny.",
      remedies: ["Donate jaggery, wheat, and copper; wear silver around the neck.", "Float a coconut in running water; avoid black and blue clothes."],
      caution: "Avoid intoxicants and shortcuts." },
    2: { nature: 'mixed',
      effect: "Fearless and famous, struggling at home but rich abroad — wealthy as Kuber, yet unable to enjoy it; if weak, dental trouble and loss by embezzlement.",
      remedies: ["Keep a solid silver ball with you.", "Do not accept any electrical goods during or after marriage."] },
    3: { nature: 'benefic',
      effect: "Exalted here — sanctified, industrious, and proud, as strong as a lion, with wealth growing effortlessly, never sonless, never in debt.",
      remedies: ["Wear silver; drown barley equal to your weight in running water.", "Help your siblings."] },
    4: { nature: 'mixed',
      effect: "Courageous and rich abroad with rajyoga, spending on good deeds; but if afflicted, mental worry, an ailing wife, and trouble at the maternal uncle's.",
      remedies: ["Keep an elephant tusk at home (not a toy)."] },
    5: { nature: 'malefic',
      effect: "Compassionate and sharp, gaining through writing and the state, with a late but sure son; if weak, heart or abdominal disease and obstacles to progeny.",
      remedies: ["Keep a small silver elephant at home.", "Put a silver plate under the threshold for the joy of progeny."] },
    6: { nature: 'benefic',
      effect: "Exalted here — unmatched, famous, and long-lived, whose eminence destroys enemies; Rahu protects, with wealth and respect abroad.",
      remedies: ["Offer blue flowers before an idol of Saraswati for six days.", "Keep a pet brown dog; keep a black glass ball or coin with you."] },
    7: { nature: 'malefic',
      effect: "Generally auspicious unless afflicted — favour from government and an early marriage; if weak, a quarrelsome spouse, divorces, and illicit relations.",
      remedies: ["Float a coconut or almond in running water."],
      caution: "Be transparent with your partner." },
    8: { nature: 'malefic',
      effect: "Debilitated here — well-built and healthy with honour from the state once or twice; if afflicted, punishment, prolonged illness, and rarely a male child.",
      remedies: ["Keep a rectangular piece of silver; put a copper coin in the oven.", "Throw a coin into a river for 8 Wednesdays."] },
    9: { nature: 'mixed',
      effect: "Debilitated here — erudite, benevolent, and well-travelled, a town chief with unsullied fame; if weak, irreligion, body-ache, and malice toward the father.",
      remedies: ["Maintain good relations with in-laws; apply a saffron tilak.", "Wear gold; keep a pet dog."] },
    10: { nature: 'benefic',
      effect: "Benevolent and immensely powerful — a great leader or officer with foreign ties; if weak, arrogance and wasted money.",
      remedies: ["Float red lentils (masoor dal) in water."] },
    11: { nature: 'benefic',
      effect: "Learned, reticent, and lucky — a senior officer with servants and fulfilled desires; if afflicted, debt, gambling losses, and trouble with the father.",
      remedies: ["Wrap gram pulse and turmeric in yellow cloth and donate on a Thursday.", "Wear gold; apply a saffron tilak."] },
    12: { nature: 'malefic',
      effect: "Benevolent and ambitious, earning plenty by focusing on one task, with foreign gains and an interest in Vedanta; if weak, debt and defamation.",
      remedies: ["Keep aniseed (saunf) in a red-cloth sachet under your pillow.", "Eat meals in the kitchen; gift a share of earnings to a daughter or sister."] },
  },
  ketu: {
    1: { nature: 'malefic',
      effect: "Property, regal ease, and the joy of a son, with emancipation through meditation; if afflicted, anxiety, confusion, and danger to the wife.",
      remedies: ["Keep a pet dog; wrap white silk thread or silver wire around both big toes.", "Apply a saffron tilak; donate a black-and-white quilt at a temple if a son suffers."] },
    2: { nature: 'mixed',
      effect: "Good-looking and sweet-spoken with great gain of house and money and promotion by transfer; if weak, harsh speech and no son if adulterous.",
      remedies: ["Apply sandalwood paste or a saffron tilak."] },
    3: { nature: 'benefic',
      effect: "Brilliant, virtuous, and long-lived, living abroad with affluence, noble children, and victory in debate.",
      remedies: ["Wear gold around the neck and apply a saffron tilak.", "Float gram pulse, rice, and jaggery in water."] },
    4: { nature: 'malefic',
      effect: "Heroic and prosperous with rajyoga and full family joy; but if afflicted, foul speech, bile and wind trouble, and distance from the mother.",
      remedies: ["Float gram pulse in flowing water; wear silver.", "Keep a pet dog to relieve trouble to progeny."] },
    5: { nature: 'benefic',
      effect: "Exalted here — brave and perceptive with rajyoga and grandsons; if afflicted, hurdles in education, abdominal disease, and friction with a son.",
      remedies: ["Donate milk, rice, and red lentils (masoor)."] },
    6: { nature: 'benefic',
      effect: "Compassionate and famous with a disease-free body and quick recovery, enemies destroyed and desires fulfilled; if weak, dental trouble and enmity with the maternal uncle.",
      remedies: ["Donate a banana at a temple for 43 days; wear gold on the arm.", "Keep a pet dog to free a son from affliction (replace it at once if it dies)."] },
    7: { nature: 'malefic',
      effect: "Mostly inauspicious here — fearless if Ketu is good, but otherwise idle, fearful of enemies and water, separated from the spouse, with intestinal trouble.",
      remedies: ["Keep a pet dog and pierce the ear.", "Apply a saffron tilak."] },
    8: { nature: 'mixed',
      effect: "Hard-working and valiant, profiting through vehicles and the state; if afflicted, falls and injuries, dental disease, and difficulty earning.",
      remedies: ["Pierce the ear and keep gold in it for 96 days.", "Donate a black-and-white quilt at a temple if children suffer; apply a saffron tilak."] },
    9: { nature: 'benefic',
      effect: "Exalted here — valiant and kind, rising by oneself with a sure son and excellent ties to the father, luck growing through travel and charity.",
      remedies: ["Wear gold for joint, spinal, or urinary trouble; worship Ganesha.", "Keep a dog."] },
    10: { nature: 'mixed',
      effect: "Intelligent, famous, and skilled, with luck rising abroad and unmatched influence; if afflicted, instability in work and no joy of mother or progeny.",
      remedies: ["Bury milk and honey in an iron pot in the home's foundation.", "Keep a pet dog after the age of 48."] },
    11: { nature: 'mixed',
      effect: "Attractive, lucky, and generous, well-educated and officer-like with all desires fulfilled; but inauspicious here, with intestine/liver trouble and short joy of the mother.",
      remedies: ["Keep a pet dog.", "Place a white radish by the wife's head at night and donate it at a temple in the morning."] },
    12: { nature: 'benefic',
      effect: "Exalted here — large, beautiful eyes, good education, and king-like affluence, with luck rising after a son's birth and final emancipation.",
      remedies: ["Worship Ganesha; keep a pet dog (replace it at once if it dies)."] },
  },
};

const GRAHAS: Graha[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const HOUSES: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The 108-cell map, with each cell's citation pinned to its source chapter + house. */
export const LAL_KITAB: Record<Graha, Record<HouseNumber, LalKitabEntry>> = (() => {
  const out = {} as Record<Graha, Record<HouseNumber, LalKitabEntry>>;
  for (const g of GRAHAS) {
    out[g] = {} as Record<HouseNumber, LalKitabEntry>;
    for (const h of HOUSES) {
      out[g][h] = { ...SEED[g][h], citation: cite(g, h) };
    }
  }
  return out;
})();

export interface LalKitabPlacement {
  planet: Graha;
  house: HouseNumber;
  entry: LalKitabEntry;
}

const NATURE_ORDER: Record<LalKitabEntry['nature'], number> = { malefic: 0, mixed: 1, benefic: 2 };

function clampHouse(n: number): HouseNumber {
  return Math.min(12, Math.max(1, Math.round(n))) as HouseNumber;
}

/**
 * Map a D1 chart's planet placements to their Lal Kitab remedies, ordered so
 * the most pressing (malefic-nature) placements surface first, then by house.
 * Excludes the ascendant (Lal Kitab remedies are keyed to the nine grahas).
 */
export function selectLalKitab(d1: DivisionalChart): LalKitabPlacement[] {
  return d1.planets
    .filter((p): p is typeof p & { planet: Exclude<PlanetName, 'ascendant'> } => p.planet !== 'ascendant')
    .map((p) => {
      const planet = p.planet as Graha;
      const house = clampHouse(p.houseNumber);
      return { planet, house, entry: LAL_KITAB[planet][house] };
    })
    .sort((a, b) => NATURE_ORDER[a.entry.nature] - NATURE_ORDER[b.entry.nature] || a.house - b.house);
}
