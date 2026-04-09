import { listEntries } from './wiki.js';
import { getLast30DaysEntries } from './last30days.js';

function extractKeyPhrases(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this',
    'what', 'which', 'who', 'whom', 'these', 'those', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it',
    'its', 'they', 'them', 'their', 'about', 'up', 'also', 'like',
  ]);

  const words = cleaned.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  return [...new Set(words)];
}

function findContradictionSignals(text) {
  const patterns = [
    { pattern: /\balways\b/gi, type: 'absolute', phrase: 'always' },
    { pattern: /\bnever\b/gi, type: 'absolute', phrase: 'never' },
    { pattern: /\beveryone\b/gi, type: 'absolute', phrase: 'everyone' },
    { pattern: /\bno one\b/gi, type: 'absolute', phrase: 'no one' },
    { pattern: /\bimpossible\b/gi, type: 'absolute', phrase: 'impossible' },
    { pattern: /\bobviously\b/gi, type: 'certainty', phrase: 'obviously' },
    { pattern: /\bclearly\b/gi, type: 'certainty', phrase: 'clearly' },
    { pattern: /\bof course\b/gi, type: 'certainty', phrase: 'of course' },
    { pattern: /\bundoubtedly\b/gi, type: 'certainty', phrase: 'undoubtedly' },
    { pattern: /\bshould\b/gi, type: 'normative', phrase: 'should' },
    { pattern: /\bmust\b/gi, type: 'normative', phrase: 'must' },
    { pattern: /\bneed to\b/gi, type: 'normative', phrase: 'need to' },
    { pattern: /\bhave to\b/gi, type: 'normative', phrase: 'have to' },
    { pattern: /\bbest\b/gi, type: 'superlative', phrase: 'best' },
    { pattern: /\bworst\b/gi, type: 'superlative', phrase: 'worst' },
    { pattern: /\bonly way\b/gi, type: 'limiting', phrase: 'only way' },
    { pattern: /\bcan't\b/gi, type: 'limiting', phrase: "can't" },
    { pattern: /\bcannot\b/gi, type: 'limiting', phrase: 'cannot' },
    { pattern: /\bwon't work\b/gi, type: 'limiting', phrase: "won't work" },
  ];

  const found = [];
  for (const { pattern, type, phrase } of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      found.push({ type, phrase, count: matches.length });
    }
  }
  return found;
}

function findOverlappingTopics(inputPhrases, wikiEntry) {
  const entryPhrases = extractKeyPhrases(wikiEntry.title + ' ' + wikiEntry.content);
  const overlap = inputPhrases.filter(p => entryPhrases.includes(p));
  return overlap;
}

export function questionAssumptions(inputText, options = {}) {
  const { useRecent = false, maxResults = 20 } = options;
  const wikiEntries = useRecent ? getLast30DaysEntries() : listEntries();

  const inputPhrases = extractKeyPhrases(inputText);
  const signals = findContradictionSignals(inputText);

  if (wikiEntries.length === 0) {
    const assumptions = signals.map(signal => {
      const context = extractSentenceAround(inputText, signal.phrase);
      return {
        type: signal.type,
        trigger: signal.phrase,
        context,
        challengePrompt: generateChallenge(signal),
        relatedWikiEntries: [],
      };
    });
    return {
      assumptions,
      relatedEntries: [],
      summary: assumptions.length > 0
        ? `Found ${assumptions.length} assumption(s) to question. No wiki entries to compare against.`
        : 'No wiki entries to compare against. Add some knowledge first!',
    };
  }

  const relatedEntries = wikiEntries
    .map(entry => {
      const overlap = findOverlappingTopics(inputPhrases, entry);
      return { entry, overlap, relevance: overlap.length };
    })
    .filter(r => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);

  const assumptions = [];

  for (const signal of signals) {
    const context = extractSentenceAround(inputText, signal.phrase);
    const related = relatedEntries
      .filter(r => r.overlap.some(word => context.toLowerCase().includes(word)))
      .slice(0, 3);

    assumptions.push({
      type: signal.type,
      trigger: signal.phrase,
      context,
      challengePrompt: generateChallenge(signal),
      relatedWikiEntries: related.map(r => ({
        id: r.entry.id,
        title: r.entry.title,
        overlap: r.overlap,
      })),
    });
  }

  const summary = buildSummary(assumptions, relatedEntries);

  return { assumptions, relatedEntries: relatedEntries.map(r => ({
    id: r.entry.id,
    title: r.entry.title,
    overlap: r.overlap,
    relevance: r.relevance,
  })), summary };
}

function extractSentenceAround(text, phrase) {
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, text.lastIndexOf('.', idx) + 1);
  const end = text.indexOf('.', idx + phrase.length);
  return text.slice(start, end === -1 ? undefined : end + 1).trim();
}

function generateChallenge(signal) {
  const challenges = {
    absolute: `You used "${signal.phrase}" -- is this truly universal? What exceptions exist?`,
    certainty: `You said "${signal.phrase}" -- what would change your mind? What evidence contradicts this?`,
    normative: `You wrote "${signal.phrase}" -- says who? What if the opposite were true?`,
    superlative: `You claimed "${signal.phrase}" -- by what metric? What are the runners-up?`,
    limiting: `You stated "${signal.phrase}" -- what if there's a way you haven't considered?`,
  };
  return challenges[signal.type] || `Question this assumption: "${signal.phrase}"`;
}

function buildSummary(assumptions, relatedEntries) {
  const lines = [];
  lines.push(`Found ${assumptions.length} assumption(s) to question.`);
  lines.push(`${relatedEntries.length} related wiki entries overlap with your text.`);

  if (assumptions.length > 0) {
    lines.push('');
    lines.push('Key challenges:');
    assumptions.slice(0, 5).forEach((a, i) => {
      lines.push(`  ${i + 1}. ${a.challengePrompt}`);
    });
  }

  return lines.join('\n');
}

export function formatAssumptionReport(inputText, options = {}) {
  const result = questionAssumptions(inputText, options);
  const lines = [];

  lines.push('=== ClaudeVil: Question Your Assumptions ===');
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  if (result.assumptions.length > 0) {
    lines.push('--- Assumptions Found ---');
    result.assumptions.forEach((a, i) => {
      lines.push('');
      lines.push(`${i + 1}. [${a.type}] "${a.trigger}"`);
      lines.push(`   Context: ${a.context}`);
      lines.push(`   Challenge: ${a.challengePrompt}`);
      if (a.relatedWikiEntries.length > 0) {
        lines.push('   Related wiki entries:');
        a.relatedWikiEntries.forEach(e => {
          lines.push(`     - ${e.title} (overlap: ${e.overlap.join(', ')})`);
        });
      }
    });
  }

  if (result.relatedEntries.length > 0) {
    lines.push('');
    lines.push('--- Related Knowledge ---');
    result.relatedEntries.slice(0, 10).forEach(e => {
      lines.push(`  - ${e.title} (${e.relevance} overlapping concepts: ${e.overlap.join(', ')})`);
    });
  }

  return lines.join('\n');
}
