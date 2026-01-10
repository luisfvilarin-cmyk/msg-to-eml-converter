# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MSG to EML Converter - A Node.js tool for converting Microsoft Outlook MSG files to EML format.

## Development Commands

Currently, this is a minimal project setup. Standard Node.js commands:

```bash
npm install          # Install dependencies
npm test            # Run tests (not yet configured)
```

## Project Status

This project is in early setup phase with minimal files. The codebase will likely need:
- Core conversion logic for MSG to EML format
- File I/O handling for reading MSG files and writing EML output
- Command-line interface or API for conversion operations
- Dependencies for MSG parsing (e.g., @kenjiuno/msgreader or msg-reader)
- Email format handling libraries

## Architecture Notes

When implementing the converter:
- MSG files are Microsoft's proprietary format based on OLE/COM structured storage
- EML files are RFC 822/MIME format email messages
- Key conversion considerations include preserving email headers, body content, attachments, and metadata
