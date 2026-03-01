#!/usr/bin/env node
/**
 * CLI helper for managing Mom's daily schedule.
 *
 * Usage:
 *   node scripts/schedule.js show [date]
 *   node scripts/schedule.js set <date> <time> "<label>" ["<reminderText>"]
 *   node scripts/schedule.js clear <date>
 *   node scripts/schedule.js example <date>
 *
 * date defaults to today (YYYY-MM-DD) when omitted.
 * API_URL env var overrides the default http://localhost:3000
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');

// ── HTTP helper ────────────────────────────────────────────────────────────

function request(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;

    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Date helper ────────────────────────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Commands ───────────────────────────────────────────────────────────────

async function show(date) {
  const { body } = await request('GET', `${BASE_URL}/schedule/${date}`);
  if (!body.events || body.events.length === 0) {
    console.log(`No events scheduled for ${date}.`);
    return;
  }
  console.log(`\nSchedule for ${date}:`);
  for (const ev of body.events) {
    console.log(`  ${ev.time}  ${ev.label}`);
    console.log(`         → Siri will say: "${ev.reminderText}"`);
  }
  console.log();
}

async function addEvent(date, time, label, reminderText) {
  // Fetch existing events so we append rather than replace
  const { body: existing } = await request('GET', `${BASE_URL}/schedule/${date}`);
  const events = existing.events || [];

  events.push({ time, label, reminderText: reminderText || undefined });

  // Sort by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  const { status, body } = await request('POST', `${BASE_URL}/schedule/${date}`, { events });
  if (status !== 200) {
    console.error('Error:', body);
    process.exit(1);
  }
  console.log(`Added "${label}" at ${time} on ${date}.`);
  await show(date);
}

async function clearDate(date) {
  const { status } = await request('DELETE', `${BASE_URL}/schedule/${date}`);
  if (status === 200) {
    console.log(`Schedule cleared for ${date}.`);
  } else {
    console.error('Error clearing schedule.');
    process.exit(1);
  }
}

async function loadExample(date) {
  const events = [
    { time: '11:30', label: 'Chair Yoga', reminderText: 'Time to start going to Chair Yoga!' },
    { time: '13:30', label: 'Zumba', reminderText: 'Time to start going to Zumba!' },
  ];
  const { status, body } = await request('POST', `${BASE_URL}/schedule/${date}`, { events });
  if (status !== 200) {
    console.error('Error:', body);
    process.exit(1);
  }
  console.log(`Example schedule loaded for ${date}.`);
  await show(date);
}

function printHelp() {
  console.log(`
Usage:
  node scripts/schedule.js show [date]
  node scripts/schedule.js set <date> <time> "<label>" ["<reminderText>"]
  node scripts/schedule.js clear <date>
  node scripts/schedule.js example [date]

Arguments:
  date          YYYY-MM-DD (defaults to today)
  time          HH:MM in 24-hour format, e.g. 11:30
  label         Activity name, e.g. "Chair Yoga"
  reminderText  What Siri will speak (optional, auto-generated if omitted)

Environment:
  API_URL       Base URL of the schedule API (default: http://localhost:3000)

Examples:
  node scripts/schedule.js show
  node scripts/schedule.js set 2026-03-02 11:30 "Chair Yoga"
  node scripts/schedule.js set 2026-03-02 13:30 "Zumba" "Mom, Zumba starts in 30 minutes!"
  node scripts/schedule.js example
  node scripts/schedule.js clear 2026-03-02
`);
}

// ── Entry point ────────────────────────────────────────────────────────────

(async () => {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case 'show':
      await show(args[0] || todayKey());
      break;

    case 'set': {
      const [date, time, label, reminderText] = args;
      if (!date || !time || !label) {
        console.error('Usage: schedule.js set <date> <time> "<label>" ["<reminderText>"]');
        process.exit(1);
      }
      await addEvent(date, time, label, reminderText);
      break;
    }

    case 'clear':
      await clearDate(args[0] || todayKey());
      break;

    case 'example':
      await loadExample(args[0] || todayKey());
      break;

    default:
      printHelp();
  }
})();
