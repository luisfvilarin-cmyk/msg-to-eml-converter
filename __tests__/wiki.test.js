import fs from 'fs';
import path from 'path';
import { createEntry, getEntry, updateEntry, deleteEntry, listEntries, search, getEntriesByDateRange, getTagCloud, getTimeline, getStats } from '../src/wiki.js';

// Use a temp directory for tests
const TEST_DATA_DIR = path.resolve(process.cwd(), 'data', 'wiki');

function cleanTestData() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    const files = fs.readdirSync(TEST_DATA_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(TEST_DATA_DIR, f)));
  }
}

describe('Wiki Store', () => {
  beforeEach(() => cleanTestData());
  afterAll(() => cleanTestData());

  test('createEntry creates a valid entry', () => {
    const entry = createEntry({ title: 'Test Entry', content: 'Some content', tags: ['test'] });
    expect(entry.id).toBeDefined();
    expect(entry.title).toBe('Test Entry');
    expect(entry.content).toBe('Some content');
    expect(entry.tags).toEqual(['test']);
    expect(entry.source).toBe('manual');
    expect(entry.createdAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
  });

  test('getEntry retrieves an existing entry', () => {
    const created = createEntry({ title: 'Fetch Me', content: 'Hello' });
    const fetched = getEntry(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched.title).toBe('Fetch Me');
  });

  test('getEntry returns null for missing entry', () => {
    expect(getEntry('nonexistent')).toBeNull();
  });

  test('updateEntry modifies an entry', () => {
    const entry = createEntry({ title: 'Original', content: 'v1' });
    const updated = updateEntry(entry.id, { title: 'Updated', content: 'v2' });
    expect(updated.title).toBe('Updated');
    expect(updated.content).toBe('v2');
    expect(updated.createdAt).toBe(entry.createdAt);
    expect(updated.updatedAt).toBeDefined();
    expect(updated.id).toBe(entry.id);
  });

  test('updateEntry returns null for missing entry', () => {
    expect(updateEntry('nonexistent', { title: 'x' })).toBeNull();
  });

  test('deleteEntry removes an entry', () => {
    const entry = createEntry({ title: 'Delete Me', content: 'bye' });
    expect(deleteEntry(entry.id)).toBe(true);
    expect(getEntry(entry.id)).toBeNull();
  });

  test('deleteEntry returns false for missing entry', () => {
    expect(deleteEntry('nonexistent')).toBe(false);
  });

  test('listEntries returns all entries', () => {
    createEntry({ title: 'A', content: '1' });
    createEntry({ title: 'B', content: '2' });
    createEntry({ title: 'C', content: '3' });
    expect(listEntries().length).toBe(3);
  });

  test('search finds entries by title', () => {
    createEntry({ title: 'Machine Learning Basics', content: 'Neural networks' });
    createEntry({ title: 'Cooking Recipes', content: 'Pasta' });
    const results = search('machine');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Machine Learning Basics');
  });

  test('search finds entries by content', () => {
    createEntry({ title: 'A', content: 'The quick brown fox' });
    createEntry({ title: 'B', content: 'Lazy dog' });
    const results = search('fox');
    expect(results.length).toBe(1);
  });

  test('search finds entries by tags', () => {
    createEntry({ title: 'Tagged', content: 'x', tags: ['javascript', 'web'] });
    createEntry({ title: 'Other', content: 'y', tags: ['python'] });
    const results = search('javascript');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Tagged');
  });

  test('search filters by date range', () => {
    const entry = createEntry({ title: 'Today', content: 'now' });
    const results = search('today', { from: new Date(Date.now() - 60000).toISOString() });
    expect(results.length).toBe(1);
    const resultsOld = search('today', { to: '2020-01-01' });
    expect(resultsOld.length).toBe(0);
  });

  test('search filters by tags option', () => {
    createEntry({ title: 'A', content: 'content', tags: ['ai'] });
    createEntry({ title: 'B', content: 'content', tags: ['cooking'] });
    const results = search('content', { tags: ['ai'] });
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('A');
  });

  test('getTagCloud returns tag counts', () => {
    createEntry({ title: 'A', content: 'x', tags: ['ai', 'ml'] });
    createEntry({ title: 'B', content: 'y', tags: ['ai', 'web'] });
    createEntry({ title: 'C', content: 'z', tags: ['web'] });
    const cloud = getTagCloud();
    expect(cloud[0].tag).toBe('ai');
    expect(cloud[0].count).toBe(2);
    expect(cloud[1].tag).toBe('web');
    expect(cloud[1].count).toBe(2);
  });

  test('getTimeline groups entries by date', () => {
    createEntry({ title: 'A', content: 'x' });
    createEntry({ title: 'B', content: 'y' });
    const timeline = getTimeline();
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].count).toBeGreaterThanOrEqual(1);
  });

  test('getStats returns valid statistics', () => {
    createEntry({ title: 'A', content: 'x', tags: ['a'] });
    createEntry({ title: 'B', content: 'y', tags: ['b'], source: 'download' });
    const stats = getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalTags).toBe(2);
    expect(stats.sources.manual).toBe(1);
    expect(stats.sources.download).toBe(1);
  });

  test('getEntriesByDateRange filters correctly', () => {
    createEntry({ title: 'A', content: 'x' });
    const now = new Date();
    const results = getEntriesByDateRange(
      new Date(now.getTime() - 60000).toISOString(),
      new Date(now.getTime() + 60000).toISOString()
    );
    expect(results.length).toBe(1);
  });
});
