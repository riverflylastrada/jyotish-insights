/**
 * Timezone-aware tests for client-side "now" features.
 *
 * Validates:
 * 1. localDateInTz returns the correct civil date for different timezones
 *    when a UTC instant straddles midnight in some zones but not others.
 * 2. computeSunTimes produces different sunrise/sunset for different locations.
 * 3. Muhurta window math (Rahu Kalam, Abhijit) varies correctly by location.
 */

import { describe, it, expect } from 'vitest';
import { computeSunTimes, localDateInTz } from '@/lib/astro/sun';

// ── localDateInTz ───────────────────────────────────────────────────

describe('localDateInTz — civil date varies by timezone', () => {
  // 2026-05-27 23:00 UTC  →  still May 27 in LA, but May 28 in Kolkata
  const utcLateEvening = new Date('2026-05-27T23:00:00Z');

  it('America/Los_Angeles sees May 27 (UTC−7 in PDT)', () => {
    expect(localDateInTz('America/Los_Angeles', utcLateEvening)).toBe('2026-05-27');
  });

  it('Europe/London sees May 28 (UTC+1 in BST)', () => {
    expect(localDateInTz('Europe/London', utcLateEvening)).toBe('2026-05-28');
  });

  it('Asia/Kolkata sees May 28 (UTC+5:30)', () => {
    expect(localDateInTz('Asia/Kolkata', utcLateEvening)).toBe('2026-05-28');
  });

  // 2026-05-28 00:25 UTC  →  May 27 in LA, May 28 in London and Kolkata
  const justPastMidnight = new Date('2026-05-28T00:25:00Z');

  it('America/Los_Angeles still sees May 27 at UTC 00:25', () => {
    expect(localDateInTz('America/Los_Angeles', justPastMidnight)).toBe('2026-05-27');
  });

  it('Asia/Kolkata sees May 28 at UTC 00:25', () => {
    expect(localDateInTz('Asia/Kolkata', justPastMidnight)).toBe('2026-05-28');
  });
});

// ── computeSunTimes ─────────────────────────────────────────────────

describe('computeSunTimes — sunrise/sunset differ by location', () => {
  const date = '2026-05-27';

  const mumbai  = computeSunTimes(date, 19.0760, 72.8777, 'Asia/Kolkata');
  const london  = computeSunTimes(date, 51.5074, -0.1278, 'Europe/London');
  const newYork = computeSunTimes(date, 40.7128, -74.0060, 'America/New_York');

  it('Mumbai sunrise is around 06:0x IST', () => {
    const [h] = mumbai.sunrise.split(':').map(Number);
    expect(h).toBe(6);
  });

  it('London sunrise is around 05:0x BST', () => {
    const [h] = london.sunrise.split(':').map(Number);
    expect(h).toBe(5);
  });

  it('New York sunrise is around 05:3x EDT', () => {
    const [h, m] = newYork.sunrise.split(':').map(Number);
    expect(h).toBe(5);
    expect(m).toBeGreaterThanOrEqual(30);
    expect(m).toBeLessThanOrEqual(40);
  });

  it('sunrise times differ between cities', () => {
    expect(mumbai.sunrise).not.toBe(london.sunrise);
    expect(london.sunrise).not.toBe(newYork.sunrise);
  });

  it('sunset times differ between cities', () => {
    expect(mumbai.sunset).not.toBe(london.sunset);
    expect(london.sunset).not.toBe(newYork.sunset);
  });

  it('sunriseUtc dates are valid Date objects', () => {
    expect(mumbai.sunriseUtc).toBeInstanceOf(Date);
    expect(london.sunriseUtc).toBeInstanceOf(Date);
    expect(newYork.sunriseUtc).toBeInstanceOf(Date);
  });

  it('sunrise comes before sunset in UTC', () => {
    expect(mumbai.sunriseUtc.getTime()).toBeLessThan(mumbai.sunsetUtc.getTime());
    expect(london.sunriseUtc.getTime()).toBeLessThan(london.sunsetUtc.getTime());
    expect(newYork.sunriseUtc.getTime()).toBeLessThan(newYork.sunsetUtc.getTime());
  });

  it('London has a longer day than Mumbai in late May (high latitude)', () => {
    const mumDayLen = mumbai.sunsetUtc.getTime() - mumbai.sunriseUtc.getTime();
    const lonDayLen = london.sunsetUtc.getTime() - london.sunriseUtc.getTime();
    expect(lonDayLen).toBeGreaterThan(mumDayLen);
  });
});

// ── Muhurta windows vary by location ────────────────────────────────

describe('Muhurta windows differ correctly by location', () => {
  const date = '2026-05-28'; // Thursday — Abhijit is active

  const mumbai  = computeSunTimes(date, 19.0760, 72.8777, 'Asia/Kolkata');
  const london  = computeSunTimes(date, 51.5074, -0.1278, 'Europe/London');

  function timeToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

  it('Rahu Kalam window differs between Mumbai and London', () => {
    // Thursday: Rahu Kalam pos = 6 (1-based)
    const RAHU_POS = 6;
    const mumSr = timeToMin(mumbai.sunrise);
    const mumSs = timeToMin(mumbai.sunset);
    const mumSlice = (mumSs - mumSr) / 8;
    const mumRahuStart = mumSr + mumSlice * (RAHU_POS - 1);

    const lonSr = timeToMin(london.sunrise);
    const lonSs = timeToMin(london.sunset);
    const lonSlice = (lonSs - lonSr) / 8;
    const lonRahuStart = lonSr + lonSlice * (RAHU_POS - 1);

    // The slice lengths should differ (Mumbai ~97 min, London ~119 min)
    expect(Math.abs(mumSlice - lonSlice)).toBeGreaterThan(10);
    // Rahu Kalam start minute-of-day should differ
    expect(mumRahuStart).not.toBe(lonRahuStart);
  });

  it('Abhijit Muhurta is centered on local solar noon and differs', () => {
    const mumSr = timeToMin(mumbai.sunrise);
    const mumSs = timeToMin(mumbai.sunset);
    const mumNoon = mumSr + (mumSs - mumSr) / 2;

    const lonSr = timeToMin(london.sunrise);
    const lonSs = timeToMin(london.sunset);
    const lonNoon = lonSr + (lonSs - lonSr) / 2;

    // Solar noon differs by location
    expect(mumNoon).not.toBe(lonNoon);
  });
});
