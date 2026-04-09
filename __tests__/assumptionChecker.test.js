import fs from 'fs';
import path from 'path';
import { createEntry } from '../src/wiki.js';
import { questionAssumptions, formatAssumptionReport } from '../src/assumptionChecker.js';

const TEST_DATA_DIR = path.resolve(process.cwd(), 'data', 'wiki');

function cleanTestData() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    const files = fs.readdirSync(TEST_DATA_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(TEST_DATA_DIR, f)));
  }
}

describe('Assumption Checker', () => {
  beforeEach(() => cleanTestData());
  afterAll(() => cleanTestData());

  test('detects absolute language', () => {
    createEntry({ title: 'AI Knowledge', content: 'Neural networks are powerful tools' });
    const result = questionAssumptions('AI will always outperform humans at every task.');
    expect(result.assumptions.length).toBeGreaterThan(0);
    const absolutes = result.assumptions.filter(a => a.type === 'absolute');
    expect(absolutes.length).toBeGreaterThan(0);
  });

  test('detects certainty language', () => {
    const result = questionAssumptions('Obviously the best approach is to use React. Clearly it dominates.');
    const certainties = result.assumptions.filter(a => a.type === 'certainty');
    expect(certainties.length).toBeGreaterThanOrEqual(2);
  });

  test('detects normative language', () => {
    const result = questionAssumptions('We should always test our code. Teams must follow TDD.');
    const normatives = result.assumptions.filter(a => a.type === 'normative');
    expect(normatives.length).toBeGreaterThanOrEqual(2);
  });

  test('detects superlative language', () => {
    const result = questionAssumptions('This is the best framework and the worst alternative.');
    const superlatives = result.assumptions.filter(a => a.type === 'superlative');
    expect(superlatives.length).toBe(2);
  });

  test('detects limiting language', () => {
    const result = questionAssumptions("The only way to succeed is hard work. You can't shortcut it.");
    const limiting = result.assumptions.filter(a => a.type === 'limiting');
    expect(limiting.length).toBeGreaterThanOrEqual(1);
  });

  test('generates challenge prompts for each assumption', () => {
    const result = questionAssumptions('We should always use TypeScript. It obviously prevents bugs.');
    result.assumptions.forEach(a => {
      expect(a.challengePrompt).toBeDefined();
      expect(a.challengePrompt.length).toBeGreaterThan(10);
    });
  });

  test('finds related wiki entries', () => {
    createEntry({ title: 'TypeScript Benefits', content: 'TypeScript adds type safety to JavaScript projects.', tags: ['typescript'] });
    createEntry({ title: 'Cooking Tips', content: 'Season your cast iron pan regularly.', tags: ['cooking'] });

    const result = questionAssumptions('TypeScript should always be used for JavaScript projects.');
    expect(result.relatedEntries.length).toBeGreaterThan(0);
    expect(result.relatedEntries[0].title).toBe('TypeScript Benefits');
  });

  test('handles empty wiki gracefully', () => {
    const result = questionAssumptions('Always use the best tools available.');
    expect(result.summary).toContain('No wiki entries');
  });

  test('handles text with no assumptions', () => {
    createEntry({ title: 'Note', content: 'Some content' });
    const result = questionAssumptions('The weather today is mild and partly cloudy.');
    expect(result.assumptions.length).toBe(0);
  });

  test('formatAssumptionReport produces readable output', () => {
    createEntry({ title: 'AI Note', content: 'Machine learning models require data' });
    const report = formatAssumptionReport('AI will obviously always be the best solution.');
    expect(report).toContain('ClaudeVil: Question Your Assumptions');
    expect(report).toContain('assumption');
  });
});
