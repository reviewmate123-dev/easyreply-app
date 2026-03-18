// lib/category-rules.ts
// Safe vs Manual categories define karna

export const safeCategories = [
  'Restaurant', 'Salon', 'Gym', 'Local Shop', 'Cafe', 'Bakery',
  'Retail Store', 'Electronics Store', 'Furniture Store', 'Hardware Store',
  'Pet Store', 'Bookstore', 'Gift Shop', 'Florist', 'Jeweler', 'Optician'
];

export const manualCategories = [
  'Pharmacy', 'Clinic', 'Hospital', 'Law Firm', 'Dental Clinic', 'Doctor',
  'Accountant', 'Financial Advisor', 'Insurance Agent', 'Real Estate Agent',
  'Travel Agent', 'Wedding Planner', 'Event Planner', 'Photographer',
  'Videographer', 'Graphic Designer', 'Web Designer', 'Software Developer',
  'IT Consultant', 'Marketing Consultant', 'Business Consultant'
];

export function isSafeCategory(category: string): boolean {
  return safeCategories.includes(category);
}

export function requiresManualReview(category: string): boolean {
  return manualCategories.includes(category);
}

// Get auto mode recommendation
export function getAutoModeRecommendation(category: string): {
  allowed: boolean;
  reason: string;
} {
  if (isSafeCategory(category)) {
    return {
      allowed: true,
      reason: 'Safe category - auto mode available'
    };
  }
  
  return {
    allowed: false,
    reason: 'This category requires manual review for all replies'
  };
}