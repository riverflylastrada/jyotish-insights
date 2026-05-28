/**
 * Yoga detection — 40+ classical yogas with cancellation/negation rules.
 *
 * Categories: Raja, Dhana, Pancha Mahapurusha, Nabhasa, Chandra, Surya, Other.
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

  return yogas;
}
