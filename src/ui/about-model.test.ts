import { describe, expect, it } from 'vitest';
import { collectTodo, DATA_FILE_NAMES } from '../data/validate';
import { loadContentFromDisk, readDataFile } from '../test/load-data-from-disk';
import { citationSummary, unverifiedSummary } from './about-model';

describe('About view model', () => {
  const data = loadContentFromDisk();

  it('counts the same unverified values as docs/DATA_TODO.md', () => {
    const raw = Object.fromEntries(DATA_FILE_NAMES.map((n) => [n, readDataFile(n)]));
    const summary = unverifiedSummary(data);
    expect(summary.total).toBe(collectTodo(raw).length);
    expect(summary.byFile.reduce((n, f) => n + f.count, 0)).toBe(summary.total);
  });

  it('summarises cited pages by site', () => {
    const c = citationSummary(data);
    expect(c.urls).toBeGreaterThan(0);
    expect(c.sites.length).toBeGreaterThan(0);
    expect(c.sites).toEqual([...c.sites].sort());
    expect(c.sites.every((s) => !s.startsWith('www.'))).toBe(true);
  });
});
