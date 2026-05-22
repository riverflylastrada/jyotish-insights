/**
 * Yoga detection — 15+ classical yogas.
 */

import type { PlanetPos } from "./divisional.ts";
import { getSignLord } from "./vedic.ts";

export interface Yoga {
  name: string;
  category: string;
  isPresent: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  formedBy: string[];
  explanation: string;
  effects: string[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function find(planets: PlanetPos[], name: string): PlanetPos | undefined {
  return planets.find(p => p.planet === name);
}

function kendras(house: number): boolean { return [1, 4, 7, 10].includes(house); }
function trikonas(house: number): boolean { return [1, 5, 9].includes(house); }
function dusthanas(house: number): boolean { return [6, 8, 12].includes(house); }

function housesApart(h1: number, h2: number): number {
  return ((h2 - h1 + 12) % 12) || 12;
}

function inKendraFrom(h1: number, h2: number): boolean {
  const diff = housesApart(h1, h2);
  return [1, 4, 7, 10].includes(diff);
}

// ─── Yoga detectors ─────────────────────────────────────────────────────────

export function detectYogas(d1: PlanetPos[]): Yoga[] {
  const yogas: Yoga[] = [];
  const moon = find(d1, 'moon');
  const sun = find(d1, 'sun');
  const jupiter = find(d1, 'jupiter');
  const mercury = find(d1, 'mercury');
  const mars = find(d1, 'mars');
  const venus = find(d1, 'venus');
  const saturn = find(d1, 'saturn');
  const rahu = find(d1, 'rahu');
  const ketu = find(d1, 'ketu');

  // Gajakesari Yoga: Jupiter in kendra from Moon
  if (moon && jupiter && inKendraFrom(moon.houseNumber, jupiter.houseNumber)) {
    yogas.push({
      name: 'Gajakesari Yoga', category: 'chandra', isPresent: true,
      strength: kendras(jupiter.houseNumber) ? 'strong' : 'moderate',
      formedBy: [`Jupiter in H${jupiter.houseNumber}`, `Moon in H${moon.houseNumber} — kendra from each other`],
      explanation: 'Jupiter and Moon are in mutual kendra positions, forming the classical Gajakesari Yoga.',
      effects: ['Fame and recognition', 'Strong intellect', 'Long-lasting reputation'],
    });
  } else {
    yogas.push({ name: 'Gajakesari Yoga', category: 'chandra', isPresent: false, strength: 'weak', formedBy: [], explanation: 'Jupiter is not in a kendra from Moon.', effects: [] });
  }

  // Budhaditya Yoga: Sun + Mercury in same house
  if (sun && mercury && sun.houseNumber === mercury.houseNumber) {
    yogas.push({
      name: 'Budhaditya Yoga', category: 'sun', isPresent: true,
      strength: mercury.isCombust ? 'moderate' : 'strong',
      formedBy: [`Sun & Mercury conjunct in H${sun.houseNumber} ${sun.signName}`],
      explanation: 'Conjunction of Sun and Mercury within close orb.',
      effects: ['Sharp analytical mind', 'Success in communication-led careers'],
    });
  } else {
    yogas.push({ name: 'Budhaditya Yoga', category: 'sun', isPresent: false, strength: 'weak', formedBy: [], explanation: 'Sun and Mercury are not conjunct.', effects: [] });
  }

  // Pancha Mahapurusha Yogas (5)
  const pmyList: Array<{ name: string; planet: PlanetPos | undefined; ownSigns: number[]; exaltSign: number }> = [
    { name: 'Ruchaka Yoga', planet: mars, ownSigns: [1, 8], exaltSign: 10 },
    { name: 'Bhadra Yoga', planet: mercury, ownSigns: [3, 6], exaltSign: 6 },
    { name: 'Hamsa Yoga', planet: jupiter, ownSigns: [9, 12], exaltSign: 4 },
    { name: 'Malavya Yoga', planet: venus, ownSigns: [2, 7], exaltSign: 12 },
    { name: 'Sasa Yoga', planet: saturn, ownSigns: [10, 11], exaltSign: 7 },
  ];
  for (const { name, planet: pl, ownSigns, exaltSign } of pmyList) {
    const inKendra = pl && kendras(pl.houseNumber);
    const inOwnOrExalted = pl && (ownSigns.includes(pl.signNumber) || pl.signNumber === exaltSign);
    const present = !!(inKendra && inOwnOrExalted);
    yogas.push({
      name, category: 'pancha_mahapurusha', isPresent: present,
      strength: present ? 'strong' : 'weak',
      formedBy: present && pl ? [`${pl.planet} in own/exalted sign in H${pl.houseNumber}`] : [],
      explanation: present ? `${name} formed — planet in own/exalted sign in a kendra.` : `Planet not in own/exalted sign in a kendra.`,
      effects: present ? ['Power, authority, and fame'] : [],
    });
  }

  // Chandra-Mangal Yoga: Moon + Mars conjunct or mutual aspect
  if (moon && mars) {
    const conjunct = moon.houseNumber === mars.houseNumber;
    const aspect = housesApart(moon.houseNumber, mars.houseNumber) === 7;
    if (conjunct || aspect) {
      yogas.push({
        name: 'Chandra-Mangal Yoga', category: 'dhana', isPresent: true, strength: 'moderate',
        formedBy: [conjunct ? 'Moon and Mars conjunct' : 'Moon and Mars in mutual aspect'],
        explanation: 'Wealth combination through dynamic action.',
        effects: ['Earnings through enterprise', 'Real estate gains'],
      });
    } else {
      yogas.push({ name: 'Chandra-Mangal Yoga', category: 'dhana', isPresent: false, strength: 'weak', formedBy: [], explanation: 'Moon and Mars are not conjunct or aspecting.', effects: [] });
    }
  }

  // Viparita Raja Yoga: lords of 6/8/12 placed in 6/8/12
  {
    const asc = find(d1, 'ascendant');
    if (asc) {
      const lord6 = getSignLord(((asc.signNumber + 5 - 1) % 12) + 1);
      const lord8 = getSignLord(((asc.signNumber + 7 - 1) % 12) + 1);
      const lord12 = getSignLord(((asc.signNumber + 11 - 1) % 12) + 1);
      const dusthanaLords = [lord6, lord8, lord12];
      const inDust = dusthanaLords.some(l => {
        const pl = find(d1, l);
        return pl && dusthanas(pl.houseNumber);
      });
      yogas.push({
        name: 'Viparita Raja Yoga', category: 'raja', isPresent: inDust,
        strength: inDust ? 'moderate' : 'weak',
        formedBy: inDust ? ['Lord of dusthana placed in another dusthana'] : [],
        explanation: inDust ? 'Lords of dusthanas exchange producing reversal of fortune.' : 'No dusthana lords in dusthana houses.',
        effects: inDust ? ['Rises after struggle', 'Hidden support'] : [],
      });
    }
  }

  // Dhana Yoga: lords of 1/2/5/9/11 interconnected in kendras/trikonas
  {
    const asc = find(d1, 'ascendant');
    if (asc) {
      const lord2 = getSignLord(((asc.signNumber + 1 - 1) % 12) + 1);
      const lord11 = getSignLord(((asc.signNumber + 10 - 1) % 12) + 1);
      const pl2 = find(d1, lord2);
      const pl11 = find(d1, lord11);
      const present = !!((pl2 && (kendras(pl2.houseNumber) || trikonas(pl2.houseNumber))) ||
        (pl11 && (kendras(pl11.houseNumber) || trikonas(pl11.houseNumber))));
      yogas.push({
        name: 'Dhana Yoga', category: 'dhana', isPresent: present,
        strength: present ? 'moderate' : 'weak',
        formedBy: present ? ['Wealth lords well-placed'] : [],
        explanation: present ? 'Lords of wealth houses placed in kendras or trikonas.' : 'Wealth house lords not strongly placed.',
        effects: present ? ['Financial prosperity', 'Material gains'] : [],
      });
    }
  }

  // Amala Yoga: benefic in 10th house from Lagna
  {
    const in10 = d1.filter(p => p.houseNumber === 10 && ['jupiter', 'venus', 'mercury', 'moon'].includes(p.planet));
    const present = in10.length > 0;
    yogas.push({
      name: 'Amala Yoga', category: 'other', isPresent: present,
      strength: present ? 'moderate' : 'weak',
      formedBy: present ? in10.map(p => `${p.planet} in H10`) : [],
      explanation: present ? 'Natural benefic in the 10th house gives good reputation.' : 'No natural benefic in the 10th house.',
      effects: present ? ['Good reputation', 'Ethical conduct'] : [],
    });
  }

  // Sunapha Yoga: planet (not Sun) in 2nd from Moon
  if (moon) {
    const h2 = (moon.houseNumber % 12) + 1;
    const in2 = d1.filter(p => p.houseNumber === h2 && p.planet !== 'sun' && p.planet !== 'ascendant' && p.planet !== 'rahu' && p.planet !== 'ketu');
    yogas.push({
      name: 'Sunapha Yoga', category: 'chandra', isPresent: in2.length > 0,
      strength: in2.length > 0 ? 'moderate' : 'weak',
      formedBy: in2.map(p => `${p.planet} in 2nd from Moon`),
      explanation: in2.length > 0 ? 'Planet in 2nd from Moon gives self-made wealth.' : 'No planet in 2nd from Moon.',
      effects: in2.length > 0 ? ['Self-made prosperity'] : [],
    });
  }

  // Anapha Yoga: planet (not Sun) in 12th from Moon
  if (moon) {
    const h12 = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const in12 = d1.filter(p => p.houseNumber === h12 && p.planet !== 'sun' && p.planet !== 'ascendant' && p.planet !== 'rahu' && p.planet !== 'ketu');
    yogas.push({
      name: 'Anapha Yoga', category: 'chandra', isPresent: in12.length > 0,
      strength: in12.length > 0 ? 'moderate' : 'weak',
      formedBy: in12.map(p => `${p.planet} in 12th from Moon`),
      explanation: in12.length > 0 ? 'Planet in 12th from Moon gives royal comforts.' : 'No planet in 12th from Moon.',
      effects: in12.length > 0 ? ['Regal bearing', 'Comfortable life'] : [],
    });
  }

  // Kemadruma Yoga: no planet in 2nd or 12th from Moon (excluding Sun, nodes)
  if (moon) {
    const h2 = (moon.houseNumber % 12) + 1;
    const h12 = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const any2or12 = d1.some(p => !excluded.includes(p.planet) && (p.houseNumber === h2 || p.houseNumber === h12));
    yogas.push({
      name: 'Kemadruma Yoga', category: 'chandra', isPresent: !any2or12,
      strength: !any2or12 ? 'strong' : 'weak',
      formedBy: !any2or12 ? ['No planet in 2nd or 12th from Moon'] : [],
      explanation: !any2or12 ? 'Moon is isolated — potential for poverty and struggle.' : 'Kemadruma cancelled by flanking planets.',
      effects: !any2or12 ? ['Financial instability', 'Emotional isolation'] : [],
    });
  }

  // Neechabhanga Raja Yoga: debilitated planet whose debilitation is cancelled
  {
    const debPlanets = d1.filter(p => p.dignity === 'debilitated');
    for (const dp of debPlanets) {
      const debSign = dp.signNumber;
      const lordOfDebSign = getSignLord(debSign);
      const lordPl = find(d1, lordOfDebSign);
      const cancelled = lordPl && kendras(lordPl.houseNumber);
      if (cancelled) {
        yogas.push({
          name: 'Neechabhanga Raja Yoga', category: 'raja', isPresent: true,
          strength: 'strong',
          formedBy: [`${dp.planet} debilitated in ${dp.signName}`, `Lord ${lordOfDebSign} in kendra H${lordPl!.houseNumber}`],
          explanation: `Debilitation of ${dp.planet} cancelled by disposition of ${lordOfDebSign}.`,
          effects: ['Rise to power after initial setback', 'Transformation of weakness into strength'],
        });
      }
    }
  }

  return yogas;
}
