// lib/risk-detection.ts
// High-risk keywords detect karna

import { containsSensitiveKeywords, getRiskLevel } from './sensitive-keywords';
import { generateAIReply } from './openai';

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  riskKeywords: string[];
  suggestedReply?: string;
  confidence: number;
  needsManualReview: boolean;
}

// Risk categories with severity
export const riskCategories = {
  scam: {
    keywords: ['scam', 'fraud', 'cheating', 'fake', 'dishonest', 'liar'],
    severity: 'high',
    suggestedTone: 'calm and factual'
  },
  complaint: {
    keywords: ['complaint', 'refund', 'money back', 'overpriced', 'expensive'],
    severity: 'medium',
    suggestedTone: 'apologetic and helpful'
  },
  legal: {
    keywords: ['lawsuit', 'court', 'police', 'legal action', 'lawyer', 'attorney'],
    severity: 'high',
    suggestedTone: 'professional and cautious'
  },
  medical: {
    keywords: ['medical advice', 'doctor', 'surgery', 'prescription', 'medicine'],
    severity: 'high',
    suggestedTone: 'disclaimer and professional'
  },
  safety: {
    keywords: ['unsafe', 'dangerous', 'accident', 'injury', 'emergency'],
    severity: 'high',
    suggestedTone: 'concerned and responsible'
  }
};

// Assess risk for a question
export async function assessQuestionRisk(
  questionText: string,
  businessContext?: any
): Promise<RiskAssessment> {
  
  const lowerText = questionText.toLowerCase();
  
  // Check for sensitive keywords
  const { hasSensitive, matchedKeywords } = containsSensitiveKeywords(questionText);
  
  // Get risk level
  const riskLevel = getRiskLevel(questionText);
  
  // If high risk, generate a calming suggested reply
  let suggestedReply: string | undefined;
  
  if (riskLevel === 'high' && matchedKeywords.length > 0) {
    // Determine which category
    let category = 'general';
    for (const [cat, data] of Object.entries(riskCategories)) {
      if (data.keywords.some(k => lowerText.includes(k))) {
        category = cat;
        break;
      }
    }
    
    // Generate calming reply based on category
    const tone = riskCategories[category as keyof typeof riskCategories]?.suggestedTone || 'calm and professional';
    
    suggestedReply = await generateCalmingReply(questionText, tone, businessContext);
  }
  
  return {
    riskLevel,
    riskKeywords: matchedKeywords,
    suggestedReply,
    confidence: riskLevel === 'high' ? 0.9 : 0.7,
    needsManualReview: riskLevel === 'high' || matchedKeywords.length > 3
  };
}

// Generate calming reply for high-risk questions
async function generateCalmingReply(
  questionText: string,
  tone: string,
  businessContext?: any
): Promise<string> {
  
  // Dummy calming replies based on category
  if (questionText.toLowerCase().includes('scam') || questionText.toLowerCase().includes('fraud')) {
    return "We take all concerns seriously. Please contact us directly so we can address your specific situation personally. We're committed to transparency and customer satisfaction.";
  }
  
  if (questionText.toLowerCase().includes('complaint') || questionText.toLowerCase().includes('refund')) {
    return "We're sorry to hear about your experience. Please reach out to us directly so we can make things right. Customer satisfaction is our top priority.";
  }
  
  if (questionText.toLowerCase().includes('medical') || questionText.toLowerCase().includes('doctor')) {
    return "For medical concerns, we strongly recommend consulting with a healthcare professional directly. We're happy to discuss our services, but specific medical advice should come from your provider.";
  }
  
  // Default calming reply
  return `Thank you for your question. We take all customer inquiries seriously and want to ensure we provide you with accurate information. Please contact us directly so we can address your concerns personally.`;
}

// Check if question needs immediate attention
export function needsImmediateAttention(riskLevel: 'low' | 'medium' | 'high'): boolean {
  return riskLevel === 'high';
}

// Get priority for question
export function getQuestionPriority(riskLevel: 'low' | 'medium' | 'high'): number {
  switch(riskLevel) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 4;
  }
}