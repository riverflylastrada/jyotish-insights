/**
 * KP Horary Number (1-249) → representative sidereal longitude.
 *
 * The zodiac is divided into 27 nakshatras x 9 Vimshottari subs = 243 sub-lord
 * segments. Six of the 11 non-zero sign boundaries (30, 90, 150, 210, 270, 330)
 * fall inside a sub, splitting it into two numbered segments. The remaining five
 * (60, 120, 180, 240, 300) coincide with a sub or nakshatra boundary and create
 * no split. Total: 243 + 6 = 249.
 *
 * For each number the representative longitude is the midpoint of the segment.
 * This is used as the Lagna (ascendant) in a KP horary chart.
 *
 * Reference: KP Reader-1 (Krishnamurti), KP sub-lord table.
 */

import { VIMSHOTTARI_SEQUENCE } from "./constants.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KpSubSegment {
  /** 1-249 horary number */
  number: number;
  /** Sidereal start degree (inclusive) */
  startDeg: number;
  /** Sidereal end degree (exclusive) */
  endDeg: number;
  /** Rasi sign 1-12 */
  sign: number;
  /** Star (nakshatra) lord */
  starLord: string;
  /** Sub lord */
  subLord: string;
}

// ─── Build the 249-segment table ────────────────────────────────────────────

const NAK_SPAN = 360 / 27; // 13.3333...
const VIM_TOTAL = 120;

/** Nakshatra lords in order (repeating cycle of 9 for 27 nakshatras). */
const NAK_LORDS: readonly string[] = VIMSHOTTARI_SEQUENCE.map(([p]) => p);
const VIM_YEARS: readonly number[] = VIMSHOTTARI_SEQUENCE.map(([, y]) => y);

function buildTable(): KpSubSegment[] {
  // Phase 1: generate the 243 raw subs (27 naks x 9 subs each)
  const rawSubs: Array<{ startDeg: number; endDeg: number; starLord: string; subLord: string }> = [];

  for (let nak = 0; nak < 27; nak++) {
    const nakStart = nak * NAK_SPAN;
    const lordIdx = nak % 9; // index into VIMSHOTTARI_SEQUENCE
    let pos = nakStart;

    for (let i = 0; i < 9; i++) {
      const seqIdx = (lordIdx + i) % 9;
      const subSpan = (VIM_YEARS[seqIdx] / VIM_TOTAL) * NAK_SPAN;
      const subEnd = pos + subSpan;
      rawSubs.push({
        startDeg: pos,
        endDeg: subEnd,
        starLord: NAK_LORDS[lordIdx],
        subLord: NAK_LORDS[seqIdx],
      });
      pos = subEnd;
    }
  }

  // Phase 2: split at sign boundaries → 249 numbered segments
  const segments: KpSubSegment[] = [];
  let num = 1;

  for (const sub of rawSubs) {
    const startSign = Math.floor(sub.startDeg / 30) + 1;
    // endDeg is exclusive; if it lands exactly on a boundary it stays in the current sign
    const endSign = Math.floor((sub.endDeg - 1e-9) / 30) + 1;

    if (startSign !== endSign && sub.endDeg - sub.startDeg > 1e-9) {
      // Sub crosses a sign boundary — split
      const boundary = startSign * 30;
      segments.push({
        number: num++,
        startDeg: sub.startDeg,
        endDeg: boundary,
        sign: startSign,
        starLord: sub.starLord,
        subLord: sub.subLord,
      });
      segments.push({
        number: num++,
        startDeg: boundary,
        endDeg: sub.endDeg,
        sign: endSign <= 12 ? endSign : 1,
        starLord: sub.starLord,
        subLord: sub.subLord,
      });
    } else {
      segments.push({
        number: num++,
        startDeg: sub.startDeg,
        endDeg: sub.endDeg,
        sign: startSign <= 12 ? startSign : 1,
        starLord: sub.starLord,
        subLord: sub.subLord,
      });
    }
  }

  return segments;
}

/** Lazily cached table (computed once). */
let _table: KpSubSegment[] | null = null;

export function kpHoraryTable(): KpSubSegment[] {
  if (!_table) _table = buildTable();
  return _table;
}

/**
 * Convert a KP horary number (1-249) to a representative sidereal longitude
 * (midpoint of the sub segment). Returns null for invalid numbers.
 */
export function kpHoraryLongitude(num: number): number | null {
  if (num < 1 || num > 249 || !Number.isInteger(num)) return null;
  const table = kpHoraryTable();
  const seg = table[num - 1];
  if (!seg) return null;
  return (seg.startDeg + seg.endDeg) / 2;
}

/**
 * Look up the full segment details for a KP horary number (1-249).
 */
export function kpHorarySegment(num: number): KpSubSegment | null {
  if (num < 1 || num > 249 || !Number.isInteger(num)) return null;
  const table = kpHoraryTable();
  return table[num - 1] ?? null;
}
