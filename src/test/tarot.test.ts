import { describe, it, expect } from 'vitest';
import { DECK, drawCards } from '@/lib/tarot';

describe('tarot', () => {
  it('has a full 78-card deck with unique ids', () => {
    expect(DECK).toHaveLength(78);
    expect(DECK.filter((c) => c.arcana === 'major')).toHaveLength(22);
    expect(DECK.filter((c) => c.arcana === 'minor')).toHaveLength(56);
    expect(new Set(DECK.map((c) => c.id)).size).toBe(78);
  });

  it('every card has bilingual upright + reversed meanings', () => {
    for (const c of DECK) {
      expect(c.uprightEn.length).toBeGreaterThan(0);
      expect(c.uprightHi.length).toBeGreaterThan(0);
      expect(c.reversedEn.length).toBeGreaterThan(0);
      expect(c.reversedHi.length).toBeGreaterThan(0);
    }
  });

  it('draws are deterministic per seed and distinct within a draw', () => {
    const a = drawCards('spread-2026-06-09-career', 3);
    const b = drawCards('spread-2026-06-09-career', 3);
    expect(a.map((d) => d.card.id)).toEqual(b.map((d) => d.card.id));
    expect(new Set(a.map((d) => d.card.id)).size).toBe(3); // no repeats
  });

  it('different seeds generally yield different draws', () => {
    const a = drawCards('daily-2026-06-09', 1)[0];
    const b = drawCards('daily-2026-06-10', 1)[0];
    // Not a hard guarantee, but these two specific seeds differ.
    expect(a.card.id !== b.card.id || a.reversed !== b.reversed).toBe(true);
  });
});
