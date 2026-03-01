# Siri Schedule Alarm System

Omi reviews the day's schedule with mom each morning, then sets **spoken Siri alarms** that tell her exactly what she's supposed to do — not just ring a bell.

```
Omi (morning review)
       │
       ▼
 Schedule API  ←──── CLI / manual edits
       │
       ▼
 iOS Shortcut "Set Mom's Schedule"
       │
       ▼
 Reminders in "Mom's Schedule" list
       │
       ▼
 Siri speaks aloud via HomePod / AirPods:
 "Time to start going to Chair Yoga!"
```

---

## How it works

1. **Omi reviews the schedule** with mom each morning.
2. Omi calls `POST /omi/schedule` with the day's events (or a caregiver enters them via the CLI).
3. Omi (or mom) says **"Hey Siri, set Mom's schedule"** to trigger the iOS Shortcut.
4. The Shortcut fetches today's events, clears old reminders, and creates new Reminders with exact times.
5. At each scheduled time, **Siri announces the reminder aloud** through a HomePod or AirPods.

---

## Quick start

### 1. Start the API

```bash
cd siri-schedule/api
npm install
npm start
# → Listening on http://localhost:3000
```

For production, deploy this to any Node.js host (Render, Railway, Fly.io) and note the HTTPS URL.

### 2. Set today's schedule

**Via CLI:**
```bash
# Add individual events
node siri-schedule/scripts/schedule.js set 2026-03-01 11:30 "Chair Yoga"
node siri-schedule/scripts/schedule.js set 2026-03-01 13:30 "Zumba"

# Load the built-in example (Chair Yoga 11:30, Zumba 1:30)
node siri-schedule/scripts/schedule.js example

# View the schedule
node siri-schedule/scripts/schedule.js show
```

**Via Omi webhook (automatic):**
```bash
curl -X POST http://localhost:3000/omi/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      { "time": "11:30", "label": "Chair Yoga" },
      { "time": "13:30", "label": "Zumba" }
    ]
  }'
```

### 3. Set up the iOS Shortcut

See [`shortcut-guide/SetMomSchedule.md`](./shortcut-guide/SetMomSchedule.md) for a complete
step-by-step walkthrough.

Trigger it with: **"Hey Siri, set Mom's schedule."**

### 4. Enable spoken alarms

*Settings → Notifications → Announce Notifications → On*

Select the speaker (HomePod in mom's room is ideal). From then on, every reminder fires as:

> "Hey [name], reminder: **Time to start going to Chair Yoga!**"

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/schedule/today` | Today's schedule |
| `GET` | `/schedule/:date` | Schedule for any date (YYYY-MM-DD) |
| `POST` | `/schedule/:date` | Replace schedule for a date |
| `DELETE` | `/schedule/:date` | Clear a date's schedule |
| `POST` | `/omi/schedule` | Omi webhook — set today's schedule |

### Event object

```json
{
  "time": "11:30",
  "label": "Chair Yoga",
  "reminderText": "Time to start going to Chair Yoga!"
}
```

- `time` — 24-hour `HH:MM`, e.g. `"13:30"` for 1:30 PM
- `label` — short name shown in Reminders
- `reminderText` — what Siri speaks aloud (auto-generated from `label` if omitted)

### POST /omi/schedule body

```json
{
  "date": "2026-03-01",
  "events": [
    { "time": "11:30", "label": "Chair Yoga" },
    { "time": "13:30", "label": "Zumba" }
  ]
}
```

`date` is optional — defaults to today.

---

## Customizing what Siri says

Set `reminderText` to anything you want Siri to speak:

```json
{ "time": "11:00", "label": "Chair Yoga", "reminderText": "Mom, Chair Yoga is in 30 minutes. Time to get ready!" }
```

You can use lead-time reminders by setting `time` 20–30 minutes before the activity starts.

---

## Recommended hardware

| Device | Role |
|--------|------|
| HomePod mini (mom's room) | Speaks alarms aloud, always on |
| iPhone / iPad (mom's) | Runs Shortcuts, shows Reminders |
| Any server / Mac | Runs the Schedule API |

---

## File structure

```
siri-schedule/
├── api/
│   ├── server.js        ← Express API + Omi webhook
│   ├── package.json
│   └── schedules.json   ← Persisted schedule data
├── shortcut-guide/
│   └── SetMomSchedule.md  ← Step-by-step iOS Shortcut guide
├── scripts/
│   └── schedule.js      ← CLI helper for managing schedules
└── README.md            ← This file
```
