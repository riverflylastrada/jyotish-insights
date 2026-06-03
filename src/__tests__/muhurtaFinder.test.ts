import { describe, it, expect } from 'vitest';
import { computeDayPanchang, computeAbhijitMuhurta, minutesToTime } from '../lib/muhurta/panchangLite';
import { scoreDay, findAuspiciousDays } from '../lib/muhurta/muhurtaFinder';
import { ACTIVITY_RULES, getActivityRule } from '../lib/muhurta/muhurtaRules';

/**
 * Reference data from Drik Panchang for Delhi (28.6139°N, 77.2090°E)
 * on 15 Jan 2024:
 *   Tithi: Shukla Paksha Panchami
 *   Nakshatra: Purva Bhadrapada
 *   Vara: Monday (Somavara)
 *   Sunrise: ~07:14 IST, Sunset: ~17:57 IST
 *   Abhijit Muhurta: 12:14 PM – 12:57 PM
 */
const DELHI = { lat: 28.6139, lon: 77.209, tz: 5.5 };

describe('panchangLite', () => {
  it('computes Delhi 2024-01-15 panchang matching Drik Panchang reference', () => {
    const p = computeDayPanchang('2024-01-15', DELHI.lat, DELHI.lon, DELHI.tz);

    // Vara: Monday
    expect(p.varaIndex).toBe(1);
    expect(p.vara).toBe('Monday');

    // Tithi: Shukla Panchami (index 4)
    expect(p.tithiFull).toBe('Shukla Panchami');
    expect(p.tithiIndex).toBe(4);

    // Nakshatra: Purva Bhadrapada (index 24)
    expect(p.nakshatra).toBe('Purva Bhadrapada');
    expect(p.nakshatraIndex).toBe(24);

    // Sunrise between 07:00–07:30 IST (420–450 min)
    expect(p.sunriseMin).toBeGreaterThanOrEqual(420);
    expect(p.sunriseMin).toBeLessThanOrEqual(450);

    // Sunset between 17:45–18:15 IST (1065–1095 min)
    expect(p.sunsetMin).toBeGreaterThanOrEqual(1065);
    expect(p.sunsetMin).toBeLessThanOrEqual(1095);
  });

  it('computes Abhijit as 8th of 15 muhurtas', () => {
    const sr = 434; // ~07:14
    const ss = 1077; // ~17:57
    const a = computeAbhijitMuhurta(sr, ss, 1);

    expect(a.active).toBe(true);
    const dayLen = ss - sr;
    const muhLen = dayLen / 15;
    // 8th muhurta (index 7) starts at sr + 7 * muhLen
    expect(a.startMin).toBeCloseTo(sr + 7 * muhLen, 1);
    expect(a.endMin).toBeCloseTo(sr + 8 * muhLen, 1);
  });

  it('marks Abhijit inactive on Wednesday', () => {
    const a = computeAbhijitMuhurta(434, 1077, 3);
    expect(a.active).toBe(false);
  });
});

describe('muhurtaFinder', () => {
  it('scores a day with reasons', () => {
    const p = computeDayPanchang('2024-01-15', DELHI.lat, DELHI.lon, DELHI.tz);
    const rule = getActivityRule('general')!;
    const s = scoreDay(p, rule);

    expect(s.date).toBe('2024-01-15');
    expect(typeof s.score).toBe('number');
    expect(s.reasons.length).toBeGreaterThan(0);
  });

  it('returns sorted results for a 7-day range', () => {
    const result = findAuspiciousDays('general', '2024-01-15', '2024-01-21', DELHI.lat, DELHI.lon, DELHI.tz);

    expect(result.scored.length).toBe(7);
    expect(result.activity.key).toBe('general');
    // Sorted descending
    for (let i = 1; i < result.scored.length; i++) {
      expect(result.scored[i].score).toBeLessThanOrEqual(result.scored[i - 1].score);
    }
  });

  it('Vivah preset scores correctly', () => {
    const result = findAuspiciousDays('vivah', '2024-01-15', '2024-01-28', DELHI.lat, DELHI.lon, DELHI.tz);

    expect(result.scored.length).toBe(14);
    expect(result.activity.key).toBe('vivah');
    // Each day has reasons
    result.scored.forEach(d => {
      expect(d.reasons.length).toBeGreaterThan(0);
      expect(d.panchang.date).toBeTruthy();
    });
  });
});

describe('muhurtaRules', () => {
  it('all rules have required fields', () => {
    expect(ACTIVITY_RULES.length).toBeGreaterThanOrEqual(5);
    ACTIVITY_RULES.forEach(r => {
      expect(r.key).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(r.labelHi).toBeTruthy();
      expect(r.favourTithis.length).toBeGreaterThan(0);
      expect(r.favourNakshatras.length).toBeGreaterThan(0);
    });
  });

  it('getActivityRule returns correct rule', () => {
    expect(getActivityRule('vivah')?.key).toBe('vivah');
    expect(getActivityRule('nonexistent')).toBeUndefined();
  });
});

describe('minutesToTime', () => {
  it('converts minutes to HH:MM', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(434)).toBe('07:14');
    expect(minutesToTime(1077)).toBe('17:57');
  });
});
