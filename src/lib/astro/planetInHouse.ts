/**
 * Deterministic 108-entry planet-in-house interpretation database (D1 Rasi chart).
 *
 * Sources:
 *  - BPHS = Brihat Parashara Hora Shastra, Ch. 24 "Effects of Planets in Houses"
 *    (Santhanam translation, Ranjan Publications)
 *  - Saravali = Saravali by Kalyana Varma
 *    (B. Suryanarayana Rao translation)
 *  - Phaladeepika = Phaladeepika by Mantreswara
 *    (G.S. Kapoor translation, Ranjan Publications)
 *
 * NOTE: No LLM calls. This is pure static data transcribed from cited texts.
 */

export type Graha = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu';
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface PlanetInHouseEntry {
  brief: string;
  full: string;
  citation: string;
  keywords: string[];
  unsourced?: true;
}

export const PLANET_IN_HOUSE: Record<Graha, Record<HouseNumber, PlanetInHouseEntry>> = {
  sun: {
    1: {
      brief: 'The native is valorous, of bilious constitution, and possesses a lean body with scanty hair.',
      full: 'Sun in the 1st house makes one courageous, irascible, lazy, and cruel in disposition. The body is lean and spare, the eyes are afflicted, and the native attains distinction among his kinsmen. He gains royal favour but is restless in temperament.',
      citation: 'BPHS Ch. 24, śl. 2–3',
      keywords: ['valour', 'constitution', 'royalty', 'temperament'],
    },
    2: {
      brief: 'The native is deprived of learning and wealth, afflicted in speech, and suffers from diseases of the face.',
      full: 'Sun in the 2nd house causes loss of family wealth, lack of education, stammering or harsh speech, and diseases of the mouth or eyes. The native may face humiliation from the ruling authority and has a bilious constitution.',
      citation: 'BPHS Ch. 24, śl. 4–5',
      keywords: ['wealth-loss', 'speech', 'eyes', 'family'],
    },
    3: {
      brief: 'The native is brave, powerful, wealthy, and generous but inimical to his brothers.',
      full: 'Sun in the 3rd house makes the native strong and courageous, endowed with good health, liberal-minded, and possessed of servants. However, he is hostile towards his brothers and may cause their downfall. He achieves success through his own efforts.',
      citation: 'BPHS Ch. 24, śl. 6',
      keywords: ['valour', 'brothers', 'effort', 'generosity'],
    },
    4: {
      brief: 'The native is devoid of happiness, lands, friends, and conveyances.',
      full: 'Sun in the 4th house deprives the native of domestic comfort, ancestral property, and conveyances. The heart is troubled, the mother may suffer, and there is scarcity of happiness in the place of residence. The native is frequently changing his dwelling.',
      citation: 'BPHS Ch. 24, śl. 7',
      keywords: ['happiness', 'property', 'mother', 'home'],
    },
    5: {
      brief: 'The native is bereft of happiness from children, is intelligent, and wanders aimlessly.',
      full: 'Sun in the 5th house causes loss or scarcity of sons, diminished intelligence, poverty, and wandering. The native may be short-lived if further afflicted. He is angry and moves about without settled purpose, though he possesses a sharp mind.',
      citation: 'BPHS Ch. 24, śl. 8',
      keywords: ['children', 'intelligence', 'wandering', 'longevity'],
    },
    6: {
      brief: 'The native conquers enemies, is illustrious, and prosperous.',
      full: 'Sun in the 6th house makes the native glorious, a destroyer of enemies, and powerful. He acquires fame and is free from diseases. He may hold high office and is successful in contests, litigation, and competition.',
      citation: 'BPHS Ch. 24, śl. 9',
      keywords: ['enemies', 'fame', 'health', 'competition'],
    },
    7: {
      brief: 'The native suffers in marriage, is humiliated by women, and afflicted by the state.',
      full: 'Sun in the 7th house causes trouble through the wife, humiliation from women, and displeasure of the government. The native wanders in foreign lands, is without potency, and may have a delayed or unhappy marriage. He is afflicted in his seventh year.',
      citation: 'BPHS Ch. 24, śl. 10',
      keywords: ['marriage', 'wife', 'government', 'travel'],
    },
    8: {
      brief: 'The native has few issues, is short-lived, and suffers from loss of sight.',
      full: 'Sun in the 8th house shortens the span of life, causes eye diseases, and limits progeny. The native suffers from fever and bodily weakness. Inheritance may be lost, and the native is given to quarrels. Death may come through royal displeasure or fire.',
      citation: 'BPHS Ch. 24, śl. 11',
      keywords: ['longevity', 'eyes', 'children', 'inheritance'],
    },
    9: {
      brief: 'The native is endowed with sons and wealth, is devoted to his father, and favoured by the king.',
      full: 'Sun in the 9th house grants progeny, prosperity, and devotion. The native is pious, well-disposed towards his father, performs charitable acts, and receives the patronage of the king. He gains through pilgrimage and is righteous in conduct.',
      citation: 'BPHS Ch. 24, śl. 12',
      keywords: ['fortune', 'father', 'dharma', 'royalty'],
    },
    10: {
      brief: 'The native attains great power, authority, and fame through his occupation.',
      full: 'Sun in the 10th house makes the native extremely powerful, famous, and endowed with conveyances and attendants. He is intelligent, happy, and performs meritorious deeds. He rises to high position in the kingdom and is a leader among men.',
      citation: 'BPHS Ch. 24, śl. 13',
      keywords: ['career', 'authority', 'fame', 'power'],
    },
    11: {
      brief: 'The native is wealthy, long-lived, and commands many servants.',
      full: 'Sun in the 11th house bestows riches, longevity, and attendants. The native accumulates gold and precious objects, is free from illness, and enjoys the company of powerful friends. He gains through the government and authority figures.',
      citation: 'Saravali Ch. 23, śl. 11',
      keywords: ['wealth', 'gains', 'longevity', 'friends'],
    },
    12: {
      brief: 'The native is at enmity with his father, suffers eye afflictions, and is without wealth.',
      full: 'Sun in the 12th house causes enmity with the father, loss of wealth, and diseases of the eyes. The native is without lustre, may go to a foreign land, and suffers from the displeasure of the government. He may enter into servitude or confinement.',
      citation: 'BPHS Ch. 24, śl. 14',
      keywords: ['father', 'eyes', 'loss', 'foreign-land'],
    },
  },
  moon: {
    1: {
      brief: 'The native is beautiful, soft-spoken, fickle-minded, and fond of women.',
      full: 'Moon in the 1st house makes the native handsome, charming, with a large or round face, and fond of the opposite sex. He is changeable in mind, possesses many excellences, and enjoys comforts. A waxing Moon here grants more auspicious results.',
      citation: 'BPHS Ch. 24, śl. 15',
      keywords: ['beauty', 'mind', 'women', 'comfort'],
    },
    2: {
      brief: 'The native is wealthy, enjoys good food, and has a large family.',
      full: 'Moon in the 2nd house bestows wealth, a pleasing face, good food, and a prosperous family. The native is soft-spoken, eloquent, and commands many servants. He accumulates wealth from various sources and is generous in disposition.',
      citation: 'BPHS Ch. 24, śl. 16',
      keywords: ['wealth', 'family', 'speech', 'food'],
    },
    3: {
      brief: 'The native is courageous, has brothers, and is of a miserly disposition.',
      full: 'Moon in the 3rd house makes the native energetic, brave, and surrounded by siblings. However, he may be miserly and cruel-minded. He depends on others for sustenance and may suffer mental unrest. He is fond of travel.',
      citation: 'BPHS Ch. 24, śl. 17',
      keywords: ['brothers', 'valour', 'mind', 'travel'],
    },
    4: {
      brief: 'The native enjoys happiness, conveyances, and abundant comfort from the mother.',
      full: 'Moon in the 4th house grants happiness, lands, houses, conveyances, and maternal affection. The native is prosperous, well-disposed, and charitable. He has a good reputation and enjoys all domestic comforts. This is among the best placements for the Moon.',
      citation: 'BPHS Ch. 24, śl. 18',
      keywords: ['happiness', 'mother', 'property', 'conveyances'],
    },
    5: {
      brief: 'The native is intelligent, holds ministerial office, and possesses many sons.',
      full: 'Moon in the 5th house bestows sharp intelligence, many sons, political influence, and royal favour. The native is a good counsellor and advisor, devoted to the gods, and prosperous. He may attain ministerial rank.',
      citation: 'BPHS Ch. 24, śl. 19',
      keywords: ['intelligence', 'children', 'minister', 'counsel'],
    },
    6: {
      brief: 'The native is short-lived, lazy, and troubled by enemies and stomach ailments.',
      full: 'Moon in the 6th house makes the native liable to stomach disorders, lethargic, and humiliated by enemies. He is short-lived if further afflicted, has a fluctuating fortune, and may suffer from water-related ailments. Women and maternal relatives cause trouble.',
      citation: 'BPHS Ch. 24, śl. 20',
      keywords: ['enemies', 'health', 'stomach', 'longevity'],
    },
    7: {
      brief: 'The native has a beautiful wife, is passionate, and enjoys marital happiness.',
      full: 'Moon in the 7th house grants a charming and devoted wife, marital bliss, and good fortune. The native is passionate, inclined towards women, and enjoys pleasures. He possesses a well-proportioned body and gains through partnerships.',
      citation: 'BPHS Ch. 24, śl. 21',
      keywords: ['marriage', 'wife', 'passion', 'partnership'],
    },
    8: {
      brief: 'The native is sickly, short-lived, and suffers mental anguish.',
      full: 'Moon in the 8th house causes ill-health, short life, and mental affliction. The native suffers from cold and phlegmatic disorders, is troubled by frequent ailments, and may face danger from water. Inheritance is scanty.',
      citation: 'BPHS Ch. 24, śl. 22',
      keywords: ['longevity', 'health', 'mind', 'inheritance'],
    },
    9: {
      brief: 'The native is virtuous, wealthy, devoted to the gods, and blessed with sons.',
      full: 'Moon in the 9th house makes the native pious, wealthy, and blessed with good sons. He is devoted to his parents and the divine, performs pilgrimages, and is righteous. He wins the favour of the king and is widely respected.',
      citation: 'BPHS Ch. 24, śl. 23',
      keywords: ['dharma', 'wealth', 'children', 'piety'],
    },
    10: {
      brief: 'The native is victorious, performs meritorious deeds, and enjoys royal patronage.',
      full: 'Moon in the 10th house grants success in undertakings, royal favour, and charitable disposition. The native is virtuous, strong, and prosperous. He attains fame through his deeds and commands authority among his people.',
      citation: 'BPHS Ch. 24, śl. 24',
      keywords: ['career', 'fame', 'success', 'royalty'],
    },
    11: {
      brief: 'The native is wealthy, long-lived, blessed with many children, and commands attendants.',
      full: 'Moon in the 11th house bestows wealth, longevity, many sons, and servants. The native possesses vehicles, enjoys all comforts, and gains through women. His gains are consistent, and he is celebrated among friends.',
      citation: 'BPHS Ch. 24, śl. 25',
      keywords: ['wealth', 'gains', 'children', 'longevity'],
    },
    12: {
      brief: 'The native is indolent, humiliated, unhappy, and suffers from eye afflictions.',
      full: 'Moon in the 12th house makes the native lazy, disgraced, and given to expenditure. He suffers from diseases of the eyes and is deprived of intelligence. He sleeps excessively, dwells in foreign lands, and has few comforts.',
      citation: 'BPHS Ch. 24, śl. 26',
      keywords: ['expenditure', 'eyes', 'foreign-land', 'indolence'],
    },
  },
  mars: {
    1: {
      brief: 'The native is courageous, short-lived, and bears wounds or marks on the body.',
      full: 'Mars in the 1st house makes the native valorous but prone to bodily injuries and scars. He is cruel, adventurous, and short-lived if afflicted. The native has a bilious temperament, is fond of combat, and may be employed in military or police service.',
      citation: 'BPHS Ch. 24, śl. 27',
      keywords: ['valour', 'injuries', 'longevity', 'constitution'],
    },
    2: {
      brief: 'The native is devoid of learning and wealth, eats bad food, and keeps evil company.',
      full: 'Mars in the 2nd house causes loss of wealth, poor education, harsh speech, and bad food. The native keeps low company, has an unattractive face, and may be dependent on others. He quarrels with family members and suffers from diseases of the mouth.',
      citation: 'BPHS Ch. 24, śl. 28',
      keywords: ['wealth-loss', 'speech', 'family', 'food'],
    },
    3: {
      brief: 'The native is brave, unconquerable, wealthy, and happy but hostile to his brothers.',
      full: 'Mars in the 3rd house makes the native exceedingly courageous, rich, and successful. He is endowed with good qualities and servants but is inimical to his brothers. He is patient and achieves his goals through determined effort.',
      citation: 'BPHS Ch. 24, śl. 29',
      keywords: ['valour', 'brothers', 'wealth', 'effort'],
    },
    4: {
      brief: 'The native is deprived of mother, friends, happiness, lands, and conveyances.',
      full: 'Mars in the 4th house deprives the native of domestic happiness, the mother, lands, and vehicles. He is without faithful friends and suffers from heart afflictions. His fixed assets are damaged, and he has no peace at home.',
      citation: 'BPHS Ch. 24, śl. 30',
      keywords: ['mother', 'happiness', 'property', 'home'],
    },
    5: {
      brief: 'The native is without children, intelligence, and is given to evil deeds.',
      full: 'Mars in the 5th house denies progeny or causes their loss, diminishes intelligence, and leads the native to sinful actions. He is fickle-minded and may suffer from stomach disorders. If further afflicted, the firstborn may be lost.',
      citation: 'BPHS Ch. 24, śl. 31',
      keywords: ['children', 'intelligence', 'sin', 'stomach'],
    },
    6: {
      brief: 'The native conquers all enemies, is wealthy, and free from disease.',
      full: 'Mars in the 6th house is excellent — the native destroys all foes, accumulates wealth, and is free from illness. He is famous, commands servants, and triumphs in litigation and war. This is among the most favourable placements for Mars.',
      citation: 'BPHS Ch. 24, śl. 32',
      keywords: ['enemies', 'wealth', 'health', 'victory'],
    },
    7: {
      brief: 'The native suffers in marriage, is afflicted by disease, and wanders abroad.',
      full: 'Mars in the 7th house causes marital discord, wife\'s ill-health or separation, and bodily disease. The native wanders in foreign lands and suffers humiliation. He is lustful and may have multiple marriages if further afflicted.',
      citation: 'BPHS Ch. 24, śl. 33',
      keywords: ['marriage', 'wife', 'disease', 'travel'],
    },
    8: {
      brief: 'The native is short-lived, afflicted by chronic diseases, and has few possessions.',
      full: 'Mars in the 8th house shortens life, causes chronic ailments, and gives few resources. The native suffers from bleeding disorders, accidents, and wounds. He is poor and may face an unnatural death through weapons, fire, or enemies.',
      citation: 'BPHS Ch. 24, śl. 34',
      keywords: ['longevity', 'disease', 'accidents', 'poverty'],
    },
    9: {
      brief: 'The native is without fortune, is hostile to his father, and acts sinfully.',
      full: 'Mars in the 9th house makes the native unfortunate, inimical to the father, and inclined towards sinful acts. He is lacking in religious merit and may disrespect elders and preceptors. His fortune comes late, if at all.',
      citation: 'BPHS Ch. 24, śl. 35',
      keywords: ['fortune', 'father', 'dharma', 'sin'],
    },
    10: {
      brief: 'The native is brave, famous, and powerful in his occupation like a king.',
      full: 'Mars in the 10th house makes the native exceedingly powerful, famous, and courageous. He is equal to a king in authority, commands armies, and performs bold deeds. He is successful in his profession and feared by adversaries.',
      citation: 'BPHS Ch. 24, śl. 36',
      keywords: ['career', 'authority', 'fame', 'valour'],
    },
    11: {
      brief: 'The native is wealthy, happy, courageous, and commands many servants.',
      full: 'Mars in the 11th house bestows abundant wealth, happiness, servants, and good health. The native is prosperous, has landed property, and gains from trade and speculation. He has powerful friends and is victorious in enterprises.',
      citation: 'BPHS Ch. 24, śl. 37',
      keywords: ['wealth', 'gains', 'servants', 'happiness'],
    },
    12: {
      brief: 'The native spends excessively, suffers from eye disease, and is cruel.',
      full: 'Mars in the 12th house causes heavy expenditure, eye diseases, and a fall from honour. The native is cruel, without conjugal happiness, and may be confined or exiled. His enemies triumph over him, and he is troubled by debts.',
      citation: 'BPHS Ch. 24, śl. 38',
      keywords: ['expenditure', 'eyes', 'enemies', 'confinement'],
    },
  },
  mercury: {
    1: {
      brief: 'The native is learned, eloquent, long-lived, and skilled in crafts.',
      full: 'Mercury in the 1st house makes the native intelligent, well-read, sweet-spoken, and dexterous in arts and crafts. He is long-lived, handsome, and endowed with good qualities. He may be proficient in astrology, mathematics, or commerce.',
      citation: 'BPHS Ch. 24, śl. 39',
      keywords: ['intelligence', 'speech', 'longevity', 'crafts'],
    },
    2: {
      brief: 'The native is wealthy, a poet or scholar, sweet-tongued, and devoted to learning.',
      full: 'Mercury in the 2nd house bestows wealth, poetic ability, and eloquent speech. The native is handsome, a scholar, and surrounded by a large family. He earns through his intellectual abilities and is respected for his learning.',
      citation: 'BPHS Ch. 24, śl. 40',
      keywords: ['wealth', 'speech', 'learning', 'poetry'],
    },
    3: {
      brief: 'The native is courageous, has brothers, and is of a mean disposition.',
      full: 'Mercury in the 3rd house makes the native brave but of middling disposition. He has brothers and is skilled in yoga or physical disciplines. He may be deceitful and suffer mental fatigue but is successful in short journeys and communications.',
      citation: 'BPHS Ch. 24, śl. 41',
      keywords: ['brothers', 'valour', 'communication', 'deceit'],
    },
    4: {
      brief: 'The native is learned, happy, blessed with friends and relations, and possesses lands.',
      full: 'Mercury in the 4th house grants learning, domestic happiness, good friends, and landed property. The native is gentle, well-disposed, and enjoys the company of the learned. He has vehicles and is blessed by his mother.',
      citation: 'BPHS Ch. 24, śl. 42',
      keywords: ['happiness', 'learning', 'property', 'mother'],
    },
    5: {
      brief: 'The native is wise, has sons who are proficient in learning, and is a skilled speaker.',
      full: 'Mercury in the 5th house bestows sharp intellect, learned sons, and proficiency in mantras or sacred recitation. The native is a good counsellor, versed in sacred texts, and prosperous. He gains through speculation and wise investments.',
      citation: 'BPHS Ch. 24, śl. 43',
      keywords: ['intelligence', 'children', 'mantras', 'counsel'],
    },
    6: {
      brief: 'The native is quarrelsome, lazy, and troubled by enemies but overcomes them through speech.',
      full: 'Mercury in the 6th house makes the native argumentative and prone to disputes. He is lazy and troubled by enemies but prevails through his wit, writing, or litigation skills. He suffers from nervous disorders but ultimately vanquishes his foes.',
      citation: 'BPHS Ch. 24, śl. 44',
      keywords: ['enemies', 'disputes', 'speech', 'health'],
    },
    7: {
      brief: 'The native has a learned and beautiful wife, is skilled in arts, and well-dressed.',
      full: 'Mercury in the 7th house grants an educated and attractive wife, proficiency in fine arts, and elegance in dress. The native gains through trade and partnership. He is well-mannered and respected in society.',
      citation: 'BPHS Ch. 24, śl. 45',
      keywords: ['marriage', 'wife', 'arts', 'trade'],
    },
    8: {
      brief: 'The native is famous, long-lived, assists the king, and heads a family.',
      full: 'Mercury in the 8th house gives longevity, fame, and royal patronage. The native is the head of his clan and performs meritorious deeds. He is skilled in occult sciences and may gain through inheritance or hidden knowledge.',
      citation: 'BPHS Ch. 24, śl. 46',
      keywords: ['longevity', 'fame', 'occult', 'inheritance'],
    },
    9: {
      brief: 'The native is religious, eloquent, wealthy, and devoted to sacred learning.',
      full: 'Mercury in the 9th house makes the native pious, a fine orator, and prosperous. He is devoted to sacred studies, performs religious rites, and gains through higher education. He is respected by the learned and travels on pilgrimage.',
      citation: 'BPHS Ch. 24, śl. 47',
      keywords: ['dharma', 'learning', 'wealth', 'speech'],
    },
    10: {
      brief: 'The native is learned, happy, truthful, and successful in his profession.',
      full: 'Mercury in the 10th house makes the native truthful, intelligent, and prosperous in his trade or profession. He is happy, possesses excellent qualities, and performs virtuous deeds. He is honoured by the state and attains fame.',
      citation: 'BPHS Ch. 24, śl. 48',
      keywords: ['career', 'truth', 'intelligence', 'fame'],
    },
    11: {
      brief: 'The native is wealthy, long-lived, truthful, and blessed with many attendants.',
      full: 'Mercury in the 11th house grants wealth, longevity, and truthfulness. The native has many friends and servants, gains through intellectual pursuits, and is happy. He achieves his desires and is prosperous in every undertaking.',
      citation: 'BPHS Ch. 24, śl. 49',
      keywords: ['wealth', 'gains', 'longevity', 'truth'],
    },
    12: {
      brief: 'The native is indolent, without learning, humiliated, and spends on unworthy objects.',
      full: 'Mercury in the 12th house causes laziness, lack of education, and dishonour. The native spends excessively on futile objects, is despised, and suffers from nervous disorders. He may be confined or live in foreign lands.',
      citation: 'BPHS Ch. 24, śl. 50',
      keywords: ['expenditure', 'learning-loss', 'foreign-land', 'humiliation'],
    },
  },
  jupiter: {
    1: {
      brief: 'The native is handsome, long-lived, fearless, and favoured by the king.',
      full: 'Jupiter in the 1st house makes the native beautiful, learned, long-lived, and endowed with children. He is fearless, blessed by the sovereign, and possesses a commanding personality. He is devoted to the gods and respected by all.',
      citation: 'BPHS Ch. 24, śl. 51',
      keywords: ['longevity', 'beauty', 'royalty', 'learning'],
    },
    2: {
      brief: 'The native is wealthy, eloquent, handsome, and enjoys good food.',
      full: 'Jupiter in the 2nd house grants immense wealth, a large family, eloquence, and attractive features. The native eats sumptuous food, is learned in the scriptures, and acquires wealth through righteous means. His speech is persuasive and respected.',
      citation: 'BPHS Ch. 24, śl. 52',
      keywords: ['wealth', 'speech', 'family', 'food'],
    },
    3: {
      brief: 'The native is miserly, of bad repute among brothers, and occupies a low position.',
      full: 'Jupiter in the 3rd house makes the native miserly, ill-famed among his siblings, and occupying a menial station. He may be blamed for his brothers\' misfortunes. His courage is unremarkable and he may suffer from digestive troubles.',
      citation: 'BPHS Ch. 24, śl. 53',
      keywords: ['brothers', 'reputation', 'miserliness', 'position'],
    },
    4: {
      brief: 'The native is blessed with mother, friends, happiness, lands, and conveyances.',
      full: 'Jupiter in the 4th house bestows happiness, maternal blessings, lands, vehicles, and faithful friends. The native is prosperous, well-settled, and performs virtuous deeds. He enjoys a comfortable home and is respected in his community.',
      citation: 'BPHS Ch. 24, śl. 54',
      keywords: ['happiness', 'mother', 'property', 'conveyances'],
    },
    5: {
      brief: 'The native is wise, blessed with sons, and attains ministerial rank.',
      full: 'Jupiter in the 5th house makes the native exceedingly intelligent, blessed with virtuous sons, and influential in governance. He is a good advisor, devoted to the divine, and gains through speculation and counsel. He may attain the post of a minister.',
      citation: 'BPHS Ch. 24, śl. 55',
      keywords: ['intelligence', 'children', 'minister', 'dharma'],
    },
    6: {
      brief: 'The native is lazy, destroyed by enemies, and without lustre.',
      full: 'Jupiter in the 6th house makes the native lazy, overpowered by foes, and lacking in vitality. He may suffer humiliation and physical ailments. His efforts are thwarted, and he is tormented by enemies despite his learning.',
      citation: 'BPHS Ch. 24, śl. 56',
      keywords: ['enemies', 'laziness', 'health', 'humiliation'],
    },
    7: {
      brief: 'The native has a virtuous wife, is learned, and surpasses his father in qualities.',
      full: 'Jupiter in the 7th house grants a noble and devoted wife, learning, and superiority over the father in qualities. The native gains through partnership and marriage, is well-mannered, and commands respect. His wife is religious and dutiful.',
      citation: 'BPHS Ch. 24, śl. 57',
      keywords: ['marriage', 'wife', 'learning', 'partnership'],
    },
    8: {
      brief: 'The native is long-lived but performs menial work, is despised, and sinful.',
      full: 'Jupiter in the 8th house gives longevity but causes the native to be engaged in low occupation, blamed by others, and inclined to sinful acts. He may live as a servant and suffers from poverty despite long life. He gains some knowledge of the occult.',
      citation: 'BPHS Ch. 24, śl. 58',
      keywords: ['longevity', 'occupation', 'poverty', 'occult'],
    },
    9: {
      brief: 'The native is fortunate, religious, wealthy, and a great devotee of the divine.',
      full: 'Jupiter in the 9th house makes the native exceedingly fortunate, pious, and wealthy. He is a great devotee, performs sacrifices and pilgrimages, and is honoured by the king. He has illustrious sons and commands universal respect. This is Jupiter\'s finest placement.',
      citation: 'BPHS Ch. 24, śl. 59',
      keywords: ['fortune', 'dharma', 'wealth', 'devotion'],
    },
    10: {
      brief: 'The native is prosperous, devoted to the gods, and performs noble deeds.',
      full: 'Jupiter in the 10th house grants prosperity, divine devotion, and engagement in noble deeds. The native attains high status, is powerful and virtuous, and is honoured by the state. His professional achievements bring lasting fame.',
      citation: 'BPHS Ch. 24, śl. 60',
      keywords: ['career', 'prosperity', 'dharma', 'fame'],
    },
    11: {
      brief: 'The native is wealthy, long-lived, and blessed with children and vehicles.',
      full: 'Jupiter in the 11th house grants abundant wealth, longevity, children, and conveyances. The native has powerful and learned friends, gains effortlessly, and is free from disease. His every desire is fulfilled.',
      citation: 'BPHS Ch. 24, śl. 61',
      keywords: ['wealth', 'gains', 'children', 'longevity'],
    },
    12: {
      brief: 'The native is indolent, hated by others, and without wealth or progeny.',
      full: 'Jupiter in the 12th house makes the native lazy, despised, and childless. He spends excessively, is without riches, and suffers from falls or humiliation. He may however gain spiritual liberation or dwell in ashrams and monasteries.',
      citation: 'BPHS Ch. 24, śl. 62',
      keywords: ['expenditure', 'children', 'spirituality', 'humiliation'],
    },
  },
  venus: {
    1: {
      brief: 'The native is handsome, happy, long-lived, and attractive to women.',
      full: 'Venus in the 1st house makes the native beautiful, happy, long-lived, and adored by women. He is well-proportioned, possesses a charming personality, and enjoys all worldly pleasures. He is skilled in fine arts and fond of ornaments.',
      citation: 'BPHS Ch. 24, śl. 63',
      keywords: ['beauty', 'happiness', 'longevity', 'women'],
    },
    2: {
      brief: 'The native is wealthy, possesses a large family, and is a poet or artist.',
      full: 'Venus in the 2nd house bestows wealth, a large and prosperous family, poetic ability, and sweet speech. The native enjoys fine food, possesses jewels and ornaments, and gains through artistic or literary pursuits. His face is attractive.',
      citation: 'BPHS Ch. 24, śl. 64',
      keywords: ['wealth', 'family', 'poetry', 'speech'],
    },
    3: {
      brief: 'The native is miserly, unhappy, and without strength or position.',
      full: 'Venus in the 3rd house makes the native miserly, weak, and unhappy. He lacks position and may be blamed by his brothers. He is without wealth and suffers from mental distress, though he has some skill in communication.',
      citation: 'BPHS Ch. 24, śl. 65',
      keywords: ['brothers', 'miserliness', 'unhappiness', 'weakness'],
    },
    4: {
      brief: 'The native is blessed with vehicles, houses, ornaments, and domestic happiness.',
      full: 'Venus in the 4th house grants conveyances, houses, lands, ornaments, and domestic comfort. The native is prosperous, enjoys the affection of his mother, and lives in pleasant surroundings. He has abundant pleasures and is well-settled.',
      citation: 'BPHS Ch. 24, śl. 66',
      keywords: ['happiness', 'property', 'conveyances', 'mother'],
    },
    5: {
      brief: 'The native is wealthy, intelligent, blessed with sons, and honoured by the king.',
      full: 'Venus in the 5th house grants wealth, intelligence, and virtuous children. The native is honoured by the king, is a good counsellor, and gains through creative arts or speculation. He is devoted and prosperous.',
      citation: 'BPHS Ch. 24, śl. 67',
      keywords: ['wealth', 'children', 'intelligence', 'royalty'],
    },
    6: {
      brief: 'The native is without enemies, but also without wealth and is humiliated.',
      full: 'Venus in the 6th house frees the native from enemies but deprives him of wealth. He may be humiliated and suffer from venereal or urinary disorders. He is lazy and without vigour, though he enjoys some comforts from women.',
      citation: 'BPHS Ch. 24, śl. 68',
      keywords: ['enemies', 'health', 'wealth-loss', 'women'],
    },
    7: {
      brief: 'The native has a beautiful wife, is passionate, wealthy, and happy in marriage.',
      full: 'Venus in the 7th house grants a beautiful and devoted wife, conjugal happiness, and prosperity. The native is passionate, well-dressed, and gains through partnerships. He is fond of pleasures and is popular in society.',
      citation: 'BPHS Ch. 24, śl. 69',
      keywords: ['marriage', 'wife', 'passion', 'wealth'],
    },
    8: {
      brief: 'The native is long-lived, wealthy from inheritance, and enjoys many comforts.',
      full: 'Venus in the 8th house grants longevity, wealth through inheritance or the spouse, and enjoyment of comforts. The native may have gains through hidden means or occult pursuits. He is blessed with lands and vehicles.',
      citation: 'BPHS Ch. 24, śl. 70',
      keywords: ['longevity', 'inheritance', 'wealth', 'comforts'],
    },
    9: {
      brief: 'The native is fortunate, devoted to his wife, religious, and prosperous.',
      full: 'Venus in the 9th house makes the native fortunate, attached to his wife, religious, and wealthy. He performs charitable acts, is honoured by the learned, and gains through pilgrimages. His father is also prosperous.',
      citation: 'BPHS Ch. 24, śl. 71',
      keywords: ['fortune', 'dharma', 'wife', 'wealth'],
    },
    10: {
      brief: 'The native attains high position, fame, and success in his vocation.',
      full: 'Venus in the 10th house makes the native highly successful in his profession, famous, and honoured by the state. He achieves authority and is engaged in pleasant occupations. He gains through arts, entertainment, or luxury trades.',
      citation: 'BPHS Ch. 24, śl. 72',
      keywords: ['career', 'fame', 'authority', 'arts'],
    },
    11: {
      brief: 'The native is wealthy, gains from women, and commands many pleasures.',
      full: 'Venus in the 11th house grants abundant gains, especially through women, arts, or luxury items. The native is prosperous, has powerful friends, and fulfills all desires. He is surrounded by pleasures and comforts.',
      citation: 'BPHS Ch. 24, śl. 73',
      keywords: ['wealth', 'gains', 'women', 'pleasures'],
    },
    12: {
      brief: 'The native enjoys bed pleasures, is extravagant, and possesses fine beds and clothing.',
      full: 'Venus in the 12th house gives indulgence in bed pleasures, expenditure on luxuries, and fine sleeping arrangements. The native is liberal, enjoys foreign lands, and may have secret liaisons. He is given to excessive enjoyment.',
      citation: 'BPHS Ch. 24, śl. 74',
      keywords: ['expenditure', 'pleasures', 'foreign-land', 'luxury'],
    },
  },
  saturn: {
    1: {
      brief: 'The native is sickly, sorrowful, idle, and of unclean habits.',
      full: 'Saturn in the 1st house makes the native sickly, sorrowful, and indolent. He is unclean in habits, has a lean body, and wanders aimlessly. His childhood is troubled, and he may be separated from his birthplace. He gains strength only in later life.',
      citation: 'BPHS Ch. 24, śl. 75',
      keywords: ['health', 'sorrow', 'constitution', 'childhood'],
    },
    2: {
      brief: 'The native is poor, his face is unattractive, and his family is distressed.',
      full: 'Saturn in the 2nd house deprives the native of wealth, family harmony, and facial beauty. His speech is harsh or faltering, and he eats impure food. He is dishonest and may be separated from his family. He accumulates wealth only with great difficulty.',
      citation: 'BPHS Ch. 24, śl. 76',
      keywords: ['wealth-loss', 'family', 'speech', 'face'],
    },
    3: {
      brief: 'The native is courageous, intelligent, wealthy, but hostile to his relatives.',
      full: 'Saturn in the 3rd house makes the native brave, sharp-witted, and wealthy. He is liberal and of good conduct but is hostile to siblings and relatives. He is strong and resolute in his undertakings. His efforts yield fruit over time.',
      citation: 'BPHS Ch. 24, śl. 77',
      keywords: ['valour', 'intelligence', 'brothers', 'wealth'],
    },
    4: {
      brief: 'The native is without happiness, conveyances, and domestic comfort.',
      full: 'Saturn in the 4th house deprives the native of happiness, mother, vehicles, and property. His heart is afflicted and his home life is disturbed. He may be separated from his place of birth and suffer chronic chest ailments.',
      citation: 'BPHS Ch. 24, śl. 78',
      keywords: ['happiness', 'mother', 'property', 'home'],
    },
    5: {
      brief: 'The native is without children, wicked, and of perverse intellect.',
      full: 'Saturn in the 5th house denies children or causes their loss, makes the native wicked, and impairs the intellect. He is a wanderer, of sinful mind, and given to evil counsel. His speculations fail, and he is troubled by stomach complaints.',
      citation: 'BPHS Ch. 24, śl. 79',
      keywords: ['children', 'intelligence', 'wickedness', 'loss'],
    },
    6: {
      brief: 'The native conquers enemies, is gluttonous, wealthy, and proud.',
      full: 'Saturn in the 6th house destroys all enemies, grants wealth, and gives the native a voracious appetite. He is proud, strong, and triumphs in every contest. He is free from disease and overcomes all obstacles placed by his adversaries.',
      citation: 'BPHS Ch. 24, śl. 80',
      keywords: ['enemies', 'wealth', 'health', 'pride'],
    },
    7: {
      brief: 'The native has a sickly or older wife, wanders abroad, and is without potency.',
      full: 'Saturn in the 7th house gives a wife who is older, sickly, or of inferior status. The native wanders in foreign countries, is without virility, and may marry more than once. Marital happiness is limited, and partnerships cause suffering.',
      citation: 'BPHS Ch. 24, śl. 81',
      keywords: ['marriage', 'wife', 'travel', 'potency'],
    },
    8: {
      brief: 'The native is sickly, short-lived, given to theft, and troubled by chronic disease.',
      full: 'Saturn in the 8th house shortens life, causes chronic diseases, and makes the native poor and disreputable. He may be given to stealing, quarrelling, and is afflicted by rheumatic disorders. He suffers from piles and is without happiness.',
      citation: 'BPHS Ch. 24, śl. 82',
      keywords: ['longevity', 'disease', 'poverty', 'dishonour'],
    },
    9: {
      brief: 'The native is without fortune, dharma, father, and is engaged in sinful deeds.',
      full: 'Saturn in the 9th house deprives the native of fortune, religious merit, and paternal happiness. He is engaged in sinful deeds, is impious, and does not perform the prescribed rites. His father suffers, and pilgrimages yield no fruit.',
      citation: 'BPHS Ch. 24, śl. 83',
      keywords: ['fortune', 'dharma', 'father', 'sin'],
    },
    10: {
      brief: 'The native is powerful, wealthy, and a ruler but of questionable morals.',
      full: 'Saturn in the 10th house makes the native powerful, wealthy, and a leader or ruler. He is bold and achieves great things in his profession. However, his means may be questionable, he is devoid of filial piety, and he achieves power through sheer effort.',
      citation: 'BPHS Ch. 24, śl. 84',
      keywords: ['career', 'power', 'wealth', 'effort'],
    },
    11: {
      brief: 'The native is wealthy, long-lived, possesses lands, and has faithful servants.',
      full: 'Saturn in the 11th house bestows wealth, longevity, landed property, and loyal servants. The native gains steadily, has a good income, and is free from illness. He fulfills his desires through persistent effort and is respected.',
      citation: 'BPHS Ch. 24, śl. 85',
      keywords: ['wealth', 'gains', 'longevity', 'property'],
    },
    12: {
      brief: 'The native is indolent, spends on evil purposes, is defective in a limb, and humiliated.',
      full: 'Saturn in the 12th house makes the native lazy, prone to excessive spending on base objects, and physically defective. He is shameless, without riches, and may be confined or exiled. He suffers from eye diseases and lives in solitude.',
      citation: 'BPHS Ch. 24, śl. 86',
      keywords: ['expenditure', 'confinement', 'limbs', 'humiliation'],
    },
  },
  rahu: {
    1: {
      brief: 'The native is short-lived, wealthy, and afflicted in the upper body.',
      full: 'Rahu in the 1st house gives a short span of life (if afflicted), wealth from questionable sources, and ailments in the head or upper body. The native is bold, unconventional, and may achieve sudden rise in status. He is given to foreign ways.',
      citation: 'Phaladeepika Ch. 11, śl. 1; Saravali Ch. 31, śl. 1–2',
      keywords: ['longevity', 'wealth', 'head', 'foreignness'],
    },
    2: {
      brief: 'The native is harsh in speech, suffers from facial diseases, and loses wealth through deceit.',
      full: 'Rahu in the 2nd house makes the native harsh or deceptive in speech, afflicted with diseases of the face or mouth, and prone to loss of family wealth. He may gain through falsehood or foreigners but loses through misrepresentation.',
      citation: 'Saravali Ch. 31, śl. 3–4; Phaladeepika Ch. 11, śl. 2',
      keywords: ['speech', 'face', 'wealth-loss', 'deceit'],
    },
    3: {
      brief: 'The native is courageous, wealthy, and long-lived but hostile to siblings.',
      full: 'Rahu in the 3rd house makes the native bold, wealthy, and long-lived. He has few brothers or is hostile to them. He is proud, travels frequently, and succeeds through daring enterprise. His courage is of an unconventional kind.',
      citation: 'Saravali Ch. 31, śl. 5–6; Phaladeepika Ch. 11, śl. 3',
      keywords: ['valour', 'brothers', 'wealth', 'longevity'],
    },
    4: {
      brief: 'The native is devoid of happiness, mother, and domestic comforts.',
      full: 'Rahu in the 4th house deprives the native of happiness, maternal blessings, and settled home life. He is frequently changing residence, troubled in heart, and without landed property. He may dwell in foreign lands or unconventional surroundings.',
      citation: 'Saravali Ch. 31, śl. 7; Phaladeepika Ch. 11, śl. 4',
      keywords: ['happiness', 'mother', 'home', 'foreign-land'],
    },
    5: {
      brief: 'The native is without children, speaks harshly, and suffers from stomach ailments.',
      full: 'Rahu in the 5th house denies children or causes difficulties in progeny, makes the native harsh-spoken, and gives stomach disorders. His intellect may be sharp but directed towards unorthodox pursuits. He is troubled by anxiety.',
      citation: 'Saravali Ch. 31, śl. 8–9; Phaladeepika Ch. 11, śl. 5',
      keywords: ['children', 'speech', 'stomach', 'anxiety'],
    },
    6: {
      brief: 'The native conquers enemies, is long-lived, and wealthy.',
      full: 'Rahu in the 6th house is highly favourable — the native vanquishes all enemies, enjoys good health, accumulates wealth, and is long-lived. He triumphs in litigation and overcomes all adversaries through unconventional means.',
      citation: 'Saravali Ch. 31, śl. 10; Phaladeepika Ch. 11, śl. 6',
      keywords: ['enemies', 'wealth', 'health', 'longevity'],
    },
    7: {
      brief: 'The native suffers loss of wife, is headstrong, and connects with widows or foreigners.',
      full: 'Rahu in the 7th house causes loss of wife, association with widows or women of loose character, and marriage to a foreigner or person of different community. The native is headstrong, suffers in partnerships, and may have multiple unions.',
      citation: 'Saravali Ch. 31, śl. 11–12; Phaladeepika Ch. 11, śl. 7',
      keywords: ['marriage', 'wife', 'foreignness', 'widows'],
    },
    8: {
      brief: 'The native is short-lived, afflicted by chronic ailments, and suffers sudden reversals.',
      full: 'Rahu in the 8th house shortens life, causes chronic or mysterious diseases, and brings sudden calamities. The native may face poisoning, snakebite, or unnatural events. He is poor, quarrelsome, and suffers from piles or fistula.',
      citation: 'Phaladeepika Ch. 11, śl. 8; Saravali Ch. 31, śl. 13',
      keywords: ['longevity', 'disease', 'calamity', 'poison'],
    },
    9: {
      brief: 'The native is impious, opposed to his father, and performs unrighteous deeds.',
      full: 'Rahu in the 9th house makes the native impious, antagonistic to the father, and given to unrighteous conduct. He does not observe prescribed rites and may follow a heterodox path. His fortune is unstable and gained through unconventional means.',
      citation: 'Saravali Ch. 31, śl. 14–15; Phaladeepika Ch. 11, śl. 9',
      keywords: ['dharma', 'father', 'impiety', 'fortune'],
    },
    10: {
      brief: 'The native is powerful and famous but achieves success through dubious means.',
      full: 'Rahu in the 10th house gives power, fame, and high position achieved through unconventional or dubious means. The native is courageous and may hold authority in foreign lands or over foreigners. His career is marked by sudden rises and falls.',
      citation: 'Phaladeepika Ch. 11, śl. 10; Saravali Ch. 31, śl. 16',
      keywords: ['career', 'power', 'fame', 'foreignness'],
    },
    11: {
      brief: 'The native is wealthy, has few children, and gains through foreign connections.',
      full: 'Rahu in the 11th house grants wealth, fulfilment of desires, and gains through foreigners or unconventional enterprises. The native has few children but abundant income. He is prosperous and has influential, if unusual, friends.',
      citation: 'Saravali Ch. 31, śl. 17; Phaladeepika Ch. 11, śl. 11',
      keywords: ['wealth', 'gains', 'foreignness', 'children'],
    },
    12: {
      brief: 'The native spends excessively, suffers eye ailments, and dwells in foreign lands.',
      full: 'Rahu in the 12th house causes excessive expenditure, eye afflictions, and residence in foreign countries. The native is troubled by hidden enemies, may face confinement, and sleeps excessively. He may however gain spiritual insight through unconventional paths.',
      citation: 'Phaladeepika Ch. 11, śl. 12; Saravali Ch. 31, śl. 18',
      keywords: ['expenditure', 'eyes', 'foreign-land', 'confinement'],
    },
  },
  ketu: {
    1: {
      brief: 'The native is sickly, ungrateful, and associates with outcasts.',
      full: 'Ketu in the 1st house makes the native sickly, ungrateful, and given to keeping low company. He is lean, troubled, and may bear marks on the body. He is disposed towards spiritual or ascetic pursuits but faces worldly difficulties.',
      citation: 'Phaladeepika Ch. 11, śl. 13; Saravali Ch. 32, śl. 1–2',
      keywords: ['health', 'association', 'asceticism', 'body'],
    },
    2: {
      brief: 'The native has defective speech, is poor, and suffers from eye and facial ailments.',
      full: 'Ketu in the 2nd house gives defective speech, poverty, and diseases of the face or eyes. The native eats impure food, is dependent on others, and separated from his family. He may stammer or speak harshly.',
      citation: 'Saravali Ch. 32, śl. 3–4; Phaladeepika Ch. 11, śl. 14',
      keywords: ['speech', 'poverty', 'eyes', 'family'],
    },
    3: {
      brief: 'The native is long-lived, powerful, wealthy, and famous.',
      full: 'Ketu in the 3rd house makes the native long-lived, strong, wealthy, and reputed. He has few brothers or siblings may suffer, but he is courageous and successful in his undertakings. He is resolute and achieves goals through solitary effort.',
      citation: 'Saravali Ch. 32, śl. 5; Phaladeepika Ch. 11, śl. 15',
      keywords: ['longevity', 'valour', 'wealth', 'fame'],
    },
    4: {
      brief: 'The native is deprived of home, lands, mother, and domestic happiness.',
      full: 'Ketu in the 4th house deprives the native of domestic comforts, lands, vehicles, and maternal happiness. He is forced to leave his birthplace, lives in rented or foreign dwellings, and suffers from chest ailments. His inner peace is disturbed.',
      citation: 'Saravali Ch. 32, śl. 6–7; Phaladeepika Ch. 11, śl. 16',
      keywords: ['happiness', 'mother', 'property', 'displacement'],
    },
    5: {
      brief: 'The native is without children, sinful, and troubled in stomach.',
      full: 'Ketu in the 5th house denies children or causes their loss, inclines the native to sinful deeds, and gives stomach ailments. The native is sharp but applies his intellect to occult or unorthodox subjects. He is anxious about progeny.',
      citation: 'Phaladeepika Ch. 11, śl. 17; Saravali Ch. 32, śl. 8',
      keywords: ['children', 'sin', 'stomach', 'occult'],
    },
    6: {
      brief: 'The native is victorious over enemies, generous, and renowned.',
      full: 'Ketu in the 6th house makes the native victorious over all enemies, generous, and widely renowned. He is strong and healthy, free from debts, and triumphs in all disputes. This is among the most favourable placements for Ketu.',
      citation: 'Saravali Ch. 32, śl. 9; Phaladeepika Ch. 11, śl. 18',
      keywords: ['enemies', 'fame', 'health', 'generosity'],
    },
    7: {
      brief: 'The native suffers in marriage, is humiliated, and connects with low women.',
      full: 'Ketu in the 7th house causes loss of wife, humiliation, and association with women of low status. The native suffers in partnership, may marry more than once, and faces stomach disorders. Marital happiness is denied or severely limited.',
      citation: 'Phaladeepika Ch. 11, śl. 19; Saravali Ch. 32, śl. 10',
      keywords: ['marriage', 'wife', 'humiliation', 'loss'],
    },
    8: {
      brief: 'The native is short-lived, separated from dear ones, and suffers wounds.',
      full: 'Ketu in the 8th house shortens life, causes separation from loved ones, and gives wounds or injuries. The native is quarrelsome, suffers from chronic ailments, and faces sudden misfortunes. He is poor and troubled by mysterious diseases.',
      citation: 'Saravali Ch. 32, śl. 11–12; Phaladeepika Ch. 11, śl. 20',
      keywords: ['longevity', 'separation', 'wounds', 'disease'],
    },
    9: {
      brief: 'The native is sinful, devoid of fortune, and hostile to his father.',
      full: 'Ketu in the 9th house makes the native irreligious, unfortunate, and inimical to the father. He does not perform prescribed rites, is given to sin, and his fortune is diminished. He may follow an unconventional spiritual path.',
      citation: 'Phaladeepika Ch. 11, śl. 21; Saravali Ch. 32, śl. 13',
      keywords: ['fortune', 'dharma', 'father', 'sin'],
    },
    10: {
      brief: 'The native faces obstacles in profession but may gain through spiritual or occult work.',
      full: 'Ketu in the 10th house causes obstacles in profession, ill-repute, and hindrance to authority. However, the native may gain through spiritual endeavours, healing, or occult pursuits. His career is marked by sudden changes and unconventional paths.',
      citation: 'Saravali Ch. 32, śl. 14; Phaladeepika Ch. 11, śl. 22',
      keywords: ['career', 'obstacles', 'occult', 'spirituality'],
    },
    11: {
      brief: 'The native gains wealth, is successful, but has few children.',
      full: 'Ketu in the 11th house grants gains, fulfilment of desires, and success in enterprises. The native has few children but accumulates wealth through effort. He has a limited circle of friends but those he has are loyal.',
      citation: 'Phaladeepika Ch. 11, śl. 23; Saravali Ch. 32, śl. 15',
      keywords: ['wealth', 'gains', 'children', 'success'],
    },
    12: {
      brief: 'The native spends on sinful objects, suffers eye afflictions, and may attain liberation.',
      full: 'Ketu in the 12th house causes expenditure on unworthy objects, eye diseases, and loss through enemies. However, the native is inclined towards moksha (spiritual liberation) and may renounce worldly life. He dwells in solitude or foreign lands.',
      citation: 'Saravali Ch. 32, śl. 16–17; Phaladeepika Ch. 11, śl. 24',
      keywords: ['expenditure', 'eyes', 'moksha', 'foreign-land'],
    },
  },
};
