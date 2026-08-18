/**
 * Embedding and text vector utilities for RAG pipeline
 */

// Tokenize text into normalized tokens
const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
};

// Common stop words to filter for cleaner keyword weighting
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for',
  'of', 'or', 'by', 'with', 'as', 'from', 'that', 'this', 'it', 'be',
  'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will', 'shall'
]);

// Extract significant keywords
const extractKeywords = (text, topN = 20) => {
  const tokens = tokenize(text).filter((t) => !STOP_WORDS.has(t));
  const freqMap = {};
  tokens.forEach((t) => {
    freqMap[t] = (freqMap[t] || 0) + 1;
  });

  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
};

// Chunk text into overlapping windows (approx 500-800 characters/tokens)
const chunkText = (fullText, chunkSize = 1200, overlap = 200) => {
  if (!fullText) return [];
  const clean = fullText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const chunks = [];
  let startIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < clean.length) {
      // Find clean sentence or newline boundary
      const nextNewline = clean.indexOf('\n', endIndex - 100);
      const nextPeriod = clean.indexOf('. ', endIndex - 100);
      if (nextNewline !== -1 && nextNewline < endIndex + 100) {
        endIndex = nextNewline + 1;
      } else if (nextPeriod !== -1 && nextPeriod < endIndex + 100) {
        endIndex = nextPeriod + 2;
      }
    }

    const chunkStr = clean.substring(startIndex, endIndex).trim();
    if (chunkStr.length > 50) {
      chunks.push({
        text: chunkStr,
        keywords: extractKeywords(chunkStr, 15),
        tokenCount: Math.round(chunkStr.split(/\s+/).length),
      });
    }

    startIndex = endIndex - overlap;
    if (startIndex >= clean.length - 100) break;
  }

  return chunks;
};

// Calculate Cosine Similarity over term frequency vectors
const calculateSimilarity = (query, text, chunkKeywords = []) => {
  const qTokens = tokenize(query).filter((t) => !STOP_WORDS.has(t));
  if (qTokens.length === 0) return 0.1;

  const tTokens = tokenize(text);
  const tFreq = {};
  tTokens.forEach((t) => {
    tFreq[t] = (tFreq[t] || 0) + 1;
  });

  let matchScore = 0;
  let exactPhraseBonus = 0;

  // Check for multi-word phrase matching
  if (query.length > 5 && text.toLowerCase().includes(query.toLowerCase())) {
    exactPhraseBonus = 0.5;
  }

  qTokens.forEach((q) => {
    if (tFreq[q]) {
      matchScore += (tFreq[q] > 3 ? 3 : tFreq[q]) * 1.5;
    }
    if (chunkKeywords.includes(q)) {
      matchScore += 2.0;
    }
  });

  const queryNorm = Math.sqrt(qTokens.length);
  const textNorm = Math.sqrt(Math.min(tTokens.length, 300));
  const rawScore = (matchScore / (queryNorm * textNorm || 1)) + exactPhraseBonus;

  return Math.min(Math.max(rawScore, 0.05), 1.0);
};

module.exports = {
  tokenize,
  extractKeywords,
  chunkText,
  calculateSimilarity,
};
