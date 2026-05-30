/**
 * Yoga detection — 150+ classical yogas with cancellation/negation rules.
 *
 * Categories: Raja, Dhana, Pancha Mahapurusha, Nabhasa, Chandra, Surya,
 * Aristha, Daridra, Sanyasa, Other.
 * Each yoga includes the classical formation rule, cancellation conditions,
 * strength assessment, and human-readable explanation.
 *
 * NOTE: The previous `housesApart` helper had an off-by-one error (returned
 * 0-indexed distance instead of Vedic 1-indexed "Nth from" count). This caused
 * `inKendraFrom` to test houses 2/5/8/11 instead of 1/4/7/10.  Fixed below as
 * `nthFrom`, which returns the standard Vedic count (same house = 1).
 */

import type { PlanetPos } from "./divisional.ts";
import { getSignLord } from "./vedic.ts";
import { OWN_SIGNS, EXALTATION, DEBILITATION } from "./constants.ts";

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

/** Vedic "Nth from": same house = 1, next house = 2, … , 12th from = 12. */
function nthFrom(h1: number, h2: number): number {
  return ((h2 - h1 + 12) % 12) + 1;
}

function isKendra(h: number): boolean { return [1, 4, 7, 10].includes(h); }
function isTrikona(h: number): boolean { return [1, 5, 9].includes(h); }
function isDusthana(h: number): boolean { return [6, 8, 12].includes(h); }

function inKendraFrom(h1: number, h2: number): boolean {
  return isKendra(nthFrom(h1, h2));
}

function isInOwnSign(p: PlanetPos): boolean {
  return OWN_SIGNS[p.planet]?.includes(p.signNumber) ?? false;
}
function isExalted(p: PlanetPos): boolean {
  return EXALTATION[p.planet]?.[0] === p.signNumber;
}
function isDebilitated(p: PlanetPos): boolean {
  return DEBILITATION[p.planet] === p.signNumber;
}
function isOwnOrExalted(p: PlanetPos): boolean {
  return isInOwnSign(p) || isExalted(p);
}

/** Sign of a whole-sign house given the ascendant sign. */
function houseSign(ascSign: number, house: number): number {
  return ((ascSign + house - 2) % 12) + 1;
}

const NATURAL_BENEFICS = ['jupiter', 'venus', 'mercury', 'moon'];
const NATURAL_MALEFICS = ['sun', 'mars', 'saturn', 'rahu', 'ketu'];
function isUpachaya(h: number): boolean { return [3, 6, 10, 11].includes(h); }
function isPanaphara(h: number): boolean { return [2, 5, 8, 11].includes(h); }
function isApoklima(h: number): boolean { return [3, 6, 9, 12].includes(h); }

function absent(name: string, category: Yoga['category'], explanation: string): Yoga {
  return { name, category, isPresent: false, strength: 'weak', formedBy: [], explanation, effects: [] };
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function detectYogas(d1: PlanetPos[]): Yoga[] {
  const yogas: Yoga[] = [];
  const asc = find(d1, 'ascendant');
  const moon = find(d1, 'moon');
  const sun = find(d1, 'sun');
  const jupiter = find(d1, 'jupiter');
  const mercury = find(d1, 'mercury');
  const mars = find(d1, 'mars');
  const venus = find(d1, 'venus');
  const saturn = find(d1, 'saturn');
  const rahu = find(d1, 'rahu');
  const ketu = find(d1, 'ketu');
  const ascSign = asc?.signNumber ?? 1;

  // Seven traditional planets (excluding nodes and ascendant)
  const seven = [sun, moon, mars, mercury, jupiter, venus, saturn].filter(
    (p): p is PlanetPos => !!p,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RAJA YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  // 1a. Viparita Raja Yoga: lord of 6/8/12 in another dusthana
  if (asc) {
    const dusthanaHouses = [6, 8, 12] as const;
    const inDust: string[] = [];
    for (const dh of dusthanaHouses) {
      const lord = getSignLord(houseSign(ascSign, dh));
      const pl = find(d1, lord);
      if (pl && isDusthana(pl.houseNumber) && pl.houseNumber !== dh) {
        inDust.push(`Lord of H${dh} (${lord}) in H${pl.houseNumber}`);
      }
    }
    yogas.push(inDust.length > 0
      ? { name: 'Viparita Raja Yoga', category: 'raja', isPresent: true,
          strength: inDust.length >= 2 ? 'strong' : 'moderate',
          formedBy: inDust,
          explanation: 'Lord of a dusthana placed in another dusthana — reversal of fortune.',
          effects: ['Rise after struggle', 'Hidden support'] }
      : absent('Viparita Raja Yoga', 'raja', 'No dusthana lord placed in another dusthana.'));
  } else {
    yogas.push(absent('Viparita Raja Yoga', 'raja', 'Ascendant not available.'));
  }

  // 1b. Neechabhanga Raja Yoga: debilitated planet whose debilitation is cancelled
  {
    const debPlanets = d1.filter(p => p.dignity === 'debilitated');
    let found = false;
    for (const dp of debPlanets) {
      const debSign = dp.signNumber;
      const lordOfDebSign = getSignLord(debSign);
      const lordPl = find(d1, lordOfDebSign);
      // Classical NBRY conditions:
      // (a) Lord of debilitation sign in kendra from Lagna or Moon
      //     (exclude self-referential case: lord IS Moon checking kendra from Moon)
      const lordInKendra = lordPl && (isKendra(lordPl.houseNumber) ||
        (moon && lordPl.planet !== moon.planet && inKendraFrom(moon.houseNumber, lordPl.houseNumber)));
      // (b) Exaltation lord of debilitation sign in kendra
      const exaltLord = Object.entries(EXALTATION).find(([, v]) => v[0] === debSign);
      const exaltPl = exaltLord ? find(d1, exaltLord[0]) : undefined;
      const exaltInKendra = exaltPl && (isKendra(exaltPl.houseNumber) ||
        (moon && inKendraFrom(moon.houseNumber, exaltPl.houseNumber)));
      if (lordInKendra || exaltInKendra) {
        yogas.push({
          name: 'Neechabhanga Raja Yoga', category: 'raja', isPresent: true,
          strength: 'strong',
          formedBy: [
            `${dp.planet} debilitated in ${dp.signName}`,
            lordInKendra && lordPl ? `Lord ${lordOfDebSign} in kendra H${lordPl.houseNumber}` : '',
            exaltInKendra && exaltPl ? `Exalt-lord ${exaltPl.planet} in kendra H${exaltPl.houseNumber}` : '',
          ].filter(Boolean),
          explanation: `Debilitation of ${dp.planet} cancelled by dispositional strength.`,
          effects: ['Rise to power after initial setback', 'Transformation of weakness into strength'],
        });
        found = true;
      }
    }
    if (!found) {
      yogas.push(absent('Neechabhanga Raja Yoga', 'raja',
        debPlanets.length === 0 ? 'No debilitated planet in chart.' : 'Debilitation not cancelled by dispositional strength.'));
    }
  }

  // 1c. Dharmakarmadhipati Yoga: lords of 9th and 10th conjunct or in mutual aspect
  if (asc) {
    const lord9 = getSignLord(houseSign(ascSign, 9));
    const lord10 = getSignLord(houseSign(ascSign, 10));
    const pl9 = find(d1, lord9);
    const pl10 = find(d1, lord10);
    if (pl9 && pl10 && lord9 !== lord10) {
      const conjunct = pl9.houseNumber === pl10.houseNumber;
      const mutualAspect = nthFrom(pl9.houseNumber, pl10.houseNumber) === 7;
      if (conjunct || mutualAspect) {
        const strength: Yoga['strength'] = (pl9.isCombust || pl10.isCombust || isDebilitated(pl9) || isDebilitated(pl10))
          ? 'weak' : (isOwnOrExalted(pl9) || isOwnOrExalted(pl10)) ? 'strong' : 'moderate';
        yogas.push({
          name: 'Dharmakarmadhipati Yoga', category: 'raja', isPresent: true, strength,
          formedBy: [conjunct
            ? `Lord9 (${lord9}) & Lord10 (${lord10}) conjunct in H${pl9.houseNumber}`
            : `Lord9 (${lord9}) in H${pl9.houseNumber} ↔ Lord10 (${lord10}) in H${pl10.houseNumber} — mutual aspect`],
          explanation: 'Lords of dharma (9th) and karma (10th) united — highest raja yoga.',
          effects: ['Authority and leadership', 'Righteous fame', 'Career aligned with purpose'],
        });
      } else {
        yogas.push(absent('Dharmakarmadhipati Yoga', 'raja', 'Lords of 9th and 10th not conjunct or in mutual aspect.'));
      }
    } else {
      yogas.push(absent('Dharmakarmadhipati Yoga', 'raja',
        lord9 === lord10 ? 'Same planet lords both 9th and 10th.' : 'Lords of 9th/10th not available.'));
    }
  } else {
    yogas.push(absent('Dharmakarmadhipati Yoga', 'raja', 'Ascendant not available.'));
  }

  // 1d. Raja Yoga (generic kendra-trikona): lord of a kendra + lord of a trikona conjunct
  if (asc) {
    const kendraLords = [1, 4, 7, 10].map(h => ({ house: h, lord: getSignLord(houseSign(ascSign, h)) }));
    const trikonaLords = [5, 9].map(h => ({ house: h, lord: getSignLord(houseSign(ascSign, h)) }));
    let bestPair: { kh: number; th: number; kLord: string; tLord: string; house: number } | null = null;

    for (const kl of kendraLords) {
      for (const tl of trikonaLords) {
        if (kl.lord === tl.lord) continue; // same planet = yoga-karaka, handled implicitly
        const plK = find(d1, kl.lord);
        const plT = find(d1, tl.lord);
        if (plK && plT && plK.houseNumber === plT.houseNumber) {
          if (!bestPair || isKendra(plK.houseNumber) || isTrikona(plK.houseNumber)) {
            bestPair = { kh: kl.house, th: tl.house, kLord: kl.lord, tLord: tl.lord, house: plK.houseNumber };
          }
        }
      }
    }
    if (bestPair) {
      const plK = find(d1, bestPair.kLord)!;
      const plT = find(d1, bestPair.tLord)!;
      const strength: Yoga['strength'] = (plK.isCombust || plT.isCombust) ? 'moderate'
        : (isKendra(bestPair.house) || isTrikona(bestPair.house)) ? 'strong' : 'moderate';
      yogas.push({
        name: 'Raja Yoga', category: 'raja', isPresent: true, strength,
        formedBy: [`Lord of H${bestPair.kh} (${bestPair.kLord}) & Lord of H${bestPair.th} (${bestPair.tLord}) conjunct in H${bestPair.house}`],
        explanation: 'Lord of a kendra and lord of a trikona conjoined — classical raja yoga.',
        effects: ['Power, status, and authority', 'Social elevation'],
      });
    } else {
      yogas.push(absent('Raja Yoga', 'raja', 'No kendra lord conjunct with a trikona lord.'));
    }
  } else {
    yogas.push(absent('Raja Yoga', 'raja', 'Ascendant not available.'));
  }

  // 1e. Lakshmi Yoga: lord of 9th in own/exalted sign in a kendra or trikona
  if (asc) {
    const lord9 = getSignLord(houseSign(ascSign, 9));
    const pl9 = find(d1, lord9);
    if (pl9 && isOwnOrExalted(pl9) && (isKendra(pl9.houseNumber) || isTrikona(pl9.houseNumber))) {
      const strength: Yoga['strength'] = pl9.isCombust ? 'moderate' : isExalted(pl9) ? 'strong' : 'moderate';
      yogas.push({
        name: 'Lakshmi Yoga', category: 'raja', isPresent: true, strength,
        formedBy: [`Lord9 (${lord9}) in ${isExalted(pl9) ? 'exalted' : 'own'} sign in H${pl9.houseNumber}`],
        explanation: 'Lord of fortune in dignity and strength — bestows wealth and grace.',
        effects: ['Prosperity and luxury', 'Grace and beauty', 'Good fortune'],
      });
    } else {
      yogas.push(absent('Lakshmi Yoga', 'raja', 'Lord of 9th not in own/exalted sign in a kendra or trikona.'));
    }
  } else {
    yogas.push(absent('Lakshmi Yoga', 'raja', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DHANA YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  // 2a. Chandra-Mangal Yoga: Moon + Mars conjunct or in mutual 7th aspect
  if (moon && mars) {
    const conjunct = moon.houseNumber === mars.houseNumber;
    const mutualAspect = nthFrom(moon.houseNumber, mars.houseNumber) === 7;
    if (conjunct || mutualAspect) {
      yogas.push({
        name: 'Chandra-Mangal Yoga', category: 'dhana', isPresent: true, strength: 'moderate',
        formedBy: [conjunct ? 'Moon and Mars conjunct' : 'Moon and Mars in mutual 7th aspect'],
        explanation: 'Wealth combination through dynamic action.',
        effects: ['Earnings through enterprise', 'Real estate gains'],
      });
    } else {
      yogas.push(absent('Chandra-Mangal Yoga', 'dhana', 'Moon and Mars not conjunct or in mutual aspect.'));
    }
  } else {
    yogas.push(absent('Chandra-Mangal Yoga', 'dhana', 'Moon or Mars not available.'));
  }

  // 2b. Dhana Yoga: lords of 2nd/11th in kendras or trikonas
  if (asc) {
    const lord2 = getSignLord(houseSign(ascSign, 2));
    const lord11 = getSignLord(houseSign(ascSign, 11));
    const pl2 = find(d1, lord2);
    const pl11 = find(d1, lord11);
    const present = !!((pl2 && (isKendra(pl2.houseNumber) || isTrikona(pl2.houseNumber))) ||
      (pl11 && (isKendra(pl11.houseNumber) || isTrikona(pl11.houseNumber))));
    yogas.push({
      name: 'Dhana Yoga', category: 'dhana', isPresent: present,
      strength: present ? 'moderate' : 'weak',
      formedBy: present ? ['Wealth lords well-placed'] : [],
      explanation: present ? 'Lords of wealth houses placed in kendras or trikonas.' : 'Wealth house lords not strongly placed.',
      effects: present ? ['Financial prosperity', 'Material gains'] : [],
    });
  } else {
    yogas.push(absent('Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // 2c. Daridra Yoga: lord of 11th in dusthana — cancelled if in own/exalted
  if (asc) {
    const lord11 = getSignLord(houseSign(ascSign, 11));
    const pl11 = find(d1, lord11);
    if (pl11 && isDusthana(pl11.houseNumber)) {
      const cancelled = isOwnOrExalted(pl11);
      yogas.push({
        name: 'Daridra Yoga', category: 'dhana', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Lord of H11 (${lord11}) in dusthana H${pl11.houseNumber}`],
        explanation: cancelled
          ? `Lord of 11th in dusthana but in ${isExalted(pl11) ? 'exalted' : 'own'} sign — negativity cancelled.`
          : `Lord of gains in H${pl11.houseNumber} — obstructs income and creates financial strain.`,
        effects: cancelled ? [] : ['Financial difficulties', 'Blocked income sources'],
      });
    } else {
      yogas.push(absent('Daridra Yoga', 'dhana', 'Lord of 11th not in a dusthana.'));
    }
  } else {
    yogas.push(absent('Daridra Yoga', 'dhana', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PANCHA MAHAPURUSHA YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  const pmyList: Array<{ name: string; planet: PlanetPos | undefined; ownSigns: number[]; exaltSign: number }> = [
    { name: 'Ruchaka Yoga', planet: mars, ownSigns: [1, 8], exaltSign: 10 },
    { name: 'Bhadra Yoga', planet: mercury, ownSigns: [3, 6], exaltSign: 6 },
    { name: 'Hamsa Yoga', planet: jupiter, ownSigns: [9, 12], exaltSign: 4 },
    { name: 'Malavya Yoga', planet: venus, ownSigns: [2, 7], exaltSign: 12 },
    { name: 'Sasa Yoga', planet: saturn, ownSigns: [10, 11], exaltSign: 7 },
  ];
  for (const { name, planet: pl, ownSigns, exaltSign } of pmyList) {
    const inKendraH = pl && isKendra(pl.houseNumber);
    const inOE = pl && (ownSigns.includes(pl.signNumber) || pl.signNumber === exaltSign);
    // Cancellation: combustion nullifies the yoga
    const combust = pl?.isCombust ?? false;
    const present = !!(inKendraH && inOE && !combust);
    yogas.push({
      name, category: 'pancha_mahapurusha', isPresent: present,
      strength: present ? 'strong' : 'weak',
      formedBy: present && pl ? [`${pl.planet} in ${isExalted(pl) ? 'exalted' : 'own'} sign in kendra H${pl.houseNumber}`] : [],
      explanation: combust && inKendraH && inOE
        ? `Formation present but ${pl!.planet} is combust — yoga cancelled.`
        : present ? `${name} formed — planet in own/exalted sign in a kendra.`
        : 'Planet not in own/exalted sign in a kendra.',
      effects: present ? ['Power, authority, and fame'] : [],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. NABHASA YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const signs = new Set(seven.map(p => p.signNumber));
    const houses = new Set(seven.map(p => p.houseNumber));
    const signCount = signs.size;

    // 4a. Akriti (sign quality)
    const movable = [1, 4, 7, 10];
    const fixed = [2, 5, 8, 11];
    const dual = [3, 6, 9, 12];

    const allMovable = seven.every(p => movable.includes(p.signNumber));
    yogas.push(allMovable
      ? { name: 'Rajju Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in movable signs (Aries/Cancer/Libra/Capricorn)'],
          explanation: 'Nabhasa Akriti yoga — all planets in cardinal signs.', effects: ['Love of travel', 'Restlessness', 'Initiative'] }
      : absent('Rajju Yoga', 'nabhasa', 'Not all planets in movable signs.'));

    const allFixed = seven.every(p => fixed.includes(p.signNumber));
    yogas.push(allFixed
      ? { name: 'Musala Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in fixed signs (Taurus/Leo/Scorpio/Aquarius)'],
          explanation: 'Nabhasa Akriti yoga — all planets in fixed signs.', effects: ['Stability and persistence', 'Stubbornness', 'Wealth retention'] }
      : absent('Musala Yoga', 'nabhasa', 'Not all planets in fixed signs.'));

    const allDual = seven.every(p => dual.includes(p.signNumber));
    yogas.push(allDual
      ? { name: 'Nala Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in dual signs (Gemini/Virgo/Sagittarius/Pisces)'],
          explanation: 'Nabhasa Akriti yoga — all planets in mutable signs.', effects: ['Adaptability', 'Dual nature', 'Intellectual versatility'] }
      : absent('Nala Yoga', 'nabhasa', 'Not all planets in dual signs.'));

    // 4b. Sankhya (by number of occupied signs)
    const sankhyaDefs: Array<{ name: string; count: number; effects: string[] }> = [
      { name: 'Gola Yoga',   count: 1, effects: ['Extreme poverty or extreme wealth', 'Highly unusual life'] },
      { name: 'Yuga Yoga',   count: 2, effects: ['Heretical views', 'Poverty', 'Mixed fortune'] },
      { name: 'Shoola Yoga', count: 3, effects: ['Valorous', 'Sharp intellect', 'Cruel streak'] },
      { name: 'Kedara Yoga', count: 4, effects: ['Agricultural wealth', 'Service to others', 'Steady income'] },
      { name: 'Pasha Yoga',  count: 5, effects: ['Many dependents', 'Social connections', 'Moderate wealth'] },
      { name: 'Dama Yoga',   count: 6, effects: ['Generosity', 'Many acquaintances', 'Liberal spending'] },
      { name: 'Veena Yoga',  count: 7, effects: ['Love of arts and music', 'Prosperous', 'Well-liked'] },
    ];
    for (const sd of sankhyaDefs) {
      const present = signCount === sd.count;
      yogas.push(present
        ? { name: sd.name, category: 'nabhasa', isPresent: true, strength: sd.count <= 3 ? 'strong' : 'moderate',
            formedBy: [`All 7 planets in ${sd.count} sign${sd.count > 1 ? 's' : ''}`],
            explanation: `Nabhasa Sankhya yoga — planets occupy exactly ${sd.count} sign${sd.count > 1 ? 's' : ''}.`,
            effects: sd.effects }
        : absent(sd.name, 'nabhasa', `Planets occupy ${signCount} signs, not ${sd.count}.`));
    }

    // 4c. Ashreya (position)
    const allInKendras = seven.every(p => isKendra(p.houseNumber));
    yogas.push(allInKendras
      ? { name: 'Kamala Yoga', category: 'nabhasa', isPresent: true, strength: 'strong',
          formedBy: ['All 7 planets in kendra houses (1/4/7/10)'],
          explanation: 'Nabhasa Ashreya yoga — all planets in angular houses.', effects: ['Kingly status', 'Great fame', 'Widespread influence'] }
      : absent('Kamala Yoga', 'nabhasa', 'Not all planets in kendra houses.'));

    const panapharas = [2, 5, 8, 11];
    const allInPan = seven.every(p => panapharas.includes(p.houseNumber));
    yogas.push(allInPan
      ? { name: 'Vapi Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in panaphara houses (2/5/8/11)'],
          explanation: 'Nabhasa Ashreya yoga — all planets in succedent houses.', effects: ['Wealth accumulation', 'Enjoyment of stored resources'] }
      : absent('Vapi Yoga', 'nabhasa', 'Not all planets in panaphara houses.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CHANDRA YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  // 5a. Gajakesari Yoga: Jupiter in kendra from Moon
  //     Cancellation: Jupiter combust or debilitated
  if (moon && jupiter) {
    const kendraRelation = inKendraFrom(moon.houseNumber, jupiter.houseNumber);
    if (kendraRelation) {
      const debCancelled = isDebilitated(jupiter);
      const strength: Yoga['strength'] = debCancelled ? 'weak'
        : jupiter.isCombust ? 'weak'
        : isKendra(jupiter.houseNumber) ? 'strong' : 'moderate';
      yogas.push({
        name: 'Gajakesari Yoga', category: 'chandra', isPresent: !debCancelled,
        strength,
        formedBy: debCancelled ? [] : [`Jupiter in H${jupiter.houseNumber}`, `Moon in H${moon.houseNumber} — ${nthFrom(moon.houseNumber, jupiter.houseNumber)}th from Moon (kendra)`],
        explanation: debCancelled
          ? 'Jupiter in kendra from Moon but debilitated — yoga cancelled.'
          : jupiter.isCombust
          ? 'Jupiter in kendra from Moon but combust — yoga weakened.'
          : 'Jupiter in kendra from Moon — fame, intellect, and lasting reputation.',
        effects: debCancelled ? [] : ['Fame and recognition', 'Strong intellect', 'Long-lasting reputation'],
      });
    } else {
      yogas.push(absent('Gajakesari Yoga', 'chandra', 'Jupiter not in a kendra from Moon.'));
    }
  } else {
    yogas.push(absent('Gajakesari Yoga', 'chandra', 'Moon or Jupiter not available.'));
  }

  // 5b. Sunapha Yoga: planet (not Sun/nodes) in 2nd from Moon
  if (moon) {
    const h2 = (moon.houseNumber % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const in2 = d1.filter(p => p.houseNumber === h2 && !excluded.includes(p.planet));
    yogas.push(in2.length > 0
      ? { name: 'Sunapha Yoga', category: 'chandra', isPresent: true,
          strength: in2.some(p => isOwnOrExalted(p)) ? 'strong' : 'moderate',
          formedBy: in2.map(p => `${p.planet} in 2nd from Moon (H${h2})`),
          explanation: 'Planet in 2nd from Moon — self-made wealth.', effects: ['Self-made prosperity', 'Resourcefulness'] }
      : absent('Sunapha Yoga', 'chandra', 'No planet in 2nd from Moon.'));
  } else {
    yogas.push(absent('Sunapha Yoga', 'chandra', 'Moon not available.'));
  }

  // 5c. Anapha Yoga: planet (not Sun/nodes) in 12th from Moon
  if (moon) {
    const h12 = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const in12 = d1.filter(p => p.houseNumber === h12 && !excluded.includes(p.planet));
    yogas.push(in12.length > 0
      ? { name: 'Anapha Yoga', category: 'chandra', isPresent: true,
          strength: in12.some(p => isOwnOrExalted(p)) ? 'strong' : 'moderate',
          formedBy: in12.map(p => `${p.planet} in 12th from Moon (H${h12})`),
          explanation: 'Planet in 12th from Moon — royal comforts.', effects: ['Regal bearing', 'Comfortable life'] }
      : absent('Anapha Yoga', 'chandra', 'No planet in 12th from Moon.'));
  } else {
    yogas.push(absent('Anapha Yoga', 'chandra', 'Moon not available.'));
  }

  // 5d. Durudhura Yoga: planets in BOTH 2nd AND 12th from Moon
  if (moon) {
    const h2 = (moon.houseNumber % 12) + 1;
    const h12m = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const in2 = d1.filter(p => p.houseNumber === h2 && !excluded.includes(p.planet));
    const in12 = d1.filter(p => p.houseNumber === h12m && !excluded.includes(p.planet));
    const present = in2.length > 0 && in12.length > 0;
    yogas.push(present
      ? { name: 'Durudhura Yoga', category: 'chandra', isPresent: true, strength: 'strong',
          formedBy: [...in2.map(p => `${p.planet} in 2nd from Moon`), ...in12.map(p => `${p.planet} in 12th from Moon`)],
          explanation: 'Moon flanked on both sides — wealth, fame, and virtuous life.',
          effects: ['Wealth and luxury', 'Fame', 'Generous and virtuous'] }
      : absent('Durudhura Yoga', 'chandra', 'Moon not flanked by planets on both sides.'));
  } else {
    yogas.push(absent('Durudhura Yoga', 'chandra', 'Moon not available.'));
  }

  // 5e. Kemadruma Yoga: no planet in 2nd or 12th from Moon (negative)
  //     Cancellation: planet in kendra from Lagna, or Moon conjunct benefic
  if (moon) {
    const h2 = (moon.houseNumber % 12) + 1;
    const h12m = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const flanked = d1.some(p => !excluded.includes(p.planet) && (p.houseNumber === h2 || p.houseNumber === h12m));
    if (!flanked) {
      // Check cancellation conditions
      const planetInKendraFromLagna = d1.some(p =>
        p.planet !== 'ascendant' && p.planet !== 'rahu' && p.planet !== 'ketu' && isKendra(p.houseNumber));
      const moonConjBenefic = d1.some(p =>
        NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' && p.houseNumber === moon.houseNumber);
      const cancelled = planetInKendraFromLagna || moonConjBenefic;
      yogas.push({
        name: 'Kemadruma Yoga', category: 'chandra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'strong',
        formedBy: cancelled ? [] : ['No planet in 2nd or 12th from Moon'],
        explanation: cancelled
          ? 'Moon isolated but cancelled by planets in kendra from Lagna.'
          : 'Moon is isolated — potential for poverty and struggle.',
        effects: cancelled ? [] : ['Financial instability', 'Emotional isolation'],
      });
    } else {
      yogas.push(absent('Kemadruma Yoga', 'chandra', 'Kemadruma cancelled by flanking planets.'));
    }
  } else {
    yogas.push(absent('Kemadruma Yoga', 'chandra', 'Moon not available.'));
  }

  // 5f. Chandradhi Yoga (Adhi Yoga): natural benefics in 6th, 7th, 8th from Moon
  if (moon) {
    const h6 = ((moon.houseNumber + 4) % 12) + 1;
    const h7 = ((moon.houseNumber + 5) % 12) + 1;
    const h8 = ((moon.houseNumber + 6) % 12) + 1;
    const beneficsIn = d1.filter(p =>
      NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' &&
      [h6, h7, h8].includes(p.houseNumber));
    const present = beneficsIn.length >= 2;
    yogas.push(present
      ? { name: 'Chandradhi Yoga', category: 'chandra', isPresent: true,
          strength: beneficsIn.length >= 3 ? 'strong' : 'moderate',
          formedBy: beneficsIn.map(p => `${p.planet} in H${p.houseNumber} (${nthFrom(moon!.houseNumber, p.houseNumber)}th from Moon)`),
          explanation: 'Multiple benefics in 6th/7th/8th from Moon — leadership and respect.',
          effects: ['Commander or leader', 'Respected and influential', 'Polite and wealthy'] }
      : absent('Chandradhi Yoga', 'chandra', 'Fewer than 2 benefics in 6th/7th/8th from Moon.'));
  } else {
    yogas.push(absent('Chandradhi Yoga', 'chandra', 'Moon not available.'));
  }

  // 5g. Shakata Yoga: Moon in 6th or 8th from Jupiter (negative)
  //     Cancellation: Moon in kendra from Lagna
  if (moon && jupiter) {
    const dist = nthFrom(jupiter.houseNumber, moon.houseNumber);
    if (dist === 6 || dist === 8) {
      const cancelled = isKendra(moon.houseNumber);
      yogas.push({
        name: 'Shakata Yoga', category: 'chandra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Moon in ${dist}th from Jupiter`],
        explanation: cancelled
          ? `Moon in ${dist}th from Jupiter but in kendra from Lagna — negativity cancelled.`
          : `Moon in ${dist}th from Jupiter — fluctuating fortune.`,
        effects: cancelled ? [] : ['Ups and downs in fortune', 'Obstacles to success'],
      });
    } else {
      yogas.push(absent('Shakata Yoga', 'chandra', 'Moon not in 6th or 8th from Jupiter.'));
    }
  } else {
    yogas.push(absent('Shakata Yoga', 'chandra', 'Moon or Jupiter not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SURYA (SUN) YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  // 6a. Budhaditya Yoga: Sun + Mercury in same sign
  if (sun && mercury && sun.houseNumber === mercury.houseNumber) {
    yogas.push({
      name: 'Budhaditya Yoga', category: 'sun', isPresent: true,
      strength: mercury.isCombust ? 'moderate' : 'strong',
      formedBy: [`Sun & Mercury conjunct in H${sun.houseNumber} ${sun.signName}`],
      explanation: mercury.isCombust
        ? 'Sun-Mercury conjunction but Mercury combust — intellect somewhat eclipsed.'
        : 'Sun-Mercury conjunction — sharp analytical mind.',
      effects: ['Sharp analytical mind', 'Success in communication-led careers'],
    });
  } else {
    yogas.push(absent('Budhaditya Yoga', 'sun', 'Sun and Mercury not conjunct.'));
  }

  // 6b. Voshi (Vesi) Yoga: planet (not Moon/nodes) in 2nd from Sun
  if (sun) {
    const h2s = (sun.houseNumber % 12) + 1;
    const voshiExclude = ['moon', 'ascendant', 'rahu', 'ketu'];
    const in2s = d1.filter(p => p.houseNumber === h2s && !voshiExclude.includes(p.planet));
    yogas.push(in2s.length > 0
      ? { name: 'Voshi Yoga', category: 'sun', isPresent: true,
          strength: in2s.some(p => NATURAL_BENEFICS.includes(p.planet)) ? 'strong' : 'moderate',
          formedBy: in2s.map(p => `${p.planet} in 2nd from Sun (H${h2s})`),
          explanation: 'Planet ahead of Sun — adds lustre to personality.',
          effects: ['Dignified bearing', 'Leadership qualities'] }
      : absent('Voshi Yoga', 'sun', 'No qualifying planet in 2nd from Sun.'));
  } else {
    yogas.push(absent('Voshi Yoga', 'sun', 'Sun not available.'));
  }

  // 6c. Veshi Yoga: planet (not Moon/nodes) in 12th from Sun
  if (sun) {
    const h12s = ((sun.houseNumber - 2 + 12) % 12) + 1;
    const veshiExclude = ['moon', 'ascendant', 'rahu', 'ketu'];
    const in12s = d1.filter(p => p.houseNumber === h12s && !veshiExclude.includes(p.planet));
    yogas.push(in12s.length > 0
      ? { name: 'Veshi Yoga', category: 'sun', isPresent: true,
          strength: in12s.some(p => NATURAL_BENEFICS.includes(p.planet)) ? 'strong' : 'moderate',
          formedBy: in12s.map(p => `${p.planet} in 12th from Sun (H${h12s})`),
          explanation: 'Planet behind Sun — provides support and backing.',
          effects: ['Support from authorities', 'Strong background influence'] }
      : absent('Veshi Yoga', 'sun', 'No qualifying planet in 12th from Sun.'));
  } else {
    yogas.push(absent('Veshi Yoga', 'sun', 'Sun not available.'));
  }

  // 6d. Ubhayachari Yoga: planets in BOTH 2nd AND 12th from Sun
  if (sun) {
    const h2s = (sun.houseNumber % 12) + 1;
    const h12s = ((sun.houseNumber - 2 + 12) % 12) + 1;
    const excl = ['moon', 'ascendant', 'rahu', 'ketu'];
    const in2s = d1.filter(p => p.houseNumber === h2s && !excl.includes(p.planet));
    const in12s = d1.filter(p => p.houseNumber === h12s && !excl.includes(p.planet));
    const present = in2s.length > 0 && in12s.length > 0;
    yogas.push(present
      ? { name: 'Ubhayachari Yoga', category: 'sun', isPresent: true, strength: 'strong',
          formedBy: [...in2s.map(p => `${p.planet} in 2nd from Sun`), ...in12s.map(p => `${p.planet} in 12th from Sun`)],
          explanation: 'Sun flanked on both sides — kingly bearing and authority.',
          effects: ['Kingly qualities', 'Influence and authority', 'Prosperous career'] }
      : absent('Ubhayachari Yoga', 'sun', 'Sun not flanked by planets on both sides.'));
  } else {
    yogas.push(absent('Ubhayachari Yoga', 'sun', 'Sun not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. OTHER YOGAS
  // ═══════════════════════════════════════════════════════════════════════════

  // 7a. Amala Yoga: natural benefic in 10th from Lagna
  {
    const in10 = d1.filter(p => p.houseNumber === 10 && NATURAL_BENEFICS.includes(p.planet));
    const present = in10.length > 0;
    yogas.push({
      name: 'Amala Yoga', category: 'other', isPresent: present,
      strength: present ? 'moderate' : 'weak',
      formedBy: present ? in10.map(p => `${p.planet} in H10`) : [],
      explanation: present ? 'Natural benefic in the 10th house gives good reputation.' : 'No natural benefic in the 10th house.',
      effects: present ? ['Good reputation', 'Ethical conduct'] : [],
    });
  }

  // 7b. Saraswati Yoga: Jupiter, Venus, Mercury all in kendras, trikonas, or 2nd house
  if (jupiter && venus && mercury) {
    const validH = (h: number) => isKendra(h) || isTrikona(h) || h === 2;
    const allValid = validH(jupiter.houseNumber) && validH(venus.houseNumber) && validH(mercury.houseNumber);
    if (allValid) {
      const anyCombust = jupiter.isCombust || venus.isCombust || mercury.isCombust;
      const anyDeb = isDebilitated(jupiter) || isDebilitated(venus) || isDebilitated(mercury);
      const strength: Yoga['strength'] = anyDeb ? 'weak' : anyCombust ? 'moderate' : 'strong';
      yogas.push({
        name: 'Saraswati Yoga', category: 'other', isPresent: true, strength,
        formedBy: [`Jupiter in H${jupiter.houseNumber}`, `Venus in H${venus.houseNumber}`, `Mercury in H${mercury.houseNumber}`],
        explanation: 'Jupiter, Venus, Mercury all in strong houses — mastery of learning and arts.',
        effects: ['Erudition and scholarship', 'Eloquence', 'Mastery of arts'],
      });
    } else {
      yogas.push(absent('Saraswati Yoga', 'other', 'Jupiter, Venus, and Mercury not all in kendras/trikonas/2nd.'));
    }
  } else {
    yogas.push(absent('Saraswati Yoga', 'other', 'Jupiter, Venus, or Mercury not available.'));
  }

  // 7c. Shubha Kartari Yoga: Lagna hemmed by natural benefics in H2 and H12
  {
    const beneficsH2 = d1.some(p => p.houseNumber === 2 && NATURAL_BENEFICS.includes(p.planet));
    const beneficsH12 = d1.some(p => p.houseNumber === 12 && NATURAL_BENEFICS.includes(p.planet));
    const maleficsH2 = d1.some(p => p.houseNumber === 2 && !NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'ascendant');
    const maleficsH12 = d1.some(p => p.houseNumber === 12 && !NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'ascendant');
    const present = beneficsH2 && beneficsH12 && !maleficsH2 && !maleficsH12;
    yogas.push(present
      ? { name: 'Shubha Kartari Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: ['Lagna hemmed by benefics in H2 and H12 (no malefics)'],
          explanation: 'Auspicious scissors — Lagna protected by benefics on both sides.',
          effects: ['Good health', 'Protective environment', 'Positive disposition'] }
      : absent('Shubha Kartari Yoga', 'other', 'Lagna not hemmed exclusively by benefics.'));
  }

  // 7d. Papa Kartari Yoga: Lagna hemmed by natural malefics in H2 and H12
  {
    const maleficNames = ['sun', 'mars', 'saturn', 'rahu', 'ketu'];
    const maleficsH2 = d1.some(p => p.houseNumber === 2 && maleficNames.includes(p.planet));
    const maleficsH12 = d1.some(p => p.houseNumber === 12 && maleficNames.includes(p.planet));
    const present = maleficsH2 && maleficsH12;
    yogas.push(present
      ? { name: 'Papa Kartari Yoga', category: 'other', isPresent: true, strength: 'moderate',
          formedBy: ['Malefics in H2 and H12 hemming the Lagna'],
          explanation: 'Malefic scissors — Lagna squeezed by malefics, creating obstacles.',
          effects: ['Health challenges', 'Obstacles in early life', 'Need for perseverance'] }
      : absent('Papa Kartari Yoga', 'other', 'Lagna not hemmed by malefics on both sides.'));
  }

  // 7e. Pravrajya Yoga: 4 or more planets (excluding nodes) in one house
  {
    const nonNodes = d1.filter(p => p.planet !== 'ascendant' && p.planet !== 'rahu' && p.planet !== 'ketu');
    const houseCounts: Record<number, string[]> = {};
    for (const p of nonNodes) {
      (houseCounts[p.houseNumber] ??= []).push(p.planet);
    }
    let stelliumHouse: number | null = null;
    let stelliumPlanets: string[] = [];
    for (const [h, planets] of Object.entries(houseCounts)) {
      if (planets.length >= 4 && planets.length > stelliumPlanets.length) {
        stelliumHouse = Number(h);
        stelliumPlanets = planets;
      }
    }
    yogas.push(stelliumHouse !== null
      ? { name: 'Pravrajya Yoga', category: 'other', isPresent: true,
          strength: stelliumPlanets.length >= 5 ? 'strong' : 'moderate',
          formedBy: [`${stelliumPlanets.length} planets (${stelliumPlanets.join(', ')}) in H${stelliumHouse}`],
          explanation: `Stellium of ${stelliumPlanets.length} planets in one house — ascetic or renunciation tendency.`,
          effects: ['Spiritual inclination', 'Detachment', 'Possible renunciation'] }
      : absent('Pravrajya Yoga', 'other', 'No house has 4+ planets.'));
  }

  // 7f. Guru-Chandal Yoga: Jupiter conjunct Rahu (negative)
  //     Cancellation: Jupiter in own/exalted sign
  if (jupiter && rahu) {
    if (jupiter.houseNumber === rahu.houseNumber) {
      const cancelled = isOwnOrExalted(jupiter);
      yogas.push({
        name: 'Guru-Chandal Yoga', category: 'other', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Jupiter & Rahu conjunct in H${jupiter.houseNumber}`],
        explanation: cancelled
          ? 'Jupiter conjunct Rahu but Jupiter in own/exalted sign — negativity neutralized.'
          : 'Jupiter eclipsed by Rahu — unorthodox beliefs, misguided advice.',
        effects: cancelled ? [] : ['Questionable judgment', 'Challenges with mentors', 'Unorthodox path'],
      });
    } else {
      yogas.push(absent('Guru-Chandal Yoga', 'other', 'Jupiter and Rahu not conjunct.'));
    }
  } else {
    yogas.push(absent('Guru-Chandal Yoga', 'other', 'Jupiter or Rahu not available.'));
  }

  // 7g. Grahan Yoga: Sun or Moon conjunct Rahu or Ketu (eclipse combination)
  {
    const pairs: Array<{ luminary: PlanetPos; node: PlanetPos }> = [];
    if (sun && rahu && sun.houseNumber === rahu.houseNumber) pairs.push({ luminary: sun, node: rahu });
    if (sun && ketu && sun.houseNumber === ketu.houseNumber) pairs.push({ luminary: sun, node: ketu });
    if (moon && rahu && moon.houseNumber === rahu.houseNumber) pairs.push({ luminary: moon, node: rahu });
    if (moon && ketu && moon.houseNumber === ketu.houseNumber) pairs.push({ luminary: moon, node: ketu });
    if (pairs.length > 0) {
      const anyStrong = pairs.some(({ luminary }) => isOwnOrExalted(luminary));
      yogas.push({
        name: 'Grahan Yoga', category: 'other', isPresent: true,
        strength: anyStrong ? 'weak' : 'moderate',
        formedBy: pairs.map(({ luminary, node }) => `${luminary.planet} conjunct ${node.planet} in H${luminary.houseNumber}`),
        explanation: anyStrong
          ? 'Eclipse combination present but luminary is dignified — effects mitigated.'
          : 'Sun or Moon eclipsed by a node — challenges to vitality or emotional clarity.',
        effects: anyStrong ? ['Mild eclipse effects'] : ['Health or mental challenges periodically', 'Sudden transformations'],
      });
    } else {
      yogas.push(absent('Grahan Yoga', 'other', 'No luminary conjunct a node.'));
    }
  }

  // 7h. Parivartana Yoga: mutual exchange of house lords
  if (asc) {
    let bestExchange: { h1: number; h2: number; l1: string; l2: string } | null = null;
    for (let h1 = 1; h1 <= 12; h1++) {
      const l1 = getSignLord(houseSign(ascSign, h1));
      const pl1 = find(d1, l1);
      if (!pl1) continue;
      const h1OfPl1 = pl1.houseNumber;
      if (h1OfPl1 === h1) continue; // in own house, no exchange
      const l2 = getSignLord(houseSign(ascSign, h1OfPl1));
      if (l2 === l1) continue; // same lord
      const pl2 = find(d1, l2);
      if (pl2 && pl2.houseNumber === h1) {
        // Mutual exchange found: lord of h1 in h1OfPl1, lord of h1OfPl1 in h1
        if (h1 < h1OfPl1) { // avoid double-counting
          const isRaja = (isKendra(h1) || isTrikona(h1)) && (isKendra(h1OfPl1) || isTrikona(h1OfPl1));
          if (!bestExchange || isRaja) {
            bestExchange = { h1, h2: h1OfPl1, l1, l2 };
          }
        }
      }
    }
    if (bestExchange) {
      const { h1, h2, l1, l2 } = bestExchange;
      const isRaja = (isKendra(h1) || isTrikona(h1)) && (isKendra(h2) || isTrikona(h2));
      const isDainya = isDusthana(h1) || isDusthana(h2);
      yogas.push({
        name: 'Parivartana Yoga', category: isRaja ? 'raja' : 'other', isPresent: true,
        strength: isRaja ? 'strong' : isDainya ? 'weak' : 'moderate',
        formedBy: [`Lord of H${h1} (${l1}) ↔ Lord of H${h2} (${l2}) — mutual exchange`],
        explanation: isRaja
          ? 'Maha Yoga Parivartana — lords of kendra/trikona exchange, amplifying each house.'
          : isDainya
          ? 'Dainya Parivartana — exchange involving dusthana, mixed results.'
          : 'Parivartana — mutual exchange of house lords strengthens both houses.',
        effects: isRaja
          ? ['Amplified power and fortune', 'Strong synergy between houses']
          : isDainya
          ? ['Mixed results — challenges become opportunities']
          : ['Synergy between exchanging houses', 'Enhanced significations of both houses'],
      });
    } else {
      yogas.push(absent('Parivartana Yoga', 'other', 'No mutual exchange of house lords found.'));
    }
  } else {
    yogas.push(absent('Parivartana Yoga', 'other', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ADDITIONAL NABHASA YOGAS — BPHS Ch. 36 + Phaladeepika Ch. 6
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const signs = new Set(seven.map(p => p.signNumber));
    const houses = new Set(seven.map(p => p.houseNumber));

    // --- 8a. Dala Yogas (BPHS Ch. 36.3–4) ---

    // Maala (Srik) Yoga: all 7 planets in trine houses (1/5/9) only
    const trinaH = [1, 5, 9];
    const allInTrines = seven.every(p => trinaH.includes(p.houseNumber));
    yogas.push(allInTrines
      ? { name: 'Maala Yoga', category: 'nabhasa', isPresent: true, strength: 'strong',
          formedBy: ['All 7 planets in trikona houses (1/5/9)'],
          explanation: 'Nabhasa Dala yoga — all planets in trines. Source: BPHS Ch. 36.3.',
          effects: ['Wealth and comfort', 'Respected in society', 'Enjoyment of luxuries'] }
      : absent('Maala Yoga', 'nabhasa', 'Not all planets in trikona houses (1/5/9).'));

    // Sarpa Yoga: all 7 planets in apoklima (cadent) houses (3/6/9/12)
    const allInCadent = seven.every(p => isApoklima(p.houseNumber));
    yogas.push(allInCadent
      ? { name: 'Sarpa Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in apoklima houses (3/6/9/12)'],
          explanation: 'Nabhasa Dala yoga — all planets in cadent houses. Source: BPHS Ch. 36.4.',
          effects: ['Misery and suffering', 'Crooked nature', 'Dependence on others'] }
      : absent('Sarpa Yoga', 'nabhasa', 'Not all planets in apoklima houses (3/6/9/12).'));

    // --- 8b. Akriti Yogas (BPHS Ch. 36.5–24) ---

    // Gada Yoga: all 7 planets in 2 adjacent kendras
    // Adjacent kendra pairs: (1,4), (4,7), (7,10), (10,1)
    const gadaPairs: [number, number][] = [[1, 4], [4, 7], [7, 10], [10, 1]];
    let gadaFound = false;
    for (const [k1, k2] of gadaPairs) {
      if (seven.every(p => p.houseNumber === k1 || p.houseNumber === k2)) {
        yogas.push({ name: 'Gada Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: [`All 7 planets in H${k1} and H${k2}`],
          explanation: 'Nabhasa Akriti yoga — planets in two adjacent kendras. Source: BPHS Ch. 36.5.',
          effects: ['Wealth through enterprise', 'Religious merit', 'Alternating fortune'] });
        gadaFound = true; break;
      }
    }
    if (!gadaFound) yogas.push(absent('Gada Yoga', 'nabhasa', 'Planets not confined to two adjacent kendra houses.'));

    // Shakata Yoga (Nabhasa): all 7 in H1 and H7 only
    const allIn1and7 = seven.every(p => p.houseNumber === 1 || p.houseNumber === 7);
    yogas.push(allIn1and7
      ? { name: 'Shakata Yoga (Nabhasa)', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H1 and H7 only'],
          explanation: 'Nabhasa Akriti yoga — cart shape. Source: BPHS Ch. 36.6.',
          effects: ['Poverty alternating with wealth', 'Sickly constitution', 'Living by manual labor'] }
      : absent('Shakata Yoga (Nabhasa)', 'nabhasa', 'Planets not confined to H1 and H7.'));

    // Pakshi (Vihaga) Yoga: all 7 in H4 and H10 only
    const allIn4and10 = seven.every(p => p.houseNumber === 4 || p.houseNumber === 10);
    yogas.push(allIn4and10
      ? { name: 'Pakshi Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H4 and H10 only'],
          explanation: 'Nabhasa Akriti yoga — bird shape. Source: BPHS Ch. 36.7.',
          effects: ['Love of wandering', 'Messenger or ambassador', 'Quarrelsome nature'] }
      : absent('Pakshi Yoga', 'nabhasa', 'Planets not confined to H4 and H10.'));

    // Shringataka Yoga: all 7 in one set of trinal houses (1/5/9, 2/6/10, 3/7/11, 4/8/12)
    const trinalSets: number[][] = [[1,5,9],[2,6,10],[3,7,11],[4,8,12]];
    let shrinFound = false;
    for (const ts of trinalSets) {
      if (seven.every(p => ts.includes(p.houseNumber))) {
        yogas.push({ name: 'Shringataka Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: [`All 7 planets in houses ${ts.join('/')}`],
          explanation: 'Nabhasa Akriti yoga — triangular shape. Source: BPHS Ch. 36.8.',
          effects: ['Loved by rulers', 'Comfort from spouse', 'Martial nature'] });
        shrinFound = true; break;
      }
    }
    if (!shrinFound) yogas.push(absent('Shringataka Yoga', 'nabhasa', 'Planets not confined to any single set of trinal houses.'));

    // Hala Yoga: all 7 in one of the three non-dharma trines (2/6/10, 3/7/11, 4/8/12)
    const halaSets: number[][] = [[2,6,10],[3,7,11],[4,8,12]];
    let halaFound = false;
    for (const hs of halaSets) {
      if (seven.every(p => hs.includes(p.houseNumber))) {
        yogas.push({ name: 'Hala Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: [`All 7 planets in houses ${hs.join('/')}`],
          explanation: 'Nabhasa Akriti yoga — plough shape. Source: BPHS Ch. 36.9.',
          effects: ['Agricultural occupation', 'Moderate happiness', 'Mean livelihood'] });
        halaFound = true; break;
      }
    }
    if (!halaFound) yogas.push(absent('Hala Yoga', 'nabhasa', 'Planets not confined to a non-dharma trinal set (2/6/10, 3/7/11, 4/8/12).'));

    // Vajra Yoga: benefics in H1 and H7, malefics in H4 and H10
    const benIn1 = d1.some(p => p.houseNumber === 1 && NATURAL_BENEFICS.includes(p.planet));
    const benIn7 = d1.some(p => p.houseNumber === 7 && NATURAL_BENEFICS.includes(p.planet));
    const malIn4 = d1.some(p => p.houseNumber === 4 && NATURAL_MALEFICS.includes(p.planet));
    const malIn10 = d1.some(p => p.houseNumber === 10 && NATURAL_MALEFICS.includes(p.planet));
    const vajraPresent = benIn1 && benIn7 && malIn4 && malIn10;
    yogas.push(vajraPresent
      ? { name: 'Vajra Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['Benefics in H1 & H7, malefics in H4 & H10'],
          explanation: 'Nabhasa Akriti yoga — thunderbolt shape. Source: BPHS Ch. 36.10.',
          effects: ['Handsome appearance', 'Happy in early and old age', 'Brave and courageous'] }
      : absent('Vajra Yoga', 'nabhasa', 'Benefics not in 1&7 with malefics in 4&10.'));

    // Yava Yoga: malefics in H1 and H7, benefics in H4 and H10 (reverse of Vajra)
    const malIn1 = d1.some(p => p.houseNumber === 1 && NATURAL_MALEFICS.includes(p.planet));
    const malIn7 = d1.some(p => p.houseNumber === 7 && NATURAL_MALEFICS.includes(p.planet));
    const benIn4 = d1.some(p => p.houseNumber === 4 && NATURAL_BENEFICS.includes(p.planet));
    const benIn10 = d1.some(p => p.houseNumber === 10 && NATURAL_BENEFICS.includes(p.planet));
    const yavaPresent = malIn1 && malIn7 && benIn4 && benIn10;
    yogas.push(yavaPresent
      ? { name: 'Yava Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['Malefics in H1 & H7, benefics in H4 & H10'],
          explanation: 'Nabhasa Akriti yoga — barley shape. Source: BPHS Ch. 36.11.',
          effects: ['Happy in middle age', 'Charitable disposition', 'Moderate wealth'] }
      : absent('Yava Yoga', 'nabhasa', 'Malefics not in 1&7 with benefics in 4&10.'));

    // Yupa Yoga: all 7 in H1/2/3/4
    const yupaH = [1, 2, 3, 4];
    const allInYupa = seven.every(p => yupaH.includes(p.houseNumber));
    yogas.push(allInYupa
      ? { name: 'Yupa Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H1/2/3/4'],
          explanation: 'Nabhasa Akriti yoga — sacrificial post. Source: BPHS Ch. 36.14.',
          effects: ['Charitable and generous', 'Devoted to sacred rites', 'Self-controlled'] }
      : absent('Yupa Yoga', 'nabhasa', 'Planets not confined to H1/2/3/4.'));

    // Ishu (Shara) Yoga: all 7 in H4/5/6/7
    const ishuH = [4, 5, 6, 7];
    const allInIshu = seven.every(p => ishuH.includes(p.houseNumber));
    yogas.push(allInIshu
      ? { name: 'Ishu Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H4/5/6/7'],
          explanation: 'Nabhasa Akriti yoga — arrow shape. Source: BPHS Ch. 36.15.',
          effects: ['Connected to prisons or military', 'Fond of weapons', 'Earning through metallurgy'] }
      : absent('Ishu Yoga', 'nabhasa', 'Planets not confined to H4/5/6/7.'));

    // Shakti Yoga: all 7 in H7/8/9/10
    const shaktiH = [7, 8, 9, 10];
    const allInShakti = seven.every(p => shaktiH.includes(p.houseNumber));
    yogas.push(allInShakti
      ? { name: 'Shakti Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H7/8/9/10'],
          explanation: 'Nabhasa Akriti yoga — spear shape. Source: BPHS Ch. 36.16.',
          effects: ['Lazy disposition', 'Lacking wealth', 'Long-lived'] }
      : absent('Shakti Yoga', 'nabhasa', 'Planets not confined to H7/8/9/10.'));

    // Danda Yoga: all 7 in H10/11/12/1
    const dandaH = [10, 11, 12, 1];
    const allInDanda = seven.every(p => dandaH.includes(p.houseNumber));
    yogas.push(allInDanda
      ? { name: 'Danda Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H10/11/12/1'],
          explanation: 'Nabhasa Akriti yoga — staff shape. Source: BPHS Ch. 36.17.',
          effects: ['Loss of spouse and children', 'Separation from dear ones', 'Austere life'] }
      : absent('Danda Yoga', 'nabhasa', 'Planets not confined to H10/11/12/1.'));

    // Nauka Yoga: all 7 in H1 through H7 (consecutive from Lagna)
    const naukaH = [1, 2, 3, 4, 5, 6, 7];
    const allInNauka = seven.every(p => naukaH.includes(p.houseNumber));
    yogas.push(allInNauka
      ? { name: 'Nauka Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H1 through H7'],
          explanation: 'Nabhasa Akriti yoga — boat shape. Source: BPHS Ch. 36.18.',
          effects: ['Wealth through water or shipping', 'Fame through navigation', 'Generous nature'] }
      : absent('Nauka Yoga', 'nabhasa', 'Planets not confined to H1 through H7.'));

    // Kuta Yoga: all 7 in H4 through H10
    const kutaH = [4, 5, 6, 7, 8, 9, 10];
    const allInKuta = seven.every(p => kutaH.includes(p.houseNumber));
    yogas.push(allInKuta
      ? { name: 'Kuta Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H4 through H10'],
          explanation: 'Nabhasa Akriti yoga — fort shape. Source: BPHS Ch. 36.19.',
          effects: ['Liar and jailer', 'Living in a fort or hill station', 'Cunning nature'] }
      : absent('Kuta Yoga', 'nabhasa', 'Planets not confined to H4 through H10.'));

    // Chhatra Yoga: all 7 in H7 through H1 (i.e., H7/8/9/10/11/12/1)
    const chhatraH = [7, 8, 9, 10, 11, 12, 1];
    const allInChhatra = seven.every(p => chhatraH.includes(p.houseNumber));
    yogas.push(allInChhatra
      ? { name: 'Chhatra Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H7 through H1'],
          explanation: 'Nabhasa Akriti yoga — umbrella shape. Source: BPHS Ch. 36.20.',
          effects: ['Protector of others', 'Helpful and kind', 'Prosperity in later life'] }
      : absent('Chhatra Yoga', 'nabhasa', 'Planets not confined to H7 through H1.'));

    // Chapa (Dhanush) Yoga: all 7 in H10 through H4 (i.e., H10/11/12/1/2/3/4)
    const chapaH = [10, 11, 12, 1, 2, 3, 4];
    const allInChapa = seven.every(p => chapaH.includes(p.houseNumber));
    yogas.push(allInChapa
      ? { name: 'Chapa Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['All 7 planets in H10 through H4'],
          explanation: 'Nabhasa Akriti yoga — bow shape. Source: BPHS Ch. 36.21.',
          effects: ['Truthful and brave', 'Happy in middle life', 'Guardian of treasures'] }
      : absent('Chapa Yoga', 'nabhasa', 'Planets not confined to H10 through H4.'));

    // Ardha-Chandra Yoga: all 7 in 7 consecutive houses starting from a panaphara
    const ardhaChandraStarts = [2, 5, 8, 11];
    let ardhaChandraFound = false;
    for (const start of ardhaChandraStarts) {
      const consecutive = Array.from({ length: 7 }, (_, i) => ((start - 1 + i) % 12) + 1);
      if (seven.every(p => consecutive.includes(p.houseNumber))) {
        yogas.push({ name: 'Ardha-Chandra Yoga', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: [`All 7 planets in 7 consecutive houses from H${start}`],
          explanation: 'Nabhasa Akriti yoga — half-moon shape. Source: BPHS Ch. 36.22.',
          effects: ['Commanding personality', 'Leader of armies', 'Handsome and strong'] });
        ardhaChandraFound = true; break;
      }
    }
    if (!ardhaChandraFound) yogas.push(absent('Ardha-Chandra Yoga', 'nabhasa', 'Planets not in 7 consecutive houses from a panaphara.'));

    // Chakra Yoga: all 7 in odd houses only (1/3/5/7/9/11)
    const oddH = [1, 3, 5, 7, 9, 11];
    const allInOdd = seven.every(p => oddH.includes(p.houseNumber));
    yogas.push(allInOdd
      ? { name: 'Chakra Yoga', category: 'nabhasa', isPresent: true, strength: 'strong',
          formedBy: ['All 7 planets in odd houses (1/3/5/7/9/11)'],
          explanation: 'Nabhasa Akriti yoga — wheel shape. Source: BPHS Ch. 36.23.',
          effects: ['Emperor or sovereign', 'Worshipped by kings', 'Commands vast territories'] }
      : absent('Chakra Yoga', 'nabhasa', 'Not all planets in odd houses.'));

    // Samudra Yoga: all 7 in even houses only (2/4/6/8/10/12)
    const evenH = [2, 4, 6, 8, 10, 12];
    const allInEven = seven.every(p => evenH.includes(p.houseNumber));
    yogas.push(allInEven
      ? { name: 'Samudra Yoga', category: 'nabhasa', isPresent: true, strength: 'strong',
          formedBy: ['All 7 planets in even houses (2/4/6/8/10/12)'],
          explanation: 'Nabhasa Akriti yoga — ocean shape. Source: BPHS Ch. 36.24.',
          effects: ['Wealthy and generous', 'Many pleasures', 'Loved by the ruler'] }
      : absent('Samudra Yoga', 'nabhasa', 'Not all planets in even houses.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ADDITIONAL RAJA YOGAS — BPHS Ch. 39–41, Saravali Ch. 35
  // ═══════════════════════════════════════════════════════════════════════════

  // 9a. Yogakaraka Raja Yoga: single planet lords both a kendra and a trikona
  // Source: BPHS Ch. 39.1–3
  if (asc) {
    const kendraH = [1, 4, 7, 10];
    const trikonaH = [1, 5, 9];
    let ykPlanet: string | null = null;
    let ykKH = 0, ykTH = 0;
    for (const kh of kendraH) {
      for (const th of trikonaH) {
        if (kh === th) continue;
        const kLord = getSignLord(houseSign(ascSign, kh));
        const tLord = getSignLord(houseSign(ascSign, th));
        if (kLord === tLord) {
          const pl = find(d1, kLord);
          if (pl && !ykPlanet) { ykPlanet = kLord; ykKH = kh; ykTH = th; }
        }
      }
    }
    if (ykPlanet) {
      const pl = find(d1, ykPlanet)!;
      const str: Yoga['strength'] = isOwnOrExalted(pl) ? 'strong' : pl.isCombust ? 'weak' : 'moderate';
      yogas.push({ name: 'Yogakaraka Raja Yoga', category: 'raja', isPresent: true, strength: str,
        formedBy: [`${ykPlanet} lords both H${ykKH} (kendra) and H${ykTH} (trikona)`],
        explanation: 'Single planet lords a kendra and a trikona — inherent raja yoga maker. Source: BPHS Ch. 39.1–3.',
        effects: ['Power and authority through one planet', 'Auspicious results in its periods'] });
    } else {
      yogas.push(absent('Yogakaraka Raja Yoga', 'raja', 'No single planet lords both a kendra and a trikona.'));
    }
  } else {
    yogas.push(absent('Yogakaraka Raja Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9b. Maharaja Yoga: lords of kendra and trikona in mutual 7th aspect (not conjunction)
  // Source: BPHS Ch. 39.6–10
  if (asc) {
    const kendraLords2 = [1, 4, 7, 10].map(h => ({ house: h, lord: getSignLord(houseSign(ascSign, h)) }));
    const trikonaLords2 = [5, 9].map(h => ({ house: h, lord: getSignLord(houseSign(ascSign, h)) }));
    let mrjFound = false;
    for (const kl of kendraLords2) {
      for (const tl of trikonaLords2) {
        if (kl.lord === tl.lord) continue;
        const plK = find(d1, kl.lord);
        const plT = find(d1, tl.lord);
        if (plK && plT && nthFrom(plK.houseNumber, plT.houseNumber) === 7) {
          yogas.push({ name: 'Maharaja Yoga', category: 'raja', isPresent: true,
            strength: (isOwnOrExalted(plK) || isOwnOrExalted(plT)) ? 'strong' : 'moderate',
            formedBy: [`Lord H${kl.house} (${kl.lord}) in H${plK.houseNumber} ↔ Lord H${tl.house} (${tl.lord}) in H${plT.houseNumber} — mutual 7th aspect`],
            explanation: 'Kendra and trikona lords in mutual aspect — great royal yoga. Source: BPHS Ch. 39.6–10.',
            effects: ['Kingly authority', 'Vast dominion', 'Lasting fame'] });
          mrjFound = true; break;
        }
      }
      if (mrjFound) break;
    }
    if (!mrjFound) yogas.push(absent('Maharaja Yoga', 'raja', 'No kendra-trikona lord pair in mutual 7th aspect.'));
  } else {
    yogas.push(absent('Maharaja Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9c. Mahabhagya Yoga: male = day birth, Sun+Moon+Asc in odd signs;
  //     female = night birth, Sun+Moon+Asc in even signs.
  // Source: BPHS Ch. 39.20–21, Saravali Ch. 35
  if (asc && sun && moon) {
    const ascOdd = ascSign % 2 === 1;
    const sunOdd = sun.signNumber % 2 === 1;
    const moonOdd = moon.signNumber % 2 === 1;
    const allOdd = ascOdd && sunOdd && moonOdd;
    const allEven = !ascOdd && !sunOdd && !moonOdd;
    // We cannot determine birth gender from chart data; check both conditions
    const present = allOdd || allEven;
    yogas.push(present
      ? { name: 'Mahabhagya Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [allOdd ? 'Asc, Sun, Moon all in odd signs (male form)' : 'Asc, Sun, Moon all in even signs (female form)'],
          explanation: 'Great fortune yoga — luminaries and lagna in same parity signs. Source: BPHS Ch. 39.20–21.',
          effects: ['Great fortune and longevity', 'Ruling over many', 'Widespread fame'] }
      : absent('Mahabhagya Yoga', 'raja', 'Asc, Sun, Moon not all in odd or all in even signs.'));
  } else {
    yogas.push(absent('Mahabhagya Yoga', 'raja', 'Ascendant, Sun, or Moon not available.'));
  }

  // 9d. Adhi Yoga (from Lagna): benefics in 6th, 7th, 8th from Lagna
  // Source: Phaladeepika Ch. 9.1, Saravali Ch. 35
  {
    const h6 = ((ascSign + 4) % 12) + 1; // house 6 sign
    const beneficsFromLagna = d1.filter(p =>
      NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' &&
      [6, 7, 8].includes(p.houseNumber));
    const present = beneficsFromLagna.length >= 2;
    yogas.push(present
      ? { name: 'Adhi Yoga (Lagna)', category: 'raja', isPresent: true,
          strength: beneficsFromLagna.length >= 3 ? 'strong' : 'moderate',
          formedBy: beneficsFromLagna.map(p => `${p.planet} in H${p.houseNumber}`),
          explanation: 'Benefics in 6th/7th/8th from Lagna — commander or minister. Source: Phaladeepika Ch. 9.1.',
          effects: ['Minister or commander', 'Polite and trustworthy', 'Wealthy and long-lived'] }
      : absent('Adhi Yoga (Lagna)', 'raja', 'Fewer than 2 benefics in 6th/7th/8th from Lagna.'));
  }

  // 9e. Chamara Yoga: Lagna lord exalted in kendra, aspected by Jupiter
  // Source: BPHS Ch. 39.22
  if (asc && jupiter) {
    const lagnaLord = getSignLord(ascSign);
    const llPl = find(d1, lagnaLord);
    if (llPl && isExalted(llPl) && isKendra(llPl.houseNumber) &&
        nthFrom(jupiter.houseNumber, llPl.houseNumber) === 7) {
      yogas.push({ name: 'Chamara Yoga', category: 'raja', isPresent: true, strength: 'strong',
        formedBy: [`Lagna lord (${lagnaLord}) exalted in kendra H${llPl.houseNumber}, aspected by Jupiter`],
        explanation: 'Lagna lord exalted in kendra with Jupiter aspect — royal honor. Source: BPHS Ch. 39.22.',
        effects: ['Royal honors', 'Eloquent and learned', 'Long-lived and virtuous'] });
    } else {
      yogas.push(absent('Chamara Yoga', 'raja', 'Lagna lord not exalted in kendra aspected by Jupiter.'));
    }
  } else {
    yogas.push(absent('Chamara Yoga', 'raja', 'Ascendant or Jupiter not available.'));
  }

  // 9f. Parvata Yoga: benefics in kendras, 6th and 8th houses unoccupied by malefics
  // Source: BPHS Ch. 39.23
  {
    const benInKendras = d1.filter(p => NATURAL_BENEFICS.includes(p.planet) && isKendra(p.houseNumber));
    const malIn6or8 = d1.some(p => NATURAL_MALEFICS.includes(p.planet) && (p.houseNumber === 6 || p.houseNumber === 8));
    const present = benInKendras.length >= 2 && !malIn6or8;
    yogas.push(present
      ? { name: 'Parvata Yoga', category: 'raja', isPresent: true,
          strength: benInKendras.length >= 3 ? 'strong' : 'moderate',
          formedBy: [...benInKendras.map(p => `${p.planet} in kendra H${p.houseNumber}`), 'H6 and H8 free from malefics'],
          explanation: 'Benefics in kendras, 6/8 unafflicted — fortress-like protection. Source: BPHS Ch. 39.23.',
          effects: ['Wealthy and generous', 'Head of a town or community', 'Prosperous and famous'] }
      : absent('Parvata Yoga', 'raja', 'Insufficient benefics in kendras or malefics in 6th/8th.'));
  }

  // 9g. Kahala Yoga: lords of 4th and 9th in mutual kendras, Lagna lord strong
  // Source: BPHS Ch. 39.24
  if (asc) {
    const lord4 = getSignLord(houseSign(ascSign, 4));
    const lord9k = getSignLord(houseSign(ascSign, 9));
    const pl4 = find(d1, lord4);
    const pl9k = find(d1, lord9k);
    const lagnaLord = getSignLord(ascSign);
    const llPl = find(d1, lagnaLord);
    const llStrong = llPl && (isKendra(llPl.houseNumber) || isTrikona(llPl.houseNumber));
    if (pl4 && pl9k && lord4 !== lord9k && inKendraFrom(pl4.houseNumber, pl9k.houseNumber) && llStrong) {
      yogas.push({ name: 'Kahala Yoga', category: 'raja', isPresent: true, strength: 'moderate',
        formedBy: [`Lord H4 (${lord4}) and Lord H9 (${lord9k}) in mutual kendras`, `Lagna lord (${lagnaLord}) strong in H${llPl!.houseNumber}`],
        explanation: 'Lords of 4th and 9th in mutual kendras with strong lagna lord — bold and authoritative. Source: BPHS Ch. 39.24.',
        effects: ['Stubborn and bold', 'Commands armies', 'Cunning but courageous'] });
    } else {
      yogas.push(absent('Kahala Yoga', 'raja', 'Lords of 4th/9th not in mutual kendras or lagna lord weak.'));
    }
  } else {
    yogas.push(absent('Kahala Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9h. Simhasana Yoga: lords of 2/4/5/9/10 all in kendras
  // Source: BPHS Ch. 39.25
  if (asc) {
    const simhHouses = [2, 4, 5, 9, 10];
    const simhLords = simhHouses.map(h => ({ house: h, lord: getSignLord(houseSign(ascSign, h)), pl: find(d1, getSignLord(houseSign(ascSign, h))) }));
    const allInKendras = simhLords.every(({ pl }) => pl && isKendra(pl.houseNumber));
    yogas.push(allInKendras
      ? { name: 'Simhasana Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: simhLords.map(({ house, lord, pl }) => `Lord H${house} (${lord}) in kendra H${pl!.houseNumber}`),
          explanation: 'Lords of 2/4/5/9/10 all in kendras — throne yoga. Source: BPHS Ch. 39.25.',
          effects: ['King or equivalent', 'Highly honored', 'Observes righteous conduct'] }
      : absent('Simhasana Yoga', 'raja', 'Not all lords of 2/4/5/9/10 in kendra houses.'));
  } else {
    yogas.push(absent('Simhasana Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9i. Mridanga Yoga: Lagna lord strong in kendra/trikona, all benefics in kendras
  // Source: BPHS Ch. 39.26
  if (asc) {
    const lagnaLord = getSignLord(ascSign);
    const llPl = find(d1, lagnaLord);
    const llStrong = llPl && (isKendra(llPl.houseNumber) || isTrikona(llPl.houseNumber)) && isOwnOrExalted(llPl);
    const beneficPlanets = d1.filter(p => NATURAL_BENEFICS.includes(p.planet));
    const allBenInKendras = beneficPlanets.length > 0 && beneficPlanets.every(p => isKendra(p.houseNumber));
    const present = !!llStrong && allBenInKendras;
    yogas.push(present
      ? { name: 'Mridanga Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lagna lord (${lagnaLord}) in own/exalted in H${llPl!.houseNumber}`, 'All benefics in kendras'],
          explanation: 'Lagna lord dignified + all benefics angular — royal drums beaten. Source: BPHS Ch. 39.26.',
          effects: ['King or ruler', 'Fame spreads by drumbeat', 'Prosperous reign'] }
      : absent('Mridanga Yoga', 'raja', 'Lagna lord not dignified in kendra/trikona or benefics not all in kendras.'));
  } else {
    yogas.push(absent('Mridanga Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9j. Shankha Yoga: lords of 5th and 6th in mutual kendras, Lagna lord strong
  // Source: BPHS Ch. 39.27
  if (asc) {
    const lord5s = getSignLord(houseSign(ascSign, 5));
    const lord6s = getSignLord(houseSign(ascSign, 6));
    const pl5s = find(d1, lord5s);
    const pl6s = find(d1, lord6s);
    const lagnaLord = getSignLord(ascSign);
    const llPl = find(d1, lagnaLord);
    const llStrong = llPl && (isKendra(llPl.houseNumber) || isTrikona(llPl.houseNumber));
    if (pl5s && pl6s && lord5s !== lord6s && inKendraFrom(pl5s.houseNumber, pl6s.houseNumber) && llStrong) {
      yogas.push({ name: 'Shankha Yoga', category: 'raja', isPresent: true, strength: 'moderate',
        formedBy: [`Lord H5 (${lord5s}) and Lord H6 (${lord6s}) in mutual kendras`, `Lagna lord strong in H${llPl!.houseNumber}`],
        explanation: 'Lords of 5th and 6th mutually angular — conch yoga. Source: BPHS Ch. 39.27.',
        effects: ['Virtuous and learned', 'Long-lived and prosperous', 'Fond of pleasures'] });
    } else {
      yogas.push(absent('Shankha Yoga', 'raja', 'Lords of 5th/6th not in mutual kendras or lagna lord weak.'));
    }
  } else {
    yogas.push(absent('Shankha Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9k. Bheri Yoga: Lord of 9th in kendra, and Venus+Jupiter+Lagna lord all in kendras
  // Source: BPHS Ch. 39.28
  if (asc && venus && jupiter) {
    const lord9b = getSignLord(houseSign(ascSign, 9));
    const pl9b = find(d1, lord9b);
    const lagnaLord = getSignLord(ascSign);
    const llPl = find(d1, lagnaLord);
    const present = !!(pl9b && isKendra(pl9b.houseNumber) && isKendra(venus.houseNumber)
      && isKendra(jupiter.houseNumber) && llPl && isKendra(llPl.houseNumber));
    yogas.push(present
      ? { name: 'Bheri Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lord H9 (${lord9b}) in kendra H${pl9b!.houseNumber}`, `Venus in H${venus.houseNumber}`, `Jupiter in H${jupiter.houseNumber}`, `Lagna lord in H${llPl!.houseNumber}`],
          explanation: 'Lord of 9th + Venus + Jupiter + lagna lord all in kendras — cymbal yoga. Source: BPHS Ch. 39.28.',
          effects: ['King or equivalent', 'Devout and virtuous', 'Blessed with family happiness'] }
      : absent('Bheri Yoga', 'raja', 'Lord of 9th / Venus / Jupiter / Lagna lord not all in kendras.'));
  } else {
    yogas.push(absent('Bheri Yoga', 'raja', 'Ascendant, Venus, or Jupiter not available.'));
  }

  // 9l. Akhanda Samrajya Yoga: Jupiter lords 2nd/5th/11th and a benefic is in kendra from Moon
  // Source: BPHS Ch. 39.29
  if (asc && moon && jupiter) {
    const jupLords = [2, 5, 11].filter(h => getSignLord(houseSign(ascSign, h)) === 'jupiter');
    const benInKendraFromMoon = d1.some(p =>
      NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' && inKendraFrom(moon.houseNumber, p.houseNumber));
    const present = jupLords.length > 0 && benInKendraFromMoon;
    yogas.push(present
      ? { name: 'Akhanda Samrajya Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Jupiter lords H${jupLords.join('/')}`, 'Benefic in kendra from Moon'],
          explanation: 'Jupiter lords wealth/fortune house + benefic angular from Moon — undivided empire. Source: BPHS Ch. 39.29.',
          effects: ['Undivided sovereignty', 'Abundant wealth', 'Long-lasting kingdom'] }
      : absent('Akhanda Samrajya Yoga', 'raja', 'Jupiter does not lord 2/5/11 or no benefic in kendra from Moon.'));
  } else {
    yogas.push(absent('Akhanda Samrajya Yoga', 'raja', 'Ascendant, Moon, or Jupiter not available.'));
  }

  // 9m. Pushkala Yoga: Lagna lord and Moon-sign lord in same house/kendra, aspected by strong planet
  // Source: BPHS Ch. 39.30
  if (asc && moon) {
    const lagnaLord = getSignLord(ascSign);
    const moonSignLord = getSignLord(moon.signNumber);
    const llPl = find(d1, lagnaLord);
    const mslPl = find(d1, moonSignLord);
    if (llPl && mslPl && lagnaLord !== moonSignLord &&
        (llPl.houseNumber === mslPl.houseNumber || inKendraFrom(llPl.houseNumber, mslPl.houseNumber))) {
      const aspected = d1.some(p => p.planet !== lagnaLord && p.planet !== moonSignLord &&
        isOwnOrExalted(p) && nthFrom(p.houseNumber, llPl.houseNumber) === 7);
      if (aspected) {
        yogas.push({ name: 'Pushkala Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lagna lord (${lagnaLord}) and Moon-sign lord (${moonSignLord}) together/mutual kendra`, 'Aspected by a dignified planet'],
          explanation: 'Lagna lord and Moon-sign lord jointly strong — auspicious accumulation. Source: BPHS Ch. 39.30.',
          effects: ['Wealth and fame', 'Sweet speech', 'Honored by the ruler'] });
      } else {
        yogas.push(absent('Pushkala Yoga', 'raja', 'Lagna/Moon-sign lords conjunct but not aspected by dignified planet.'));
      }
    } else {
      yogas.push(absent('Pushkala Yoga', 'raja', 'Lagna lord and Moon-sign lord not conjunct or in mutual kendras.'));
    }
  } else {
    yogas.push(absent('Pushkala Yoga', 'raja', 'Ascendant or Moon not available.'));
  }

  // 9n. Amala Kirti Yoga: natural benefic in 10th from Moon
  // Source: Saravali Ch. 35.3
  if (moon) {
    const h10fromMoon = ((moon.houseNumber + 8) % 12) + 1;
    const benIn10m = d1.filter(p => p.houseNumber === h10fromMoon && NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon');
    yogas.push(benIn10m.length > 0
      ? { name: 'Amala Kirti Yoga', category: 'raja', isPresent: true,
          strength: benIn10m.some(p => isOwnOrExalted(p)) ? 'strong' : 'moderate',
          formedBy: benIn10m.map(p => `${p.planet} in 10th from Moon (H${h10fromMoon})`),
          explanation: 'Benefic in 10th from Moon — spotless reputation. Source: Saravali Ch. 35.3.',
          effects: ['Unblemished reputation', 'Charitable and virtuous', 'Enduring fame'] }
      : absent('Amala Kirti Yoga', 'raja', 'No benefic in 10th from Moon.'));
  } else {
    yogas.push(absent('Amala Kirti Yoga', 'raja', 'Moon not available.'));
  }

  // 9o. Vasumati Yoga: all natural benefics in upachaya houses (3/6/10/11) from Moon
  // Source: Saravali Ch. 35.5
  if (moon) {
    const upachayaFromMoon = [3, 6, 10, 11].map(h => ((moon.houseNumber + h - 2) % 12) + 1);
    const beneficPlanets = ['jupiter', 'venus', 'mercury'];
    const allBenInUpa = beneficPlanets.every(bp => {
      const pl = find(d1, bp);
      return pl && upachayaFromMoon.includes(pl.houseNumber);
    });
    yogas.push(allBenInUpa
      ? { name: 'Vasumati Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: beneficPlanets.map(bp => `${bp} in upachaya from Moon`),
          explanation: 'All benefics in upachaya houses from Moon — immense wealth. Source: Saravali Ch. 35.5.',
          effects: ['Immense wealth', 'Never faces poverty', 'Generous and prosperous'] }
      : absent('Vasumati Yoga', 'raja', 'Not all benefics (Jupiter/Venus/Mercury) in upachaya from Moon.'));
  } else {
    yogas.push(absent('Vasumati Yoga', 'raja', 'Moon not available.'));
  }

  // 9p. Gauri Yoga: Moon in own/exalted sign in kendra, aspected by Jupiter
  // Source: Saravali Ch. 35.8
  if (moon && jupiter) {
    const moonDignified = isOwnOrExalted(moon) && isKendra(moon.houseNumber);
    const jupAspects = nthFrom(jupiter.houseNumber, moon.houseNumber) === 7;
    yogas.push(moonDignified && jupAspects
      ? { name: 'Gauri Yoga', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Moon in ${isExalted(moon) ? 'exalted' : 'own'} sign in kendra H${moon.houseNumber}`, `Jupiter aspects from H${jupiter.houseNumber}`],
          explanation: 'Moon dignified in kendra aspected by Jupiter — grace and beauty. Source: Saravali Ch. 35.8.',
          effects: ['Born in royal family', 'Virtuous and beautiful', 'Charitable'] }
      : absent('Gauri Yoga', 'raja', 'Moon not in own/exalted kendra aspected by Jupiter.'));
  } else {
    yogas.push(absent('Gauri Yoga', 'raja', 'Moon or Jupiter not available.'));
  }

  // 9q. Matsya Yoga: benefics in H1 and H9, malefics in H5, mixed in H4 and H8
  // Source: Saravali Ch. 35.10
  {
    const benH1 = d1.some(p => p.houseNumber === 1 && NATURAL_BENEFICS.includes(p.planet));
    const benH9 = d1.some(p => p.houseNumber === 9 && NATURAL_BENEFICS.includes(p.planet));
    const malH5 = d1.some(p => p.houseNumber === 5 && NATURAL_MALEFICS.includes(p.planet));
    const anyH4 = d1.some(p => p.houseNumber === 4 && p.planet !== 'ascendant');
    const anyH8 = d1.some(p => p.houseNumber === 8 && p.planet !== 'ascendant');
    const present = benH1 && benH9 && malH5 && anyH4 && anyH8;
    yogas.push(present
      ? { name: 'Matsya Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: ['Benefic in H1 & H9, malefic in H5, planets in H4 & H8'],
          explanation: 'Fish-shaped yoga — compassionate and learned. Source: Saravali Ch. 35.10.',
          effects: ['Compassionate and learned', 'Good-looking', 'Famous and virtuous'] }
      : absent('Matsya Yoga', 'raja', 'Required planetary positions for fish-shape not met.'));
  }

  // 9r. Kurma Yoga: benefics in H5/6/7 in own/exalted sign
  // Source: Saravali Ch. 35.11
  {
    const benIn567 = d1.filter(p => NATURAL_BENEFICS.includes(p.planet) && [5, 6, 7].includes(p.houseNumber) && isOwnOrExalted(p));
    yogas.push(benIn567.length >= 2
      ? { name: 'Kurma Yoga', category: 'raja', isPresent: true,
          strength: benIn567.length >= 3 ? 'strong' : 'moderate',
          formedBy: benIn567.map(p => `${p.planet} in own/exalted in H${p.houseNumber}`),
          explanation: 'Benefics dignified in H5/6/7 — tortoise yoga (slow and steady). Source: Saravali Ch. 35.11.',
          effects: ['Virtuous and happy', 'Leader and benefactor', 'Renowned and righteous'] }
      : absent('Kurma Yoga', 'raja', 'Insufficient dignified benefics in H5/6/7.'));
  }

  // 9s. Khadga Yoga: lord of 2nd in kendra, lord of 9th in 2nd house
  // Source: BPHS Ch. 39.32
  if (asc) {
    const lord2k = getSignLord(houseSign(ascSign, 2));
    const lord9k2 = getSignLord(houseSign(ascSign, 9));
    const pl2k = find(d1, lord2k);
    const pl9k2 = find(d1, lord9k2);
    const present = !!(pl2k && isKendra(pl2k.houseNumber) && pl9k2 && pl9k2.houseNumber === 2);
    yogas.push(present
      ? { name: 'Khadga Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H2 (${lord2k}) in kendra H${pl2k!.houseNumber}`, `Lord H9 (${lord9k2}) in H2`],
          explanation: 'Lord of 2nd in kendra, lord of 9th in 2nd — sword yoga. Source: BPHS Ch. 39.32.',
          effects: ['Virtuous and learned', 'Charitable and fortunate', 'Scholarly reputation'] }
      : absent('Khadga Yoga', 'raja', 'Lord of 2nd not in kendra or lord of 9th not in 2nd.'));
  } else {
    yogas.push(absent('Khadga Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9t. Harsha Yoga: lord of 6th in 6th house
  // Source: BPHS Ch. 41.1
  if (asc) {
    const lord6h = getSignLord(houseSign(ascSign, 6));
    const pl6h = find(d1, lord6h);
    yogas.push(pl6h && pl6h.houseNumber === 6
      ? { name: 'Harsha Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H6 (${lord6h}) in H6`],
          explanation: 'Lord of 6th in own house (6th) — specific Viparita raja yoga. Source: BPHS Ch. 41.1.',
          effects: ['Happy and fortunate', 'Conquers enemies', 'Good health'] }
      : absent('Harsha Yoga', 'raja', 'Lord of 6th not placed in 6th house.'));
  } else {
    yogas.push(absent('Harsha Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9u. Sarala Yoga: lord of 8th in 8th house
  // Source: BPHS Ch. 41.2
  if (asc) {
    const lord8s = getSignLord(houseSign(ascSign, 8));
    const pl8s = find(d1, lord8s);
    yogas.push(pl8s && pl8s.houseNumber === 8
      ? { name: 'Sarala Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H8 (${lord8s}) in H8`],
          explanation: 'Lord of 8th in own house (8th) — specific Viparita raja yoga. Source: BPHS Ch. 41.2.',
          effects: ['Long-lived', 'Fearless and prosperous', 'Conqueror of enemies'] }
      : absent('Sarala Yoga', 'raja', 'Lord of 8th not placed in 8th house.'));
  } else {
    yogas.push(absent('Sarala Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9v. Vimala Yoga: lord of 12th in 12th house
  // Source: BPHS Ch. 41.3
  if (asc) {
    const lord12v = getSignLord(houseSign(ascSign, 12));
    const pl12v = find(d1, lord12v);
    yogas.push(pl12v && pl12v.houseNumber === 12
      ? { name: 'Vimala Yoga', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H12 (${lord12v}) in H12`],
          explanation: 'Lord of 12th in own house (12th) — specific Viparita raja yoga. Source: BPHS Ch. 41.3.',
          effects: ['Frugal and happy', 'Independently wealthy', 'Virtuous conduct'] }
      : absent('Vimala Yoga', 'raja', 'Lord of 12th not placed in 12th house.'));
  } else {
    yogas.push(absent('Vimala Yoga', 'raja', 'Ascendant not available.'));
  }

  // 9w. Duryoga: lord of 10th in dusthana (6/8/12)
  // Source: Saravali Ch. 35.15
  if (asc) {
    const lord10d = getSignLord(houseSign(ascSign, 10));
    const pl10d = find(d1, lord10d);
    const present = !!(pl10d && isDusthana(pl10d.houseNumber));
    const cancelled = present && pl10d && isOwnOrExalted(pl10d);
    yogas.push(present
      ? { name: 'Duryoga', category: 'raja', isPresent: !cancelled,
          strength: cancelled ? 'weak' : 'moderate',
          formedBy: cancelled ? [] : [`Lord H10 (${lord10d}) in dusthana H${pl10d!.houseNumber}`],
          explanation: cancelled
            ? `Lord of 10th in dusthana but in ${isExalted(pl10d!) ? 'exalted' : 'own'} sign — negativity reduced.`
            : `Lord of karma in H${pl10d!.houseNumber} — obstructed career. Source: Saravali Ch. 35.15.`,
          effects: cancelled ? [] : ['Career struggles', 'Dependent on others', 'Servile position'] }
      : absent('Duryoga', 'raja', 'Lord of 10th not in a dusthana.'));
  } else {
    yogas.push(absent('Duryoga', 'raja', 'Ascendant not available.'));
  }

  // 9x. Rajayogabhanga: any raja yoga lord that is combust, debilitated (without NBRY), or in dusthana
  // Source: BPHS Ch. 40.1–5
  if (asc) {
    const kendraLords3 = [1, 4, 7, 10].map(h => getSignLord(houseSign(ascSign, h)));
    const trikonaLords3 = [5, 9].map(h => getSignLord(houseSign(ascSign, h)));
    const rajaPlanets = new Set([...kendraLords3, ...trikonaLords3]);
    const bhangaReasons: string[] = [];
    for (const rp of rajaPlanets) {
      const pl = find(d1, rp);
      if (!pl) continue;
      if (pl.isCombust) bhangaReasons.push(`${rp} (kendra/trikona lord) combust`);
      if (isDebilitated(pl)) bhangaReasons.push(`${rp} (kendra/trikona lord) debilitated`);
      if (isDusthana(pl.houseNumber)) bhangaReasons.push(`${rp} (kendra/trikona lord) in dusthana H${pl.houseNumber}`);
    }
    yogas.push(bhangaReasons.length > 0
      ? { name: 'Rajayogabhanga', category: 'raja', isPresent: true,
          strength: bhangaReasons.length >= 3 ? 'strong' : 'moderate',
          formedBy: bhangaReasons,
          explanation: 'Cancellation of raja yoga — yoga-forming lords weakened. Source: BPHS Ch. 40.1–5.',
          effects: ['Raja yoga results diminished', 'Rise followed by fall', 'Obstacles to power'] }
      : absent('Rajayogabhanga', 'raja', 'No kendra/trikona lord is combust, debilitated, or in dusthana.'));
  } else {
    yogas.push(absent('Rajayogabhanga', 'raja', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ADDITIONAL DHANA YOGAS — Saravali Ch. 34, BPHS Ch. 39
  // ═══════════════════════════════════════════════════════════════════════════

  // 10a. Dhana Yoga (Lords of 2+5): conjunction of lords of 2nd and 5th
  // Source: Saravali Ch. 34.1
  if (asc) {
    const l2 = getSignLord(houseSign(ascSign, 2));
    const l5 = getSignLord(houseSign(ascSign, 5));
    const p2 = find(d1, l2), p5 = find(d1, l5);
    const present = !!(p2 && p5 && l2 !== l5 && p2.houseNumber === p5.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (2-5 Lords)', category: 'dhana', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H2 (${l2}) & Lord H5 (${l5}) conjunct in H${p2!.houseNumber}`],
          explanation: 'Lords of 2nd and 5th conjoined — wealth through intelligence. Source: Saravali Ch. 34.1.',
          effects: ['Wealth through intellect', 'Good investments', 'Financial wisdom'] }
      : absent('Dhana Yoga (2-5 Lords)', 'dhana', 'Lords of 2nd and 5th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (2-5 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10b. Dhana Yoga (Lords of 2+9): conjunction of lords of 2nd and 9th
  // Source: Saravali Ch. 34.2
  if (asc) {
    const l2b = getSignLord(houseSign(ascSign, 2));
    const l9b = getSignLord(houseSign(ascSign, 9));
    const p2b = find(d1, l2b), p9b = find(d1, l9b);
    const present = !!(p2b && p9b && l2b !== l9b && p2b.houseNumber === p9b.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (2-9 Lords)', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H2 (${l2b}) & Lord H9 (${l9b}) conjunct in H${p2b!.houseNumber}`],
          explanation: 'Lords of 2nd and 9th conjoined — wealth through fortune. Source: Saravali Ch. 34.2.',
          effects: ['Wealth through luck and inheritance', 'Fortunate in finances', 'Paternal wealth'] }
      : absent('Dhana Yoga (2-9 Lords)', 'dhana', 'Lords of 2nd and 9th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (2-9 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10c. Dhana Yoga (Lords of 2+11): conjunction of lords of 2nd and 11th
  // Source: Saravali Ch. 34.3
  if (asc) {
    const l2c = getSignLord(houseSign(ascSign, 2));
    const l11c = getSignLord(houseSign(ascSign, 11));
    const p2c = find(d1, l2c), p11c = find(d1, l11c);
    const present = !!(p2c && p11c && l2c !== l11c && p2c.houseNumber === p11c.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (2-11 Lords)', category: 'dhana', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H2 (${l2c}) & Lord H11 (${l11c}) conjunct in H${p2c!.houseNumber}`],
          explanation: 'Lords of 2nd and 11th conjoined — earnings and accumulated wealth. Source: Saravali Ch. 34.3.',
          effects: ['Strong earnings', 'Wealth accumulation', 'Multiple income sources'] }
      : absent('Dhana Yoga (2-11 Lords)', 'dhana', 'Lords of 2nd and 11th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (2-11 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10d. Dhana Yoga (Lords of 5+9): conjunction of lords of 5th and 9th
  // Source: Saravali Ch. 34.4
  if (asc) {
    const l5d = getSignLord(houseSign(ascSign, 5));
    const l9d = getSignLord(houseSign(ascSign, 9));
    const p5d = find(d1, l5d), p9d = find(d1, l9d);
    const present = !!(p5d && p9d && l5d !== l9d && p5d.houseNumber === p9d.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (5-9 Lords)', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H5 (${l5d}) & Lord H9 (${l9d}) conjunct in H${p5d!.houseNumber}`],
          explanation: 'Lords of 5th and 9th conjoined — wealth through past-life merit. Source: Saravali Ch. 34.4.',
          effects: ['Wealth from purva punya', 'Speculative gains', 'Fortunate children'] }
      : absent('Dhana Yoga (5-9 Lords)', 'dhana', 'Lords of 5th and 9th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (5-9 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10e. Dhana Yoga (Lords of 5+11): conjunction of lords of 5th and 11th
  // Source: Saravali Ch. 34.5
  if (asc) {
    const l5e = getSignLord(houseSign(ascSign, 5));
    const l11e = getSignLord(houseSign(ascSign, 11));
    const p5e = find(d1, l5e), p11e = find(d1, l11e);
    const present = !!(p5e && p11e && l5e !== l11e && p5e.houseNumber === p11e.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (5-11 Lords)', category: 'dhana', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H5 (${l5e}) & Lord H11 (${l11e}) conjunct in H${p5e!.houseNumber}`],
          explanation: 'Lords of 5th and 11th conjoined — gains through speculation. Source: Saravali Ch. 34.5.',
          effects: ['Speculative gains', 'Profits from investments', 'Prosperous children'] }
      : absent('Dhana Yoga (5-11 Lords)', 'dhana', 'Lords of 5th and 11th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (5-11 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10f. Dhana Yoga (Lords of 9+11): conjunction of lords of 9th and 11th
  // Source: Saravali Ch. 34.6
  if (asc) {
    const l9f = getSignLord(houseSign(ascSign, 9));
    const l11f = getSignLord(houseSign(ascSign, 11));
    const p9f = find(d1, l9f), p11f = find(d1, l11f);
    const present = !!(p9f && p11f && l9f !== l11f && p9f.houseNumber === p11f.houseNumber);
    yogas.push(present
      ? { name: 'Dhana Yoga (9-11 Lords)', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H9 (${l9f}) & Lord H11 (${l11f}) conjunct in H${p9f!.houseNumber}`],
          explanation: 'Lords of 9th and 11th conjoined — fortune and gains unite. Source: Saravali Ch. 34.6.',
          effects: ['Great fortune', 'Abundant gains', 'Philanthropic wealth'] }
      : absent('Dhana Yoga (9-11 Lords)', 'dhana', 'Lords of 9th and 11th not conjunct.'));
  } else {
    yogas.push(absent('Dhana Yoga (9-11 Lords)', 'dhana', 'Ascendant not available.'));
  }

  // 10g. Kalanidhi Yoga: Jupiter in 2nd or 5th, conjunct or aspected by Mercury and Venus
  // Source: Saravali Ch. 34.8
  if (jupiter && mercury && venus) {
    const jupIn2or5 = jupiter.houseNumber === 2 || jupiter.houseNumber === 5;
    const mercConj = mercury.houseNumber === jupiter.houseNumber || nthFrom(mercury.houseNumber, jupiter.houseNumber) === 7;
    const venConj = venus.houseNumber === jupiter.houseNumber || nthFrom(venus.houseNumber, jupiter.houseNumber) === 7;
    const present = jupIn2or5 && mercConj && venConj;
    yogas.push(present
      ? { name: 'Kalanidhi Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Jupiter in H${jupiter.houseNumber}`, `Mercury ${mercury.houseNumber === jupiter.houseNumber ? 'conjunct' : 'aspects'}`, `Venus ${venus.houseNumber === jupiter.houseNumber ? 'conjunct' : 'aspects'}`],
          explanation: 'Jupiter in 2nd/5th with Mercury and Venus influence — treasure of arts. Source: Saravali Ch. 34.8.',
          effects: ['Honored by kings', 'Virtuous and wealthy', 'Master of many arts'] }
      : absent('Kalanidhi Yoga', 'dhana', 'Jupiter not in 2nd/5th or not conjunct/aspected by both Mercury and Venus.'));
  } else {
    yogas.push(absent('Kalanidhi Yoga', 'dhana', 'Jupiter, Mercury, or Venus not available.'));
  }

  // 10h. Mahalakshmi Yoga: lord of 5th in kendra conjunct Venus
  // Source: BPHS Ch. 39.35
  if (asc && venus) {
    const lord5ml = getSignLord(houseSign(ascSign, 5));
    const pl5ml = find(d1, lord5ml);
    const present = !!(pl5ml && isKendra(pl5ml.houseNumber) && venus.houseNumber === pl5ml.houseNumber);
    yogas.push(present
      ? { name: 'Mahalakshmi Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H5 (${lord5ml}) in kendra H${pl5ml!.houseNumber} conjunct Venus`],
          explanation: 'Lord of 5th with Venus in kendra — great goddess of wealth. Source: BPHS Ch. 39.35.',
          effects: ['Extraordinary wealth', 'Luxurious life', 'Grace and beauty'] }
      : absent('Mahalakshmi Yoga', 'dhana', 'Lord of 5th not in kendra conjunct Venus.'));
  } else {
    yogas.push(absent('Mahalakshmi Yoga', 'dhana', 'Ascendant or Venus not available.'));
  }

  // 10i. Shri Yoga: Moon in own/exalted sign in kendra, aspected by Venus
  // Source: Saravali Ch. 34.10
  if (moon && venus) {
    const moonDig = isOwnOrExalted(moon) && isKendra(moon.houseNumber);
    const venAspects = nthFrom(venus.houseNumber, moon.houseNumber) === 7;
    yogas.push(moonDig && venAspects
      ? { name: 'Shri Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Moon in ${isExalted(moon) ? 'exalted' : 'own'} sign in H${moon.houseNumber}`, `Venus aspects from H${venus.houseNumber}`],
          explanation: 'Moon dignified in kendra, aspected by Venus — goddess Shri. Source: Saravali Ch. 34.10.',
          effects: ['Wealthy and beautiful', 'Loved by spouse', 'Luxurious life'] }
      : absent('Shri Yoga', 'dhana', 'Moon not in own/exalted kendra aspected by Venus.'));
  } else {
    yogas.push(absent('Shri Yoga', 'dhana', 'Moon or Venus not available.'));
  }

  // 10j. Maha Dhana Yoga: lord of 2nd exalted in kendra
  // Source: BPHS Ch. 39.36
  if (asc) {
    const lord2md = getSignLord(houseSign(ascSign, 2));
    const pl2md = find(d1, lord2md);
    yogas.push(pl2md && isExalted(pl2md) && isKendra(pl2md.houseNumber)
      ? { name: 'Maha Dhana Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H2 (${lord2md}) exalted in kendra H${pl2md.houseNumber}`],
          explanation: 'Lord of wealth house exalted in kendra — great wealth. Source: BPHS Ch. 39.36.',
          effects: ['Great accumulated wealth', 'Born in wealthy family', 'Generous and prosperous'] }
      : absent('Maha Dhana Yoga', 'dhana', 'Lord of 2nd not exalted in a kendra.'));
  } else {
    yogas.push(absent('Maha Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // 10k. Dhana Yoga (Lagna-lord in 2/11): lagna lord in 2nd or 11th house
  // Source: BPHS Ch. 39.37
  if (asc) {
    const lagnaLordD = getSignLord(ascSign);
    const llPlD = find(d1, lagnaLordD);
    const present = !!(llPlD && (llPlD.houseNumber === 2 || llPlD.houseNumber === 11));
    yogas.push(present
      ? { name: 'Dhana Yoga (Lagna Lord)', category: 'dhana', isPresent: true,
          strength: isOwnOrExalted(llPlD!) ? 'strong' : 'moderate',
          formedBy: [`Lagna lord (${lagnaLordD}) in H${llPlD!.houseNumber}`],
          explanation: `Lagna lord in house of wealth (H${llPlD!.houseNumber}) — self-earned wealth. Source: BPHS Ch. 39.37.`,
          effects: ['Self-made wealth', 'Strong personality attracts money', 'Financial independence'] }
      : absent('Dhana Yoga (Lagna Lord)', 'dhana', 'Lagna lord not in 2nd or 11th house.'));
  } else {
    yogas.push(absent('Dhana Yoga (Lagna Lord)', 'dhana', 'Ascendant not available.'));
  }

  // 10l. Rajya-Dhana Yoga: lords of 9th and 10th conjunct in 2nd or 11th
  // Source: Saravali Ch. 34.12
  if (asc) {
    const l9rd = getSignLord(houseSign(ascSign, 9));
    const l10rd = getSignLord(houseSign(ascSign, 10));
    const p9rd = find(d1, l9rd), p10rd = find(d1, l10rd);
    const present = !!(p9rd && p10rd && l9rd !== l10rd && p9rd.houseNumber === p10rd.houseNumber && (p9rd.houseNumber === 2 || p9rd.houseNumber === 11));
    yogas.push(present
      ? { name: 'Rajya-Dhana Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H9 (${l9rd}) & Lord H10 (${l10rd}) conjunct in H${p9rd!.houseNumber}`],
          explanation: 'Lords of fortune and karma in wealth house — wealth through power. Source: Saravali Ch. 34.12.',
          effects: ['Wealth through authority', 'Government income', 'Royal grants'] }
      : absent('Rajya-Dhana Yoga', 'dhana', 'Lords of 9th and 10th not conjunct in 2nd or 11th.'));
  } else {
    yogas.push(absent('Rajya-Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // 10m. Subha Dhana Yoga: natural benefic in 2nd house in own/exalted sign
  // Source: Saravali Ch. 34.14
  {
    const benIn2Dig = d1.filter(p => p.houseNumber === 2 && NATURAL_BENEFICS.includes(p.planet) && isOwnOrExalted(p));
    yogas.push(benIn2Dig.length > 0
      ? { name: 'Subha Dhana Yoga', category: 'dhana', isPresent: true,
          strength: benIn2Dig.some(p => isExalted(p)) ? 'strong' : 'moderate',
          formedBy: benIn2Dig.map(p => `${p.planet} in own/exalted in H2`),
          explanation: 'Benefic dignified in 2nd house — auspicious wealth. Source: Saravali Ch. 34.14.',
          effects: ['Good family wealth', 'Sweet speech', 'Financial stability'] }
      : absent('Subha Dhana Yoga', 'dhana', 'No benefic in 2nd house in own/exalted sign.'));
  }

  // 10n. Uttama Dhana Yoga: lord of 11th in own/exalted sign in kendra
  // Source: BPHS Ch. 39.38
  if (asc) {
    const l11u = getSignLord(houseSign(ascSign, 11));
    const p11u = find(d1, l11u);
    yogas.push(p11u && isOwnOrExalted(p11u) && isKendra(p11u.houseNumber)
      ? { name: 'Uttama Dhana Yoga', category: 'dhana', isPresent: true, strength: 'strong',
          formedBy: [`Lord H11 (${l11u}) in ${isExalted(p11u) ? 'exalted' : 'own'} sign in kendra H${p11u.houseNumber}`],
          explanation: 'Lord of gains dignified in kendra — best wealth yoga. Source: BPHS Ch. 39.38.',
          effects: ['Excellent income', 'Fulfillment of desires', 'Prosperous network'] }
      : absent('Uttama Dhana Yoga', 'dhana', 'Lord of 11th not in own/exalted sign in kendra.'));
  } else {
    yogas.push(absent('Uttama Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ARISTHA YOGAS (health/longevity) — BPHS Ch. 41–42, Phaladeepika Ch. 13
  // ═══════════════════════════════════════════════════════════════════════════

  // 11a. Balarishta Yoga: Moon in 6/8/12 from Lagna, aspected by malefic, no benefic aspect
  // Source: BPHS Ch. 42.1–3
  if (moon) {
    const moonInDust = isDusthana(moon.houseNumber);
    const malAspects = d1.some(p => NATURAL_MALEFICS.includes(p.planet) && nthFrom(p.houseNumber, moon.houseNumber) === 7);
    const benAspects = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' && nthFrom(p.houseNumber, moon.houseNumber) === 7);
    const present = moonInDust && malAspects && !benAspects;
    yogas.push(present
      ? { name: 'Balarishta Yoga', category: 'aristha', isPresent: true, strength: 'strong',
          formedBy: [`Moon in dusthana H${moon.houseNumber}`, 'Aspected by malefic', 'No benefic aspect on Moon'],
          explanation: 'Moon in dusthana under malefic aspect without benefic protection — childhood affliction. Source: BPHS Ch. 42.1–3.',
          effects: ['Health issues in childhood', 'Early life difficulties', 'Need for medical attention'] }
      : absent('Balarishta Yoga', 'aristha', 'Moon not in dusthana under unrelieved malefic aspect.'));
  } else {
    yogas.push(absent('Balarishta Yoga', 'aristha', 'Moon not available.'));
  }

  // 11b. Balarishta Cancellation: Jupiter/Venus aspect on Moon, or Moon in kendra
  // Source: BPHS Ch. 42.4–5
  if (moon) {
    const moonInDust = isDusthana(moon.houseNumber);
    const jupVenAspect = d1.some(p => (p.planet === 'jupiter' || p.planet === 'venus') && nthFrom(p.houseNumber, moon.houseNumber) === 7);
    const moonInKendra = isKendra(moon.houseNumber);
    const cancelled = moonInDust && (jupVenAspect || moonInKendra);
    yogas.push(cancelled
      ? { name: 'Balarishta Cancellation', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [jupVenAspect ? 'Jupiter/Venus aspects Moon' : 'Moon in kendra'],
          explanation: 'Balarishta cancelled by benefic influence — childhood dangers overcome. Source: BPHS Ch. 42.4–5.',
          effects: ['Childhood difficulties overcome', 'Recovery from early illness', 'Protected by grace'] }
      : absent('Balarishta Cancellation', 'aristha', 'No Balarishta present to cancel, or cancellation conditions not met.'));
  } else {
    yogas.push(absent('Balarishta Cancellation', 'aristha', 'Moon not available.'));
  }

  // 11c. Maraka Yoga: lords of 2nd and 7th (maraka houses) in kendras or conjunct
  // Source: BPHS Ch. 41.10–12
  if (asc) {
    const lord2m = getSignLord(houseSign(ascSign, 2));
    const lord7m = getSignLord(houseSign(ascSign, 7));
    const pl2m = find(d1, lord2m), pl7m = find(d1, lord7m);
    const conjunct = !!(pl2m && pl7m && lord2m !== lord7m && pl2m.houseNumber === pl7m.houseNumber);
    const bothInKendra = !!(pl2m && pl7m && isKendra(pl2m.houseNumber) && isKendra(pl7m.houseNumber));
    const present = conjunct || bothInKendra;
    yogas.push(present
      ? { name: 'Maraka Yoga', category: 'aristha', isPresent: true,
          strength: conjunct ? 'strong' : 'moderate',
          formedBy: [conjunct ? `Lord H2 (${lord2m}) & Lord H7 (${lord7m}) conjunct in H${pl2m!.houseNumber}` : `Lord H2 in kendra H${pl2m!.houseNumber}, Lord H7 in kendra H${pl7m!.houseNumber}`],
          explanation: 'Maraka lords (2nd & 7th) associated — potential health/longevity issues. Source: BPHS Ch. 41.10–12.',
          effects: ['Health challenges in maraka dasha', 'Need for care during critical periods', 'Potential longevity concerns'] }
      : absent('Maraka Yoga', 'aristha', 'Lords of 2nd and 7th not conjunct or both in kendras.'));
  } else {
    yogas.push(absent('Maraka Yoga', 'aristha', 'Ascendant not available.'));
  }

  // 11d. Alpayu Yoga (short life): Lagna lord in dusthana, Moon afflicted, no benefic in kendra
  // Source: BPHS Ch. 41.15
  if (asc && moon) {
    const lagnaLordA = getSignLord(ascSign);
    const llPlA = find(d1, lagnaLordA);
    const llInDust = llPlA && isDusthana(llPlA.houseNumber);
    const moonAfflicted = d1.some(p => NATURAL_MALEFICS.includes(p.planet) && p.houseNumber === moon.houseNumber);
    const benInKendra = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && isKendra(p.houseNumber));
    const present = !!(llInDust && moonAfflicted && !benInKendra);
    yogas.push(present
      ? { name: 'Alpayu Yoga', category: 'aristha', isPresent: true, strength: 'strong',
          formedBy: [`Lagna lord (${lagnaLordA}) in dusthana H${llPlA!.houseNumber}`, 'Moon afflicted by malefic', 'No benefic in kendra'],
          explanation: 'Lagna lord weak, Moon afflicted, no angular benefic — short lifespan indicator. Source: BPHS Ch. 41.15.',
          effects: ['Shortened lifespan indicated', 'Health vulnerabilities', 'Need for remedial measures'] }
      : absent('Alpayu Yoga', 'aristha', 'Conditions for short life indicator not fully met.'));
  } else {
    yogas.push(absent('Alpayu Yoga', 'aristha', 'Ascendant or Moon not available.'));
  }

  // 11e. Madhyayu Yoga (medium life): Lagna lord in panaphara, Moon in panaphara
  // Source: BPHS Ch. 41.16
  if (asc && moon) {
    const lagnaLordM = getSignLord(ascSign);
    const llPlM = find(d1, lagnaLordM);
    const present = !!(llPlM && isPanaphara(llPlM.houseNumber) && isPanaphara(moon.houseNumber));
    yogas.push(present
      ? { name: 'Madhyayu Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [`Lagna lord (${lagnaLordM}) in panaphara H${llPlM!.houseNumber}`, `Moon in panaphara H${moon.houseNumber}`],
          explanation: 'Lagna lord and Moon in succedent houses — medium lifespan. Source: BPHS Ch. 41.16.',
          effects: ['Medium lifespan (60-80 years)', 'Moderate health', 'Balanced constitution'] }
      : absent('Madhyayu Yoga', 'aristha', 'Lagna lord and Moon not both in panaphara houses.'));
  } else {
    yogas.push(absent('Madhyayu Yoga', 'aristha', 'Ascendant or Moon not available.'));
  }

  // 11f. Poornayu Yoga (full life): Lagna lord in kendra, Moon in kendra, benefics in kendras
  // Source: BPHS Ch. 41.17
  if (asc && moon) {
    const lagnaLordP = getSignLord(ascSign);
    const llPlP = find(d1, lagnaLordP);
    const benInKendras = d1.filter(p => NATURAL_BENEFICS.includes(p.planet) && isKendra(p.houseNumber));
    const present = !!(llPlP && isKendra(llPlP.houseNumber) && isKendra(moon.houseNumber) && benInKendras.length >= 1);
    yogas.push(present
      ? { name: 'Poornayu Yoga', category: 'aristha', isPresent: true, strength: 'strong',
          formedBy: [`Lagna lord (${lagnaLordP}) in kendra H${llPlP!.houseNumber}`, `Moon in kendra H${moon.houseNumber}`, `${benInKendras.length} benefic(s) in kendras`],
          explanation: 'Lagna lord and Moon angular with benefics — full lifespan. Source: BPHS Ch. 41.17.',
          effects: ['Long life (80+ years)', 'Good health', 'Strong constitution'] }
      : absent('Poornayu Yoga', 'aristha', 'Lagna lord and Moon not both in kendras with benefic support.'));
  } else {
    yogas.push(absent('Poornayu Yoga', 'aristha', 'Ascendant or Moon not available.'));
  }

  // 11g. Roga Yoga: lord of 6th in Lagna or conjunct Lagna lord
  // Source: BPHS Ch. 42.10
  if (asc) {
    const lord6r = getSignLord(houseSign(ascSign, 6));
    const pl6r = find(d1, lord6r);
    const lagnaLordR = getSignLord(ascSign);
    const llPlR = find(d1, lagnaLordR);
    const inLagna = pl6r && pl6r.houseNumber === 1;
    const conjLL = !!(pl6r && llPlR && lord6r !== lagnaLordR && pl6r.houseNumber === llPlR.houseNumber);
    const present = !!(inLagna || conjLL);
    yogas.push(present
      ? { name: 'Roga Yoga', category: 'aristha', isPresent: true,
          strength: (inLagna && conjLL) ? 'strong' : 'moderate',
          formedBy: [inLagna ? `Lord H6 (${lord6r}) in H1` : `Lord H6 (${lord6r}) conjunct Lagna lord (${lagnaLordR}) in H${pl6r!.houseNumber}`],
          explanation: 'Lord of disease house connected to Lagna — proneness to illness. Source: BPHS Ch. 42.10.',
          effects: ['Chronic health issues', 'Susceptibility to disease', 'Need for health care'] }
      : absent('Roga Yoga', 'aristha', 'Lord of 6th not in Lagna or conjunct Lagna lord.'));
  } else {
    yogas.push(absent('Roga Yoga', 'aristha', 'Ascendant not available.'));
  }

  // 11h. Vrana Yoga: Mars and Saturn in 6th or 8th — wounds/surgery
  // Source: BPHS Ch. 42.12
  if (mars && saturn) {
    const marsIn68 = mars.houseNumber === 6 || mars.houseNumber === 8;
    const satIn68 = saturn.houseNumber === 6 || saturn.houseNumber === 8;
    yogas.push(marsIn68 && satIn68
      ? { name: 'Vrana Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [`Mars in H${mars.houseNumber}`, `Saturn in H${saturn.houseNumber}`],
          explanation: 'Mars and Saturn both in 6th/8th — wounds, surgery, or chronic ailment. Source: BPHS Ch. 42.12.',
          effects: ['Surgical interventions', 'Injuries or wounds', 'Chronic health condition'] }
      : absent('Vrana Yoga', 'aristha', 'Mars and Saturn not both in 6th/8th houses.'));
  } else {
    yogas.push(absent('Vrana Yoga', 'aristha', 'Mars or Saturn not available.'));
  }

  // 11i. Bandhana Yoga: lord of Lagna and lord of 6th in kendra, aspected by Saturn/Rahu
  // Source: BPHS Ch. 42.15
  if (asc) {
    const lagnaLordB = getSignLord(ascSign);
    const lord6b = getSignLord(houseSign(ascSign, 6));
    const llPlB = find(d1, lagnaLordB);
    const pl6b = find(d1, lord6b);
    if (llPlB && pl6b && lagnaLordB !== lord6b && isKendra(llPlB.houseNumber) && isKendra(pl6b.houseNumber)) {
      const satRahuAspect = d1.some(p =>
        (p.planet === 'saturn' || p.planet === 'rahu') &&
        (nthFrom(p.houseNumber, llPlB.houseNumber) === 7 || nthFrom(p.houseNumber, pl6b.houseNumber) === 7));
      yogas.push(satRahuAspect
        ? { name: 'Bandhana Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
            formedBy: [`Lagna lord (${lagnaLordB}) in kendra H${llPlB.houseNumber}`, `Lord H6 (${lord6b}) in kendra H${pl6b.houseNumber}`, 'Aspected by Saturn or Rahu'],
            explanation: 'Lagna and 6th lords angular under Saturn/Rahu aspect — confinement. Source: BPHS Ch. 42.15.',
            effects: ['Imprisonment or confinement', 'Legal troubles', 'Restriction of freedom'] }
        : absent('Bandhana Yoga', 'aristha', 'Lagna & 6th lords in kendras but not aspected by Saturn/Rahu.'));
    } else {
      yogas.push(absent('Bandhana Yoga', 'aristha', 'Lagna lord and lord of 6th not both in kendras.'));
    }
  } else {
    yogas.push(absent('Bandhana Yoga', 'aristha', 'Ascendant not available.'));
  }

  // 11j. Ashubha Mrityu Yoga: lords of 8th and 1st exchange houses
  // Source: Phaladeepika Ch. 13.5
  if (asc) {
    const lagnaLordAM = getSignLord(ascSign);
    const lord8am = getSignLord(houseSign(ascSign, 8));
    const llPlAM = find(d1, lagnaLordAM);
    const pl8am = find(d1, lord8am);
    const exchange = !!(llPlAM && pl8am && lagnaLordAM !== lord8am && llPlAM.houseNumber === 8 && pl8am.houseNumber === 1);
    yogas.push(exchange
      ? { name: 'Ashubha Mrityu Yoga', category: 'aristha', isPresent: true, strength: 'strong',
          formedBy: [`Lagna lord (${lagnaLordAM}) in H8`, `Lord H8 (${lord8am}) in H1 — exchange`],
          explanation: 'Lagna-8th lord exchange — inauspicious for longevity. Source: Phaladeepika Ch. 13.5.',
          effects: ['Serious health crisis', 'Accident-prone', 'Longevity concerns'] }
      : absent('Ashubha Mrityu Yoga', 'aristha', 'Lords of 1st and 8th not exchanging houses.'));
  } else {
    yogas.push(absent('Ashubha Mrityu Yoga', 'aristha', 'Ascendant not available.'));
  }

  // 11k. Danda Aristha Yoga: all malefics in 8th house
  // Source: BPHS Ch. 42.18
  {
    const malIn8 = d1.filter(p => NATURAL_MALEFICS.includes(p.planet) && p.houseNumber === 8);
    yogas.push(malIn8.length >= 2
      ? { name: 'Danda Aristha Yoga', category: 'aristha', isPresent: true,
          strength: malIn8.length >= 3 ? 'strong' : 'moderate',
          formedBy: malIn8.map(p => `${p.planet} in H8`),
          explanation: 'Multiple malefics in 8th house — punishment or severe affliction. Source: BPHS Ch. 42.18.',
          effects: ['Government punishment', 'Severe illness', 'Loss through litigation'] }
      : absent('Danda Aristha Yoga', 'aristha', 'Fewer than 2 malefics in 8th house.'));
  }

  // 11l. Durmaranadhwanta Yoga: lord of 8th in 8th, aspected by malefic
  // Source: Phaladeepika Ch. 13.8
  if (asc) {
    const lord8dm = getSignLord(houseSign(ascSign, 8));
    const pl8dm = find(d1, lord8dm);
    const malAspect8 = pl8dm && d1.some(p => NATURAL_MALEFICS.includes(p.planet) && nthFrom(p.houseNumber, pl8dm.houseNumber) === 7);
    yogas.push(pl8dm && pl8dm.houseNumber === 8 && malAspect8
      ? { name: 'Durmaranadhwanta Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H8 (${lord8dm}) in H8`, 'Aspected by malefic'],
          explanation: 'Lord of 8th in 8th under malefic aspect — difficult death. Source: Phaladeepika Ch. 13.8.',
          effects: ['Suffering at end of life', 'Difficult final illness', 'Need for spiritual preparation'] }
      : absent('Durmaranadhwanta Yoga', 'aristha', 'Lord of 8th not in 8th or not aspected by malefic.'));
  } else {
    yogas.push(absent('Durmaranadhwanta Yoga', 'aristha', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. DARIDRA / SANYASA / SPECIAL YOGAS — BPHS + Phaladeepika
  // ═══════════════════════════════════════════════════════════════════════════

  // 12a. Daridra Yoga (2nd-lord): lord of 2nd in dusthana — cancelled if in own/exalted
  // Source: BPHS Ch. 41.20
  if (asc) {
    const lord2dr = getSignLord(houseSign(ascSign, 2));
    const pl2dr = find(d1, lord2dr);
    if (pl2dr && isDusthana(pl2dr.houseNumber)) {
      const cancelled = isOwnOrExalted(pl2dr);
      yogas.push({
        name: 'Daridra Yoga (2nd Lord)', category: 'daridra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Lord H2 (${lord2dr}) in dusthana H${pl2dr.houseNumber}`],
        explanation: cancelled
          ? `Lord of 2nd in dusthana but in ${isExalted(pl2dr) ? 'exalted' : 'own'} sign — poverty cancelled.`
          : 'Lord of 2nd in dusthana — poverty and loss of family wealth. Source: BPHS Ch. 41.20.',
        effects: cancelled ? [] : ['Poverty and deprivation', 'Loss of family wealth', 'Difficult speech'],
      });
    } else {
      yogas.push(absent('Daridra Yoga (2nd Lord)', 'daridra', 'Lord of 2nd not in a dusthana.'));
    }
  } else {
    yogas.push(absent('Daridra Yoga (2nd Lord)', 'daridra', 'Ascendant not available.'));
  }

  // 12b. Daridra Yoga (5th-lord): lord of 5th in dusthana
  // Source: BPHS Ch. 41.21
  if (asc) {
    const lord5dr = getSignLord(houseSign(ascSign, 5));
    const pl5dr = find(d1, lord5dr);
    if (pl5dr && isDusthana(pl5dr.houseNumber)) {
      const cancelled = isOwnOrExalted(pl5dr);
      yogas.push({
        name: 'Daridra Yoga (5th Lord)', category: 'daridra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Lord H5 (${lord5dr}) in dusthana H${pl5dr.houseNumber}`],
        explanation: cancelled
          ? `Lord of 5th in dusthana but dignified — poverty mitigated.`
          : 'Lord of 5th in dusthana — loss through speculation and children. Source: BPHS Ch. 41.21.',
        effects: cancelled ? [] : ['Loss through speculation', 'Difficulties with children', 'Lack of intelligence'],
      });
    } else {
      yogas.push(absent('Daridra Yoga (5th Lord)', 'daridra', 'Lord of 5th not in a dusthana.'));
    }
  } else {
    yogas.push(absent('Daridra Yoga (5th Lord)', 'daridra', 'Ascendant not available.'));
  }

  // 12c. Daridra Yoga (9th-lord): lord of 9th in dusthana
  // Source: BPHS Ch. 41.22
  if (asc) {
    const lord9dr = getSignLord(houseSign(ascSign, 9));
    const pl9dr = find(d1, lord9dr);
    if (pl9dr && isDusthana(pl9dr.houseNumber)) {
      const cancelled = isOwnOrExalted(pl9dr);
      yogas.push({
        name: 'Daridra Yoga (9th Lord)', category: 'daridra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'moderate',
        formedBy: cancelled ? [] : [`Lord H9 (${lord9dr}) in dusthana H${pl9dr.houseNumber}`],
        explanation: cancelled
          ? `Lord of 9th in dusthana but dignified — misfortune mitigated.`
          : 'Lord of 9th in dusthana — lack of fortune and paternal difficulties. Source: BPHS Ch. 41.22.',
        effects: cancelled ? [] : ['Lack of luck', 'Father\'s health issues', 'Irreligious tendency'],
      });
    } else {
      yogas.push(absent('Daridra Yoga (9th Lord)', 'daridra', 'Lord of 9th not in a dusthana.'));
    }
  } else {
    yogas.push(absent('Daridra Yoga (9th Lord)', 'daridra', 'Ascendant not available.'));
  }

  // 12d. Sanyasa Yoga (full): 4+ planets (excluding nodes) in one house including Saturn
  // Source: BPHS Ch. 42.25, Phaladeepika Ch. 15.1
  {
    const nonNodes = d1.filter(p => p.planet !== 'ascendant' && p.planet !== 'rahu' && p.planet !== 'ketu');
    const houseCounts: Record<number, string[]> = {};
    for (const p of nonNodes) {
      (houseCounts[p.houseNumber] ??= []).push(p.planet);
    }
    let sanyasaHouse: number | null = null;
    let sanyasaPlanets: string[] = [];
    for (const [h, planets] of Object.entries(houseCounts)) {
      if (planets.length >= 4 && planets.includes('saturn') && planets.length > sanyasaPlanets.length) {
        sanyasaHouse = Number(h);
        sanyasaPlanets = planets;
      }
    }
    // Cancellation: if the stellium is in H1/4/7/10 and lord of Lagna is strong
    let sanyasaCancelled = false;
    if (sanyasaHouse !== null && asc) {
      const lagnaLordS = getSignLord(ascSign);
      const llPlS = find(d1, lagnaLordS);
      sanyasaCancelled = !!(isKendra(sanyasaHouse) && llPlS && isOwnOrExalted(llPlS));
    }
    yogas.push(sanyasaHouse !== null
      ? { name: 'Sanyasa Yoga', category: 'sanyasa', isPresent: !sanyasaCancelled,
          strength: sanyasaCancelled ? 'weak' : (sanyasaPlanets.length >= 5 ? 'strong' : 'moderate'),
          formedBy: sanyasaCancelled ? [] : [`${sanyasaPlanets.length} planets including Saturn (${sanyasaPlanets.join(', ')}) in H${sanyasaHouse}`],
          explanation: sanyasaCancelled
            ? 'Stellium with Saturn in kendra but Lagna lord strong — renunciation urge cancelled.'
            : `Stellium with Saturn in H${sanyasaHouse} — renunciation and spiritual life. Source: BPHS Ch. 42.25.`,
          effects: sanyasaCancelled ? [] : ['Renunciation of worldly life', 'Spiritual pursuit', 'Ascetic inclination'] }
      : absent('Sanyasa Yoga', 'sanyasa', 'No house has 4+ planets including Saturn.'));
  }

  // 12e. Parivraja Yoga: Moon alone in a kendra aspected only by Saturn, no other planet aspects
  // Source: Phaladeepika Ch. 15.3
  if (moon && saturn) {
    const moonInKendra = isKendra(moon.houseNumber);
    const satAspectsMoon = nthFrom(saturn.houseNumber, moon.houseNumber) === 7;
    const moonAlone = !d1.some(p => p.planet !== 'moon' && p.planet !== 'ascendant' && p.houseNumber === moon.houseNumber);
    const otherAspects = d1.some(p =>
      p.planet !== 'saturn' && p.planet !== 'moon' && p.planet !== 'ascendant' &&
      p.planet !== 'rahu' && p.planet !== 'ketu' &&
      nthFrom(p.houseNumber, moon.houseNumber) === 7);
    yogas.push(moonInKendra && satAspectsMoon && moonAlone && !otherAspects
      ? { name: 'Parivraja Yoga', category: 'sanyasa', isPresent: true, strength: 'moderate',
          formedBy: [`Moon alone in kendra H${moon.houseNumber}`, `Only Saturn aspects from H${saturn.houseNumber}`],
          explanation: 'Moon alone in kendra aspected only by Saturn — wandering ascetic. Source: Phaladeepika Ch. 15.3.',
          effects: ['Wandering mendicant', 'Detached from family', 'Spiritual seeker'] }
      : absent('Parivraja Yoga', 'sanyasa', 'Moon not alone in kendra aspected solely by Saturn.'));
  } else {
    yogas.push(absent('Parivraja Yoga', 'sanyasa', 'Moon or Saturn not available.'));
  }

  // 12f. Kemadruma Cancellation (explicit): Moon isolated but Jupiter in kendra from Lagna
  // (extends existing Kemadruma detection with explicit cancellation yoga entry)
  // Source: Phaladeepika Ch. 9.6
  if (moon && jupiter) {
    const h2kc = (moon.houseNumber % 12) + 1;
    const h12kc = ((moon.houseNumber - 2 + 12) % 12) + 1;
    const excluded = ['sun', 'ascendant', 'rahu', 'ketu'];
    const flanked = d1.some(p => !excluded.includes(p.planet) && (p.houseNumber === h2kc || p.houseNumber === h12kc));
    const jupInKendra = isKendra(jupiter.houseNumber);
    yogas.push(!flanked && jupInKendra
      ? { name: 'Kemadruma Cancellation', category: 'chandra', isPresent: true, strength: 'moderate',
          formedBy: ['Moon isolated (no planet in 2nd/12th)', `Jupiter in kendra H${jupiter.houseNumber}`],
          explanation: 'Moon isolation cancelled by Jupiter in kendra — poverty averted. Source: Phaladeepika Ch. 9.6.',
          effects: ['Poverty averted', 'Gains through Jupiter\'s grace', 'Eventual stability'] }
      : absent('Kemadruma Cancellation', 'chandra', 'Moon not isolated or Jupiter not in kendra to cancel.'));
  } else {
    yogas.push(absent('Kemadruma Cancellation', 'chandra', 'Moon or Jupiter not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. ADDITIONAL RAJA YOGAS (batch 2) — BPHS Ch. 39, Saravali, Brihat Jataka
  // ═══════════════════════════════════════════════════════════════════════════

  // 13a. Raja Yoga (1-5 Lords): lord of Lagna and lord of 5th conjunct
  // Source: BPHS Ch. 39.8
  if (asc) {
    const l1r = getSignLord(ascSign);
    const l5r = getSignLord(houseSign(ascSign, 5));
    const p1r = find(d1, l1r), p5r = find(d1, l5r);
    const present = !!(p1r && p5r && l1r !== l5r && p1r.houseNumber === p5r.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (1-5 Lords)', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lord H1 (${l1r}) & Lord H5 (${l5r}) conjunct in H${p1r!.houseNumber}`],
          explanation: 'Lords of Lagna and 5th conjoined — rajayoga through personal merit. Source: BPHS Ch. 39.8.',
          effects: ['Rise through own ability', 'Political power', 'Honored by government'] }
      : absent('Raja Yoga (1-5 Lords)', 'raja', 'Lords of 1st and 5th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (1-5 Lords)', 'raja', 'Ascendant not available.'));
  }

  // 13b. Raja Yoga (1-9 Lords): lord of Lagna and lord of 9th conjunct
  // Source: BPHS Ch. 39.9
  if (asc) {
    const l1r2 = getSignLord(ascSign);
    const l9r2 = getSignLord(houseSign(ascSign, 9));
    const p1r2 = find(d1, l1r2), p9r2 = find(d1, l9r2);
    const present = !!(p1r2 && p9r2 && l1r2 !== l9r2 && p1r2.houseNumber === p9r2.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (1-9 Lords)', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lord H1 (${l1r2}) & Lord H9 (${l9r2}) conjunct in H${p1r2!.houseNumber}`],
          explanation: 'Lords of Lagna and 9th conjoined — raja yoga from fortune and self. Source: BPHS Ch. 39.9.',
          effects: ['Fortunate and powerful', 'Father\'s support in career', 'Dharmic authority'] }
      : absent('Raja Yoga (1-9 Lords)', 'raja', 'Lords of 1st and 9th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (1-9 Lords)', 'raja', 'Ascendant not available.'));
  }

  // 13c. Raja Yoga (4-5 Lords): lord of 4th and lord of 5th conjunct
  // Source: BPHS Ch. 39.10
  if (asc) {
    const l4r = getSignLord(houseSign(ascSign, 4));
    const l5r2 = getSignLord(houseSign(ascSign, 5));
    const p4r = find(d1, l4r), p5r2 = find(d1, l5r2);
    const present = !!(p4r && p5r2 && l4r !== l5r2 && p4r.houseNumber === p5r2.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (4-5 Lords)', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H4 (${l4r}) & Lord H5 (${l5r2}) conjunct in H${p4r!.houseNumber}`],
          explanation: 'Lords of 4th and 5th conjoined — happiness and intelligence combine. Source: BPHS Ch. 39.10.',
          effects: ['Landed property', 'Scholarly reputation', 'Political influence'] }
      : absent('Raja Yoga (4-5 Lords)', 'raja', 'Lords of 4th and 5th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (4-5 Lords)', 'raja', 'Ascendant not available.'));
  }

  // 13d. Raja Yoga (4-9 Lords): lord of 4th and lord of 9th conjunct
  // Source: BPHS Ch. 39.11
  if (asc) {
    const l4r2 = getSignLord(houseSign(ascSign, 4));
    const l9r3 = getSignLord(houseSign(ascSign, 9));
    const p4r2 = find(d1, l4r2), p9r3 = find(d1, l9r3);
    const present = !!(p4r2 && p9r3 && l4r2 !== l9r3 && p4r2.houseNumber === p9r3.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (4-9 Lords)', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lord H4 (${l4r2}) & Lord H9 (${l9r3}) conjunct in H${p4r2!.houseNumber}`],
          explanation: 'Lords of 4th and 9th conjoined — fortune through property and conveyances. Source: BPHS Ch. 39.11.',
          effects: ['Vehicles and estates', 'Fortunate in land', 'Government favor'] }
      : absent('Raja Yoga (4-9 Lords)', 'raja', 'Lords of 4th and 9th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (4-9 Lords)', 'raja', 'Ascendant not available.'));
  }

  // 13e. Raja Yoga (7-9 Lords): lord of 7th and lord of 9th conjunct
  // Source: BPHS Ch. 39.12
  if (asc) {
    const l7r = getSignLord(houseSign(ascSign, 7));
    const l9r4 = getSignLord(houseSign(ascSign, 9));
    const p7r = find(d1, l7r), p9r4 = find(d1, l9r4);
    const present = !!(p7r && p9r4 && l7r !== l9r4 && p7r.houseNumber === p9r4.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (7-9 Lords)', category: 'raja', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H7 (${l7r}) & Lord H9 (${l9r4}) conjunct in H${p7r!.houseNumber}`],
          explanation: 'Lords of 7th and 9th conjoined — fortune through partnerships. Source: BPHS Ch. 39.12.',
          effects: ['Fortunate marriage', 'Business prosperity', 'Foreign fortune'] }
      : absent('Raja Yoga (7-9 Lords)', 'raja', 'Lords of 7th and 9th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (7-9 Lords)', 'raja', 'Ascendant not available.'));
  }

  // 13f. Raja Yoga (10-5 Lords): lord of 10th and lord of 5th conjunct
  // Source: BPHS Ch. 39.13
  if (asc) {
    const l10r = getSignLord(houseSign(ascSign, 10));
    const l5r3 = getSignLord(houseSign(ascSign, 5));
    const p10r = find(d1, l10r), p5r3 = find(d1, l5r3);
    const present = !!(p10r && p5r3 && l10r !== l5r3 && p10r.houseNumber === p5r3.houseNumber);
    yogas.push(present
      ? { name: 'Raja Yoga (10-5 Lords)', category: 'raja', isPresent: true, strength: 'strong',
          formedBy: [`Lord H10 (${l10r}) & Lord H5 (${l5r3}) conjunct in H${p10r!.houseNumber}`],
          explanation: 'Lords of 10th and 5th conjoined — success through intellect and karma. Source: BPHS Ch. 39.13.',
          effects: ['Career success through merit', 'Government honor', 'Children bring fame'] }
      : absent('Raja Yoga (10-5 Lords)', 'raja', 'Lords of 10th and 5th not conjunct.'));
  } else {
    yogas.push(absent('Raja Yoga (10-5 Lords)', 'raja', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. ADDITIONAL DHANA YOGAS (batch 2) — BPHS, Saravali, Phaladeepika
  // ═══════════════════════════════════════════════════════════════════════════

  // 14a. Adhama Dhana Yoga: lord of 2nd debilitated in dusthana
  // Source: BPHS Ch. 39.40
  if (asc) {
    const l2ad = getSignLord(houseSign(ascSign, 2));
    const p2ad = find(d1, l2ad);
    yogas.push(p2ad && isDebilitated(p2ad) && isDusthana(p2ad.houseNumber)
      ? { name: 'Adhama Dhana Yoga', category: 'dhana', isPresent: true, strength: 'weak',
          formedBy: [`Lord H2 (${l2ad}) debilitated in dusthana H${p2ad.houseNumber}`],
          explanation: 'Lord of 2nd debilitated in dusthana — lowest form of wealth. Source: BPHS Ch. 39.40.',
          effects: ['Extreme poverty', 'Loss of family wealth', 'Difficulty earning'] }
      : absent('Adhama Dhana Yoga', 'dhana', 'Lord of 2nd not debilitated in dusthana.'));
  } else {
    yogas.push(absent('Adhama Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // 14b. Sama Dhana Yoga: lord of 2nd in own sign in panaphara
  // Source: BPHS Ch. 39.41
  if (asc) {
    const l2sm = getSignLord(houseSign(ascSign, 2));
    const p2sm = find(d1, l2sm);
    yogas.push(p2sm && isInOwnSign(p2sm) && isPanaphara(p2sm.houseNumber)
      ? { name: 'Sama Dhana Yoga', category: 'dhana', isPresent: true, strength: 'moderate',
          formedBy: [`Lord H2 (${l2sm}) in own sign in panaphara H${p2sm.houseNumber}`],
          explanation: 'Lord of 2nd in own sign in succedent house — moderate wealth. Source: BPHS Ch. 39.41.',
          effects: ['Steady income', 'Middle-class comfort', 'Balanced finances'] }
      : absent('Sama Dhana Yoga', 'dhana', 'Lord of 2nd not in own sign in panaphara.'));
  } else {
    yogas.push(absent('Sama Dhana Yoga', 'dhana', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. ADDITIONAL CHANDRA YOGAS — Saravali, Brihat Jataka
  // ═══════════════════════════════════════════════════════════════════════════

  // 15a. Amrita Yoga: Moon in own/exalted sign aspected by Jupiter (no malefic aspect)
  // Source: Brihat Jataka Ch. 13.1
  if (moon && jupiter) {
    const moonDig = isOwnOrExalted(moon);
    const jupAsp = nthFrom(jupiter.houseNumber, moon.houseNumber) === 7;
    const malAsp = d1.some(p => NATURAL_MALEFICS.includes(p.planet) && nthFrom(p.houseNumber, moon.houseNumber) === 7);
    yogas.push(moonDig && jupAsp && !malAsp
      ? { name: 'Amrita Yoga', category: 'chandra', isPresent: true, strength: 'strong',
          formedBy: [`Moon in ${isExalted(moon) ? 'exalted' : 'own'} sign`, `Jupiter aspects from H${jupiter.houseNumber}`, 'No malefic aspect on Moon'],
          explanation: 'Moon dignified and aspected only by Jupiter — nectar yoga. Source: Brihat Jataka Ch. 13.1.',
          effects: ['Long and healthy life', 'Wisdom and prosperity', 'Immortal fame'] }
      : absent('Amrita Yoga', 'chandra', 'Moon not dignified aspected only by Jupiter.'));
  } else {
    yogas.push(absent('Amrita Yoga', 'chandra', 'Moon or Jupiter not available.'));
  }

  // 15b. Chandra-Adhi Yoga: Moon in kendra from 2 or more benefics
  // Source: Saravali Ch. 33.5
  if (moon) {
    const benInKendraFromMoon = d1.filter(p =>
      NATURAL_BENEFICS.includes(p.planet) && p.planet !== 'moon' && inKendraFrom(moon.houseNumber, p.houseNumber));
    yogas.push(benInKendraFromMoon.length >= 2
      ? { name: 'Chandra-Adhi Yoga', category: 'chandra', isPresent: true,
          strength: benInKendraFromMoon.length >= 3 ? 'strong' : 'moderate',
          formedBy: benInKendraFromMoon.map(p => `${p.planet} in kendra from Moon (H${p.houseNumber})`),
          explanation: 'Multiple benefics in kendras from Moon — authority and respect. Source: Saravali Ch. 33.5.',
          effects: ['Commanding authority', 'Respected in society', 'Wealthy and comfortable'] }
      : absent('Chandra-Adhi Yoga', 'chandra', 'Fewer than 2 benefics in kendras from Moon.'));
  } else {
    yogas.push(absent('Chandra-Adhi Yoga', 'chandra', 'Moon not available.'));
  }

  // 15c. Chandra-Mangala Yoga (from Moon): Mars in kendra from Moon (alternate reading)
  // Already covered in 2a as conjunction — this checks kendra relationship
  // Skip to avoid overlap; use different yoga:

  // 15c. Pushya Yoga (Saravali): Jupiter in Pushya nakshatra (Cancer sign)
  // Source: Saravali Ch. 33.8
  if (jupiter) {
    yogas.push(jupiter.nakshatra === 'Pushya'
      ? { name: 'Pushya Yoga', category: 'chandra', isPresent: true, strength: 'strong',
          formedBy: [`Jupiter in Pushya nakshatra (H${jupiter.houseNumber})`],
          explanation: 'Jupiter in its most nourishing nakshatra — auspicious for wealth and wisdom. Source: Saravali Ch. 33.8.',
          effects: ['Great wealth', 'Nourishing personality', 'Respected teacher'] }
      : absent('Pushya Yoga', 'chandra', 'Jupiter not in Pushya nakshatra.'));
  } else {
    yogas.push(absent('Pushya Yoga', 'chandra', 'Jupiter not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. ADDITIONAL SURYA YOGAS — Saravali, BPHS
  // ═══════════════════════════════════════════════════════════════════════════

  // 16a. Nipuna Yoga: Sun and Mercury conjunct in kendra/trikona (not combust)
  // Source: Saravali Ch. 33.10
  if (sun && mercury) {
    const conjunctKT = sun.houseNumber === mercury.houseNumber && (isKendra(sun.houseNumber) || isTrikona(sun.houseNumber));
    yogas.push(conjunctKT && !mercury.isCombust
      ? { name: 'Nipuna Yoga', category: 'sun', isPresent: true, strength: 'strong',
          formedBy: [`Sun & Mercury conjunct in H${sun.houseNumber} (${isKendra(sun.houseNumber) ? 'kendra' : 'trikona'})`],
          explanation: 'Sun-Mercury conjunction in kendra/trikona, Mercury not combust — exceptional skill. Source: Saravali Ch. 33.10.',
          effects: ['Exceptional skill in arts/sciences', 'Famous for intelligence', 'Expert communicator'] }
      : absent('Nipuna Yoga', 'sun', 'Sun/Mercury not conjunct in kendra/trikona or Mercury combust.'));
  } else {
    yogas.push(absent('Nipuna Yoga', 'sun', 'Sun or Mercury not available.'));
  }

  // 16b. Surya Yoga: Sun in own/exalted sign in kendra
  // Source: Saravali Ch. 33.12
  if (sun) {
    yogas.push(isOwnOrExalted(sun) && isKendra(sun.houseNumber)
      ? { name: 'Surya Yoga', category: 'sun', isPresent: true, strength: 'strong',
          formedBy: [`Sun in ${isExalted(sun) ? 'exalted' : 'own'} sign in kendra H${sun.houseNumber}`],
          explanation: 'Sun dignified in kendra — governmental authority. Source: Saravali Ch. 33.12.',
          effects: ['Government authority', 'Wealth from state', 'High social position'] }
      : absent('Surya Yoga', 'sun', 'Sun not in own/exalted sign in kendra.'));
  } else {
    yogas.push(absent('Surya Yoga', 'sun', 'Sun not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. ADDITIONAL OTHER YOGAS — BPHS, Saravali, Phaladeepika
  // ═══════════════════════════════════════════════════════════════════════════

  // 17a. Chatussagara Yoga: all kendras occupied by planets
  // Source: BPHS Ch. 39.45
  {
    const kendras = [1, 4, 7, 10];
    const allOccupied = kendras.every(k => d1.some(p => p.houseNumber === k && p.planet !== 'ascendant'));
    yogas.push(allOccupied
      ? { name: 'Chatussagara Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: kendras.map(k => `H${k} occupied`),
          explanation: 'All four kendras occupied — four-ocean yoga. Source: BPHS Ch. 39.45.',
          effects: ['Famous across all directions', 'Long-lived and wealthy', 'Equal to a king'] }
      : absent('Chatussagara Yoga', 'other', 'Not all kendras occupied by planets.'));
  }

  // 17b. Hari Yoga: benefics in H2/12/8 from Lagna lord
  // Source: BPHS Ch. 39.46
  if (asc) {
    const lagnaLordH = getSignLord(ascSign);
    const llPlH = find(d1, lagnaLordH);
    if (llPlH) {
      const h2ll = (llPlH.houseNumber % 12) + 1;
      const h8ll = ((llPlH.houseNumber + 6) % 12) + 1;
      const h12ll = ((llPlH.houseNumber - 2 + 12) % 12) + 1;
      const benIn2 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h2ll);
      const benIn8 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h8ll);
      const benIn12 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h12ll);
      yogas.push(benIn2 && benIn8 && benIn12
        ? { name: 'Hari Yoga', category: 'other', isPresent: true, strength: 'strong',
            formedBy: [`Benefic in H${h2ll} (2nd from LL)`, `Benefic in H${h8ll} (8th from LL)`, `Benefic in H${h12ll} (12th from LL)`],
            explanation: 'Benefics in 2nd/8th/12th from Lagna lord — Vishnu yoga. Source: BPHS Ch. 39.46.',
            effects: ['Virtuous and righteous', 'Goes to heaven', 'Famous and prosperous'] }
        : absent('Hari Yoga', 'other', 'Benefics not in 2nd/8th/12th from Lagna lord.'));
    } else {
      yogas.push(absent('Hari Yoga', 'other', 'Lagna lord not found.'));
    }
  } else {
    yogas.push(absent('Hari Yoga', 'other', 'Ascendant not available.'));
  }

  // 17c. Hara Yoga: benefics in H4/8/9 from Lagna lord
  // Source: BPHS Ch. 39.47
  if (asc) {
    const lagnaLordHr = getSignLord(ascSign);
    const llPlHr = find(d1, lagnaLordHr);
    if (llPlHr) {
      const h4ll = ((llPlHr.houseNumber + 2) % 12) + 1;
      const h8ll = ((llPlHr.houseNumber + 6) % 12) + 1;
      const h9ll = ((llPlHr.houseNumber + 7) % 12) + 1;
      const benIn4 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h4ll);
      const benIn8 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h8ll);
      const benIn9 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && p.houseNumber === h9ll);
      yogas.push(benIn4 && benIn8 && benIn9
        ? { name: 'Hara Yoga', category: 'other', isPresent: true, strength: 'strong',
            formedBy: [`Benefic in H${h4ll} (4th from LL)`, `Benefic in H${h8ll} (8th from LL)`, `Benefic in H${h9ll} (9th from LL)`],
            explanation: 'Benefics in 4th/8th/9th from Lagna lord — Shiva yoga. Source: BPHS Ch. 39.47.',
            effects: ['Devotion to Shiva', 'Austerity and penance', 'Spiritual attainment'] }
        : absent('Hara Yoga', 'other', 'Benefics not in 4th/8th/9th from Lagna lord.'));
    } else {
      yogas.push(absent('Hara Yoga', 'other', 'Lagna lord not found.'));
    }
  } else {
    yogas.push(absent('Hara Yoga', 'other', 'Ascendant not available.'));
  }

  // 17d. Brahma Yoga: Jupiter in kendra, Venus in Lagna, lord of 11th in kendra
  // Source: BPHS Ch. 39.48
  if (asc && jupiter && venus) {
    const lord11b = getSignLord(houseSign(ascSign, 11));
    const pl11b = find(d1, lord11b);
    const present = !!(isKendra(jupiter.houseNumber) && venus.houseNumber === 1 && pl11b && isKendra(pl11b.houseNumber));
    yogas.push(present
      ? { name: 'Brahma Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Jupiter in kendra H${jupiter.houseNumber}`, 'Venus in H1', `Lord H11 (${lord11b}) in kendra H${pl11b!.houseNumber}`],
          explanation: 'Jupiter angular, Venus in Lagna, lord of 11th angular — Brahma yoga. Source: BPHS Ch. 39.48.',
          effects: ['Scholarly and learned', 'Wealthy and respected', 'Long-lived and virtuous'] }
      : absent('Brahma Yoga', 'other', 'Jupiter not in kendra, or Venus not in H1, or lord of 11th not in kendra.'));
  } else {
    yogas.push(absent('Brahma Yoga', 'other', 'Ascendant, Jupiter, or Venus not available.'));
  }

  // 17e. Vishnu Yoga: lord of 9th and lord of 10th exchange (Dharmakarmadhipati Parivartana)
  // Source: BPHS Ch. 39.49
  if (asc) {
    const l9v = getSignLord(houseSign(ascSign, 9));
    const l10v = getSignLord(houseSign(ascSign, 10));
    const p9v = find(d1, l9v), p10v = find(d1, l10v);
    const exchange = !!(p9v && p10v && l9v !== l10v && p9v.houseNumber === 10 && p10v.houseNumber === 9);
    yogas.push(exchange
      ? { name: 'Vishnu Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Lord H9 (${l9v}) in H10`, `Lord H10 (${l10v}) in H9 — exchange`],
          explanation: 'Lords of 9th and 10th exchange — Vishnu yoga (highest parivartana). Source: BPHS Ch. 39.49.',
          effects: ['Righteous ruler', 'Dharma and karma in perfect union', 'Unshakeable reputation'] }
      : absent('Vishnu Yoga', 'other', 'Lords of 9th and 10th not exchanging houses.'));
  } else {
    yogas.push(absent('Vishnu Yoga', 'other', 'Ascendant not available.'));
  }

  // 17f. Indra Yoga: lords of 5th and 11th exchange
  // Source: Phaladeepika Ch. 9.10
  if (asc) {
    const l5i = getSignLord(houseSign(ascSign, 5));
    const l11i = getSignLord(houseSign(ascSign, 11));
    const p5i = find(d1, l5i), p11i = find(d1, l11i);
    const exchange = !!(p5i && p11i && l5i !== l11i && p5i.houseNumber === 11 && p11i.houseNumber === 5);
    yogas.push(exchange
      ? { name: 'Indra Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Lord H5 (${l5i}) in H11`, `Lord H11 (${l11i}) in H5 — exchange`],
          explanation: 'Lords of 5th and 11th exchange — Indra yoga (lord of heavens). Source: Phaladeepika Ch. 9.10.',
          effects: ['Fame like Indra', 'Abundant gains', 'Fulfillment of desires'] }
      : absent('Indra Yoga', 'other', 'Lords of 5th and 11th not exchanging houses.'));
  } else {
    yogas.push(absent('Indra Yoga', 'other', 'Ascendant not available.'));
  }

  // 17g. Shiva Yoga: lord of 5th in 9th, lord of 9th in 10th, lord of 10th in 5th
  // Source: Brihat Jataka Ch. 12.5
  if (asc) {
    const l5sv = getSignLord(houseSign(ascSign, 5));
    const l9sv = getSignLord(houseSign(ascSign, 9));
    const l10sv = getSignLord(houseSign(ascSign, 10));
    const p5sv = find(d1, l5sv), p9sv = find(d1, l9sv), p10sv = find(d1, l10sv);
    const present = !!(p5sv && p9sv && p10sv && p5sv.houseNumber === 9 && p9sv.houseNumber === 10 && p10sv.houseNumber === 5);
    yogas.push(present
      ? { name: 'Shiva Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Lord H5 (${l5sv}) in H9`, `Lord H9 (${l9sv}) in H10`, `Lord H10 (${l10sv}) in H5`],
          explanation: 'Lords of 5/9/10 in circular placement — supreme Shiva yoga. Source: Brihat Jataka Ch. 12.5.',
          effects: ['Devotee of Shiva', 'Ascetic who rules', 'Spiritual and material mastery'] }
      : absent('Shiva Yoga', 'other', 'Lords of 5/9/10 not in the required circular placement.'));
  } else {
    yogas.push(absent('Shiva Yoga', 'other', 'Ascendant not available.'));
  }

  // 17h. Go Yoga: lord of trikona in exaltation
  // Source: Saravali Ch. 35.20
  if (asc) {
    const trikonaH2 = [1, 5, 9];
    let goFound = false;
    for (const th of trikonaH2) {
      const lord = getSignLord(houseSign(ascSign, th));
      const pl = find(d1, lord);
      if (pl && isExalted(pl)) {
        yogas.push({ name: 'Go Yoga', category: 'other', isPresent: true,
          strength: isKendra(pl.houseNumber) ? 'strong' : 'moderate',
          formedBy: [`Lord of trikona H${th} (${lord}) exalted in H${pl.houseNumber}`],
          explanation: 'Lord of trikona exalted — cow yoga (wealth and virtue). Source: Saravali Ch. 35.20.',
          effects: ['Cattle and agricultural wealth', 'Virtuous and righteous', 'Prosperous family'] });
        goFound = true; break;
      }
    }
    if (!goFound) yogas.push(absent('Go Yoga', 'other', 'No trikona lord is exalted.'));
  } else {
    yogas.push(absent('Go Yoga', 'other', 'Ascendant not available.'));
  }

  // 17i. Lagnadhi Yoga: benefics in 7th and 8th from Lagna
  // Source: Phaladeepika Ch. 9.12
  {
    const benH7 = d1.some(p => p.houseNumber === 7 && NATURAL_BENEFICS.includes(p.planet));
    const benH8 = d1.some(p => p.houseNumber === 8 && NATURAL_BENEFICS.includes(p.planet));
    yogas.push(benH7 && benH8
      ? { name: 'Lagnadhi Yoga', category: 'other', isPresent: true, strength: 'moderate',
          formedBy: ['Benefic in H7', 'Benefic in H8'],
          explanation: 'Benefics in 7th and 8th from Lagna — prosperity through partnerships. Source: Phaladeepika Ch. 9.12.',
          effects: ['Good spouse', 'Inherited wealth', 'Long life'] }
      : absent('Lagnadhi Yoga', 'other', 'Benefics not in both H7 and H8.'));
  }

  // 17j. Gandharva Yoga: Venus in own sign + kendra, lord of 10th in 7th
  // Source: Saravali Ch. 35.22
  if (asc && venus) {
    const lord10g = getSignLord(houseSign(ascSign, 10));
    const pl10g = find(d1, lord10g);
    yogas.push(isInOwnSign(venus) && isKendra(venus.houseNumber) && pl10g && pl10g.houseNumber === 7
      ? { name: 'Gandharva Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Venus in own sign in kendra H${venus.houseNumber}`, `Lord H10 (${lord10g}) in H7`],
          explanation: 'Venus strong in kendra, lord of 10th in 7th — celestial musician. Source: Saravali Ch. 35.22.',
          effects: ['Mastery of music and arts', 'Beautiful and charming', 'Celebrated performer'] }
      : absent('Gandharva Yoga', 'other', 'Venus not in own sign in kendra or lord of 10th not in 7th.'));
  } else {
    yogas.push(absent('Gandharva Yoga', 'other', 'Ascendant or Venus not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. ADDITIONAL ARISTHA YOGAS (batch 2) — BPHS Ch. 42, Phaladeepika
  // ═══════════════════════════════════════════════════════════════════════════

  // 18a. Khala Yoga: lord of Lagna debilitated, lord of 8th in Lagna
  // Source: Phaladeepika Ch. 13.10
  if (asc) {
    const lagnaLordKh = getSignLord(ascSign);
    const llPlKh = find(d1, lagnaLordKh);
    const lord8kh = getSignLord(houseSign(ascSign, 8));
    const pl8kh = find(d1, lord8kh);
    const present = !!(llPlKh && isDebilitated(llPlKh) && pl8kh && pl8kh.houseNumber === 1);
    yogas.push(present
      ? { name: 'Khala Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [`Lagna lord (${lagnaLordKh}) debilitated`, `Lord H8 (${lord8kh}) in H1`],
          explanation: 'Lagna lord debilitated, lord of 8th in Lagna — wicked disposition. Source: Phaladeepika Ch. 13.10.',
          effects: ['Sinful tendencies', 'Short life', 'Health complications'] }
      : absent('Khala Yoga', 'aristha', 'Lagna lord not debilitated or lord of 8th not in Lagna.'));
  } else {
    yogas.push(absent('Khala Yoga', 'aristha', 'Ascendant not available.'));
  }

  // 18b. Mriti Yoga: malefics in 1st and 8th, no benefic aspect
  // Source: BPHS Ch. 42.20
  {
    const malH1 = d1.some(p => p.houseNumber === 1 && NATURAL_MALEFICS.includes(p.planet));
    const malH8 = d1.some(p => p.houseNumber === 8 && NATURAL_MALEFICS.includes(p.planet));
    const benAspH1 = d1.some(p => NATURAL_BENEFICS.includes(p.planet) && nthFrom(p.houseNumber, 1) === 7);
    const present = malH1 && malH8 && !benAspH1;
    yogas.push(present
      ? { name: 'Mriti Yoga', category: 'aristha', isPresent: true, strength: 'strong',
          formedBy: ['Malefic in H1', 'Malefic in H8', 'No benefic aspecting H1'],
          explanation: 'Malefics in Lagna and 8th without benefic relief — death-like suffering. Source: BPHS Ch. 42.20.',
          effects: ['Severe health crises', 'Near-death experiences', 'Need for strong remedies'] }
      : absent('Mriti Yoga', 'aristha', 'Malefics not in both H1 and H8 or benefic aspects Lagna.'));
  }

  // 18c. Pishacha Yoga: Rahu in Lagna with lord of Lagna in H8/12
  // Source: Saravali Ch. 35.25
  if (asc && rahu) {
    const lagnaLordPs = getSignLord(ascSign);
    const llPlPs = find(d1, lagnaLordPs);
    const present = !!(rahu.houseNumber === 1 && llPlPs && (llPlPs.houseNumber === 8 || llPlPs.houseNumber === 12));
    yogas.push(present
      ? { name: 'Pishacha Yoga', category: 'aristha', isPresent: true, strength: 'moderate',
          formedBy: [`Rahu in H1`, `Lagna lord (${lagnaLordPs}) in H${llPlPs!.houseNumber}`],
          explanation: 'Rahu in Lagna with Lagna lord in 8th/12th — demonic affliction. Source: Saravali Ch. 35.25.',
          effects: ['Mental disturbance', 'Occult influences', 'Strange phobias'] }
      : absent('Pishacha Yoga', 'aristha', 'Rahu not in Lagna or Lagna lord not in H8/12.'));
  } else {
    yogas.push(absent('Pishacha Yoga', 'aristha', 'Ascendant or Rahu not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. ADDITIONAL DARIDRA YOGAS — BPHS, Phaladeepika
  // ═══════════════════════════════════════════════════════════════════════════

  // 19a. Daridra Yoga (Lagna Lord): Lagna lord in dusthana — cancelled if in own/exalted
  // Source: BPHS Ch. 41.25
  if (asc) {
    const lagnaLordDr = getSignLord(ascSign);
    const llPlDr = find(d1, lagnaLordDr);
    if (llPlDr && isDusthana(llPlDr.houseNumber)) {
      const cancelled = isOwnOrExalted(llPlDr);
      yogas.push({
        name: 'Daridra Yoga (Lagna Lord)', category: 'daridra', isPresent: !cancelled,
        strength: cancelled ? 'weak' : 'strong',
        formedBy: cancelled ? [] : [`Lagna lord (${lagnaLordDr}) in dusthana H${llPlDr.houseNumber}`],
        explanation: cancelled
          ? `Lagna lord in dusthana but dignified — poverty cancelled.`
          : 'Lagna lord in dusthana — personal weakness and poverty. Source: BPHS Ch. 41.25.',
        effects: cancelled ? [] : ['Personal weakness', 'Health and financial troubles', 'Lack of confidence'],
      });
    } else {
      yogas.push(absent('Daridra Yoga (Lagna Lord)', 'daridra', 'Lagna lord not in a dusthana.'));
    }
  } else {
    yogas.push(absent('Daridra Yoga (Lagna Lord)', 'daridra', 'Ascendant not available.'));
  }

  // 19b. Daridra Yoga (1-6 Exchange): lords of 1st and 6th exchange (Dainya Parivartana)
  // Source: BPHS Ch. 41.26
  if (asc) {
    const lagnaLordEx = getSignLord(ascSign);
    const lord6ex = getSignLord(houseSign(ascSign, 6));
    const llPlEx = find(d1, lagnaLordEx);
    const pl6ex = find(d1, lord6ex);
    const exchange = !!(llPlEx && pl6ex && lagnaLordEx !== lord6ex && llPlEx.houseNumber === 6 && pl6ex.houseNumber === 1);
    yogas.push(exchange
      ? { name: 'Daridra Yoga (1-6 Exchange)', category: 'daridra', isPresent: true, strength: 'moderate',
          formedBy: [`Lagna lord (${lagnaLordEx}) in H6`, `Lord H6 (${lord6ex}) in H1 — exchange`],
          explanation: 'Lagna and 6th lord exchange — Dainya Parivartana (poverty through enemies/debts). Source: BPHS Ch. 41.26.',
          effects: ['Debts and enemies prosper', 'Health issues', 'Servile position'] }
      : absent('Daridra Yoga (1-6 Exchange)', 'daridra', 'Lords of 1st and 6th not exchanging.'));
  } else {
    yogas.push(absent('Daridra Yoga (1-6 Exchange)', 'daridra', 'Ascendant not available.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. ADDITIONAL NABHASA SANKHYA YOGAS — BPHS Ch. 36.25–31
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const occupiedSigns2 = new Set(seven.map(p => p.signNumber));
    const distinctSignCount = occupiedSigns2.size;

    // Vallaki Yoga: 7 planets in exactly 1 sign
    yogas.push(distinctSignCount === 1
      ? { name: 'Vallaki Yoga', category: 'nabhasa', isPresent: true, strength: 'strong',
          formedBy: ['All 7 planets in 1 sign'],
          explanation: 'Nabhasa Sankhya yoga — all planets in one sign. Source: BPHS Ch. 36.25.',
          effects: ['Destitute and unhappy', 'Wanderer', 'Skilled in music'] }
      : absent('Vallaki Yoga', 'nabhasa', 'Planets occupy more than 1 sign.'));

    // Dama Yoga: 7 planets in exactly 2 signs (already exists as section 5 "Dama Yoga")
    // Skip — already defined.

    // Pasha Yoga: 7 planets in exactly 3 signs (already exists)
    // Skip — already defined.

    // Kedara Yoga: 7 planets in exactly 4 signs (already exists)
    // Skip — already defined.

    // Shoola Yoga: 7 planets in exactly 5 signs (already exists)
    // Skip — already defined.

    // Yuga Yoga: 7 planets in exactly 6 signs (already exists)
    // Skip — already defined.

    // Gola Yoga: 7 planets in exactly 7 signs (already exists)
    // Skip — already defined.

    // Veena Yoga: 7 planets in exactly 8 signs
    yogas.push(distinctSignCount === 8
      ? { name: 'Veena Yoga (Sankhya)', category: 'nabhasa', isPresent: true, strength: 'moderate',
          formedBy: ['7 planets spread across 8 distinct signs'],
          explanation: 'Nabhasa Sankhya yoga — 8 signs occupied. Source: BPHS Ch. 36.31.',
          effects: ['Musical talent', 'Happy and prosperous', 'Leader among men'] }
      : absent('Veena Yoga (Sankhya)', 'nabhasa', 'Planets do not occupy exactly 8 signs.'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. FINAL ADDITIONAL YOGAS — Various sources
  // ═══════════════════════════════════════════════════════════════════════════

  // 21a. Sharada Yoga: Mercury in kendra/trikona in own/exalted sign
  // Source: Saravali Ch. 33.15
  if (mercury) {
    yogas.push(isOwnOrExalted(mercury) && (isKendra(mercury.houseNumber) || isTrikona(mercury.houseNumber))
      ? { name: 'Sharada Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Mercury in ${isExalted(mercury) ? 'exalted' : 'own'} sign in H${mercury.houseNumber}`],
          explanation: 'Mercury dignified in kendra/trikona — goddess Sharada (learning). Source: Saravali Ch. 33.15.',
          effects: ['Exceptional learning', 'Skilled in many sciences', 'Famous writer or scholar'] }
      : absent('Sharada Yoga', 'other', 'Mercury not in own/exalted in kendra/trikona.'));
  } else {
    yogas.push(absent('Sharada Yoga', 'other', 'Mercury not available.'));
  }

  // 21b. Kalpa Druma Yoga: lord of Lagna in own sign, aspected by lord of 9th
  // Source: BPHS Ch. 39.50
  if (asc) {
    const lagnaLordKD = getSignLord(ascSign);
    const lord9kd = getSignLord(houseSign(ascSign, 9));
    const llPlKD = find(d1, lagnaLordKD);
    const pl9kd = find(d1, lord9kd);
    const present = !!(llPlKD && isInOwnSign(llPlKD) && pl9kd && lagnaLordKD !== lord9kd && nthFrom(pl9kd.houseNumber, llPlKD.houseNumber) === 7);
    yogas.push(present
      ? { name: 'Kalpa Druma Yoga', category: 'other', isPresent: true, strength: 'strong',
          formedBy: [`Lagna lord (${lagnaLordKD}) in own sign in H${llPlKD!.houseNumber}`, `Lord H9 (${lord9kd}) aspects from H${pl9kd!.houseNumber}`],
          explanation: 'Lagna lord in own sign aspected by 9th lord — wish-fulfilling tree. Source: BPHS Ch. 39.50.',
          effects: ['All wishes fulfilled', 'Royal status', 'Blessed by fortune'] }
      : absent('Kalpa Druma Yoga', 'other', 'Lagna lord not in own sign aspected by lord of 9th.'));
  } else {
    yogas.push(absent('Kalpa Druma Yoga', 'other', 'Ascendant not available.'));
  }

  // 21c. Mahapurusha Yoga (general): any planet in own/exalted in kendra
  // Source: Brihat Jataka Ch. 13.2
  {
    const mahaPlanets = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
    const mp = d1.filter(p => mahaPlanets.includes(p.planet) && isOwnOrExalted(p) && isKendra(p.houseNumber));
    const nonPancha = mp.filter(p => {
      const name = p.planet;
      // Pancha Mahapurusha already covers individual planets
      return false; // skip since each is already detected
    });
    // Instead: detect any planet in own/exalted in kendra that's not one of the 5 Pancha
    // This is already captured. We skip a duplicate.
  }

  // 21c. Sunapha-Anapha Combined: planets in both 2nd and 12th from Moon
  // Already covered by Durudhura. Skip.

  // 21c. Pravrajya Bhanga Yoga: Sanyasa yoga present but Venus strong (cancellation)
  // Source: Phaladeepika Ch. 15.5
  if (venus) {
    // Check if we have the Sanyasa Yoga as present
    const sanyasaYoga = yogas.find(y => y.name === 'Sanyasa Yoga' && y.isPresent);
    const venusStrong = isOwnOrExalted(venus) && isKendra(venus.houseNumber);
    yogas.push(sanyasaYoga && venusStrong
      ? { name: 'Pravrajya Bhanga', category: 'sanyasa', isPresent: true, strength: 'moderate',
          formedBy: ['Sanyasa Yoga present', `Venus strong in own/exalted in kendra H${venus.houseNumber}`],
          explanation: 'Sanyasa cancelled by strong Venus — worldly attachments prevail. Source: Phaladeepika Ch. 15.5.',
          effects: ['Renunciation urge cancelled', 'Luxurious life despite spiritual inclination', 'Material attachments remain'] }
      : absent('Pravrajya Bhanga', 'sanyasa', 'No active Sanyasa Yoga or Venus not strong enough to cancel.'));
  } else {
    yogas.push(absent('Pravrajya Bhanga', 'sanyasa', 'Venus not available.'));
  }

  return yogas;
}
