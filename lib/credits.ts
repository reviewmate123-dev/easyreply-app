// lib/credits.ts
// Credit system ka skeleton - actual deduct tab hoga jab AI call karega

export interface CreditTransaction {
  id?: string;
  uid: string;
  amount: number;
  type: 'purchase' | 'usage';
  action: 'review' | 'qa' | 'regenerate' | 'bulk';
  questionId?: string;
  timestamp: Date;
}

export interface UserCredits {
  total: number;
  used: number;
  remaining: number;
  freeRegenerateUsed: {
    review: number;  // Basic: 1, Growth: 3, Pro: 5
    qa: number;
  };
  lastResetDate?: Date;
}

// Plan-wise free regenerate quota
export const planFreeRegenerate = {
  basic: { review: 1, qa: 1 },
  growth: { review: 3, qa: 3 },
  pro: { review: 5, qa: 5 }
};

// Check if user has enough credits
export function hasEnoughCredits(userCredits: number, required: number): boolean {
  return userCredits >= required;
}

// Calculate required credits for action
export function getRequiredCredits(
  action: 'review' | 'qa',
  isRegenerate: boolean,
  freeUsed: number,
  planFree: number
): { credits: number; needsWarning: boolean } {
  
  // Base credits
  let baseCredits = action === 'review' ? 1 : 2;
  
  // If regenerate and free quota exhausted
  if (isRegenerate && freeUsed >= planFree) {
    return {
      credits: baseCredits + 1, // +1 extra for regenerate after free quota
      needsWarning: true
    };
  }
  
  // Normal case
  return {
    credits: baseCredits,
    needsWarning: false
  };
}

// Get user's free regenerate quota based on plan
export function getUserFreeQuota(plan: string): { review: number; qa: number } {
  switch(plan) {
    case 'basic':
      return planFreeRegenerate.basic;
    case 'growth':
      return planFreeRegenerate.growth;
    case 'pro':
      return planFreeRegenerate.pro;
    default:
      return planFreeRegenerate.basic;
  }
}

// Check if regenerate is free or needs credits
export function checkRegenerateEligibility(
  userPlan: string,
  freeUsedReview: number,
  freeUsedQa: number,
  action: 'review' | 'qa'
): { isFree: boolean; remainingFree: number } {
  
  const quota = getUserFreeQuota(userPlan);
  const freeUsed = action === 'review' ? freeUsedReview : freeUsedQa;
  const maxFree = action === 'review' ? quota.review : quota.qa;
  
  return {
    isFree: freeUsed < maxFree,
    remainingFree: Math.max(0, maxFree - freeUsed)
  };
}

// Calculate lost revenue estimate
export function estimateLostRevenue(unansweredCount: number): string {
  if (unansweredCount <= 0) return '0 customers';
  if (unansweredCount <= 2) return '2-3 customers';
  if (unansweredCount <= 5) return '5-7 customers';
  return '10+ customers';
}

// Reset monthly regenerate quota
export function resetMonthlyQuota(user: any): any {
  const now = new Date();
  const lastReset = user.freeRegenerateUsed?.lastResetDate 
    ? new Date(user.freeRegenerateUsed.lastResetDate) 
    : null;
  
  // Check if last reset was more than 30 days ago
  if (!lastReset || (now.getTime() - lastReset.getTime() > 30 * 24 * 60 * 60 * 1000)) {
    return {
      ...user,
      freeRegenerateUsed: {
        review: 0,
        qa: 0,
        lastResetDate: now
      }
    };
  }
  
  return user;
}