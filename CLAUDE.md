# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ClaudeVil** - A personal knowledge management system inspired by Andrej Karpathy's LLM-Wiki concept. Combines a file-based wiki store, ingestion skills, interactive visualization, and an assumption-questioning engine.

## Development Commands

```bash
npm install                    # Install dependencies
npm test                       # Run all tests (41 tests across 4 suites)
npm start                      # Show CLI help
node claudevil.js help         # Full CLI usage
node claudevil.js last30days   # Last 30 days activity report
node claudevil.js cron         # Run assumption-questioning cron job
```

## Architecture

### Core Modules (`src/`)
- **wiki.js** - File-based wiki store with CRUD, search, date filtering, tag cloud, timeline, and stats. Entries stored as JSON in `data/wiki/`.
- **last30days.js** - Aggregates entries from the last 30 days with weekly breakdown, top tags, and source analysis.
- **ingest.js** - Ingestion pipeline supporting screenshots, file downloads, raw text, and URLs. Files copied to `data/ingested/`.
- **assumptionChecker.js** - Scans text for absolute/certainty/normative/superlative/limiting language, cross-references against wiki entries, and generates challenge prompts.

### CLI (`claudevil.js`)
Entry point with commands: `add`, `list`, `search`, `get`, `delete`, `tags`, `stats`, `last30days`, `wiki` (with `--screenshot`/`--download`/`--text`/`--url`), `question`, `cron`.

### Visualization (`visualization/index.html`)
Interactive single-page app with full-text search, date range filtering, tag filtering, knowledge timeline, period comparison, assumption checker sidebar, and source breakdown. Works standalone in browser with localStorage fallback.

### Cron (`cron/questionAssumptions.js`)
Schedulable via crontab. Scans wiki entries from the past 7 days and ingested files, runs them through the assumption checker, outputs a report.

### Data (`data/`)
- `data/wiki/*.json` - Wiki entries (gitignored)
- `data/ingested/*` - Ingested files (gitignored)

## Key Design Decisions
- ESM modules throughout (`"type": "module"`)
- File-based storage (no database dependency)
- Tests use `node` environment (not jsdom) for file system operations
- The visualization has a browser-native fallback using localStorage when Node.js imports aren't available
