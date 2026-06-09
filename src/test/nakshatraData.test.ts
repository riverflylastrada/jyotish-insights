import { describe, it, expect } from 'vitest';
import { NAKSHATRA_INFO, NAKSHATRA_ORDER, nakshatraInfo, padaInfo } from '@/lib/astro/nakshatraData';

/**
 * The data file is keyed by the exact names the calculation engine emits
 * (NAKSHATRA_NAMES in supabase/functions/calculate-kundli/constants.ts). A typo
 * in a key would silently break the lookup on the Nakshatras page, so assert the
 * full canonical set is present and self-consistent.
 */
const CANONICAL = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
  'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

describe('nakshatraData', () => {
  it('covers exactly the 27 canonical nakshatras', () => {
    expect(Object.keys(NAKSHATRA_INFO)).toHaveLength(27);
    for (const name of CANONICAL) {
      expect(NAKSHATRA_INFO[name], `missing nakshatra: ${name}`).toBeDefined();
    }
  });

  it('NAKSHATRA_ORDER matches the canonical order', () => {
    expect(NAKSHATRA_ORDER).toEqual(CANONICAL);
  });

  it('every entry has a self-consistent name and required fields', () => {
    for (const [key, info] of Object.entries(NAKSHATRA_INFO)) {
      expect(info.name).toBe(key);
      expect(info.deva).toBeTruthy();
      expect(info.lord).toBeTruthy();
      expect(info.deity).toBeTruthy();
      expect(['Deva', 'Manushya', 'Rakshasa']).toContain(info.gana);
      expect(['Aadi', 'Madhya', 'Antya']).toContain(info.nadi);
      expect(['Sattva', 'Rajas', 'Tamas']).toContain(info.guna);
      expect(info.element).toBeTruthy();
      expect(info.shaktiName).toBeTruthy();
      expect(info.shakti).toBeTruthy();
      expect(info.career.length).toBeGreaterThan(0);
      expect(info.strengths.length).toBeGreaterThan(0);
      expect(info.challenges.length).toBeGreaterThan(0);
    }
  });

  it('nakshatraInfo() resolves a known name and misses gracefully', () => {
    expect(nakshatraInfo('Rohini')?.lord).toBe('Moon');
    expect(nakshatraInfo('Not A Nakshatra')).toBeUndefined();
  });

  it('padaInfo() computes navamsa placement deterministically', () => {
    // Ashwini P1 = Mesha navamsa (Mars); P4 = Karka (Moon).
    expect(padaInfo('Ashwini', 1)).toMatchObject({ navamsaSign: 'Mesha', lord: 'Mars' });
    expect(padaInfo('Ashwini', 4)).toMatchObject({ navamsaSign: 'Karka', lord: 'Moon' });
    // Krittika P1 = Dhanu navamsa (Jupiter) — classic checkpoint.
    expect(padaInfo('Krittika', 1)).toMatchObject({ navamsaSign: 'Dhanu', lord: 'Jupiter' });
    // Revati P4 = the 108th and final navamsa = Meena (Jupiter).
    expect(padaInfo('Revati', 4)).toMatchObject({ navamsaSign: 'Meena', lord: 'Jupiter' });
    expect(padaInfo('Not A Nakshatra', 1)).toBeUndefined();
  });
});
