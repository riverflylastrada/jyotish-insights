/**
 * Dosha detection — Mangal, Kaal Sarp, Sade Sati, Pitra, Guru Chandal, Shakat.
 */

import type { PlanetPos } from "./divisional.ts";

export interface Remedy {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Dosha {
  name: string;
  isPresent: boolean;
  severity?: 'low' | 'medium' | 'high' | 'cancelled';
  explanation: string;
  affectedAreas: string[];
  remedies: Remedy[];
}

function find(planets: PlanetPos[], name: string): PlanetPos | undefined {
  return planets.find(p => p.planet === name);
}

// ─── Mangal Dosha ───────────────────────────────────────────────────────────

function mangalDosha(d1: PlanetPos[]): Dosha {
  const mars = find(d1, 'mars');
  if (!mars) return { name: 'mangal', isPresent: false, explanation: 'Mars not found.', affectedAreas: [], remedies: [] };

  const mangalHouses = [1, 2, 4, 7, 8, 12];
  const present = mangalHouses.includes(mars.houseNumber);

  // Jupiter's aspect on Mars or Mars in own/exalted sign can mitigate
  const jupiter = find(d1, 'jupiter');
  const jupAspects = jupiter ? [jupiter.houseNumber, ((jupiter.houseNumber + 4 - 1) % 12) + 1, ((jupiter.houseNumber + 6) % 12) + 1, ((jupiter.houseNumber + 8 - 1) % 12) + 1] : [];
  const mitigated = present && (jupAspects.includes(mars.houseNumber) || mars.dignity === 'own_sign' || mars.dignity === 'exalted');

  const severity = present ? (mitigated ? 'low' : (mars.houseNumber === 7 || mars.houseNumber === 8 ? 'high' : 'medium')) : undefined;

  return {
    name: 'mangal', isPresent: present, severity: present ? severity : undefined,
    explanation: present
      ? `Mars occupies the ${mars.houseNumber}th house from Lagna in ${mars.signName}, creating ${severity} Mangal Dosha.${mitigated ? " Jupiter's aspect mitigates severity." : ''}`
      : 'Mars is not in houses 1, 2, 4, 7, 8, or 12 from Lagna. No Mangal Dosha.',
    affectedAreas: present ? ['Marriage timing', 'Domestic harmony'] : [],
    remedies: present ? [
      { type: 'mantra', title: 'Mangal Beej Mantra', description: 'Recite "Om Kraam Kreem Kraum Sah Bhaumaya Namaha" 108 times on Tuesdays.', priority: 'high' },
      { type: 'donation', title: 'Tuesday Donation', description: 'Donate red lentils or jaggery on Tuesdays.', priority: 'medium' },
    ] : [],
  };
}

// ─── Kaal Sarp Dosha ────────────────────────────────────────────────────────

function kaalSarpDosha(d1: PlanetPos[]): Dosha {
  const rahu = find(d1, 'rahu');
  const ketu = find(d1, 'ketu');
  if (!rahu || !ketu) return { name: 'kaal_sarp', isPresent: false, explanation: 'Rahu/Ketu not found.', affectedAreas: [], remedies: [] };

  // Check if all other planets are between Rahu and Ketu (using longitude)
  const rahuLon = rahu.longitude;
  const ketuLon = ketu.longitude;
  const others = d1.filter(p => !['rahu', 'ketu', 'ascendant'].includes(p.planet));

  let allBetween = true;
  for (const p of others) {
    const lon = p.longitude;
    if (rahuLon < ketuLon) {
      if (!(lon >= rahuLon && lon <= ketuLon)) { allBetween = false; break; }
    } else {
      if (!(lon >= rahuLon || lon <= ketuLon)) { allBetween = false; break; }
    }
  }

  // Also check the reverse direction
  if (!allBetween) {
    allBetween = true;
    for (const p of others) {
      const lon = p.longitude;
      if (ketuLon < rahuLon) {
        if (!(lon >= ketuLon && lon <= rahuLon)) { allBetween = false; break; }
      } else {
        if (!(lon >= ketuLon || lon <= rahuLon)) { allBetween = false; break; }
      }
    }
  }

  return {
    name: 'kaal_sarp', isPresent: allBetween,
    severity: allBetween ? 'high' : undefined,
    explanation: allBetween
      ? 'All planets are contained between the Rahu-Ketu axis, forming Kaal Sarp Dosha.'
      : 'Planets are not entirely contained between Rahu and Ketu axis. No Kaal Sarp Dosha.',
    affectedAreas: allBetween ? ['Sudden obstacles', 'Karmic delays', 'Ancestral issues'] : [],
    remedies: allBetween ? [
      { type: 'ritual', title: 'Kaal Sarp Puja', description: 'Perform Kaal Sarp Dosha Nivaran Puja at Trimbakeshwar.', priority: 'high' },
      { type: 'mantra', title: 'Rahu Mantra', description: 'Recite "Om Raam Rahave Namaha" 18,000 times in 40 days.', priority: 'medium' },
    ] : [],
  };
}

// ─── Sade Sati ──────────────────────────────────────────────────────────────

function sadeSati(d1: PlanetPos[], transitSaturnSign?: number): Dosha {
  const moon = find(d1, 'moon');
  const saturn = find(d1, 'saturn');
  if (!moon) return { name: 'sade_sati', isPresent: false, explanation: 'Moon not found.', affectedAreas: [], remedies: [] };

  // Use transit Saturn if provided, otherwise use natal Saturn position
  const satSign = transitSaturnSign ?? saturn?.signNumber;
  if (!satSign) return { name: 'sade_sati', isPresent: false, explanation: 'Saturn position unavailable.', affectedAreas: [], remedies: [] };

  const moonSign = moon.signNumber;
  const diff = ((satSign - moonSign + 12) % 12);
  const active = diff === 11 || diff === 0 || diff === 1; // 12th, same, 2nd from Moon

  let phase = '';
  if (diff === 11) phase = 'rising phase (Saturn transiting 12th from Moon)';
  else if (diff === 0) phase = 'peak phase (Saturn transiting over natal Moon)';
  else if (diff === 1) phase = 'setting phase (Saturn transiting 2nd from Moon)';

  return {
    name: 'sade_sati', isPresent: active,
    severity: active ? (diff === 0 ? 'high' : 'low') : undefined,
    explanation: active
      ? `Saturn is in ${phase} — Sade Sati active. Effects are ${diff === 0 ? 'at peak intensity' : 'tapering'}.`
      : 'Saturn is not transiting within one sign of natal Moon. No active Sade Sati.',
    affectedAreas: active ? ['Mental fatigue', 'Career pressure', 'Health concerns'] : [],
    remedies: active ? [
      { type: 'ritual', title: 'Hanuman Chalisa', description: 'Recite Hanuman Chalisa daily, especially on Saturdays.', priority: 'high' },
      { type: 'donation', title: 'Saturday Charity', description: 'Donate black sesame, mustard oil, or iron items on Saturdays.', priority: 'medium' },
    ] : [],
  };
}

// ─── Pitra Dosha ────────────────────────────────────────────────────────────

function pitraDosha(d1: PlanetPos[]): Dosha {
  const sun = find(d1, 'sun');
  const rahu = find(d1, 'rahu');
  if (!sun || !rahu) return { name: 'pitra', isPresent: false, explanation: 'Sun/Rahu not found.', affectedAreas: [], remedies: [] };

  // Sun conjunct Rahu, or 9th house afflicted by Rahu/Saturn
  const conjunct = sun.houseNumber === rahu.houseNumber;
  const saturn = find(d1, 'saturn');
  const ninthAfflicted = rahu.houseNumber === 9 || saturn?.houseNumber === 9;

  const present = conjunct || ninthAfflicted;

  return {
    name: 'pitra', isPresent: present,
    severity: present ? (conjunct ? 'high' : 'medium') : undefined,
    explanation: present
      ? conjunct
        ? 'Sun is conjunct Rahu, indicating Pitra Dosha — ancestral karmic debt.'
        : 'The 9th house is afflicted by malefics, indicating mild Pitra Dosha.'
      : 'No affliction to the Sun or 9th house from malefics. Pitra Dosha not indicated.',
    affectedAreas: present ? ['Ancestral blessings blocked', 'Father\'s health', 'Progeny issues'] : [],
    remedies: present ? [
      { type: 'ritual', title: 'Pitra Tarpan', description: 'Perform Tarpan rituals during Pitru Paksha.', priority: 'high' },
      { type: 'donation', title: 'Feed Brahmins', description: 'Offer food to Brahmins on Amavasya.', priority: 'medium' },
    ] : [],
  };
}

// ─── Guru Chandal Dosha ─────────────────────────────────────────────────────

function guruChandalDosha(d1: PlanetPos[]): Dosha {
  const jupiter = find(d1, 'jupiter');
  const rahu = find(d1, 'rahu');
  if (!jupiter || !rahu) return { name: 'guru_chandal', isPresent: false, explanation: 'Jupiter/Rahu not found.', affectedAreas: [], remedies: [] };

  const present = jupiter.houseNumber === rahu.houseNumber;

  return {
    name: 'guru_chandal', isPresent: present,
    severity: present ? 'medium' : undefined,
    explanation: present
      ? `Jupiter is conjunct Rahu in H${jupiter.houseNumber}, forming Guru Chandal Dosha — wisdom clouded by illusion.`
      : 'Jupiter and Rahu are not conjunct. No Guru Chandal Dosha.',
    affectedAreas: present ? ['Spiritual confusion', 'Wrong guidance', 'Ethical lapses'] : [],
    remedies: present ? [
      { type: 'mantra', title: 'Guru Beej Mantra', description: 'Recite "Om Graam Greem Graum Sah Gurave Namaha" 108 times on Thursdays.', priority: 'high' },
    ] : [],
  };
}

// ─── Shakat Dosha ───────────────────────────────────────────────────────────

function shakatDosha(d1: PlanetPos[]): Dosha {
  const jupiter = find(d1, 'jupiter');
  const moon = find(d1, 'moon');
  if (!jupiter || !moon) return { name: 'shakat', isPresent: false, explanation: 'Jupiter/Moon not found.', affectedAreas: [], remedies: [] };

  // Jupiter in 6th or 8th from Moon
  const diff = ((jupiter.houseNumber - moon.houseNumber + 12) % 12) + 1;
  const present = diff === 6 || diff === 8;

  return {
    name: 'shakat', isPresent: present,
    severity: present ? 'medium' : undefined,
    explanation: present
      ? `Jupiter is in ${diff}th from Moon, forming Shakat Dosha — ups and downs in fortune.`
      : 'Jupiter is not in 6th or 8th from Moon. No Shakat Dosha.',
    affectedAreas: present ? ['Fluctuating fortune', 'Instability in progress'] : [],
    remedies: present ? [
      { type: 'mantra', title: 'Vishnu Sahasranama', description: 'Recite Vishnu Sahasranama on Thursdays.', priority: 'medium' },
    ] : [],
  };
}

// ─── Public ─────────────────────────────────────────────────────────────────

export function detectDoshas(d1: PlanetPos[]): Dosha[] {
  return [
    mangalDosha(d1),
    kaalSarpDosha(d1),
    sadeSati(d1),
    pitraDosha(d1),
    guruChandalDosha(d1),
    shakatDosha(d1),
  ];
}
