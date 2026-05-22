import type { AstroProvider, BirthDetails, KundliData, PlanetPosition } from '../types';
import { supabase } from '@/integrations/supabase/client';

/** Swiss Ephemeris-based calculation engine via Supabase Edge Function. */
export class CustomEngineProvider implements AstroProvider {
  name = 'custom';

  async generateKundli(details: BirthDetails): Promise<KundliData> {
    const resp = await supabase.functions.invoke('calculate-kundli', {
      body: { birthDetails: details, mode: 'kundli' },
    });
    if (resp.error) throw new Error(resp.error.message ?? 'Calculation failed');
    return resp.data as KundliData;
  }

  async getCurrentTransits(latitude: number, longitude: number): Promise<PlanetPosition[]> {
    const now = new Date();
    const resp = await supabase.functions.invoke('calculate-kundli', {
      body: {
        birthDetails: {
          fullName: 'Transit',
          dateOfBirth: now.toISOString().split('T')[0],
          timeOfBirth: now.toISOString().split('T')[1].substring(0, 8),
          placeOfBirth: { name: '', latitude, longitude, timezone: 'UTC', timezoneOffset: 0 },
          ayanamsa: 'lahiri',
          houseSystem: 'whole_sign',
        },
        mode: 'transits',
      },
    });
    if (resp.error) throw new Error(resp.error.message ?? 'Transit calculation failed');
    return resp.data as PlanetPosition[];
  }

  async isHealthy(): Promise<boolean> {
    try {
      const resp = await supabase.functions.invoke('calculate-kundli', {
        body: { mode: 'health' },
      });
      return !resp.error;
    } catch {
      return false;
    }
  }
}
