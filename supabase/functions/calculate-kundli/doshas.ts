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

export interface DoshaCondition {
  rule: string;
  isMet: boolean;
  evidence?: string;
  citation?: string;
}

export interface Dosha {
  name: string;
  isPresent: boolean;
  severity?: 'low' | 'medium' | 'high' | 'cancelled';
  explanation: string;
  affectedAreas: string[];
  remedies: Remedy[];
  conditions?: DoshaCondition[];
  cancellations?: DoshaCondition[];
}

function find(planets: PlanetPos[], name: string): PlanetPos | undefined {
  return planets.find(p => p.planet === name);
}

// ─── Mangal Dosha ───────────────────────────────────────────────────────────

function mangalDosha(d1: PlanetPos[]): Dosha {
  const mars = find(d1, 'mars');
  if (!mars) return { name: 'mangal', isPresent: false, explanation: 'Mars not found.', affectedAreas: [], remedies: [] };

  const mangalHouses = [1, 2, 4, 7, 8, 12];

  // Build conditions
  const condLagna: DoshaCondition = {
    rule: 'Mars in 1/2/4/7/8/12 from Lagna',
    isMet: mangalHouses.includes(mars.houseNumber),
    evidence: `Mars in House ${mars.houseNumber} of ${mars.signName}`,
    citation: 'BPHS Ch. 80',
  };

  const conditions: DoshaCondition[] = [condLagna];
  const present = condLagna.isMet;

  // Build cancellations
  const jupiter = find(d1, 'jupiter');
  const jupAspects = jupiter ? [jupiter.houseNumber, ((jupiter.houseNumber + 4 - 1) % 12) + 1, ((jupiter.houseNumber + 6) % 12) + 1, ((jupiter.houseNumber + 8 - 1) % 12) + 1] : [];
  const jupAspectsMars = present && jupiter ? jupAspects.includes(mars.houseNumber) : false;
  const marsOwnExalted = present && (mars.dignity === 'own_sign' || mars.dignity === 'exalted');
  const mitigated = present && (jupAspectsMars || marsOwnExalted);

  const cancellations: DoshaCondition[] = [
    {
      rule: 'Jupiter aspects Mars',
      isMet: jupAspectsMars,
      evidence: jupAspectsMars && jupiter ? `Jupiter in H${jupiter.houseNumber} aspects H${mars.houseNumber}` : undefined,
      citation: 'BPHS Ch. 80',
    },
    {
      rule: 'Mars in own or exalted sign',
      isMet: marsOwnExalted,
      evidence: marsOwnExalted ? `Mars is ${mars.dignity} in ${mars.signName}` : undefined,
      citation: 'BPHS Ch. 80',
    },
  ];

  // Derive verdict (identical logic)
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
    conditions,
    cancellations,
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

  const kaalSarpTypes: Record<number, string> = {
    1: 'Anant', 2: 'Kulik', 3: 'Vasuki', 4: 'Shankhpal', 5: 'Padma', 6: 'Mahapadma',
    7: 'Takshak', 8: 'Karkotak', 9: 'Shankhchud', 10: 'Ghatak', 11: 'Vishdhar', 12: 'Sheshnag',
  };
  const ksType = allBetween ? (kaalSarpTypes[rahu.houseNumber] ?? 'Unknown') : '';

  // Build conditions
  const conditions: DoshaCondition[] = [
    {
      rule: 'All grahas hemmed between Rahu-Ketu axis',
      isMet: allBetween,
      evidence: allBetween
        ? `Rahu in H${rahu.houseNumber} (${rahu.signName}), Ketu in H${ketu.houseNumber} (${ketu.signName}) — all 7 planets enclosed`
        : `Planets are not entirely within the Rahu-Ketu arc`,
      citation: 'Phaladeepika',
    },
  ];

  // Cancellations: planet conjunct Rahu/Ketu breaks the hemming
  const conjunctNode = others.find(p => p.houseNumber === rahu.houseNumber || p.houseNumber === ketu.houseNumber);
  const cancellations: DoshaCondition[] = [
    {
      rule: 'A planet conjuncts Rahu or Ketu (breaks hemming)',
      isMet: allBetween && !!conjunctNode,
      evidence: conjunctNode ? `${conjunctNode.planet} conjuncts node in H${conjunctNode.houseNumber}` : undefined,
      citation: 'Phaladeepika',
    },
  ];

  return {
    name: 'kaal_sarp', isPresent: allBetween,
    severity: allBetween ? 'high' : undefined,
    explanation: allBetween
      ? `All planets are contained between the Rahu-Ketu axis, forming ${ksType} Kaal Sarp Dosha (Rahu in H${rahu.houseNumber}).`
      : 'Planets are not entirely contained between Rahu and Ketu axis. No Kaal Sarp Dosha.',
    affectedAreas: allBetween ? ['Sudden obstacles', 'Karmic delays', 'Ancestral issues'] : [],
    remedies: allBetween ? [
      { type: 'ritual', title: 'Kaal Sarp Puja', description: 'Perform Kaal Sarp Dosha Nivaran Puja at Trimbakeshwar.', priority: 'high' },
      { type: 'mantra', title: 'Rahu Mantra', description: 'Recite "Om Raam Rahave Namaha" 18,000 times in 40 days.', priority: 'medium' },
    ] : [],
    conditions,
    cancellations,
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

  // Build conditions
  const cond12th: DoshaCondition = {
    rule: 'Saturn transiting 12th from natal Moon',
    isMet: diff === 11,
    evidence: `Saturn in sign ${satSign}, Moon in sign ${moonSign} — offset ${diff === 11 ? '12th' : diff + 'th'}`,
    citation: 'Saravali, Ch. 35',
  };
  const cond1st: DoshaCondition = {
    rule: 'Saturn transiting over natal Moon (1st)',
    isMet: diff === 0,
    evidence: `Saturn in sign ${satSign}, Moon in sign ${moonSign} — same sign`,
    citation: 'Saravali, Ch. 35',
  };
  const cond2nd: DoshaCondition = {
    rule: 'Saturn transiting 2nd from natal Moon',
    isMet: diff === 1,
    evidence: `Saturn in sign ${satSign}, Moon in sign ${moonSign} — offset 2nd`,
    citation: 'Saravali, Ch. 35',
  };

  const conditions: DoshaCondition[] = [cond12th, cond1st, cond2nd];
  const active = cond12th.isMet || cond1st.isMet || cond2nd.isMet;

  // Cancellations: Saturn in own/exalted sign mitigates
  const saturnPlanet = saturn ?? find(d1, 'saturn');
  const satOwnExalted = active && saturnPlanet && (saturnPlanet.dignity === 'own_sign' || saturnPlanet.dignity === 'exalted');
  const cancellations: DoshaCondition[] = [
    {
      rule: 'Saturn in own or exalted sign',
      isMet: !!satOwnExalted,
      evidence: satOwnExalted && saturnPlanet ? `Saturn is ${saturnPlanet.dignity} in ${saturnPlanet.signName}` : undefined,
      citation: 'Saravali, Ch. 35',
    },
  ];

  // Derive verdict (identical logic)
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
    conditions,
    cancellations,
  };
}

// ─── Pitra Dosha ────────────────────────────────────────────────────────────

function pitraDosha(d1: PlanetPos[]): Dosha {
  const sun = find(d1, 'sun');
  const rahu = find(d1, 'rahu');
  if (!sun || !rahu) return { name: 'pitra', isPresent: false, explanation: 'Sun/Rahu not found.', affectedAreas: [], remedies: [] };

  // Build conditions
  const conjunct = sun.houseNumber === rahu.houseNumber;
  const saturn = find(d1, 'saturn');
  const ninthAfflicted = rahu.houseNumber === 9 || saturn?.houseNumber === 9;

  const condConjunct: DoshaCondition = {
    rule: 'Sun conjunct Rahu',
    isMet: conjunct,
    evidence: conjunct ? `Sun and Rahu both in H${sun.houseNumber}` : `Sun in H${sun.houseNumber}, Rahu in H${rahu.houseNumber}`,
    citation: 'Classical commentaries',
  };
  const condNinth: DoshaCondition = {
    rule: '9th house afflicted by Rahu or Saturn',
    isMet: ninthAfflicted,
    evidence: ninthAfflicted
      ? `${rahu.houseNumber === 9 ? 'Rahu' : ''}${rahu.houseNumber === 9 && saturn?.houseNumber === 9 ? ' & ' : ''}${saturn?.houseNumber === 9 ? 'Saturn' : ''} in 9th house`
      : 'No malefic in 9th house',
    citation: 'Classical commentaries',
  };

  const conditions: DoshaCondition[] = [condConjunct, condNinth];
  const present = condConjunct.isMet || condNinth.isMet;

  // Cancellations: Jupiter aspects 9th house or Sun
  const jupiter = find(d1, 'jupiter');
  const jupAspects9th = jupiter ? [jupiter.houseNumber, ((jupiter.houseNumber + 4 - 1) % 12) + 1, ((jupiter.houseNumber + 6) % 12) + 1, ((jupiter.houseNumber + 8 - 1) % 12) + 1].includes(9) : false;
  const cancellations: DoshaCondition[] = [
    {
      rule: 'Jupiter aspects 9th house',
      isMet: present && jupAspects9th,
      evidence: jupAspects9th && jupiter ? `Jupiter in H${jupiter.houseNumber} aspects 9th house` : undefined,
      citation: 'Classical commentaries',
    },
  ];

  // Derive verdict (identical logic)
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
    conditions,
    cancellations,
  };
}

// ─── Guru Chandal Dosha ─────────────────────────────────────────────────────

function guruChandalDosha(d1: PlanetPos[]): Dosha {
  const jupiter = find(d1, 'jupiter');
  const rahu = find(d1, 'rahu');
  if (!jupiter || !rahu) return { name: 'guru_chandal', isPresent: false, explanation: 'Jupiter/Rahu not found.', affectedAreas: [], remedies: [] };

  // Build conditions
  const present = jupiter.houseNumber === rahu.houseNumber;

  const conditions: DoshaCondition[] = [
    {
      rule: 'Jupiter conjunct Rahu',
      isMet: present,
      evidence: present
        ? `Jupiter and Rahu both in H${jupiter.houseNumber} (${jupiter.signName})`
        : `Jupiter in H${jupiter.houseNumber}, Rahu in H${rahu.houseNumber}`,
      citation: 'Phaladeepika',
    },
  ];

  // Cancellations: Jupiter in own/exalted sign, or Jupiter is strong (kendra lord)
  const jupOwnExalted = present && (jupiter.dignity === 'own_sign' || jupiter.dignity === 'exalted');
  const cancellations: DoshaCondition[] = [
    {
      rule: 'Jupiter in own or exalted sign',
      isMet: jupOwnExalted,
      evidence: jupOwnExalted ? `Jupiter is ${jupiter.dignity} in ${jupiter.signName}` : undefined,
      citation: 'Phaladeepika',
    },
  ];

  // Derive verdict (identical logic)
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
    conditions,
    cancellations,
  };
}

// ─── Shakat Dosha ───────────────────────────────────────────────────────────

function shakatDosha(d1: PlanetPos[]): Dosha {
  const jupiter = find(d1, 'jupiter');
  const moon = find(d1, 'moon');
  if (!jupiter || !moon) return { name: 'shakat', isPresent: false, explanation: 'Jupiter/Moon not found.', affectedAreas: [], remedies: [] };

  // Jupiter in 6th or 8th from Moon
  const diff = ((jupiter.houseNumber - moon.houseNumber + 12) % 12) + 1;

  // Build conditions
  const cond6th: DoshaCondition = {
    rule: 'Moon in 6th from Jupiter',
    isMet: diff === 6,
    evidence: `Jupiter in H${jupiter.houseNumber}, Moon in H${moon.houseNumber} — offset ${diff}`,
    citation: 'Brihat Jataka',
  };
  const cond8th: DoshaCondition = {
    rule: 'Moon in 8th from Jupiter',
    isMet: diff === 8,
    evidence: `Jupiter in H${jupiter.houseNumber}, Moon in H${moon.houseNumber} — offset ${diff}`,
    citation: 'Brihat Jataka',
  };

  const conditions: DoshaCondition[] = [cond6th, cond8th];
  const present = cond6th.isMet || cond8th.isMet;

  // Cancellations: Jupiter in kendra from Lagna cancels Shakat
  const asc = find(d1, 'ascendant');
  const jupKendra = asc ? [1, 4, 7, 10].includes(((jupiter.houseNumber - 1 + 12) % 12) + 1) : false;
  const cancellations: DoshaCondition[] = [
    {
      rule: 'Jupiter in kendra from Lagna',
      isMet: present && jupKendra,
      evidence: jupKendra ? `Jupiter in H${jupiter.houseNumber} (kendra)` : undefined,
      citation: 'Brihat Jataka',
    },
  ];

  // Derive verdict (identical logic)
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
    conditions,
    cancellations,
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
