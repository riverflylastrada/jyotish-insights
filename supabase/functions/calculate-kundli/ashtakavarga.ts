/**
 * Ashtakavarga (Bhinnashtakavarga + Sarvashtakavarga) — standard Parashari bindu tables.
 */

import { ASHTAK_TABLES } from "./constants.ts";
import type { PlanetPos } from "./divisional.ts";

export interface AshtakavargaData {
  bhinna: Record<string, number[]>;
  sarva: number[];
}

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;

/**
 * Compute the Bhinnashtakavarga for each planet and the Sarvashtakavarga.
 *
 * For each beneficiary planet P, and each contributor C (7 planets + ascendant),
 * check which houses from C's sign position produce a bindu in each sign.
 * Sum bindus per sign → BAV of P. Sum all BAVs → SAV.
 */
export function computeAshtakavarga(d1: PlanetPos[]): AshtakavargaData {
  const signOf: Record<string, number> = {};
  for (const p of d1) signOf[p.planet] = p.signNumber;

  const bhinna: Record<string, number[]> = {};
  const sarva: number[] = new Array(12).fill(0);

  for (const bene of PLANET_KEYS) {
    const table = ASHTAK_TABLES[bene];
    if (!table) { bhinna[bene] = new Array(12).fill(0); continue; }

    const row = new Array(12).fill(0);

    for (const contrib of [...PLANET_KEYS, 'ascendant'] as const) {
      const cSign = signOf[contrib];
      if (!cSign) continue;
      const houses = table[contrib];
      if (!houses) continue;

      for (const h of houses) {
        const targetSign = ((cSign - 1 + h - 1) % 12);
        row[targetSign] += 1;
      }
    }

    bhinna[bene] = row;
    for (let i = 0; i < 12; i++) sarva[i] += row[i];
  }

  return { bhinna, sarva };
}
