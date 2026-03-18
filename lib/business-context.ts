// lib/business-context.ts
// Business profile ka context store karta hai - brand tone, category, city etc.

export interface BusinessContext {
  businessName: string;
  category: string;
  tone: 'friendly' | 'formal' | 'confident';
  description: string;
  city: string;
  keywords: string[];
  language: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  locationId: string;
  name: string;
  address?: string;
  businessContext?: BusinessContext;
  isActive?: boolean;
}

export const defaultBusinessContext: BusinessContext = {
  businessName: '',
  category: '',
  tone: 'friendly',
  description: '',
  city: '',
  keywords: [],
  language: ['english'],
  createdAt: new Date(),
  updatedAt: new Date()
};

// Category list for dropdown
export const businessCategories = [
  // Safe Categories
  'Restaurant', 'Salon', 'Gym', 'Local Shop', 'Cafe', 'Bakery',
  'Retail Store', 'Electronics Store', 'Furniture Store', 'Hardware Store',
  'Pet Store', 'Bookstore', 'Gift Shop', 'Florist', 'Jeweler', 'Optician',
  
  // Manual Categories
  'Pharmacy', 'Clinic', 'Hospital', 'Law Firm', 'Dental Clinic', 'Doctor',
  'Accountant', 'Financial Advisor', 'Insurance Agent', 'Real Estate Agent',
  'Travel Agent', 'Wedding Planner', 'Event Planner', 'Photographer',
  'Videographer', 'Graphic Designer', 'Web Designer', 'Software Developer',
  'IT Consultant', 'Marketing Consultant', 'Business Consultant'
];

// Tone options
export const toneOptions = [
  { value: 'friendly', label: 'Friendly & Warm' },
  { value: 'formal', label: 'Formal & Professional' },
  { value: 'confident', label: 'Confident & Authoritative' }
];

// Language options
export const languageOptions = [
  { value: 'english', label: 'English Only' },
  { value: 'hindi', label: 'English + Hindi' },
  { value: 'custom', label: 'Custom Mix' }
];

// ✅ NEW: Get profile-specific business context
export function getProfileContext(
  profiles: Profile[],
  activeLocationId: string | null
): BusinessContext | null {
  if (!activeLocationId || profiles.length === 0) return null;
  
  const activeProfile = profiles.find(p => p.locationId === activeLocationId);
  return activeProfile?.businessContext || null;
}

// ✅ NEW: Update profile business context
export function updateProfileContext(
  profiles: Profile[],
  locationId: string,
  newContext: BusinessContext
): Profile[] {
  return profiles.map(profile => {
    if (profile.locationId === locationId) {
      return {
        ...profile,
        businessContext: {
          ...newContext,
          updatedAt: new Date()
        }
      };
    }
    return profile;
  });
}

// ✅ NEW: Add new profile
export function addProfile(
  profiles: Profile[],
  newProfile: Profile
): Profile[] {
  // Check if profile already exists
  const exists = profiles.some(p => p.locationId === newProfile.locationId);
  if (exists) return profiles;
  
  return [...profiles, newProfile];
}

// ✅ NEW: Remove profile
export function removeProfile(
  profiles: Profile[],
  locationId: string
): Profile[] {
  return profiles.filter(p => p.locationId !== locationId);
}