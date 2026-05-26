export type PlanetName =
  | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu' | 'ascendant';

export interface BirthDetails {
  fullName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timezoneOffset: number;
  };
  gender?: 'male' | 'female' | 'other';
  ayanamsa: 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';
  houseSystem: 'whole_sign' | 'placidus' | 'koch' | 'equal';
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
}

export type VargaCode =
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D9' | 'D10' | 'D12'
  | 'D16' | 'D20' | 'D24' | 'D27' | 'D30' | 'D40' | 'D45' | 'D60';

export interface DivisionalChart {
  varga: VargaCode;
  vargaName: string;
  significance: string;
  ascendantSign: number;
  planets: PlanetPosition[];
}

export interface DashaPeriod {
  level: 'maha' | 'antar' | 'pratyantar' | 'sookshma' | 'prana';
  planet: string;
  startDate: string;
  endDate: string;
  durationYears: number;
  children?: DashaPeriod[];
}

export interface DashaSystem {
  system: 'vimshottari' | 'yogini' | 'char' | 'ashtottari' | 'kalachakra';
  currentMahaDasha: DashaPeriod;
  timeline: DashaPeriod[];
}

export interface Remedy {
  type: 'gemstone' | 'mantra' | 'yantra' | 'donation' | 'ritual' | 'lifestyle';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Dosha {
  name: 'mangal' | 'kaal_sarp' | 'sade_sati' | 'pitra' | 'guru_chandal' | 'shakat';
  isPresent: boolean;
  severity?: 'low' | 'medium' | 'high' | 'cancelled';
  explanation: string;
  affectedAreas: string[];
  remedies: Remedy[];
}

export interface Yoga {
  name: string;
  category: 'raja' | 'dhana' | 'pancha_mahapurusha' | 'nabhasa' | 'chandra' | 'sun' | 'other';
  isPresent: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  formedBy: string[];
  explanation: string;
  effects: string[];
}

export interface AshtakavargaData {
  bhinna: Record<string, number[]>;
  sarva: number[];
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
export const CURRENT_SNAPSHOT_VERSION = 9;

export interface KundliData {
  id: string;
  /** Engine version that produced this snapshot (see CURRENT_SNAPSHOT_VERSION). */
  snapshotVersion?: number;
  birthDetails: BirthDetails;
  generatedAt: string;
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
  bhavaBala?: BhavaBalaData;
  kp?: KpData;
  jaimini?: JaiminiData;
  varshphal?: VarshphalData;
  raw: unknown;
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
