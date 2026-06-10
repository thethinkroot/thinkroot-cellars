// Fuzzy string matching for TTB label field comparison
// Handles the "STONE'S THROW" vs "Stone's Throw" class of problems
// that senior agents like Dave Morrison flag as needing human judgment

function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarityScore(a, b) {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return 1 - distance / maxLen;
}

// Returns a structured result with pass/fail, score, and a reason
// the agent can actually read and act on
function fuzzyMatch(labelValue, applicationValue, threshold = 0.9) {
  if (!labelValue || !applicationValue) {
    return {
      pass: false,
      score: 0,
      exact: false,
      reason: "One or both values missing"
    };
  }

  const score = similarityScore(labelValue, applicationValue);
  const exact = normalizeString(labelValue) === normalizeString(applicationValue);

  if (exact) {
    return {
      pass: true,
      score: 1.0,
      exact: true,
      reason: "Exact match"
    };
  }

  // Case variation only — like STONE'S THROW vs Stone's Throw
  if (labelValue.toLowerCase().trim() === applicationValue.toLowerCase().trim()) {
    return {
      pass: true,
      score: 0.99,
      exact: false,
      reason: "Near match — case variation only. Agent review recommended."
    };
  }

  if (score >= threshold) {
    return {
      pass: true,
      score,
      exact: false,
      reason: `Near match (${Math.round(score * 100)}% similarity). Agent review recommended.`
    };
  }

  return {
    pass: false,
    score,
    exact: false,
    reason: `Mismatch — ${Math.round(score * 100)}% similarity, below ${Math.round(threshold * 100)}% threshold`
  };
}

module.exports = { fuzzyMatch, similarityScore, normalizeString };