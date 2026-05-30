/**
 * Server-side schema validator for the auto-insights JSON shape
 * returned by the LLM. Extracted to its own module so Deno tests
 * can import it without pulling in the full edge-function handler.
 */

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const HOUSE_KEYS = ['1','2','3','4','5','6','7','8','9','10','11','12'];

export function validateAutoInsightsJson(obj: unknown): obj is {
  planets: Record<string, { brief: string; full: string }>;
  dashas: Array<{ system: string; level: string; lord: string; period: string; reading: string }>;
  yogas: Record<string, string>;
  doshas: Record<string, string>;
  houses: Record<string, string>;
} {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;

  // planets
  if (!o.planets || typeof o.planets !== 'object') return false;
  for (const k of PLANET_KEYS) {
    const p = (o.planets as Record<string, unknown>)[k];
    if (!p || typeof p !== 'object') return false;
    const pp = p as Record<string, unknown>;
    if (typeof pp.brief !== 'string' || typeof pp.full !== 'string') return false;
  }

  // dashas
  if (!Array.isArray(o.dashas)) return false;
  for (const d of o.dashas) {
    if (!d || typeof d !== 'object') return false;
    const dd = d as Record<string, unknown>;
    if (typeof dd.system !== 'string' || typeof dd.level !== 'string' ||
        typeof dd.lord !== 'string' || typeof dd.period !== 'string' ||
        typeof dd.reading !== 'string') return false;
  }

  // yogas
  if (!o.yogas || typeof o.yogas !== 'object') return false;
  for (const v of Object.values(o.yogas as Record<string, unknown>)) {
    if (typeof v !== 'string') return false;
  }

  // doshas
  if (!o.doshas || typeof o.doshas !== 'object') return false;
  for (const v of Object.values(o.doshas as Record<string, unknown>)) {
    if (typeof v !== 'string') return false;
  }

  // houses
  if (!o.houses || typeof o.houses !== 'object') return false;
  for (const k of HOUSE_KEYS) {
    if (typeof (o.houses as Record<string, unknown>)[k] !== 'string') return false;
  }

  return true;
}
