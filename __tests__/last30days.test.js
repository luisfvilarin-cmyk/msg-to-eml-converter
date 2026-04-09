import fs from 'fs';
import path from 'path';
import { createEntry, listEntries } from '../src/wiki.js';
import { getLast30DaysEntries, getLast30DaysSummary, formatLast30DaysReport } from '../src/last30days.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data', 'wiki');

function cleanTestData() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    const files = fs.readdirSync(TEST_DATA_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(TEST_DATA_DIR, f)));
  }
}

describe('Last 30 Days', () => {
  beforeEach(() => cleanTestData());
  afterAll(() => cleanTestData());

  test('getLast30DaysEntries returns recent entries', () => {
    createEntry({ title: 'Recent', content: 'Today stuff' });
    const entries = getLast30DaysEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].title).toBe('Recent');
  });

  test('getLast30DaysEntries is sorted newest first', () => {
    createEntry({ title: 'First', content: 'a' });
    createEntry({ title: 'Second', content: 'b' });
    const entries = getLast30DaysEntries();
    expect(entries.length).toBe(2);
    expect(new Date(entries[0].createdAt).getTime())
      .toBeGreaterThanOrEqual(new Date(entries[1].createdAt).getTime());
  });

  test('getLast30DaysSummary has correct structure', () => {
    createEntry({ title: 'A', content: 'x', tags: ['ai'], source: 'manual' });
    createEntry({ title: 'B', content: 'y', tags: ['ai', 'ml'], source: 'download' });
    const summary = getLast30DaysSummary();
    expect(summary.totalEntries).toBe(2);
    expect(summary.byWeek).toBeDefined();
    expect(summary.byWeek.thisWeek).toBe(2);
    expect(summary.topTags.length).toBeGreaterThan(0);
    expect(summary.sources.manual).toBe(1);
    expect(summary.sources.download).toBe(1);
    expect(summary.entries.length).toBe(2);
  });

  test('formatLast30DaysReport produces readable output', () => {
    createEntry({ title: 'Test Entry', content: 'Content here', tags: ['test'] });
    const report = formatLast30DaysReport();
    expect(report).toContain('ClaudeVil: Last 30 Days');
    expect(report).toContain('Total entries: 1');
    expect(report).toContain('#test');
    expect(report).toContain('Test Entry');
  });

  test('formatLast30DaysReport handles empty wiki', () => {
    const report = formatLast30DaysReport();
    expect(report).toContain('Total entries: 0');
  });
});
