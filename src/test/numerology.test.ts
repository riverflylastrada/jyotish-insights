import { describe, it, expect } from 'vitest';
import {
  reduceNumber, lifePathNumber, destinyNumber, soulUrgeNumber,
  personalityNumber, NUMBER_MEANINGS,
} from '@/lib/numerology';

describe('numerology', () => {
  it('reduces to a single digit and preserves master numbers', () => {
    expect(reduceNumber(39)).toBe(3);   // 3+9=12 -> 1+2=3
    expect(reduceNumber(48)).toBe(3);   // 4+8=12 -> 3
    expect(reduceNumber(38)).toBe(11);  // 3+8=11 -> master preserved
    expect(reduceNumber(29)).toBe(11);  // 2+9=11 -> master preserved
    expect(reduceNumber(11)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(33)).toBe(33);
    expect(reduceNumber(11, false)).toBe(2); // master collapse when disabled
  });

  it('computes Life Path = reduce(day)+reduce(month)+reduce(year)', () => {
    // 1990-12-25 -> day 25->7, month 12->3, year 1990->19->10->1 ; 7+3+1=11 (master)
    expect(lifePathNumber('1990-12-25')).toBe(11);
    // 2000-01-01 -> 1 + 1 + 2 = 4
    expect(lifePathNumber('2000-01-01')).toBe(4);
  });

  it('computes name numbers from Latin letters (Pythagorean)', () => {
    // "ABC" = 1+2+3 = 6
    expect(destinyNumber('ABC')).toBe(6);
    // vowels of "ABE" -> A(1)+E(5)=6
    expect(soulUrgeNumber('ABE')).toBe(6);
    // consonants of "ABE" -> B(2)
    expect(personalityNumber('ABE')).toBe(2);
  });

  it('has a meaning for every core/master number used', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      expect(NUMBER_MEANINGS[n], `missing meaning ${n}`).toBeDefined();
      expect(NUMBER_MEANINGS[n].hi.length).toBeGreaterThan(0);
    }
  });
});
