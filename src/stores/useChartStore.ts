import { create } from 'zustand';

interface ChartUiState {
  highlightedHouse: number | null;
  highlightedPlanet: string | null;
  chartStyle: 'north' | 'south';
  setHighlightedHouse: (h: number | null) => void;
  setHighlightedPlanet: (p: string | null) => void;
  setChartStyle: (s: 'north' | 'south') => void;
}

export const useChartStore = create<ChartUiState>((set) => ({
  highlightedHouse: null,
  highlightedPlanet: null,
  chartStyle: 'north',
  setHighlightedHouse: (h) => set({ highlightedHouse: h }),
  setHighlightedPlanet: (p) => set({ highlightedPlanet: p }),
  setChartStyle: (s) => set({ chartStyle: s }),
}));
