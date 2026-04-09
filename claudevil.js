#!/usr/bin/env node

import { createEntry, getEntry, listEntries, search, deleteEntry, getTagCloud, getStats } from './src/wiki.js';
import { formatLast30DaysReport } from './src/last30days.js';
import { ingestScreenshot, ingestDownload, ingestText, ingestUrl } from './src/ingest.js';
import { formatAssumptionReport } from './src/assumptionChecker.js';
import fs from 'fs';

const args = process.argv.slice(2);
const command = args[0];

const commands = {
  help: showHelp,
  add: addEntry,
  list: listAll,
  search: searchEntries,
  get: getOne,
  delete: deleteOne,
  tags: showTags,
  stats: showStats,
  last30days: last30days,
  wiki: wikiSkill,
  question: questionAssumptions,
  cron: runCron,
};

function showHelp() {
  console.log(`
ClaudeVil - Personal Knowledge Management System
================================================

Inspired by Andrej Karpathy's LLM-Wiki concept.

Commands:
  help                          Show this help
  add <title> <content> [tags]  Add a wiki entry
  list                          List all entries
  search <query>                Search entries (supports --from, --to, --tags)
  get <id>                      Get a specific entry
  delete <id>                   Delete an entry
  tags                          Show tag cloud
  stats                         Show knowledge base stats
  last30days                    Show last 30 days activity report
  wiki --screenshot <file>      Ingest a screenshot into the wiki
  wiki --download <file>        Ingest a downloaded file into the wiki
  wiki --text <text>            Add text directly
  wiki --url <url> <content>    Add content from a URL
  question <text|file>          Run "question your assumptions" against the wiki
  cron                          Run the assumption-questioning cron job

Options:
  --from <date>                 Filter from date (YYYY-MM-DD)
  --to <date>                   Filter to date (YYYY-MM-DD)
  --tags <tag1,tag2>            Filter by tags
  --title <title>               Set title for wiki ingestion
  --tags <tag1,tag2>            Set tags for wiki ingestion

Visualization:
  Open visualization/index.html in a browser to explore your knowledge base
  interactively with search, date ranges, and timeline comparison.
`);
}

function getFlag(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function addEntry() {
  const title = args[1];
  const content = args[2] || '';
  const tags = getFlag('--tags')?.split(',').map(t => t.trim()) || [];
  if (!title) { console.error('Usage: claudevil add <title> [content] [--tags tag1,tag2]'); process.exit(1); }
  const entry = createEntry({ title, content, tags });
  console.log(`Created entry: ${entry.id}`);
  console.log(`  Title: ${entry.title}`);
  console.log(`  Tags: ${entry.tags.join(', ') || '(none)'}`);
}

function listAll() {
  const entries = listEntries();
  if (entries.length === 0) { console.log('No entries yet. Use "claudevil add" to create one.'); return; }
  entries
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(e => {
      const date = e.createdAt.split('T')[0];
      const tags = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
      console.log(`  ${e.id}  ${date}  ${e.title}${tags}`);
    });
  console.log(`\n${entries.length} entries total.`);
}

function searchEntries() {
  const query = args[1];
  if (!query) { console.error('Usage: claudevil search <query> [--from date] [--to date] [--tags t1,t2]'); process.exit(1); }
  const from = getFlag('--from');
  const to = getFlag('--to');
  const tags = getFlag('--tags')?.split(',').map(t => t.trim());
  const results = search(query, { from, to, tags });
  if (results.length === 0) { console.log('No results found.'); return; }
  results.forEach(e => {
    const date = e.createdAt.split('T')[0];
    console.log(`  ${e.id}  ${date}  ${e.title}`);
  });
  console.log(`\n${results.length} results.`);
}

function getOne() {
  const id = args[1];
  if (!id) { console.error('Usage: claudevil get <id>'); process.exit(1); }
  const entry = getEntry(id);
  if (!entry) { console.error(`Entry not found: ${id}`); process.exit(1); }
  console.log(`Title: ${entry.title}`);
  console.log(`ID: ${entry.id}`);
  console.log(`Created: ${entry.createdAt}`);
  console.log(`Updated: ${entry.updatedAt}`);
  console.log(`Tags: ${entry.tags.join(', ') || '(none)'}`);
  console.log(`Source: ${entry.source}`);
  console.log(`\n${entry.content}`);
}

function deleteOne() {
  const id = args[1];
  if (!id) { console.error('Usage: claudevil delete <id>'); process.exit(1); }
  if (deleteEntry(id)) console.log(`Deleted: ${id}`);
  else console.error(`Entry not found: ${id}`);
}

function showTags() {
  const cloud = getTagCloud();
  if (cloud.length === 0) { console.log('No tags yet.'); return; }
  cloud.forEach(({ tag, count }) => console.log(`  #${tag} (${count})`));
}

function showStats() {
  const s = getStats();
  console.log('=== ClaudeVil Stats ===');
  console.log(`Total entries:  ${s.totalEntries}`);
  console.log(`Last 30 days:   ${s.recentEntries}`);
  console.log(`Unique tags:    ${s.totalTags}`);
  console.log(`Oldest entry:   ${s.oldestEntry || 'N/A'}`);
  console.log(`Newest entry:   ${s.newestEntry || 'N/A'}`);
  if (Object.keys(s.sources).length > 0) {
    console.log('\nSources:');
    Object.entries(s.sources).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  }
}

function last30days() {
  console.log(formatLast30DaysReport());
}

function wikiSkill() {
  const title = getFlag('--title');
  const tags = getFlag('--tags')?.split(',').map(t => t.trim()) || [];

  if (hasFlag('--screenshot')) {
    const file = getFlag('--screenshot');
    if (!file) { console.error('Usage: claudevil wiki --screenshot <file> [--title <title>] [--tags t1,t2]'); process.exit(1); }
    const entry = ingestScreenshot(file, { title, tags });
    console.log(`Ingested screenshot: ${entry.id} - ${entry.title}`);
  } else if (hasFlag('--download')) {
    const file = getFlag('--download');
    if (!file) { console.error('Usage: claudevil wiki --download <file> [--title <title>] [--tags t1,t2]'); process.exit(1); }
    const entry = ingestDownload(file, { title, tags });
    console.log(`Ingested download: ${entry.id} - ${entry.title}`);
  } else if (hasFlag('--text')) {
    const text = getFlag('--text');
    if (!text) { console.error('Usage: claudevil wiki --text <text> [--title <title>] [--tags t1,t2]'); process.exit(1); }
    const entry = ingestText(text, { title: title || 'Quick Note', tags });
    console.log(`Added text entry: ${entry.id} - ${entry.title}`);
  } else if (hasFlag('--url')) {
    const url = getFlag('--url');
    const content = args[args.indexOf('--url') + 2] || '';
    if (!url) { console.error('Usage: claudevil wiki --url <url> <content> [--title <title>] [--tags t1,t2]'); process.exit(1); }
    const entry = ingestUrl(url, content, { title, tags });
    console.log(`Added URL entry: ${entry.id} - ${entry.title}`);
  } else {
    console.error('Usage: claudevil wiki --screenshot|--download|--text|--url ...');
    process.exit(1);
  }
}

function questionAssumptions() {
  const input = args[1];
  if (!input) { console.error('Usage: claudevil question <text|filepath>'); process.exit(1); }

  let text;
  if (fs.existsSync(input)) {
    text = fs.readFileSync(input, 'utf-8');
  } else {
    text = args.slice(1).join(' ');
  }

  console.log(formatAssumptionReport(text));
}

function runCron() {
  console.log('=== ClaudeVil: Assumption Cron Job ===');
  console.log(`Running at: ${new Date().toISOString()}\n`);

  // Scan for recent text files in common locations
  const scanDirs = ['./data/ingested', './data/wiki'];
  const recentTexts = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = `${dir}/${file}`;
      const stat = fs.statSync(filePath);
      if (stat.mtime >= oneDayAgo) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.content) recentTexts.push(data.content);
        } catch { /* skip */ }
      }
    }
  }

  if (recentTexts.length === 0) {
    console.log('No recent content found to analyze.');
    return;
  }

  const combined = recentTexts.join('\n\n');
  console.log(`Analyzing ${recentTexts.length} recent entries...\n`);
  console.log(formatAssumptionReport(combined));
}

// Execute
const handler = commands[command];
if (!handler) {
  if (!command) showHelp();
  else { console.error(`Unknown command: ${command}. Run "claudevil help" for usage.`); process.exit(1); }
} else {
  handler();
}
