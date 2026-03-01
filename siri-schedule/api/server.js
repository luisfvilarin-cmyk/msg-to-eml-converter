const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const SCHEDULES_FILE = path.join(__dirname, 'schedules.json');

// ── Persistence helpers ────────────────────────────────────────────────────

function loadSchedules() {
  if (!fs.existsSync(SCHEDULES_FILE)) return {};
  return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
}

function saveSchedules(schedules) {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

// Return today's date as YYYY-MM-DD in local time
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /schedule/today
// Returns: { date, events: [{ time, label, reminderText }] }
app.get('/schedule/today', (req, res) => {
  const date = todayKey();
  const schedules = loadSchedules();
  res.json({ date, events: schedules[date] || [] });
});

// GET /schedule/:date  (date = YYYY-MM-DD)
app.get('/schedule/:date', (req, res) => {
  const { date } = req.params;
  const schedules = loadSchedules();
  res.json({ date, events: schedules[date] || [] });
});

// POST /schedule/:date
// Body: { events: [{ time, label, reminderText }] }
// • time        – "HH:MM" in 24-hour format, e.g. "11:30"
// • label       – short activity name, e.g. "Chair Yoga"
// • reminderText – what Siri will speak, e.g. "Time to start going to Chair Yoga!"
app.post('/schedule/:date', (req, res) => {
  const { date } = req.params;
  const { events } = req.body;

  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'events must be an array' });
  }

  for (const ev of events) {
    if (!ev.time || !ev.label) {
      return res.status(400).json({ error: 'Each event needs at least time and label' });
    }
    // Auto-fill reminderText if the caller omitted it
    if (!ev.reminderText) {
      ev.reminderText = `Time to start going to ${ev.label}!`;
    }
  }

  const schedules = loadSchedules();
  schedules[date] = events;
  saveSchedules(schedules);

  res.json({ success: true, date, events });
});

// DELETE /schedule/:date  – clear a day's schedule
app.delete('/schedule/:date', (req, res) => {
  const { date } = req.params;
  const schedules = loadSchedules();
  delete schedules[date];
  saveSchedules(schedules);
  res.json({ success: true });
});

// ── Omi webhook ────────────────────────────────────────────────────────────
// POST /omi/schedule
// Omi posts extracted events after the morning schedule review.
// Body: { date?: "YYYY-MM-DD", events: [{ time, label }] }
app.post('/omi/schedule', (req, res) => {
  const { events, date: requestedDate } = req.body;
  const date = requestedDate || todayKey();

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array is required and must not be empty' });
  }

  const normalized = events.map((ev) => ({
    time: ev.time,
    label: ev.label,
    reminderText: ev.reminderText || `Time to start going to ${ev.label}!`,
  }));

  const schedules = loadSchedules();
  schedules[date] = normalized;
  saveSchedules(schedules);

  console.log(`[omi] Schedule set for ${date}:`, normalized);
  res.json({ success: true, date, events: normalized });
});

// ── Start ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Siri Schedule API running on http://localhost:${PORT}`);
});
