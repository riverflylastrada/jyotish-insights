import { create } from 'zustand';

interface DebateState { question: string; setQuestion: (q: string) => void; }
export const useDebateStore = create<DebateState>((set) => ({
  question: '', setQuestion: (q) => set({ question: q }),
}));
