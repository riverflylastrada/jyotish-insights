export type PlanetName =
  | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu' | 'ascendant';

export type ChartBasis = 'rasi' | 'solar' | 'moon' | 'horary';

export interface BirthDetails {
  fullName: string;
  dateOfBirth: string;
  timeOfBirth?: string;
  placeOfBirth: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneOffset: number;
  };
  gender?: 'male' | 'female' | 'other';
  ayanamsa: 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';
  houseSystem: 'whole_sign' | 'placidus' | 'koch' | 'sripati' | 'equal';
  chartBasis?: ChartBasis;
  horaryNumber?: number;
}

export type BaladiState = 'bala' | 'kumara' | 'yuva' | 'vriddha' | 'mrita';
export type JagradadiState = 'jagrat' | 'swapna' | 'sushupti';
export type DeeptadiState = 'deepta' | 'swastha' | 'pramudita' | 'shanta' | 'shakta' | 'peedita' | 'dina' | 'vikala' | 'khala';

export interface AvasthasData {
  baladi: BaladiState;
  baladiCitation: string;
  jagradadi: JagradadiState;
  jagradadiCitation: string;
  deeptadi: DeeptadiState;
  deeptadiCitation: string;
}

export interface PlanetPosition {
  planet: PlanetName;
  longitude: number;
  signNumber: number;
  signName: string;
  signDegree: number;
  nakshatra: string;
  nakshatraPada: 1 | 2 | 3 | 4;
  houseNumber: number;
  isRetrograde: boolean;
  isCombust: boolean;
  speed?: number;
  dignity?: 'exalted' | 'debilitated' | 'own_sign' | 'mooltrikona' | 'friend' | 'neutral' | 'enemy';
  avasthas?: AvasthasData;
}

export type VargaCode =
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D9' | 'D10' | 'D12'
  | 'D16' | 'D20' | 'D24' | 'D27' | 'D30' | 'D40' | 'D45' | 'D60'
  | 'D81' | 'D108' | 'D144';

export interface DivisionalChart {
  varga: VargaCode;
  vargaName: string;
  significance: string;
  ascendantSign: number;
  planets: PlanetPosition[];
}

export interface DashaPeriod {
  // Engine computes three levels: Maha → Antar → Pratyantar.
  level: 'maha' | 'antar' | 'pratyantar';
  planet: string;
  startDate: string;
  endDate: string;
  durationYears: number;
  children?: DashaPeriod[];
}

export interface DashaSystem {
  system: 'vimshottari' | 'yogini' | 'char' | 'ashtottari' | 'kalachakra' | 'narayana' | 'lagna_kendradi' | 'sudasa' | 'drigdasa' | 'shoola' | 'dwisaptati' | 'shat_trimsa';
  currentMahaDasha: DashaPeriod;
  timeline: DashaPeriod[];
}

export interface Remedy {
  type: 'gemstone' | 'mantra' | 'yantra' | 'donation' | 'ritual' | 'lifestyle';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DoshaCondition {
  rule: string;
  isMet: boolean;
  evidence?: string;
  citation?: string;
}

export interface Dosha {
  name: 'mangal' | 'kaal_sarp' | 'sade_sati' | 'pitra' | 'guru_chandal' | 'shakat';
  isPresent: boolean;
  severity?: 'low' | 'medium' | 'high' | 'cancelled';
  explanation: string;
  affectedAreas: string[];
  remedies: Remedy[];
  conditions?: DoshaCondition[];
  cancellations?: DoshaCondition[];
}

export interface Yoga {
  name: string;
  category: 'raja' | 'dhana' | 'pancha_mahapurusha' | 'nabhasa' | 'chandra' | 'sun' | 'aristha' | 'daridra' | 'sanyasa' | 'other';
  isPresent: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  formedBy: string[];
  explanation: string;
  effects: string[];
}

export type ContribRef = 'lagna' | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn';

export interface ContributingPosition {
  fromReference: ContribRef;
  relativeSign: number; // 1..12
  rule: string;
  citation: string;
}

export interface HouseAttribution {
  house: number; // 1..12
  contributingPositions: ContributingPosition[];
}

export interface AshtakavargaData {
  bhinna: Record<string, number[]>;
  sarva: number[];
  attribution?: Record<string, HouseAttribution[]>;
}

export interface KpHouseSignificatorData {
  house: number;
  levelA: string[];
  levelB: string[];
  levelC: string[];
  levelD: string[];
  nodesActingFor: string[];
  ordered: string[];
}

export interface KpData {
  planetSubLords: Array<{
    planet: string;
    signLord: string;
    starLord: string;
    subLord: string;
  }>;
  cuspalSubLords?: Array<{
    cusp: number;
    longitude: number;
    signLord: string;
    starLord: string;
    subLord: string;
  }>;
  rulingPlanets?: {
    ascSignLord: string;
    ascStarLord: string;
    moonSignLord: string;
    moonStarLord: string;
    dayLord: string;
  };
  houseSignificators?: KpHouseSignificatorData[];
}

export interface SubBalasData {
  sthana?: { uchcha: number; saptavargeeya: number; ojhayugma: number; kendra: number; drekkana: number };
  dig?: { fromCardinal: number; idealDirection: 'east' | 'south' | 'west' | 'north'; offset: number };
  kala?: { nathonnatha: number; paksha: number; tribhaga: number; varsha: number; masa: number; vara: number; hora: number; ayana: number; yuddha: number };
  cheshta?: { motionFactor: number };
  naisargika?: { source: string };
  drik?: { fromPlanet: Record<string, number> };
}

export interface PlanetShadbalaData {
  sthanaBala: number;
  digBala: number;
  kalaBala: number;
  cheshtaBala: number;
  naisargikaBala: number;
  drikBala: number;
  totalVirupas: number;
  totalRupas: number;
  required: number;
  ratio: number;
  ishtaPhala: number;
  kashtaPhala: number;
  subBalas?: SubBalasData;
}

export interface PlanetVimsopakaData {
  score: number;
  count: number;
  charts: string;
}

export interface VimsopakaData {
  planets: Record<string, PlanetVimsopakaData>;
}

export interface ShadbalaData {
  planets: Record<string, PlanetShadbalaData>;
  rank: string[];
}

export interface HouseBhavaBalaData {
  house: number;
  bhavadhipathiBala: number;
  bhavaDigBala: number;
  bhavaDrikBala: number;
  totalVirupas: number;
  totalRupas: number;
}

export interface BhavaBalaData {
  houses: HouseBhavaBalaData[];
  rank: number[];
}

export interface SpecialLagnaData {
  name: string;
  longitude: number;
  sign: number;
  signName: string;
  degree: number;
}

export interface VargeeyaBalaData {
  panchaVargeeya: Record<string, number>;
  dwadasaVargeeya: Record<string, number>;
}

export interface ArgalaHouseData {
  house: number;
  argala: {
    from2nd: string[];
    from4th: string[];
    from5th: string[];
    from11th: string[];
  };
  virodha: {
    from12th: string[];
    from10th: string[];
    from9th: string[];
    from3rd: string[];
  };
}

export interface JaiminiData {
  charaKarakas: Array<{
    planet: string;
    degreeInSign: number;
    karaka: string;
  }>;
  atmakaraka: string;
  karakamsa: { sign: number; signName: string };
  arudhaPadas: Array<{
    house: number;
    label: string;
    sign: number;
    signName: string;
  }>;
  charaDasha?: {
    timeline: Array<{
      sign: number;
      signName: string;
      startDate: string;
      endDate: string;
      durationYears: number;
    }>;
    currentSign?: number;
    currentSignName?: string;
  };
  specialLagnas?: SpecialLagnaData[];
  argala?: ArgalaHouseData[];
}

export interface VarshphalPlanetData {
  planet: string;
  longitude: number;
  signNumber: number;
  signName: string;
  signDegree: number;
  nakshatra: string;
  nakshatraPada: 1 | 2 | 3 | 4;
  houseNumber: number;
  isRetrograde: boolean;
}

export interface TajikPairYogaData {
  yoga: 'ithasala' | 'eesarpha';
  planet1: string;
  planet2: string;
  /** 1 = Varthamaana, 2 = Poorna, 3 = Bhavishya (Ithasala only). */
  ithasalaType?: 1 | 2 | 3;
}

export interface TajikTripleYogaData {
  yoga: 'nakta' | 'yamaya';
  mediator: string;
  planet1: string;
  planet2: string;
}

export interface TajikYogaResultData {
  ithasala: TajikPairYogaData[];
  eesarpha: TajikPairYogaData[];
  nakta: TajikTripleYogaData[];
  yamaya: TajikTripleYogaData[];
  ishkavala: boolean;
  induvara: boolean;
}

export interface VarshphalData {
  /** Years elapsed since birth for this annual chart. */
  years: number;
  /** Julian Day of the Varsha Pravesh (solar return) instant. */
  varshaPraveshJd: number;
  /** Annual chart ascendant sign (1–12). */
  annualAscSign: number;
  /** Annual chart ascendant degree within sign. */
  annualAscDeg: number;
  /** All 9 planet positions in the annual chart. */
  planets: VarshphalPlanetData[];
  /** Muntha sign (1–12). */
  munthaSign: number;
  /** Muntha's house placement in the annual chart. */
  munthaHouse: number;
  /** Year Lord (Varshesh) planet name (Panchadhikari method). */
  yearLord: string;
  /** Tajik yogas detected on the annual chart. */
  tajikYogas?: TajikYogaResultData;
}

/**
 * Current engine snapshot version. Saved chart snapshots older than this
 * (or with no version) are automatically recalculated on next load.
 * Bump this whenever the snapshot gains new data, and keep it in sync with
 * `snapshotVersion` stamped in supabase/functions/calculate-kundli/engine.ts.
 */
export const CURRENT_SNAPSHOT_VERSION = 22;

export interface KundliData {
  id: string;
  /** Engine version that produced this snapshot (see CURRENT_SNAPSHOT_VERSION). */
  snapshotVersion?: number;
  birthDetails: BirthDetails;
  generatedAt: string;
  chartBasis?: ChartBasis;
  moonSignUncertain?: boolean;
  ascendant: PlanetPosition;
  panchang: {
    tithi: string;
    vara: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    sunrise: string;
    sunset: string;
  };
  divisionalCharts: DivisionalChart[];
  dashas: DashaSystem[];
  doshas: Dosha[];
  yogas: Yoga[];
  ashtakavarga: AshtakavargaData;
  shadbala?: ShadbalaData;
  vimsopakaBala?: VimsopakaData;
  bhavaBala?: BhavaBalaData;
  kp?: KpData;
  jaimini?: JaiminiData;
  varshphal?: VarshphalData;
  vargeeyaBala?: VargeeyaBalaData;
  saturnTransits?: SaturnTransitsData;
  sarvatobhadra?: SarvatobhadraData;
  autoInsights?: {
    generatedAt: string;
    model: string;
    planets: Record<PlanetName, { brief: string; full: string }>;
    dashas: Array<{ system: string; level: 'maha' | 'antar'; lord: string; period: string; reading: string }>;
    yogas: Record<string, string>;
    doshas: Record<string, string>;
    houses: Record<1|2|3|4|5|6|7|8|9|10|11|12, string>;
  };
  raw: unknown;
}

// ─── Saturn Transits ────────────────────────────────────────────────────────

export interface SadeSatiPeriod {
  phase: 1 | 2 | 3;
  phaseLabel: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  saturnSign: number;
  saturnSignName: string;
  basis: 'sign' | 'degree';
  isActive: boolean;
}

export interface SaturnTransitPeriod {
  type: 'kantaka' | 'ashtama';
  reference: 'moon' | 'ascendant';
  houseFromRef: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  saturnSign: number;
  saturnSignName: string;
  isActive: boolean;
}

export interface SaturnTransitsData {
  natalMoonSign: number;
  natalMoonSignName: string;
  natalMoonLongitude: number;
  natalAscSign: number;
  natalAscSignName: string;
  sadeSatiSign: SadeSatiPeriod[];
  sadeSatiDegree: SadeSatiPeriod[];
  kantakaMoon: SaturnTransitPeriod[];
  kantakaAsc: SaturnTransitPeriod[];
  ashtamaMoon: SaturnTransitPeriod[];
  ashtamaAsc: SaturnTransitPeriod[];
// ─── Sarvatobhadra Chakra ─────────────────────────────────────────────────────

export type SbcCellType = 'nakshatra' | 'rashi' | 'vowel' | 'consonant' | 'weekday' | 'tithi' | 'empty';

export interface SbcCell {
  row: number;
  col: number;
  type: SbcCellType;
  label: string;
  nakshatraIdx: number;
  rashiNum: number;
  planets: string[];
}

export interface TaraGroupData {
  group: string;
  nakshatraIdx: number;
  nakshatraName: string;
}

export interface JhoraTypeData {
  type: string;
  fromMoon: { nakshatraIdx: number; nakshatraName: string };
  fromLagna: { nakshatraIdx: number; nakshatraName: string };
}

export interface VedhaData {
  transitPlanet: string;
  transitNakshatra: string;
  natalPoint: string;
  natalNakshatra: string;
  isVedha: boolean;
}

export interface SarvatobhadraData {
  grid: SbcCell[][];
  natalPlacements: Array<{ planet: string; nakshatraIdx: number; nakshatraName: string; row: number; col: number }>;
  taraFromMoon: TaraGroupData[];
  taraFromLagna: TaraGroupData[];
  jhoraTypes: JhoraTypeData[];
  vedha: VedhaData[];
  citation: string;
}

export interface AstroProvider {
  name: string;
  generateKundli(details: BirthDetails): Promise<KundliData>;
  getCurrentTransits(latitude: number, longitude: number): Promise<PlanetPosition[]>;
  isHealthy(): Promise<boolean>;
}

export const SIGN_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

export const SIGN_NAMES_DEVA = [
  'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
] as const;

export const PLANET_LABELS: Record<PlanetName, { short: string; full: string; deva: string }> = {
  sun:       { short: 'Su', full: 'Sun',       deva: 'सूर्य' },
  moon:      { short: 'Mo', full: 'Moon',      deva: 'चंद्र' },
  mars:      { short: 'Ma', full: 'Mars',      deva: 'मंगल' },
  mercury:   { short: 'Me', full: 'Mercury',   deva: 'बुध' },
  jupiter:   { short: 'Ju', full: 'Jupiter',   deva: 'गुरु' },
  venus:     { short: 'Ve', full: 'Venus',     deva: 'शुक्र' },
  saturn:    { short: 'Sa', full: 'Saturn',    deva: 'शनि' },
  rahu:      { short: 'Ra', full: 'Rahu',      deva: 'राहु' },
  ketu:      { short: 'Ke', full: 'Ketu',      deva: 'केतु' },
  ascendant: { short: 'As', full: 'Ascendant', deva: 'लग्न' },
};
