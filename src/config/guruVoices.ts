// Voice Guru display registry (frontend).
//
// Display-only metadata for the voice personas — drives GuruSelector cards and
// the nav. The system prompts, greetings, and TTS params live server-side in
// supabase/functions/voice-session/personas.ts (Deno can't import this tree),
// and the actual ElevenLabs voice ids live in app_settings (admin-editable).
//
// This is a DIFFERENT, voice-specific set from the 8 text-debate gurus in
// Debate.tsx. Personas roll out in phases via the `available` flag.

export type VoiceGuruId =
  | 'parashara'
  | 'saraswati'
  | 'kp_master'
  | 'jaimini'
  | 'varahamihira'
  | 'mantreshwar'
  | 'bhrigu'
  | 'lalkitab';

export interface VoiceGuruDisplay {
  id: VoiceGuruId;
  name: string;
  nameHindi: string;
  school: string;
  description: string;
  voiceName: string; // display name of the underlying ElevenLabs voice
  icon: string;      // emoji
  available: boolean; // phased launch
}

export const VOICE_GURUS: VoiceGuruDisplay[] = [
  // ── Phase 1 (launch) ──────────────────────────────────────────────
  {
    id: 'parashara',
    name: 'Parashara Muni',
    nameHindi: 'पराशर मुनि',
    school: 'BPHS Classical',
    description: 'The ancient sage and father of Vedic Jyotish. Calm, authoritative, and deeply wise.',
    voiceName: 'Shardul K – Hindu Mythology Storyteller',
    icon: '🙏',
    available: true,
  },
  {
    id: 'saraswati',
    name: 'Devi Saraswati',
    nameHindi: 'देवी सरस्वती',
    school: 'Nadi & Intuitive',
    description: 'Divine feminine voice of intuitive wisdom. Nurturing, mystical, and deeply spiritual.',
    voiceName: 'Nikita – Encouraging, Clear and Serious',
    icon: '🪷',
    available: true,
  },
  {
    id: 'kp_master',
    name: 'KP Master',
    nameHindi: 'केपी मास्टर',
    school: 'Krishnamurthi Paddhati',
    description: 'Modern, analytical Jyotishi. Precise, data-driven, and scientifically systematic.',
    voiceName: 'Raj – Professional Hindi AI Agent',
    icon: '📐',
    available: true,
  },
  // ── Phase 2 ───────────────────────────────────────────────────────
  {
    id: 'jaimini',
    name: 'Jaimini Acharya',
    nameHindi: 'जैमिनी आचार्य',
    school: 'Jaimini Sutras',
    description: 'Scholar of the Jaimini system. Sharp and precise, focused on Karakas and Chara Dasha.',
    voiceName: 'Chetan Sabhaya – Hindi',
    icon: '📜',
    available: false,
  },
  {
    id: 'varahamihira',
    name: 'Varahamihira',
    nameHindi: 'वराहमिहिर',
    school: 'Brihat Jataka',
    description: 'Warm storyteller. Weaves predictions into narratives with poetic elegance.',
    voiceName: 'Nishi – Hindi-English Storytelling',
    icon: '🌟',
    available: false,
  },
  // ── Phase 3 ───────────────────────────────────────────────────────
  {
    id: 'mantreshwar',
    name: 'Mantreshwar',
    nameHindi: 'मन्त्रेश्वर',
    school: 'Phaladeepika',
    description: 'Practical and direct. Focused on actionable remedies and real-world outcomes.',
    voiceName: 'Tarun – Desi Indian Male Voice Pro',
    icon: '💎',
    available: false,
  },
  {
    id: 'bhrigu',
    name: 'Bhrigu Rishi',
    nameHindi: 'भृगु ऋषि',
    school: 'Bhrigu Samhita / Nadi',
    description: 'Ancient and oracular. Speaks as if reading from destiny scrolls. Prophetic.',
    voiceName: 'Jeet – Powerful Hindu Epic Voice',
    icon: '📖',
    available: false,
  },
  {
    id: 'lalkitab',
    name: 'Lal Kitab Pandit',
    nameHindi: 'लाल किताब पंडित',
    school: 'Lal Kitab',
    description: 'Energetic and folksy. Quick remedies, colorful language, village wisdom.',
    voiceName: 'Gaurav – Young, Energetic and Lively',
    icon: '📕',
    available: false,
  },
];

export const VOICE_GURUS_BY_ID: Record<VoiceGuruId, VoiceGuruDisplay> = Object.fromEntries(
  VOICE_GURUS.map((g) => [g.id, g]),
) as Record<VoiceGuruId, VoiceGuruDisplay>;

export const getVoiceGuru = (id: string): VoiceGuruDisplay | undefined =>
  VOICE_GURUS_BY_ID[id as VoiceGuruId];

export const DEFAULT_VOICE_GURU: VoiceGuruId = 'parashara';
