// lib/review-security.ts
// Review ownership and location ownership checks

import { adminDb } from './firebase-admin';

/**
 * Check if review belongs to user
 */
export async function verifyReviewOwnership(
  reviewId: string,
  userId: string
): Promise<{ 
  valid: boolean; 
  review?: any; 
  error?: string 
}> {
  try {
    const reviewDoc = await adminDb.collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      return { 
        valid: false, 
        error: 'Review not found' 
      };
    }
    
    const reviewData = reviewDoc.data();
    
    if (reviewData?.userId !== userId) {
      return { 
        valid: false, 
        error: 'You do not have permission to access this review' 
      };
    }
    
    return { 
      valid: true, 
      review: reviewData 
    };
    
  } catch (error) {
    console.error('Error verifying review ownership:', error);
    return { 
      valid: false, 
      error: 'Failed to verify review ownership' 
    };
  }
}

/**
 * Check if location belongs to user
 */
export async function verifyLocationOwnership(
  locationId: string,
  userId: string
): Promise<{ 
  valid: boolean; 
  error?: string 
}> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { 
        valid: false, 
        error: 'User not found' 
      };
    }
    
    const userData = userDoc.data();
    
    if (userData?.googleLocationId !== locationId) {
      return { 
        valid: false, 
        error: 'You do not have access to this location' 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('Error verifying location ownership:', error);
    return { 
      valid: false, 
      error: 'Failed to verify location ownership' 
    };
  }
}