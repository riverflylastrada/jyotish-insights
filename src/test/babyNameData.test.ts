import { describe, it, expect } from 'vitest';
import { PADA_SYLLABLES, NAME_POOL, suggestNames } from '@/lib/astro/babyNameData';

const CANONICAL = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
  'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

describe('babyNameData', () => {
  it('has exactly the 27 nakshatras, each with 4 pada syllables', () => {
    expect(Object.keys(PADA_SYLLABLES)).toHaveLength(27);
    for (const nak of CANONICAL) {
      expect(PADA_SYLLABLES[nak], `missing nakshatra: ${nak}`).toBeDefined();
      expect(PADA_SYLLABLES[nak]).toHaveLength(4);
      for (const s of PADA_SYLLABLES[nak]) {
        expect(s.roman.length).toBeGreaterThan(0);
        expect(s.deva.length).toBeGreaterThan(0);
      }
    }
  });

  it('every pooled name has a gender and bilingual meaning', () => {
    for (const n of NAME_POOL) {
      expect(['boy', 'girl']).toContain(n.gender);
      expect(n.en.length).toBeGreaterThan(0);
      expect(n.hi.length).toBeGreaterThan(0);
      expect(n.start).toBe(n.start.toLowerCase());
    }
  });

  it('suggests names matching a syllable', () => {
    // Ashwini pada 4 syllable is "La" → should surface a La-name (e.g. Lakshya).
    const names = suggestNames([{ roman: 'La', deva: 'ला' }]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => n.start === 'la')).toBe(true);
  });

  it('filters by gender', () => {
    const girls = suggestNames(PADA_SYLLABLES['Rohini'], 'girl');
    expect(girls.every((n) => n.gender === 'girl')).toBe(true);
  });
});
