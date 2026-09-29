import { describe, expect, it } from 'vitest';
import { fuzzyScore, fuzzySearch } from './fuzzy';

describe('fuzzyScore', () => {
  it('ranks exact > prefix > word prefix > substring > subsequence', () => {
    const exact = fuzzyScore('troll', 'Troll') ?? 0;
    const prefix = fuzzyScore('troll', 'Troll hide') ?? 0;
    const word = fuzzyScore('hide', 'Troll hide') ?? 0;
    const sub = fuzzyScore('oll', 'Troll') ?? 0;
    const subseq = fuzzyScore('tl', 'Troll') ?? 0;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(0);
  });

  it('ignores case and accents; rejects non-matches', () => {
    expect(fuzzyScore('morkhalla', 'Mörkhalla')).toBe(1000);
    expect(fuzzyScore('xyz', 'Troll')).toBeNull();
    expect(fuzzyScore('', 'Troll')).toBeNull();
  });
});

describe('fuzzySearch', () => {
  it('sorts by score, then rank, then shorter names', () => {
    const items = [
      { id: 'a', name: 'Black Forest', rank: 0 },
      { id: 'b', name: 'Blackberries', rank: 3 },
      { id: 'c', name: 'Black metal', rank: 3 },
      { id: 'd', name: 'Swamp', keywords: 'black water', rank: 0 },
    ];
    expect(fuzzySearch('black', items).map((i) => i.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(fuzzySearch('zzz', items)).toEqual([]);
  });
});
