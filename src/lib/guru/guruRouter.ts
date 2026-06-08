/**
 * Topic → expert-guru router for the focused single-guru ask.
 *
 * Instead of convening the full eight-guru tribunal (≈9 LLM calls) for a query
 * about one topic, route it to the single guru whose lineage owns that domain
 * and ask them alone (1 call). The full tribunal stays reserved for the explicit
 * Debate page (the deep / paid path).
 *
 * Lal Kitab is intentionally absent: those questions are answered for free by
 * the static, book-sourced Lal Kitab page (no LLM) — see src/lib/astro/lalKitab.ts.
 */

import type { GuruKey } from './guruRoster';

export type GuruTopic =
  | 'dasha'    // Vimshottari / timing            → K. N. Rao ("judge by dasha first")
  | 'transit'  // Gochar / current transits       → Varahamihira (Samhita)
  | 'kp'       // KP / cuspal sub-lords           → Krishnamurti
  | 'jaimini'  // Karakas / chara dasha / argala  → Jaimini
  | 'yoga'     // Yogas / planetary states        → Mantreshwara (Phaladeepika)
  | 'dosha'    // Doshas / afflictions / remedies → Parashara (BPHS)
  | 'house'    // A single bhava in the chart     → Parashara (BPHS)
  | 'varga'    // Divisional charts D1–D60        → Parashara (BPHS)
  | 'planet'   // A single planet in the chart    → Parashara (BPHS)
  | 'nakshatra'// Nakshatra / lunar mansion        → Varahamihira (Samhita / lunar lore)
  | 'general'; // Anything else                   → Parashara (BPHS)

export const GURU_FOR_TOPIC: Record<GuruTopic, GuruKey> = {
  dasha: 'rao',
  transit: 'varahamihira',
  kp: 'krishnamurti',
  jaimini: 'jaimini',
  yoga: 'mantreshwara',
  dosha: 'parashara',
  house: 'parashara',
  varga: 'parashara',
  planet: 'parashara',
  nakshatra: 'varahamihira',
  general: 'parashara',
};

export function guruForTopic(topic: GuruTopic): GuruKey {
  return GURU_FOR_TOPIC[topic] ?? 'parashara';
}

/**
 * Build the scoped question handed to the single expert guru. Kept tight and
 * topic-specific so the reading stays focused (and cheap) rather than sprawling
 * into a full chart analysis.
 */
export function focusedQuestion(topic: GuruTopic, subject: string): string {
  switch (topic) {
    case 'dasha':
      return `Focus only on ${subject}. Read the running and upcoming dasha/bhukti periods for this native — what each activates and the likely timing. Be specific and practical; 2–3 short paragraphs, no preamble.`;
    case 'transit':
      return `Focus only on ${subject}. Read the current gochar (transits) over this natal chart — which houses and natal planets are being activated, and the practical effect and timing. 2–3 short paragraphs, no preamble.`;
    case 'kp':
      return `Focus only on ${subject}. Give a KP (cuspal sub-lord) reading for this chart on that matter — the significators and the likely outcome. 2–3 short paragraphs, no preamble.`;
    case 'jaimini':
      return `Focus only on ${subject}. Read it through Jaimini principles (karakas, chara dasha, argala) for this chart. 2–3 short paragraphs, no preamble.`;
    case 'yoga':
      return `Focus only on ${subject}. Identify the relevant yogas and planetary states (avasthas) in this chart and their concrete results. 2–3 short paragraphs, no preamble.`;
    case 'dosha':
      return `Focus only on ${subject} in this chart — how severe it is, how it manifests for the native, and the practical remedies. 2–3 short paragraphs, no preamble.`;
    case 'house':
      return `Focus only on ${subject} in this chart — the sign on it, its lord and where that lord sits, any occupants and aspects, and the concrete life areas it governs for the native. 2–3 short paragraphs, no preamble.`;
    case 'varga':
      return `Focus only on ${subject} in this chart's divisional (varga) analysis — what the placement reveals about that life area. 2–3 short paragraphs, no preamble.`;
    case 'nakshatra':
      return `Focus only on ${subject}. Read this nakshatra for the native — its nature, ruling planet and presiding deity, the gana/yoni/nadi temperament, and the concrete tendencies it lends to character, career and relationships. 2–3 short paragraphs, no preamble.`;
    case 'planet':
    case 'general':
    default:
      return `Give a focused reading of ${subject} in this chart: its sign, house, dignity and strength; the houses it owns and aspects; and the concrete effect on the native's life. Be specific and practical — 2–3 short paragraphs, no preamble.`;
  }
}
