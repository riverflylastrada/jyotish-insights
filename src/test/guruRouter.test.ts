import { describe, it, expect } from 'vitest';
import { GURU_FOR_TOPIC, guruForTopic, focusedQuestion, type GuruTopic } from '@/lib/guru/guruRouter';
import { GURU_BY_KEY } from '@/lib/guru/guruRoster';

describe('guruRouter', () => {
  it('routes each topic to its domain-expert guru', () => {
    expect(guruForTopic('dasha')).toBe('rao');
    expect(guruForTopic('transit')).toBe('varahamihira');
    expect(guruForTopic('kp')).toBe('krishnamurti');
    expect(guruForTopic('jaimini')).toBe('jaimini');
    expect(guruForTopic('yoga')).toBe('mantreshwara');
    expect(guruForTopic('dosha')).toBe('parashara');
    expect(guruForTopic('house')).toBe('parashara');
    expect(guruForTopic('varga')).toBe('parashara');
    expect(guruForTopic('planet')).toBe('parashara');
    expect(guruForTopic('general')).toBe('parashara');
  });

  it('every routed guru exists in the roster', () => {
    for (const key of Object.values(GURU_FOR_TOPIC)) {
      expect(GURU_BY_KEY[key]).toBeDefined();
    }
  });

  it('focusedQuestion names the subject and stays scoped (no full-chart sprawl)', () => {
    const topics: GuruTopic[] = ['dasha', 'transit', 'kp', 'jaimini', 'yoga', 'dosha', 'house', 'varga', 'planet', 'general'];
    for (const t of topics) {
      const q = focusedQuestion(t, 'Jupiter');
      expect(q).toContain('Jupiter');
      expect(q.toLowerCase()).toMatch(/focus|2–3 short paragraphs/);
    }
  });
});
