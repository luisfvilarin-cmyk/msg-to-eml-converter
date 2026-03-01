# iOS Shortcut: "Set Mom's Schedule"

This shortcut runs each morning (manually, by Omi, or on a timer).
It pulls today's schedule from the API, wipes yesterday's reminders,
and creates fresh Reminders that Siri **speaks aloud** when they fire.

---

## Prerequisites

1. **Reminders list named "Mom's Schedule"**
   Open the Reminders app → tap **Add List** → name it exactly `Mom's Schedule`.

2. **Announce Notifications turned on** (so Siri speaks the reminder text)
   *Settings → Notifications → Announce Notifications → On*
   Enable it for the speaker Siri will use (AirPods, HomePod, or iPhone).

3. **Schedule API reachable from the phone**
   If running locally on a Mac, use your Mac's local IP, e.g. `http://192.168.1.50:3000`.
   For production, deploy to any hosting (Render, Railway, Heroku) and use the HTTPS URL.

---

## Build the Shortcut (step by step)

Open **Shortcuts → +** and add the following actions in order.

### Step 1 — Get today's date as a string
| Action | Setting |
|--------|---------|
| **Format Date** | Input: `Current Date`  Format: `Custom` → `yyyy-MM-dd` |
| **Set Variable** | Variable name: `today` |

### Step 2 — Fetch today's schedule from the API
| Action | Setting |
|--------|---------|
| **URL** | `http://<YOUR-API-HOST>:3000/schedule/today` |
| **Get Contents of URL** | Method: `GET` |
| **Set Variable** | Variable name: `scheduleResponse` |

### Step 3 — Parse the events array
| Action | Setting |
|--------|---------|
| **Get Dictionary Value** | Dictionary: `scheduleResponse` · Key: `events` |
| **Set Variable** | Variable name: `events` |

### Step 4 — Clear old reminders from "Mom's Schedule"
| Action | Setting |
|--------|---------|
| **Find Reminders** | List: `Mom's Schedule` · Filter: `Completed is false` |
| **Remove Reminders** | Reminders: result of previous step |

> This removes any leftover reminders from a previous day so the list stays clean.

### Step 5 — Loop over events and create reminders
| Action | Setting |
|--------|---------|
| **Repeat with Each** | Input: `events` |

**Inside the loop:**

#### 5a — Extract fields from each event object
| Action | Setting |
|--------|---------|
| **Get Dictionary Value** | Dictionary: `Repeat Item` · Key: `time` |
| **Set Variable** | Variable name: `eventTime` |
| **Get Dictionary Value** | Dictionary: `Repeat Item` · Key: `reminderText` |
| **Set Variable** | Variable name: `reminderText` |

#### 5b — Build the alarm date (today + event time)
| Action | Setting |
|--------|---------|
| **Text** | `[today] [eventTime]` (combine the two variables, e.g. `2026-03-01 11:30`) |
| **Format Date** | Input: above Text · Format: `Custom` → `yyyy-MM-dd HH:mm` |
| **Set Variable** | Variable name: `alarmDate` |

#### 5c — Create the reminder
| Action | Setting |
|--------|---------|
| **Add New Reminder** | Title: `reminderText` · List: `Mom's Schedule` · Alert: `alarmDate` |

**End Repeat**

### Step 6 — Confirm
| Action | Setting |
|--------|---------|
| **Show Notification** | Title: `Mom's schedule is set!` · Body: `[Count of events] reminders added.` |

---

## Trigger options

### Option A — Manual / Omi-triggered
Name the shortcut **"Set Mom's Schedule"** and say:
> "Hey Siri, set Mom's schedule."

Omi can say this phrase aloud after reviewing the day's plan with mom.

### Option B — Automatic morning automation
1. Open **Shortcuts → Automation → +**
2. Choose **Time of Day** → e.g. **7:00 AM**, Every Day
3. Add action: **Run Shortcut** → `Set Mom's Schedule`
4. Turn off *"Ask Before Running"*

The reminders get created every morning before mom wakes up.

### Option C — Omi triggers via URL scheme
Omi can fire the shortcut programmatically by opening:

```
shortcuts://run-shortcut?name=Set%20Mom%27s%20Schedule
```

This works from any iOS app that can open URLs, including Omi's companion app.

---

## What mom hears when the alarm fires

With **Announce Notifications** enabled, when the reminder triggers Siri says
(through HomePod or AirPods):

> "Hey [name], reminder: **Time to start going to Chair Yoga!**"

The reminder text comes directly from the `reminderText` field in the schedule,
so it can be personalized however you like.

---

## Customizing the spoken text

In the API payload (or `schedules.json`) set `reminderText` per event:

```json
{
  "time": "11:30",
  "label": "Chair Yoga",
  "reminderText": "Mom, it's time to head to Chair Yoga. Have a great class!"
}
```

Leave `reminderText` blank and the API auto-fills it as
`"Time to start going to <label>!"`.
