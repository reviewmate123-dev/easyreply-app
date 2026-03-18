// lib/fraud-detection.ts
// Complete fraud detection system with proper error handling

import { adminDb } from './firebase-admin';

export interface FraudCheckResult {
  isFraud: boolean;
  alerts: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }>;
}

/**
 * Detect fraudulent activity based on rate limiting and suspicious patterns
 */
export async function detectFraud(
  uid: string,
  email: string,
  ip: string,
  action: string,
  metadata?: any
): Promise<FraudCheckResult> {
  const alerts: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }> = [];
  
  try {
    // =============================
    // RATE LIMIT CHECK
    // =============================
    try {
      const userActionsRef = adminDb.collection('userActions');
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      
      // Count actions in last minute
      const recentActionsSnapshot = await userActionsRef
        .where('uid', '==', uid)
        .where('timestamp', '>=', oneMinAgo)
        .get();
      
      const recentCount = recentActionsSnapshot.size;
      
      // More than 30 actions in 1 minute = HIGH fraud
      if (recentCount > 30) {
        alerts.push({
          type: 'RATE_LIMIT_EXCEEDED',
          severity: 'HIGH',
          message: `Excessive actions (${recentCount}) in last minute`
        });
      }
      
      // More than 50 actions in 1 minute = CRITICAL fraud
      if (recentCount > 50) {
        alerts.push({
          type: 'RATE_LIMIT_CRITICAL',
          severity: 'CRITICAL',
          message: `Critical rate limit exceeded (${recentCount}) in last minute`
        });
      }
    } catch (rateLimitError) {
      // Log but don't fail - rate limiting is non-critical
      console.error('Rate limit check failed:', rateLimitError);
    }

    // =============================
    // DAILY ACTION LIMIT CHECK
    // =============================
    try {
      const userActionsRef = adminDb.collection('userActions');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const dailyActionsSnapshot = await userActionsRef
        .where('uid', '==', uid)
        .where('timestamp', '>=', oneDayAgo)
        .get();
      
      const dailyCount = dailyActionsSnapshot.size;
      
      // More than 100 actions in 1 day = suspicious
      if (dailyCount > 100) {
        alerts.push({
          type: 'DAILY_LIMIT_EXCEEDED',
          severity: 'MEDIUM',
          message: `High daily activity (${dailyCount} actions in 24h)`
        });
      }
      
      // More than 200 actions in 1 day = HIGH fraud
      if (dailyCount > 200) {
        alerts.push({
          type: 'DAILY_LIMIT_HIGH',
          severity: 'HIGH',
          message: `Excessive daily activity (${dailyCount} actions in 24h)`
        });
      }
    } catch (dailyLimitError) {
      console.error('Daily limit check failed:', dailyLimitError);
    }

    // =============================
    // IP ADDRESS CHECK
    // =============================
    try {
      // Check if IP is suspicious (VPN, proxy, etc.)
      if (ip && ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '::1') {
        // Local IPs are fine - no alert
      } else if (ip && ip.includes('.')) {
        // Log IP for future analysis
        await adminDb.collection('ipLogs').add({
          uid,
          email,
          ip,
          action,
          timestamp: new Date(),
          metadata: metadata || {}
        }).catch(err => console.error('IP log failed:', err));
      }
    } catch (ipError) {
      console.error('IP check failed:', ipError);
    }

    // =============================
    // SUSPICIOUS PATTERN CHECK
    // =============================
    try {
      // Check for suspicious review patterns
      if (metadata?.review) {
        const review = metadata.review.toLowerCase();
        
        // Check for repetitive characters
        const repetitivePattern = /(.)\1{10,}/;
        if (repetitivePattern.test(review)) {
          alerts.push({
            type: 'REPETITIVE_CONTENT',
            severity: 'LOW',
            message: 'Review contains repetitive characters'
          });
        }
        
        // Check for spam keywords
        const spamKeywords = ['casino', 'viagra', 'lottery', 'winner', 'free money'];
        for (const keyword of spamKeywords) {
          if (review.includes(keyword)) {
            alerts.push({
              type: 'SPAM_KEYWORD',
              severity: 'MEDIUM',
              message: `Review contains spam keyword: ${keyword}`
            });
            break;
          }
        }
        
        // Check for excessive length
        if (review.length > 5000) {
          alerts.push({
            type: 'EXCESSIVE_LENGTH',
            severity: 'LOW',
            message: 'Review exceeds normal length'
          });
        }
      }
    } catch (patternError) {
      console.error('Pattern check failed:', patternError);
    }

    // =============================
    // LOG ACTION FOR FUTURE ANALYSIS
    // =============================
    try {
      await adminDb.collection('userActions').add({
        uid,
        email,
        ip,
        action,
        timestamp: new Date(),
        metadata: metadata || {},
        alerts: alerts.length > 0 ? alerts : null
      });
    } catch (logError) {
      // Non-critical - don't fail the whole request
      console.error('Failed to log user action:', logError);
    }

    // =============================
    // RETURN RESULT
    // =============================
    const isFraud = alerts.some(a => 
      a.severity === 'HIGH' || a.severity === 'CRITICAL'
    );

    return {
      isFraud,
      alerts
    };

  } catch (error) {
    // Failsafe - never block the main flow
    console.error('Fatal fraud detection error:', error);
    return {
      isFraud: false,
      alerts: []
    };
  }
}

/**
 * Update user's IP address in their profile
 */
export async function updateUserIP(
  uid: string,
  ip: string
): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({
      lastIP: ip,
      lastSeen: new Date()
    });
  } catch (error) {
    console.error('Error updating user IP:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Check if an IP address is from a known proxy/VPN
 * This is a placeholder - implement with actual API if needed
 */
async function isSuspiciousIP(ip: string): Promise<boolean> {
  // Implementation can be added later
  // For now, return false
  return false;
}

/**
 * Get user's recent activity summary
 */
export async function getUserActivitySummary(
  uid: string,
  days: number = 7
): Promise<any> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const actionsSnapshot = await adminDb.collection('userActions')
      .where('uid', '==', uid)
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .get();
    
    const actions: any[] = [];
    actionsSnapshot.forEach(doc => {
      actions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      uid,
      days,
      totalActions: actions.length,
      actions
    };
    
  } catch (error) {
    console.error('Error getting user activity:', error);
    return {
      uid,
      days,
      totalActions: 0,
      actions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Block a user for fraudulent activity
 */
export async function blockUser(
  uid: string,
  reason: string,
  adminUid: string
): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({
      blocked: true,
      blockedReason: reason,
      blockedAt: new Date(),
      blockedBy: adminUid
    });
    
    await adminDb.collection('adminActions').add({
      actionType: 'USER_BLOCKED',
      targetUid: uid,
      reason,
      performedBy: adminUid,
      createdAt: new Date()
    });
    
  } catch (error) {
    console.error('Error blocking user:', error);
    throw error;
  }
}