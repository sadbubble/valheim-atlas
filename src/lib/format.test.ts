import { describe, expect, it } from 'vitest';
import { formatCoords, formatDistance, humanizeKey } from './format';

describe('format', () => {
  it('formats distances and coordinates', () => {
    expect(formatDistance(849.6)).toBe('850 m');
    expect(formatDistance(1234)).toBe('1.23 km');
    expect(formatDistance(12345)).toBe('12.3 km');
    expect(formatCoords(12.4, -99.6)).toBe('X 12 · Z -100');
  });
  it('humanizes field keys', () => {
    expect(humanizeKey('maxDistM')).toBe('Max dist (m)');
    expect(humanizeKey('vegvisirChance')).toBe('Vegvisir chance');
    expect(humanizeKey('stackSize')).toBe('Stack size');
  });
});
