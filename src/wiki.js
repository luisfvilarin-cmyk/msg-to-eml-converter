import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'wiki');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

export function createEntry({ title, content, tags = [], source = 'manual', metadata = {} }) {
  ensureDataDir();
  const id = generateId();
  const now = new Date().toISOString();
  const entry = {
    id,
    title,
    content,
    tags,
    source,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  return entry;
}

export function getEntry(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function updateEntry(id, updates) {
  const entry = getEntry(id);
  if (!entry) return null;
  const updated = {
    ...entry,
    ...updates,
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export function deleteEntry(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function listEntries() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')));
}

export function search(query, options = {}) {
  const entries = listEntries();
  const q = query.toLowerCase();
  const { from, to, tags } = options;

  return entries.filter(entry => {
    const matchesQuery =
      entry.title.toLowerCase().includes(q) ||
      entry.content.toLowerCase().includes(q) ||
      entry.tags.some(t => t.toLowerCase().includes(q));

    const matchesDateFrom = from ? new Date(entry.createdAt) >= new Date(from) : true;
    const matchesDateTo = to ? new Date(entry.createdAt) <= new Date(to) : true;
    const matchesTags = tags && tags.length > 0
      ? tags.some(t => entry.tags.map(et => et.toLowerCase()).includes(t.toLowerCase()))
      : true;

    return matchesQuery && matchesDateFrom && matchesDateTo && matchesTags;
  });
}

export function getEntriesByDateRange(from, to) {
  const entries = listEntries();
  return entries.filter(entry => {
    const created = new Date(entry.createdAt);
    return created >= new Date(from) && created <= new Date(to);
  });
}

export function getTagCloud() {
  const entries = listEntries();
  const tagCounts = {};
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTimeline() {
  const entries = listEntries();
  const byDate = {};
  entries.forEach(entry => {
    const date = entry.createdAt.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ id: entry.id, title: entry.title, tags: entry.tags });
  });
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, count: items.length, entries: items }));
}

export function getStats() {
  const entries = listEntries();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = entries.filter(e => new Date(e.createdAt) >= thirtyDaysAgo);
  const sources = {};
  entries.forEach(e => { sources[e.source] = (sources[e.source] || 0) + 1; });

  return {
    totalEntries: entries.length,
    recentEntries: recent.length,
    totalTags: new Set(entries.flatMap(e => e.tags)).size,
    sources,
    oldestEntry: entries.length > 0
      ? entries.reduce((a, b) => new Date(a.createdAt) < new Date(b.createdAt) ? a : b).createdAt
      : null,
    newestEntry: entries.length > 0
      ? entries.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b).createdAt
      : null,
  };
}
