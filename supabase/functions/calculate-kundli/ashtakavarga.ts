/**
 * Ashtakavarga (Bhinnashtakavarga + Sarvashtakavarga) — standard Parashari bindu tables.
 *
 * Each (planet, house) cell now carries optional **attribution**: the set of
 * contributing positions that generated each bindu, citing the exact BPHS Ch. 48
 * rule that fired.  The aggregate `bhinna` + `sarva` totals are derived from
 * attribution.length and remain byte-identical to the previous implementation.
 */

import { ASHTAK_TABLES } from "./constants.ts";
import type { PlanetPos } from "./divisional.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

type Graha = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn';
type ContribRef = Graha | 'lagna';

export interface ContributingPosition {
  fromReference: ContribRef;
  /** The house number from the contributor that fired (1-indexed). */
  relativeSign: number; // 1..12
  /** Human-readable rule, e.g. "Sun 1/2/4/7/8/9/10/11 from Sun". */
  rule: string;
  /** BPHS citation, e.g. "BPHS Ch. 48 śl. 3". */
  citation: string;
}

export interface HouseAttribution {
  house: number; // 1..12
  contributingPositions: ContributingPosition[];
}

export interface AshtakavargaData {
  bhinna: Record<string, number[]>;
  sarva: number[];
  /** Per-bindu attribution: which contributors fired for each (planet, house). */
  attribution?: Record<string, HouseAttribution[]>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLANET_KEYS: readonly Graha[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const;
const CONTRIB_KEYS: readonly ContribRef[] = [...PLANET_KEYS, 'lagna'] as const;

/** Map contributor key used in engine → display label used in rule strings. */
const CONTRIB_LABEL: Record<ContribRef, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', lagna: 'Lagna',
};

const PLANET_LABEL: Record<Graha, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn',
};

/**
 * BPHS Ch. 48 śloka citations per (beneficiary, contributor).
 *
 * Each beneficiary planet's bindu positions are described across 4 ślokas
 * (2 contributors per śloka) in the Ashtakavargadhyaya of BPHS Ch. 48.
 *
 * Sun  → śl. 2–5, Moon → śl. 6–9, Mars → śl. 10–13, Mercury → śl. 14–17,
 * Jupiter → śl. 18–21, Venus → śl. 22–25, Saturn → śl. 26–29.
 */
const BPHS_CITATIONS: Record<Graha, Record<string, string>> = {
  sun: {
    sun: 'BPHS Ch. 48 śl. 2', moon: 'BPHS Ch. 48 śl. 2',
    mars: 'BPHS Ch. 48 śl. 3', mercury: 'BPHS Ch. 48 śl. 3',
    jupiter: 'BPHS Ch. 48 śl. 4', venus: 'BPHS Ch. 48 śl. 4',
    saturn: 'BPHS Ch. 48 śl. 5', ascendant: 'BPHS Ch. 48 śl. 5',
  },
  moon: {
    sun: 'BPHS Ch. 48 śl. 6', moon: 'BPHS Ch. 48 śl. 6',
    mars: 'BPHS Ch. 48 śl. 7', mercury: 'BPHS Ch. 48 śl. 7',
    jupiter: 'BPHS Ch. 48 śl. 8', venus: 'BPHS Ch. 48 śl. 8',
    saturn: 'BPHS Ch. 48 śl. 9', ascendant: 'BPHS Ch. 48 śl. 9',
  },
  mars: {
    sun: 'BPHS Ch. 48 śl. 10', moon: 'BPHS Ch. 48 śl. 10',
    mars: 'BPHS Ch. 48 śl. 11', mercury: 'BPHS Ch. 48 śl. 11',
    jupiter: 'BPHS Ch. 48 śl. 12', venus: 'BPHS Ch. 48 śl. 12',
    saturn: 'BPHS Ch. 48 śl. 13', ascendant: 'BPHS Ch. 48 śl. 13',
  },
  mercury: {
    sun: 'BPHS Ch. 48 śl. 14', moon: 'BPHS Ch. 48 śl. 14',
    mars: 'BPHS Ch. 48 śl. 15', mercury: 'BPHS Ch. 48 śl. 15',
    jupiter: 'BPHS Ch. 48 śl. 16', venus: 'BPHS Ch. 48 śl. 16',
    saturn: 'BPHS Ch. 48 śl. 17', ascendant: 'BPHS Ch. 48 śl. 17',
  },
  jupiter: {
    sun: 'BPHS Ch. 48 śl. 18', moon: 'BPHS Ch. 48 śl. 18',
    mars: 'BPHS Ch. 48 śl. 19', mercury: 'BPHS Ch. 48 śl. 19',
    jupiter: 'BPHS Ch. 48 śl. 20', venus: 'BPHS Ch. 48 śl. 20',
    saturn: 'BPHS Ch. 48 śl. 21', ascendant: 'BPHS Ch. 48 śl. 21',
  },
  venus: {
    sun: 'BPHS Ch. 48 śl. 22', moon: 'BPHS Ch. 48 śl. 22',
    mars: 'BPHS Ch. 48 śl. 23', mercury: 'BPHS Ch. 48 śl. 23',
    jupiter: 'BPHS Ch. 48 śl. 24', venus: 'BPHS Ch. 48 śl. 24',
    saturn: 'BPHS Ch. 48 śl. 25', ascendant: 'BPHS Ch. 48 śl. 25',
  },
  saturn: {
    sun: 'BPHS Ch. 48 śl. 26', moon: 'BPHS Ch. 48 śl. 26',
    mars: 'BPHS Ch. 48 śl. 27', mercury: 'BPHS Ch. 48 śl. 27',
    jupiter: 'BPHS Ch. 48 śl. 28', venus: 'BPHS Ch. 48 śl. 28',
    saturn: 'BPHS Ch. 48 śl. 29', ascendant: 'BPHS Ch. 48 śl. 29',
  },
};

// ─── Computation ────────────────────────────────────────────────────────────

/**
 * Compute the Bhinnashtakavarga for each planet and the Sarvashtakavarga.
 *
 * For each beneficiary planet P, and each contributor C (7 planets + ascendant),
 * check which houses from C's sign position produce a bindu in each sign.
 *
 * Attribution is built first; bindu counts are derived as
 * `contributingPositions.length` — guaranteeing the aggregate totals remain
 * byte-identical to the prior implementation.
 */
export function computeAshtakavarga(d1: PlanetPos[]): AshtakavargaData {
  const signOf: Record<string, number> = {};
  for (const p of d1) signOf[p.planet] = p.signNumber;

  const bhinna: Record<string, number[]> = {};
  const sarva: number[] = new Array(12).fill(0);
  const attribution: Record<string, HouseAttribution[]> = {};

  for (const bene of PLANET_KEYS) {
    const table = ASHTAK_TABLES[bene];
    if (!table) {
      bhinna[bene] = new Array(12).fill(0);
      attribution[bene] = Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        contributingPositions: [],
      }));
      continue;
    }

    // Initialise per-sign attribution buckets (12 houses)
    const houseAttrs: HouseAttribution[] = Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      contributingPositions: [],
    }));

    // Build the full rule string for this (beneficiary, contributor) pair
    // e.g. "Sun 1/2/4/7/8/9/10/11 from Moon"
    for (const contrib of CONTRIB_KEYS) {
      const engineKey = contrib === 'lagna' ? 'ascendant' : contrib;
      const cSign = signOf[engineKey];
      if (!cSign) continue;
      const houses = table[engineKey];
      if (!houses) continue;

      const ruleStr = `${PLANET_LABEL[bene]} ${houses.join('/')} from ${CONTRIB_LABEL[contrib]}`;
      const citation = BPHS_CITATIONS[bene][engineKey];

      for (const h of houses) {
        const targetSign = ((cSign - 1 + h - 1) % 12); // 0-indexed sign
        houseAttrs[targetSign].contributingPositions.push({
          fromReference: contrib,
          relativeSign: h,
          rule: ruleStr,
          citation,
        });
      }
    }

    // Derive bindu counts from attribution length
    const row = houseAttrs.map((ha) => ha.contributingPositions.length);
    bhinna[bene] = row;
    attribution[bene] = houseAttrs;
    for (let i = 0; i < 12; i++) sarva[i] += row[i];
  }

  return { bhinna, sarva, attribution };
}
