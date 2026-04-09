#!/usr/bin/env node

/**
 * ClaudeVil Cron Job: Question Your Assumptions
 *
 * Runs your recent writing and wiki entries through the assumption checker
 * to surface hidden beliefs, absolutes, and untested claims.
 *
 * Setup with crontab:
 *   # Run daily at 9am
 *   0 9 * * * node /path/to/claudevil/cron/questionAssumptions.js >> /path/to/claudevil/data/cron.log 2>&1
 *
 *   # Run every Monday at 8am
 *   0 8 * * 1 node /path/to/claudevil/cron/questionAssumptions.js >> /path/to/claudevil/data/cron.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Change to project root so wiki paths resolve correctly
process.chdir(rootDir);

const { listEntries } = await import('../src/wiki.js');
const { formatAssumptionReport } = await import('../src/assumptionChecker.js');

function run() {
  const separator = '='.repeat(60);
  console.log(separator);
  console.log(`ClaudeVil Assumption Cron - ${new Date().toISOString()}`);
  console.log(separator);
  console.log('');

  // Gather recent entries (last 7 days for the cron)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const entries = listEntries().filter(e => new Date(e.createdAt) >= sevenDaysAgo);

  if (entries.length === 0) {
    console.log('No entries from the past 7 days. Nothing to analyze.');
    return;
  }

  console.log(`Found ${entries.length} entries from the past 7 days.\n`);

  // Analyze each entry individually
  for (const entry of entries) {
    console.log(`--- Analyzing: "${entry.title}" (${entry.createdAt.split('T')[0]}) ---`);
    const report = formatAssumptionReport(entry.content);
    console.log(report);
    console.log('');
  }

  // Also analyze all recent content combined for cross-entry patterns
  const combined = entries.map(e => e.content).join('\n\n');
  console.log(`${separator}`);
  console.log('Combined analysis of all recent entries:');
  console.log(`${separator}\n`);
  console.log(formatAssumptionReport(combined));

  // Also scan for external text files in the ingested directory
  const ingestedDir = path.join(rootDir, 'data', 'ingested');
  if (fs.existsSync(ingestedDir)) {
    const recentFiles = fs.readdirSync(ingestedDir)
      .filter(f => {
        const stat = fs.statSync(path.join(ingestedDir, f));
        return stat.mtime >= sevenDaysAgo;
      });

    if (recentFiles.length > 0) {
      console.log(`\n${separator}`);
      console.log(`Found ${recentFiles.length} recently ingested files to scan.`);
      console.log(`${separator}\n`);

      for (const file of recentFiles) {
        const filePath = path.join(ingestedDir, file);
        const ext = path.extname(file).toLowerCase();
        const textExts = ['.txt', '.md', '.csv', '.json', '.html', '.eml', '.log'];
        if (textExts.includes(ext)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          console.log(`--- Ingested file: ${file} ---`);
          console.log(formatAssumptionReport(content));
          console.log('');
        }
      }
    }
  }

  console.log(`\n${separator}`);
  console.log('Cron job complete.');
  console.log(separator);
}

run();
