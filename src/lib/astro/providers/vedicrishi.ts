import type { AstroProvider, BirthDetails, KundliData, PlanetPosition } from '../types';

/**
 * VedicRishi adapter — calls a backend proxy that wraps VedicRishi's API.
 * The frontend NEVER talks to VedicRishi directly. Configure VITE_API_BASE_URL
 * to point at your FastAPI / Edge Function proxy.
 *
 * Expected backend endpoints (POST, JSON body = BirthDetails):
 *   /astro/planets       /astro/divisional/:varga    /astro/dasha/:system
 *   /astro/doshas        /astro/yogas                /astro/ashtakavarga
 *   /astro/panchang      /astro/transits
 */
export class VedicRishiProvider implements AstroProvider {
  name = 'vedicrishi';
  // private baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '') + '/astro';

  async generateKundli(_details: BirthDetails): Promise<KundliData> {
    throw new Error('VedicRishiProvider.generateKundli not implemented yet — wire backend proxy.');
  }
  async getCurrentTransits(_lat: number, _lng: number): Promise<PlanetPosition[]> {
    throw new Error('VedicRishiProvider.getCurrentTransits not implemented yet.');
  }
  async isHealthy() { return false; }
}
