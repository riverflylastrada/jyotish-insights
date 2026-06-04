/**
 * Canonical roster of the eight debate Gurus (classical + modern).
 *
 * This is the single source of truth for guru keys, display names, lineage and
 * accent colours. The full Guru Debate ([Debate.tsx]) convenes all of them; the
 * focused-ask flow ([FocusedGuruAnswer]) routes a single topic to the matching
 * expert via [guruRouter]. Each guru's *voice* (system prompt) lives server-side
 * in supabase/functions/guru-debate.
 */

export type GuruKey =
  | 'parashara'
  | 'varahamihira'
  | 'raman'
  | 'rao'
  | 'krishnamurti'
  | 'jaimini'
  | 'mantreshwara'
  | 'kalyanavarman';

export interface GuruMeta {
  key: GuruKey;
  name: string;
  deva: string;
  era: string;
  school: string;
  signature: string;
  accent: string;
}

export const GURUS: GuruMeta[] = [
  { key: 'parashara',     name: 'Maharishi Parashara', deva: 'पराशर',          era: '~1500 BCE',  school: 'Brihat Parashara Hora Sastra', signature: 'PS', accent: 'hsl(var(--brand-maroon))' },
  { key: 'varahamihira',  name: 'Varahamihira',        deva: 'वराहमिहिर',       era: '6th c. CE',  school: 'Brihat Jataka',                signature: 'VM', accent: 'hsl(var(--planet-jupiter))' },
  { key: 'raman',         name: 'Dr. B. V. Raman',     deva: 'बी. वी. रमण',     era: '20th c.',    school: 'Modern Hindu Astrology',       signature: 'BR', accent: 'hsl(var(--planet-mars))' },
  { key: 'rao',           name: 'K. N. Rao',           deva: 'के. एन. राव',     era: '20th c.',    school: 'Dasha-led judgment',           signature: 'KR', accent: 'hsl(var(--planet-saturn))' },
  { key: 'krishnamurti',  name: 'K. S. Krishnamurti',  deva: 'कृष्णमूर्ति',      era: '20th c.',    school: 'KP / Stellar Astrology',       signature: 'KP', accent: 'hsl(var(--planet-mercury))' },
  { key: 'jaimini',       name: 'Maharishi Jaimini',   deva: 'जैमिनि',          era: '~3rd c. BCE', school: 'Jaimini Sutras / Dasha',       signature: 'JM', accent: 'hsl(180, 70%, 35%)' },
  { key: 'mantreshwara',  name: 'Mantreshwara',        deva: 'मन्त्रेश्वर',      era: '16th c. CE', school: 'Phaladeepika (Practical)',     signature: 'MP', accent: 'hsl(var(--brand-saffron))' },
  { key: 'kalyanavarman', name: 'Kalyanavarman',       deva: 'कल्याणवर्मन',     era: '10th c. CE', school: 'Saravali (Poetic Descriptive)', signature: 'KV', accent: 'hsl(280, 60%, 45%)' },
];

export const GURU_BY_KEY: Record<GuruKey, GuruMeta> = Object.fromEntries(
  GURUS.map((g) => [g.key, g]),
) as Record<GuruKey, GuruMeta>;
