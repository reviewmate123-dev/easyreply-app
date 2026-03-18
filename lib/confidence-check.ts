// lib/confidence-check.ts
// Simple confidence scoring for auto-reply safety checks

import { containsSensitiveKeywords } from './sensitive-keywords';

export interface ConfidenceResult {
  score: number;
  reasons: string[];
}

export async function checkConfidence(
  questionText: string,
  replyText: string,
  category?: string
): Promise<ConfidenceResult> {
  const reasons: string[] = [];
  let score = 90;

  const question = (questionText || '').trim();
  const reply = (replyText || '').trim();

  if (!question || !reply) {
    return {
      score: 0,
      reasons: ['Empty question or reply']
    };
  }

  const { hasSensitive, matchedKeywords } = containsSensitiveKeywords(question);
  if (hasSensitive) {
    score -= Math.min(40, matchedKeywords.length * 8);
    reasons.push(`Sensitive terms found (${matchedKeywords.length})`);
  }

  if (reply.length < 40) {
    score -= 20;
    reasons.push('Reply too short');
  } else if (reply.length > 800) {
    score -= 10;
    reasons.push('Reply too long');
  }

  // Keep conservative confidence for categories that usually need caution.
  const cautiousCategories = ['pharmacy', 'clinic', 'hospital', 'law', 'financial'];
  const lowerCategory = (category || '').toLowerCase();
  if (cautiousCategories.some((token) => lowerCategory.includes(token))) {
    score -= 15;
    reasons.push('Cautious category');
  }

  // Basic relevance check: at least one non-trivial keyword overlap.
  const questionWords = new Set(
    question
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 5)
  );
  const replyWords = new Set(
    reply
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 5)
  );
  const overlap = [...questionWords].filter((w) => replyWords.has(w)).length;
  if (questionWords.size > 0 && overlap === 0) {
    score -= 15;
    reasons.push('Low keyword overlap');
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    score,
    reasons
  };
}
