import type { AstroProvider, BirthDetails, KundliData, PlanetPosition } from '../types';

/** Future: in-house Swiss Ephemeris-based engine. */
export class CustomEngineProvider implements AstroProvider {
  name = 'custom';
  async generateKundli(_d: BirthDetails): Promise<KundliData> {
    throw new Error('CustomEngineProvider not implemented yet.');
  }
  async getCurrentTransits(): Promise<PlanetPosition[]> {
    throw new Error('CustomEngineProvider not implemented yet.');
  }
  async isHealthy() { return false; }
}
