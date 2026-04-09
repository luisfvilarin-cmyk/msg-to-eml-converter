import fs from 'fs';
import path from 'path';
import { createEntry } from './wiki.js';

const INGESTED_DIR = path.resolve(process.cwd(), 'data', 'ingested');

function ensureIngestedDir() {
  if (!fs.existsSync(INGESTED_DIR)) {
    fs.mkdirSync(INGESTED_DIR, { recursive: true });
  }
}

export function ingestScreenshot(filePath, { title, tags = [], description = '' } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const validExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
  if (!validExts.includes(ext)) {
    throw new Error(`Unsupported image format: ${ext}. Supported: ${validExts.join(', ')}`);
  }

  ensureIngestedDir();
  const filename = path.basename(filePath);
  const destPath = path.join(INGESTED_DIR, `${Date.now()}-${filename}`);
  fs.copyFileSync(filePath, destPath);

  const inferredTitle = title || path.basename(filePath, ext).replace(/[-_]/g, ' ');

  const content = [
    description || `Screenshot captured from: ${filename}`,
    '',
    `Original file: ${filename}`,
    `Stored at: ${destPath}`,
    `Captured: ${new Date().toISOString()}`,
    '',
    'Content from this screenshot should be reviewed and expanded manually,',
    'or processed through an LLM for text extraction.',
  ].join('\n');

  return createEntry({
    title: inferredTitle,
    content,
    tags: ['screenshot', ...tags],
    source: 'screenshot',
    metadata: {
      originalFile: filename,
      storedPath: destPath,
      imageFormat: ext,
    },
  });
}

export function ingestDownload(filePath, { title, tags = [], extractContent = true } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  ensureIngestedDir();
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const destPath = path.join(INGESTED_DIR, `${Date.now()}-${filename}`);
  fs.copyFileSync(filePath, destPath);

  let content;
  const textExts = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.yaml', '.yml', '.log', '.eml'];

  if (extractContent && textExts.includes(ext)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const maxLen = 50000;
    content = raw.length > maxLen ? raw.slice(0, maxLen) + '\n\n[... truncated ...]' : raw;
  } else {
    content = [
      `Downloaded file: ${filename}`,
      `Format: ${ext || 'unknown'}`,
      `Size: ${fs.statSync(filePath).size} bytes`,
      `Stored at: ${destPath}`,
      `Ingested: ${new Date().toISOString()}`,
    ].join('\n');
  }

  const inferredTitle = title || path.basename(filePath, ext).replace(/[-_]/g, ' ');

  return createEntry({
    title: inferredTitle,
    content,
    tags: ['download', ...tags],
    source: 'download',
    metadata: {
      originalFile: filename,
      storedPath: destPath,
      fileFormat: ext,
      fileSize: fs.statSync(filePath).size,
    },
  });
}

export function ingestText(text, { title = 'Untitled Note', tags = [], source = 'manual' } = {}) {
  return createEntry({ title, content: text, tags, source });
}

export function ingestUrl(url, content, { title, tags = [] } = {}) {
  const inferredTitle = title || url;
  return createEntry({
    title: inferredTitle,
    content,
    tags: ['web', ...tags],
    source: 'url',
    metadata: { url, fetchedAt: new Date().toISOString() },
  });
}
