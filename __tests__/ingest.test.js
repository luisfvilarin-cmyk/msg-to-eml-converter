import fs from 'fs';
import path from 'path';
import os from 'os';
import { ingestScreenshot, ingestDownload, ingestText, ingestUrl } from '../src/ingest.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data', 'wiki');
const TEST_INGESTED_DIR = path.resolve(process.cwd(), 'data', 'ingested');

function cleanTestData() {
  for (const dir of [TEST_DATA_DIR, TEST_INGESTED_DIR]) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
      });
    }
  }
}

describe('Ingestion', () => {
  let tempDir;

  beforeEach(() => {
    cleanTestData();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudevil-test-'));
  });

  afterEach(() => {
    cleanTestData();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('ingestScreenshot creates entry from image file', () => {
    const imgPath = path.join(tempDir, 'test-screenshot.png');
    fs.writeFileSync(imgPath, 'fake png data');

    const entry = ingestScreenshot(imgPath, { title: 'My Screenshot', tags: ['ui'] });
    expect(entry.title).toBe('My Screenshot');
    expect(entry.tags).toContain('screenshot');
    expect(entry.tags).toContain('ui');
    expect(entry.source).toBe('screenshot');
    expect(entry.metadata.imageFormat).toBe('.png');
  });

  test('ingestScreenshot infers title from filename', () => {
    const imgPath = path.join(tempDir, 'dashboard-design.jpg');
    fs.writeFileSync(imgPath, 'fake jpg data');

    const entry = ingestScreenshot(imgPath);
    expect(entry.title).toBe('dashboard design');
  });

  test('ingestScreenshot throws for missing file', () => {
    expect(() => ingestScreenshot('/nonexistent/file.png')).toThrow('File not found');
  });

  test('ingestScreenshot throws for unsupported format', () => {
    const filePath = path.join(tempDir, 'doc.pdf');
    fs.writeFileSync(filePath, 'fake pdf');
    expect(() => ingestScreenshot(filePath)).toThrow('Unsupported image format');
  });

  test('ingestDownload creates entry from text file with content extraction', () => {
    const txtPath = path.join(tempDir, 'notes.txt');
    fs.writeFileSync(txtPath, 'These are my notes about AI safety.');

    const entry = ingestDownload(txtPath, { title: 'AI Safety Notes', tags: ['ai'] });
    expect(entry.title).toBe('AI Safety Notes');
    expect(entry.content).toContain('AI safety');
    expect(entry.tags).toContain('download');
    expect(entry.tags).toContain('ai');
    expect(entry.source).toBe('download');
  });

  test('ingestDownload handles binary files without extraction', () => {
    const binPath = path.join(tempDir, 'data.bin');
    fs.writeFileSync(binPath, Buffer.from([0x00, 0x01, 0x02]));

    const entry = ingestDownload(binPath);
    expect(entry.content).toContain('Downloaded file: data.bin');
    expect(entry.content).toContain('Size:');
  });

  test('ingestDownload throws for missing file', () => {
    expect(() => ingestDownload('/nonexistent/file.txt')).toThrow('File not found');
  });

  test('ingestText creates entry from raw text', () => {
    const entry = ingestText('My quick note about architecture', {
      title: 'Architecture Note',
      tags: ['arch'],
      source: 'manual',
    });
    expect(entry.title).toBe('Architecture Note');
    expect(entry.content).toBe('My quick note about architecture');
    expect(entry.tags).toContain('arch');
  });

  test('ingestUrl creates entry from URL content', () => {
    const entry = ingestUrl('https://example.com/article', 'Article content here', {
      title: 'Great Article',
      tags: ['research'],
    });
    expect(entry.title).toBe('Great Article');
    expect(entry.content).toBe('Article content here');
    expect(entry.tags).toContain('web');
    expect(entry.tags).toContain('research');
    expect(entry.source).toBe('url');
    expect(entry.metadata.url).toBe('https://example.com/article');
  });
});
