import { base44 } from '@/api/base44Client';

const MAX_ENTRIES = 3;
const MIN_RELEVANCE_THRESHOLD = 0.4;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'into', 'about', 'than',
  'and', 'or', 'not', 'no', 'but', 'if', 'then', 'so', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'how', 'when', 'where', 'why',
  'just', 'want', 'need', 'tell', 'give', 'show', 'get', 'make', 'use', 'using',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function buildTf(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const max = Math.max(...Object.values(tf), 1);
  for (const t in tf) tf[t] /= max;
  return tf;
}

function cosineSimilarity(tfA, tfB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const allTokens = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  for (const t of allTokens) {
    const a = tfA[t] || 0;
    const b = tfB[t] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

function semanticScore(queryTokens, entry) {
  const titleTokens = tokenize(entry.title);
  const contentTokens = tokenize(entry.content);
  const tagTokens = tokenize((entry.tags || []).join(' '));

  const queryTf = buildTf(queryTokens);
  const titleTf = buildTf(titleTokens);
  const contentTf = buildTf(contentTokens);
  const tagTf = buildTf(tagTokens);

  // Weighted: title and tags matter more than deep content
  const titleScore = cosineSimilarity(queryTf, titleTf) * 0.4;
  const tagScore = cosineSimilarity(queryTf, tagTf) * 0.3;
  const contentScore = cosineSimilarity(queryTf, contentTf) * 0.3;

  return titleScore + tagScore + contentScore;
}

/**
 * Given a user message and all active knowledge entries,
 * returns only the entries that are RELEVANT to the question.
 *
 * Uses TF-IDF-style cosine similarity for fast local scoring.
 * Only falls back to LLM-based filtering for ambiguous ties.
 */
export async function getRelevantKnowledge(userMessage, entries) {
  if (!entries || entries.length === 0) return [];

  const queryTokens = tokenize(userMessage);
  if (queryTokens.length === 0) return [];

  const scored = entries.map((e) => ({
    entry: e,
    score: semanticScore(queryTokens, e),
  }));

  // Sort by relevance score
  scored.sort((a, b) => b.score - a.score);

  // Filter: only keep entries above threshold
  const relevant = scored
    .filter((s) => s.score >= MIN_RELEVANCE_THRESHOLD)
    .slice(0, MAX_ENTRIES)
    .map((s) => s.entry);

  // If nothing passed threshold but we have entries, include top-1 only if it has any overlap
  if (relevant.length === 0 && scored[0] && scored[0].score > 0) {
    return [scored[0].entry];
  }

  return relevant;
}

/**
 * Builds the context string from relevant entries.
 * Framed as REFERENCE KNOWLEDGE with strict instructions:
 * the user's question is the priority; knowledge is supporting context only.
 */
export function buildRagContext(relevantEntries) {
  if (!relevantEntries || relevantEntries.length === 0) return '';

  const knowledgeBlock = relevantEntries
    .map((e, i) => `[REFERENCE ${i + 1}: ${e.title}]\n${e.content}`)
    .join('\n\n');

  return `REFERENCE KNOWLEDGE (supporting context only):
${knowledgeBlock}

IMPORTANT: The above knowledge is provided as supporting reference material. Your primary focus must be answering the user's actual question. Use this knowledge to enrich your answer where relevant, but do not simply summarize or echo the knowledge. If the knowledge doesn't relate to what the user is asking, ignore it entirely. The user's question always takes priority.`;
}
