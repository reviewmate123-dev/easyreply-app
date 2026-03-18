// lib/review-generator.ts
// AI se review replies generate karta hai

import { generateAIReply, GenerateOptions } from './openai';

export interface ReviewContext {
  businessName?: string;
  category?: string;
  tone?: 'friendly' | 'formal' | 'confident';
  description?: string;
  city?: string;
  keywords?: string[];
  language?: string[];
  length?: 'short' | 'medium' | 'detailed';
}

export interface GenerateReviewReplyOptions {
  comment: string;
  rating: number;
  reviewerName?: string;
  context?: ReviewContext;
  tone?: 'friendly' | 'formal' | 'confident';
}

export interface GenerateReviewReplyResult {
  reply: string;
  confidence: number; // 0-100
  error?: string;
}

/**
 * Review ke liye AI reply generate karta hai
 */
export async function generateReviewReply(
  options: GenerateReviewReplyOptions
): Promise<GenerateReviewReplyResult> {
  
  try {
    const { comment, rating, reviewerName, context, tone } = options;
    
    // Rating ke hisaab se sentiment detect karo
    let sentiment = 'neutral';
    if (rating >= 4) sentiment = 'positive';
    else if (rating <= 2) sentiment = 'negative';
    
    // Reviewer name handle karo
    const reviewer = reviewerName || 'customer';
    
    // Tone normalize karo to supported set
    const toneValue: GenerateOptions['tone'] =
      tone === 'formal' ? 'formal' :
      tone === 'confident' ? 'confident' :
      context?.tone ? context.tone : 'friendly';

    // Business context prepare karo with defaults
    const businessContext: GenerateOptions = {
      businessName: context?.businessName || 'Our Business',
      category: context?.category || 'Local Business',
      tone: toneValue,
      description: context?.description || '',
      city: context?.city || 'your city',
      keywords: context?.keywords || [],
      language: context?.language || ['english'],
      length: context?.length || 'medium'
    };
    
    // AI se reply generate karo (existing generateAIReply function use karo)
    const { text: reply, error: aiError } = await generateAIReply(comment, businessContext);
    
    if (aiError) {
      return {
        reply: '',
        confidence: 0,
        error: aiError
      };
    }
    
    // Confidence score calculate karo (simple logic)
    const confidence = calculateConfidence(reply, comment, rating);
    
    return {
      reply,
      confidence
    };
    
  } catch (error: any) {
    console.error('Review generation error:', error);
    return {
      reply: '',
      confidence: 0,
      error: error.message || 'Failed to generate reply'
    };
  }
}

/**
 * Confidence score calculate karta hai
 */
function calculateConfidence(reply: string, comment: string, rating: number): number {
  let score = 70; // Base score
  
  // Reply length check
  if (reply.length > 30) score += 10;
  if (reply.length > 100) score += 5;
  
  // Contains rating acknowledgment?
  if (reply.includes('thank') || reply.includes('appreciate')) score += 5;
  
  // Contains personalization?
  if (comment.split(' ').some(word => reply.includes(word.substring(0, 5)))) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Regenerate karne ke liye warning message
 */
export function getRegenerateWarning(remainingFree: number): string {
  if (remainingFree > 0) {
    return `You have ${remainingFree} free regenerate${remainingFree > 1 ? 's' : ''} left this month.`;
  } else {
    return 'This will cost 1 extra credit. Continue?';
  }
}
