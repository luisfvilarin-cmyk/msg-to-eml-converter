import { listEntries, getTagCloud } from './wiki.js';

export function getLast30DaysEntries() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const entries = listEntries();
  return entries
    .filter(e => new Date(e.createdAt) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getLast30DaysSummary() {
  const entries = getLast30DaysEntries();
  const byWeek = { week1: [], week2: [], week3: [], week4plus: [] };
  const now = new Date();

  entries.forEach(entry => {
    const age = now.getTime() - new Date(entry.createdAt).getTime();
    const days = age / (24 * 60 * 60 * 1000);
    if (days <= 7) byWeek.week1.push(entry);
    else if (days <= 14) byWeek.week2.push(entry);
    else if (days <= 21) byWeek.week3.push(entry);
    else byWeek.week4plus.push(entry);
  });

  const tagCounts = {};
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const sourceCounts = {};
  entries.forEach(entry => {
    sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;
  });

  return {
    totalEntries: entries.length,
    byWeek: {
      thisWeek: byWeek.week1.length,
      lastWeek: byWeek.week2.length,
      twoWeeksAgo: byWeek.week3.length,
      threeWeeksAgo: byWeek.week4plus.length,
    },
    topTags,
    sources: sourceCounts,
    entries: entries.map(e => ({
      id: e.id,
      title: e.title,
      tags: e.tags,
      source: e.source,
      createdAt: e.createdAt,
    })),
  };
}

export function formatLast30DaysReport() {
  const summary = getLast30DaysSummary();
  const lines = [];

  lines.push('=== ClaudeVil: Last 30 Days ===');
  lines.push(`Total entries: ${summary.totalEntries}`);
  lines.push('');
  lines.push('Activity by week:');
  lines.push(`  This week:       ${summary.byWeek.thisWeek}`);
  lines.push(`  Last week:       ${summary.byWeek.lastWeek}`);
  lines.push(`  2 weeks ago:     ${summary.byWeek.twoWeeksAgo}`);
  lines.push(`  3+ weeks ago:    ${summary.byWeek.threeWeeksAgo}`);
  lines.push('');

  if (summary.topTags.length > 0) {
    lines.push('Top tags:');
    summary.topTags.forEach(({ tag, count }) => {
      lines.push(`  #${tag} (${count})`);
    });
    lines.push('');
  }

  if (Object.keys(summary.sources).length > 0) {
    lines.push('Sources:');
    Object.entries(summary.sources).forEach(([source, count]) => {
      lines.push(`  ${source}: ${count}`);
    });
    lines.push('');
  }

  if (summary.entries.length > 0) {
    lines.push('Recent entries:');
    summary.entries.slice(0, 20).forEach(e => {
      const date = e.createdAt.split('T')[0];
      const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
      lines.push(`  ${date} | ${e.title}${tags}`);
    });
  }

  return lines.join('\n');
}
