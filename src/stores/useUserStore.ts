import { create } from 'zustand';

interface UserState {
  preferences: {
    ayanamsa: 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';
    chartStyle: 'north' | 'south';
    houseSystem: 'whole_sign' | 'placidus' | 'koch' | 'equal';
  };
}

export const useUserStore = create<UserState>(() => ({
  preferences: { ayanamsa: 'lahiri', chartStyle: 'north', houseSystem: 'whole_sign' },
}));
