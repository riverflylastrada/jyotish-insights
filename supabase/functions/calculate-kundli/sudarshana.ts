/**
 * Sudarshana Chakra — tri-wheel overlay of D1 from Lagna, Moon, and Sun.
 *
 * Each reference point (Lagna ascendant sign, Moon's sign, Sun's sign) defines
 * its own "first house". For each house 1–12, we list which planets fall in
 * that house from each of the three references. A house is "confirmed" from
 * N/3 references if at least one planet occupies it from N of the three wheels.
 *
 * Classical: BPHS / Jaimini; PVR Narasimha Rao "Integrated Approach".
 */

import { signNumber, signName, wholeSignHouse } from "./vedic.ts";

export interface SudarshanaInput {
  planet: string;
  longitude: number;
  signNumber: number;
}

export interface SudarshanaHouseResult {
  house: number;
  lagnaPlanets: string[];
  moonPlanets: string[];
  sunPlanets: string[];
  confirmedCount: number;
}

export interface SudarshanaResult {
  lagnaSign: number;
  moonSign: number;
  sunSign: number;
  lagnaSignName: string;
  moonSignName: string;
  sunSignName: string;
  houses: SudarshanaHouseResult[];
  citation: string;
}

const GRAHAS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

export function computeSudarshana(
  d1Planets: SudarshanaInput[],
  ascSign: number,
): SudarshanaResult {
  const sunP = d1Planets.find(p => p.planet === 'sun');
  const moonP = d1Planets.find(p => p.planet === 'moon');

  const sunSign = sunP ? signNumber(sunP.longitude) : 1;
  const moonSign = moonP ? signNumber(moonP.longitude) : 1;

  const grahas = d1Planets.filter(p => GRAHAS.includes(p.planet));

  const houses: SudarshanaHouseResult[] = [];
  for (let h = 1; h <= 12; h++) {
    const lagnaPlanets: string[] = [];
    const moonPlanets: string[] = [];
    const sunPlanets: string[] = [];

    for (const p of grahas) {
      const pSign = signNumber(p.longitude);
      if (wholeSignHouse(pSign, ascSign) === h) lagnaPlanets.push(p.planet);
      if (wholeSignHouse(pSign, moonSign) === h) moonPlanets.push(p.planet);
      if (wholeSignHouse(pSign, sunSign) === h) sunPlanets.push(p.planet);
    }

    const confirmedCount =
      (lagnaPlanets.length > 0 ? 1 : 0) +
      (moonPlanets.length > 0 ? 1 : 0) +
      (sunPlanets.length > 0 ? 1 : 0);

    houses.push({ house: h, lagnaPlanets, moonPlanets, sunPlanets, confirmedCount });
  }

  return {
    lagnaSign: ascSign,
    moonSign,
    sunSign,
    lagnaSignName: signName(ascSign),
    moonSignName: signName(moonSign),
    sunSignName: signName(sunSign),
    houses,
    citation: 'BPHS Ch. 31 (Sudarshana Chakra); Jaimini Sutras; PVR Narasimha Rao, "Integrated Approach to Vedic Astrology".',
  };
}
