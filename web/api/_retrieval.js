// BM25-lite keyword retrieval over the build-time knowledge index. Pure
// functions, no I/O; one pass per request keeps the chat function at a
// single LLM call. Deliberately no embeddings — the corpus is ~120 chunks.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from',
  'has', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'not', 'of', 'on', 'or',
  'our', 'so', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'up', 'us', 'was', 'we',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termFreq(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  return tf;
}

// Term frequency with saturation (a term's 5th repeat adds little), a 3x
// weight for title/keyword hits, and mild length normalization so long
// chunks don't win on volume alone. Caches per-chunk token stats on the
// chunk object (cheap warm-instance win in the serverless function).
export function scoreChunk(queryTokens, chunk) {
  if (!queryTokens.length) return 0;
  if (!chunk._tf) {
    const bodyTokens = tokenize(chunk.text);
    chunk._tf = termFreq(bodyTokens);
    chunk._len = bodyTokens.length;
    chunk._head = new Set(tokenize(`${chunk.title} ${(chunk.keywords || []).join(' ')}`));
  }
  const lenNorm = 1 / (1 + chunk._len / 400);
  let score = 0;
  for (const q of new Set(queryTokens)) {
    const tf = chunk._tf[q] || 0;
    if (tf) score += (tf / (tf + 1.5)) * lenNorm;
    if (chunk._head.has(q)) score += 3;
  }
  return score;
}

export function selectChunks(query, chunks, { k = 8, maxChars = 12000, minScore = 1 } = {}) {
  const q = tokenize(query);
  if (!q.length || !Array.isArray(chunks) || !chunks.length) return [];
  const ranked = chunks
    .map((c) => ({ c, s: scoreChunk(q, c) }))
    .filter((x) => x.s >= minScore)
    .sort((a, b) => b.s - a.s)
    .slice(0, k);
  const out = [];
  let used = 0;
  for (const { c } of ranked) {
    const cost = (c.title || '').length + (c.text || '').length + 16;
    if (used + cost > maxChars) break;
    out.push(c);
    used += cost;
  }
  return out;
}

// The retrieval query is the latest user message; very short follow-ups
// ("how?", "and teams?") borrow the previous user message for subject.
export function retrievalQuery(messages) {
  const users = (messages || []).filter((m) => m && m.role === 'user' && typeof m.content === 'string');
  if (!users.length) return '';
  const last = users[users.length - 1].content;
  if (tokenize(last).length >= 4 || users.length < 2) return last;
  return `${users[users.length - 2].content}\n${last}`;
}
