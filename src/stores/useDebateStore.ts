import { create } from 'zustand';

export interface DebateTurn {
  question: string;
  readings: Array<{ guru: string; text: string }>;
  verdict: string;
}

interface DebateState {
  question: string;
  setQuestion: (q: string) => void;
  followUp: string;
  setFollowUp: (q: string) => void;
  history: Array<{ question: string; timestamp: number }>;
  addToHistory: (q: string) => void;
  turns: DebateTurn[];
  addTurn: (turn: DebateTurn) => void;
  clearTurns: () => void;
}

export const useDebateStore = create<DebateState>((set) => ({
  question: '',
  setQuestion: (q) => set({ question: q }),
  followUp: '',
  setFollowUp: (q) => set({ followUp: q }),
  history: [],
  addToHistory: (q) => set((s) => ({ history: [...s.history, { question: q, timestamp: Date.now() }] })),
  turns: [],
  addTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
  clearTurns: () => set({ turns: [] }),
}));
