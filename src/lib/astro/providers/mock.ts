import type {
  AstroProvider, BirthDetails, KundliData, PlanetPosition, DivisionalChart,
  DashaSystem, DashaPeriod, Dosha, Yoga, AshtakavargaData, PlanetName,
} from '../types';
import { SIGN_NAMES } from '../types';

// Reference chart: 15 Aug 1980, 14:30, Ahmedabad. Lagna ~ Vrischika (Scorpio).
// Numbers are illustrative — real engine will replace.

const mk = (
  planet: PlanetName, sign: number, deg: number, house: number,
  nak: string, pada: 1 | 2 | 3 | 4, opts: Partial<PlanetPosition> = {},
): PlanetPosition => ({
  planet,
  longitude: ((sign - 1) * 30 + deg) % 360,
  signNumber: sign,
  signName: SIGN_NAMES[sign - 1],
  signDegree: deg,
  nakshatra: nak,
  nakshatraPada: pada,
  houseNumber: house,
  isRetrograde: false,
  isCombust: false,
  ...opts,
});

const D1_PLANETS: PlanetPosition[] = [
  mk('ascendant', 8, 12.4, 1, 'Anuradha', 2),
  mk('sun',       5, 29.1, 10, 'Uttara Phalguni', 1, { dignity: 'friend' }),
  mk('moon',      4, 18.7, 9,  'Ashlesha', 2, { dignity: 'friend' }),
  mk('mars',      6, 8.2,  11, 'Uttara Phalguni', 4, { dignity: 'neutral' }),
  mk('mercury',   5, 21.5, 10, 'Purva Phalguni', 4, { dignity: 'own_sign' }),
  mk('jupiter',   5, 4.6,  10, 'Magha', 2, { dignity: 'friend' }),
  mk('venus',     4, 14.0, 9,  'Pushya', 4, { dignity: 'friend' }),
  mk('saturn',    6, 1.8,  11, 'Uttara Phalguni', 2, { isRetrograde: true, dignity: 'friend' }),
  mk('rahu',      5, 9.3,  10, 'Magha', 3, { isRetrograde: true }),
  mk('ketu',      11, 9.3, 4,  'Shatabhisha', 1, { isRetrograde: true }),
];

const D9_PLANETS: PlanetPosition[] = [
  mk('ascendant', 3, 5.0,  1, 'Mrigashira', 3),
  mk('sun',       2, 12.0, 12, 'Rohini', 2),
  mk('moon',      11, 8.0, 9, 'Shatabhisha', 1),
  mk('mars',      9, 22.0, 7, 'Purva Ashadha', 4),
  mk('mercury',   8, 4.0,  6, 'Mula', 1),
  mk('jupiter',   1, 14.0, 11, 'Bharani', 4),
  mk('venus',     5, 27.0, 3, 'Uttara Phalguni', 1),
  mk('saturn',    12, 18.0, 10, 'Revati', 1),
  mk('rahu',      4, 0.0,  2, 'Punarvasu', 4),
  mk('ketu',      10, 0.0, 8, 'Uttara Ashadha', 2),
];

const buildVargas = (): DivisionalChart[] => {
  const meta: Array<{ varga: DivisionalChart['varga']; name: string; sig: string }> = [
    ['D1','Rasi','Body, overall life, self'],
    ['D2','Hora','Wealth, accumulation'],
    ['D3','Drekkana','Siblings, courage'],
    ['D4','Chaturthamsa','Property, fortune'],
    ['D7','Saptamsa','Children, progeny'],
    ['D9','Navamsha','Marriage, dharma, fruition'],
    ['D10','Dasamsa','Career, public life'],
    ['D12','Dwadasamsa','Parents, lineage'],
    ['D16','Shodasamsa','Vehicles, comforts'],
    ['D20','Vimsamsa','Spiritual practice'],
    ['D24','Chaturvimsamsa','Education, learning'],
    ['D27','Bhamsa','Strengths, weaknesses'],
    ['D30','Trimsamsa','Misfortunes, evils'],
    ['D40','Khavedamsa','Maternal legacy'],
    ['D45','Akshavedamsa','Paternal legacy'],
    ['D60','Shashtiamsa','Karmic refinement'],
  ].map(([v, n, s]) => ({ varga: v as DivisionalChart['varga'], name: n, sig: s }));

  return meta.map(({ varga, name, sig }) => ({
    varga,
    vargaName: name,
    significance: sig,
    ascendantSign: varga === 'D1' ? 8 : varga === 'D9' ? 3 : ((varga.charCodeAt(1) * 7) % 12) + 1,
    planets: varga === 'D1' ? D1_PLANETS : varga === 'D9' ? D9_PLANETS : D1_PLANETS.map(p => ({
      ...p, signNumber: ((p.signNumber + 3) % 12) + 1,
      signName: SIGN_NAMES[((p.signNumber + 3) % 12)],
    })),
  }));
};

const buildVimshottari = (): DashaSystem => {
  // Simplified Vimshottari starting from Ketu MD at birth (Moon in Ashlesha = Mercury... but stylized here)
  const sequence = [
    ['Mercury', 17], ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10],
    ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19],
  ] as const;
  let cursor = new Date('1980-08-15T14:30:00+05:30');
  const timeline: DashaPeriod[] = sequence.map(([planet, years]) => {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setFullYear(end.getFullYear() + years);
    cursor = new Date(end);
    return {
      level: 'maha', planet, durationYears: years,
      startDate: start.toISOString(), endDate: end.toISOString(),
    };
  });
  // Pick the maha containing today
  const now = Date.now();
  const current = timeline.find(p => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now) ?? timeline[0];

  // Build a simple Antar inside current
  const cStart = new Date(current.startDate).getTime();
  const cEnd = new Date(current.endDate).getTime();
  const slice = (cEnd - cStart) / 9;
  current.children = sequence.map(([planet], i) => ({
    level: 'antar', planet,
    durationYears: (current.durationYears) / 9,
    startDate: new Date(cStart + i * slice).toISOString(),
    endDate: new Date(cStart + (i + 1) * slice).toISOString(),
  }));

  return { system: 'vimshottari', currentMahaDasha: current, timeline };
};

const DOSHAS: Dosha[] = [
  {
    name: 'mangal', isPresent: true, severity: 'medium',
    explanation: 'Mars occupies the 4th house from Lagna in Kanya, creating moderate Mangal Dosha. Aspects from Jupiter mitigate severity.',
    affectedAreas: ['Marriage timing', 'Domestic harmony'],
    remedies: [
      { type: 'mantra', title: 'Mangal Beej Mantra', description: 'Recite "Om Kraam Kreem Kraum Sah Bhaumaya Namaha" 108 times on Tuesdays.', priority: 'high' },
      { type: 'donation', title: 'Tuesday Donation', description: 'Donate red lentils or jaggery on Tuesdays.', priority: 'medium' },
    ],
  },
  {
    name: 'kaal_sarp', isPresent: false, explanation: 'Planets are not entirely contained between Rahu and Ketu axis. No Kaal Sarp Dosha.',
    affectedAreas: [], remedies: [],
  },
  {
    name: 'sade_sati', isPresent: true, severity: 'low',
    explanation: 'Saturn is currently transiting the 12th from natal Moon — closing phase of Sade Sati. Effects are tapering.',
    affectedAreas: ['Mental fatigue', 'Long-distance travel'],
    remedies: [
      { type: 'ritual', title: 'Hanuman Chalisa', description: 'Recite Hanuman Chalisa daily, especially on Saturdays.', priority: 'high' },
    ],
  },
  {
    name: 'pitra', isPresent: false, explanation: 'No affliction to the Sun or 9th house from malefics. Pitra Dosha not indicated.', affectedAreas: [], remedies: [],
  },
];

const YOGAS: Yoga[] = [
  { name: 'Gajakesari Yoga', category: 'chandra', isPresent: true, strength: 'strong',
    formedBy: ['Jupiter in 10H', 'Moon in 9H — kendra from each other'],
    explanation: 'Jupiter and Moon are in mutual kendra positions, forming the classical Gajakesari Yoga.',
    effects: ['Fame and recognition', 'Strong intellect', 'Long-lasting reputation'] },
  { name: 'Budhaditya Yoga', category: 'sun', isPresent: true, strength: 'strong',
    formedBy: ['Sun & Mercury conjunct in 10H Simha'],
    explanation: 'Conjunction of Sun and Mercury within close orb.',
    effects: ['Sharp analytical mind', 'Success in communication-led careers'] },
  { name: 'Ruchaka Yoga', category: 'pancha_mahapurusha', isPresent: false, strength: 'weak',
    formedBy: [], explanation: 'Mars is not in own/exalted sign in a kendra.', effects: [] },
  { name: 'Hamsa Yoga', category: 'pancha_mahapurusha', isPresent: false, strength: 'weak',
    formedBy: [], explanation: 'Jupiter is in friendly sign but not own/exalted.', effects: [] },
  { name: 'Chandra-Mangal Yoga', category: 'dhana', isPresent: true, strength: 'moderate',
    formedBy: ['Moon and Mars in mutual aspect'],
    explanation: 'Wealth combination through dynamic action.',
    effects: ['Earnings through enterprise', 'Real estate gains'] },
  { name: 'Viparita Raja Yoga', category: 'raja', isPresent: true, strength: 'moderate',
    formedBy: ['Lord of 6 in 8'], explanation: 'Lords of dusthanas exchange producing reversal of fortune.',
    effects: ['Rises after struggle', 'Hidden support'] },
];

const ASHTAK: AshtakavargaData = {
  bhinna: {
    sun:     [3,2,4,5,7,4,3,2,5,4,6,3],
    moon:    [4,5,3,6,4,2,5,7,3,4,5,3],
    mars:    [2,3,5,4,3,6,2,4,5,3,2,4],
    mercury: [5,6,4,3,7,5,4,3,6,5,4,3],
    jupiter: [4,3,5,7,6,4,3,5,7,4,3,5],
    venus:   [3,4,6,5,4,7,3,2,5,4,6,3],
    saturn:  [2,3,4,5,3,4,2,5,3,4,5,3],
  },
  sarva: [23, 26, 31, 35, 34, 32, 22, 28, 34, 28, 31, 24],
};

export class MockProvider implements AstroProvider {
  name = 'mock';

  async generateKundli(details: BirthDetails): Promise<KundliData> {
    const charts = buildVargas();
    return {
      id: 'demo',
      birthDetails: details,
      generatedAt: new Date().toISOString(),
      ascendant: D1_PLANETS[0],
      panchang: {
        tithi: 'Krishna Paksha Chaturthi',
        vara: 'Shukravara (Friday)',
        nakshatra: 'Ashlesha',
        yoga: 'Variyana',
        karana: 'Bava',
        sunrise: '06:14',
        sunset: '19:08',
      },
      divisionalCharts: charts,
      dashas: [buildVimshottari()],
      doshas: DOSHAS,
      yogas: YOGAS,
      ashtakavarga: ASHTAK,
      raw: { source: 'mock' },
    };
  }

  async getCurrentTransits(): Promise<PlanetPosition[]> {
    return D1_PLANETS.filter(p => p.planet !== 'ascendant').map(p => ({
      ...p, signNumber: ((p.signNumber + 5) % 12) + 1, signName: SIGN_NAMES[((p.signNumber + 5) % 12)],
    }));
  }

  async isHealthy() { return true; }
}

export const DEMO_BIRTH: BirthDetails = {
  fullName: 'Demo Native',
  dateOfBirth: '1980-08-15',
  timeOfBirth: '14:30:00',
  placeOfBirth: {
    name: 'Ahmedabad, Gujarat, India',
    latitude: 23.0225, longitude: 72.5714,
    timezone: 'Asia/Kolkata', timezoneOffset: 5.5,
  },
  gender: 'other',
  ayanamsa: 'lahiri',
  houseSystem: 'whole_sign',
};
