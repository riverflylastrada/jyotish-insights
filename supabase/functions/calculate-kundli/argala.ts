/**
 * Jaimini Argala — the "intervention" scheme.
 *
 * For each of the 12 houses (signs from the ascendant), identifies:
 *   - Argala: planets in the 2nd, 4th, 5th, and 11th houses from it
 *   - Virodha Argala: planets in the 12th, 10th, 9th, and 3rd houses (counterarguments)
 *
 * Validated against PyJHora v4.8.5 `house.get_argala()`.
 */

import type { PlanetPos } from "./divisional.ts";
import { wholeSignHouse } from "./vedic.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Argala offsets (houses counted from subject house) ─────────────────────

const ARGALA_OFFSETS = [2, 4, 5, 11];
const VIRODHA_OFFSETS = [12, 10, 9, 3];

// ─── Computation ────────────────────────────────────────────────────────────

export function computeArgala(d1Planets: PlanetPos[], ascSign: number): ArgalaHouseData[] {
  const realPlanets = d1Planets.filter(p => p.planet !== 'ascendant');

  const houseToPlanets: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) houseToPlanets[h] = [];
  for (const p of realPlanets) {
    const h = wholeSignHouse(p.signNumber, ascSign);
    houseToPlanets[h].push(p.planet);
  }

  const result: ArgalaHouseData[] = [];
  for (let house = 1; house <= 12; house++) {
    const argalaHouse = (offset: number) => ((house - 1 + offset - 1) % 12) + 1;

    const from2nd = houseToPlanets[argalaHouse(ARGALA_OFFSETS[0])].slice();
    const from4th = houseToPlanets[argalaHouse(ARGALA_OFFSETS[1])].slice();
    const from5th = houseToPlanets[argalaHouse(ARGALA_OFFSETS[2])].slice();
    const from11th = houseToPlanets[argalaHouse(ARGALA_OFFSETS[3])].slice();

    const vFrom12th = houseToPlanets[argalaHouse(VIRODHA_OFFSETS[0])].slice();
    const vFrom10th = houseToPlanets[argalaHouse(VIRODHA_OFFSETS[1])].slice();
    const vFrom9th = houseToPlanets[argalaHouse(VIRODHA_OFFSETS[2])].slice();
    const vFrom3rd = houseToPlanets[argalaHouse(VIRODHA_OFFSETS[3])].slice();

    result.push({
      house,
      argala: { from2nd, from4th, from5th, from11th },
      virodha: { from12th: vFrom12th, from10th: vFrom10th, from9th: vFrom9th, from3rd: vFrom3rd },
    });
  }
  return result;
}
