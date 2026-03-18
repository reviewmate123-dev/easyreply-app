// lib/rate-limiter.ts
// Simple rate limiting - ek minute mein kitni requests?

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// Memory mein store karo (temporary)
const store = new Map<string, RateLimitInfo>();

// Purane entries hatao har 5 minute mein
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function rateLimiter(
  identifier: string, // IP address ya user ID
  limit: number = 20,  // kitni requests allowed?
  windowMs: number = 60 * 1000 // 1 minute
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  
  const now = Date.now();
  const key = `rate:${identifier}`;
  
  let data = store.get(key);
  
  // Pehli request ya window expire ho gayi?
  if (!data || data.resetTime < now) {
    data = {
      count: 1,
      resetTime: now + windowMs
    };
    store.set(key, data);
    return { success: true, remaining: limit - 1, resetTime: data.resetTime };
  }
  
  // Limit cross?
  if (data.count >= limit) {
    return { success: false, remaining: 0, resetTime: data.resetTime };
  }
  
  // Count badhao
  data.count++;
  store.set(key, data);
  
  return { 
    success: true, 
    remaining: limit - data.count, 
    resetTime: data.resetTime 
  };
}