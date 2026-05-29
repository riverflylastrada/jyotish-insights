/**
 * Mundane (worldly) astrology house significations.
 *
 * Source: V.K. Choudhry, "Systems' Approach to Mundane Astrology";
 * K.N. Rao, "Mundane Astrology" (Bharatiya Vidya Bhavan); B.V. Raman,
 * "Mundane or Political Astrology" (Motilal Banarsidass). House labels
 * follow the standard mundane assignment used widely in Vedic mundane
 * analysis. Where sources diverge, we note the majority view.
 */

export interface MundaneHouseInfo {
  house: number;
  label: string;
  labelDeva: string;
  keywords: string[];
}

export const MUNDANE_HOUSES: MundaneHouseInfo[] = [
  {
    house: 1,
    label: 'Nation & Its People',
    labelDeva: 'राष्ट्र एवं जनता',
    keywords: ['general health of the country', 'public morale', 'national identity'],
  },
  {
    house: 2,
    label: 'Economy / Finances / Banks',
    labelDeva: 'अर्थव्यवस्था / वित्त / बैंक',
    keywords: ['national wealth', 'revenue', 'trade & commerce', 'banking'],
  },
  {
    house: 3,
    label: 'Communication / Transport / Neighbours',
    labelDeva: 'संचार / परिवहन / पड़ोसी',
    keywords: ['media', 'railways', 'telecom', 'neighbouring countries'],
  },
  {
    house: 4,
    label: 'Land / Agriculture / Opposition',
    labelDeva: 'भूमि / कृषि / विपक्ष',
    keywords: ['agriculture', 'real estate', 'mining', 'opposition party', 'democracy'],
  },
  {
    house: 5,
    label: 'Speculation / Children / Diplomacy',
    labelDeva: 'सट्टा / संतान / कूटनीति',
    keywords: ['stock market', 'entertainment', 'education', 'ambassadors'],
  },
  {
    house: 6,
    label: 'Military / Health / Labour',
    labelDeva: 'सेना / स्वास्थ्य / श्रम',
    keywords: ['defence', 'public health', 'disease', 'workers & unions', 'debt'],
  },
  {
    house: 7,
    label: 'Foreign Relations / Treaties / War',
    labelDeva: 'विदेश संबंध / संधि / युद्ध',
    keywords: ['foreign affairs', 'international relations', 'war & peace', 'treaties'],
  },
  {
    house: 8,
    label: 'Mortality / Disasters / Hidden Wealth',
    labelDeva: 'मृत्यु / आपदा / गुप्त धन',
    keywords: ['death rate', 'calamities', 'taxation', 'insurance', 'secrets'],
  },
  {
    house: 9,
    label: 'Judiciary / Religion / Higher Learning',
    labelDeva: 'न्यायपालिका / धर्म / उच्च शिक्षा',
    keywords: ['law & courts', 'religion', 'philosophy', 'universities', 'long-distance travel'],
  },
  {
    house: 10,
    label: 'Government / Executive / Ruling Party',
    labelDeva: 'सरकार / कार्यपालिका / सत्ता दल',
    keywords: ['head of state', 'executive branch', 'ruling party', 'national honour'],
  },
  {
    house: 11,
    label: 'Parliament / Legislature / Allies',
    labelDeva: 'संसद / विधायिका / मित्र राष्ट्र',
    keywords: ['parliament', 'legislature', 'friends & allies', 'income to govt'],
  },
  {
    house: 12,
    label: 'Foreign Expenditure / Losses / Espionage',
    labelDeva: 'विदेशी व्यय / हानि / जासूसी',
    keywords: ['foreign debt', 'espionage', 'imprisonment', 'hospitals', 'losses'],
  },
];

/** National / event chart presets. */
export interface MundanePreset {
  id: string;
  label: string;
  labelDeva: string;
  description: string;
  dateOfBirth: string;
  timeOfBirth: string;
  place: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneOffset: number;
  };
  source: string;
  caveat?: string;
}

export const NATIONAL_PRESETS: MundanePreset[] = [
  {
    id: 'india-independence',
    label: 'India — Independence',
    labelDeva: 'भारत — स्वतंत्रता',
    description: 'India independence chart, 15 Aug 1947, 00:00 IST, New Delhi.',
    dateOfBirth: '1947-08-15',
    timeOfBirth: '00:00:00',
    place: {
      name: 'New Delhi, India',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      timezoneOffset: 5.5,
    },
    source: 'B.V. Raman, "Hindu Predictive Astrology" — midnight chart (Vrishabha Lagna).',
    caveat:
      'The exact time of Indian independence is debated. B.V. Raman used 00:00 IST ' +
      '(Vrishabha Lagna); some use 00:15 IST (also Vrishabha); K.N. Rao and others ' +
      'have proposed alternate times. This is the most widely cited midnight chart.',
  },
];
