// lib/revenue-estimator.ts
// Lost revenue estimate and 24hr checks
// ⚠️ BROWSER COMPATIBLE VERSION - No Firebase Admin

export interface RevenueEstimate {
  unansweredCount: number;
  lostCustomers: string;
  estimatedRevenue: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Estimate lost customers based on unanswered questions
export function estimateLostCustomers(unansweredCount: number): string {
  if (unansweredCount <= 0) return '0';
  if (unansweredCount === 1) return '1-2';
  if (unansweredCount <= 3) return '3-5';
  if (unansweredCount <= 5) return '5-8';
  if (unansweredCount <= 10) return '8-15';
  return '15+';
}

// Estimate lost revenue (assuming ₹500 per customer)
export function estimateLostRevenue(unansweredCount: number): string {
  const lostCustomers = estimateLostCustomers(unansweredCount);
  
  // Parse range
  if (lostCustomers.includes('-')) {
    const [min, max] = lostCustomers.split('-').map(Number);
    const minRevenue = min * 500;
    const maxRevenue = max * 500;
    return `₹${minRevenue}-${maxRevenue}`;
  } else if (lostCustomers.includes('+')) {
    const base = parseInt(lostCustomers) * 500;
    return `₹${base}+`;
  } else {
    const amount = parseInt(lostCustomers) * 500;
    return `₹${amount}`;
  }
}

// Get risk level based on unanswered count
export function getUnansweredRiskLevel(unansweredCount: number): 'low' | 'medium' | 'high' {
  if (unansweredCount === 0) return 'low';
  if (unansweredCount <= 2) return 'medium';
  return 'high';
}

// Full revenue estimate for user
export function estimateUserRevenue(unansweredCount: number): RevenueEstimate {
  return {
    unansweredCount,
    lostCustomers: estimateLostCustomers(unansweredCount),
    estimatedRevenue: estimateLostRevenue(unansweredCount),
    riskLevel: getUnansweredRiskLevel(unansweredCount)
  };
}

// Format for display
export function formatRevenueAlert(unansweredCount: number): string {
  const lostCustomers = estimateLostCustomers(unansweredCount);
  const revenue = estimateLostRevenue(unansweredCount);
  
  if (unansweredCount === 0) {
    return "✅ No unanswered questions. Great job!";
  }
  
  if (unansweredCount === 1) {
    return `⚠️ 1 unanswered question could cost you 1-2 customers (${revenue})`;
  }
  
  return `⚠️ ${unansweredCount} unanswered questions = ${lostCustomers} potential customers lost (${revenue})`;
}