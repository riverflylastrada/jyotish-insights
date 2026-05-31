import { create } from 'zustand';
import type { VoiceGuruId } from '@/config/guruVoices';

// Coarse UI status for the voice tray. The live WebRTC connection + isSpeaking
// stay on the @elevenlabs useConversation hook; we mirror only this here so the
// floating button and the global tray (which mount/unmount independently) agree.
export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

export interface TranscriptEntry {
  role: 'user' | 'guru';
  text: string;
  ts: number;
}

interface VoiceState {
  isSessionActive: boolean;
  currentGuru: VoiceGuruId | null;
  chartId: string | null;
  status: VoiceStatus;
  error: string | null;
  transcript: TranscriptEntry[];
  sessionDuration: number; // seconds
  isMuted: boolean;
  // actions
  openWith: (guru: VoiceGuruId, chartId: string | null) => void;
  setStatus: (status: VoiceStatus, error?: string | null) => void;
  appendTranscript: (entry: TranscriptEntry) => void;
  tick: () => void;
  setMuted: (muted: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isSessionActive: false,
  currentGuru: null,
  chartId: null,
  status: 'idle',
  error: null,
  transcript: [],
  sessionDuration: 0,
  isMuted: false,

  openWith: (currentGuru, chartId) =>
    set({
      isSessionActive: true,
      currentGuru,
      chartId,
      status: 'idle',
      error: null,
      transcript: [],
      sessionDuration: 0,
      isMuted: false,
    }),
  setStatus: (status, error = null) => set({ status, error }),
  appendTranscript: (entry) => set((s) => ({ transcript: [...s.transcript, entry] })),
  tick: () => set((s) => ({ sessionDuration: s.sessionDuration + 1 })),
  setMuted: (isMuted) => set({ isMuted }),
  reset: () =>
    set({
      isSessionActive: false,
      currentGuru: null,
      chartId: null,
      status: 'idle',
      error: null,
      transcript: [],
      sessionDuration: 0,
      isMuted: false,
    }),
}));
