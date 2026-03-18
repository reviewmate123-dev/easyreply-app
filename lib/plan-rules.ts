// lib/plan-rules.ts
// Plan-based rules for fetch and alerts

export type PlanType = 'basic' | 'growth' | 'pro';

export interface PlanRules {
  name: string;
  price: number;
  credits: number;
  freeRegenerate: {
    review: number;
    qa: number;
  };
  autoFetch: {
    enabled: boolean;
    interval: number; // minutes
    priority: 'low' | 'medium' | 'high';
  };
  alerts: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  features: {
    multiProfile: number;
    competitorTracking: boolean;
    exportReports: boolean;
    importReports: boolean;
    seoKeywords: boolean;
    autoGenerate: boolean;
    bulkGenerate: boolean; // future
  };
}

export const planRules: Record<PlanType, PlanRules> = {
  basic: {
    name: 'Basic',
    price: 499,
    credits: 70,
    freeRegenerate: {
      review: 1,
      qa: 1
    },
    autoFetch: {
      enabled: true,
      interval: 60, // 1 hour
      priority: 'low'
    },
    alerts: {
      email: false,
      whatsapp: false,
      push: false
    },
    features: {
      multiProfile: 1,
      competitorTracking: false,
      exportReports: false,
      importReports: false,
      seoKeywords: false,
      autoGenerate: true,
      bulkGenerate: false
    }
  },
  growth: {
    name: 'Growth',
    price: 799,
    credits: 160,
    freeRegenerate: {
      review: 3,
      qa: 3
    },
    autoFetch: {
      enabled: true,
      interval: 30, // 30 minutes
      priority: 'medium'
    },
    alerts: {
      email: true,
      whatsapp: false,
      push: true
    },
    features: {
      multiProfile: 3,
      competitorTracking: true,
      exportReports: true,
      importReports: true,
      seoKeywords: true,
      autoGenerate: true,
      bulkGenerate: false
    }
  },
  pro: {
    name: 'Pro',
    price: 1099,
    credits: 250,
    freeRegenerate: {
      review: 5,
      qa: 5
    },
    autoFetch: {
      enabled: true,
      interval: 15, // 15 minutes
      priority: 'high'
    },
    alerts: {
      email: true,
      whatsapp: true,
      push: true
    },
    features: {
      multiProfile: 5,
      competitorTracking: true,
      exportReports: true,
      importReports: true,
      seoKeywords: true,
      autoGenerate: true,
      bulkGenerate: false
    }
  }
};

// Get plan rules for a user
export function getUserPlanRules(plan: string): PlanRules {
  switch (plan) {
    case 'growth':
      return planRules.growth;
    case 'pro':
      return planRules.pro;
    default:
      return planRules.basic;
  }
}

// Check if auto fetch should run for this user
export function shouldAutoFetch(
  plan: string,
  lastFetchTime: Date | null
): { shouldFetch: boolean; reason: string } {
  const rules = getUserPlanRules(plan);

  if (!rules.autoFetch.enabled) {
    return {
      shouldFetch: false,
      reason: 'Auto fetch disabled for plan'
    };
  }

  if (!lastFetchTime) {
    return {
      shouldFetch: true,
      reason: 'First time fetch'
    };
  }

  const now = new Date();
  const minutesSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);

  if (minutesSinceLastFetch >= rules.autoFetch.interval) {
    return {
      shouldFetch: true,
      reason: `Interval exceeded (${minutesSinceLastFetch.toFixed(0)} min)`
    };
  }

  return {
    shouldFetch: false,
    reason: `Next fetch in ${(rules.autoFetch.interval - minutesSinceLastFetch).toFixed(0)} minutes`
  };
}

// Get fetch interval for plan
export function getFetchInterval(plan: string): number {
  return getUserPlanRules(plan).autoFetch.interval;
}

// Get fetch priority for plan
export function getFetchPriority(plan: string): 'low' | 'medium' | 'high' {
  return getUserPlanRules(plan).autoFetch.priority;
}

// ✅ FIXED: Check if feature is enabled for plan
export function hasFeature(
  plan: string,
  feature: keyof PlanRules['features']
): boolean {
  const rules = getUserPlanRules(plan);
  const featureValue = rules.features[feature];
  
  // Agar featureValue boolean hai to directly return karo
  // Agar number hai to check karo ki > 0 hai ya nahi
  if (typeof featureValue === 'boolean') {
    return featureValue;
  } else if (typeof featureValue === 'number') {
    return featureValue > 0;
  } else {
    return false;
  }
}

// ✅ NEW: Helper function for multi-profile check
export function getMaxProfiles(plan: string): number {
  return getUserPlanRules(plan).features.multiProfile;
}

// ✅ NEW: Check if user can add another profile
export function canAddProfile(plan: string, currentProfiles: number): boolean {
  const maxProfiles = getMaxProfiles(plan);
  return currentProfiles < maxProfiles;
}