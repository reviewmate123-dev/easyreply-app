// lib/sensitive-keywords.ts
// Blocklist for sensitive terms

export const sensitiveKeywords = [
  // Legal
  'legal', 'lawyer', 'attorney', 'lawsuit', 'court', 'police', 'complaint',
  'fraud', 'scam', 'cheating', 'illegal', 'crime', 'criminal',
  
  // Medical
  'medical advice', 'doctor', 'surgery', 'prescription', 'medicine', 'diagnosis',
  'treatment', 'symptom', 'cure', 'pain', 'fever', 'infection', 'allergic',
  'side effect', 'overdose', 'suicide', 'death', 'emergency room', 'ambulance',
  'hospital', 'clinic', 'pharmacy', 'drug', 'medication', 'pill', 'tablet',
  'injection', 'surgery', 'operation', 'transplant', 'implant',
  
  // Financial
  'price', 'cost', 'fee', 'refund', 'guarantee', 'warranty', 'insurance',
  'emi', 'loan', 'interest', 'payment', 'cash', 'credit', 'debit',
  
  // Sensitive topics
  'accident', 'injury', 'death', 'emergency', 'crisis', 'disaster',
  'alcohol', 'smoking', 'drugs', 'gambling', 'casino',
  'political', 'religion', 'caste', 'communal',
  
  // Negative
  'worst', 'terrible', 'awful', 'horrible', 'disgusting', 'dirty',
  'unhygienic', 'stale', 'rotten', 'poison', 'sick', 'vomit',
  'cheating', 'overpriced', 'expensive', 'money back', 'refund'
];

// Check if text contains sensitive keywords
export function containsSensitiveKeywords(text: string): {
  hasSensitive: boolean;
  matchedKeywords: string[];
} {
  const lowerText = text.toLowerCase();
  const matched = sensitiveKeywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  return {
    hasSensitive: matched.length > 0,
    matchedKeywords: matched
  };
}

// Get risk level based on keywords
export function getRiskLevel(text: string): 'low' | 'medium' | 'high' {
  const lowerText = text.toLowerCase();
  
  // High risk keywords
  const highRisk = ['scam', 'fraud', 'cheating', 'illegal', 'crime', 
                    'emergency', 'accident', 'death', 'suicide', 'poison'];
  
  // Medium risk keywords
  const mediumRisk = ['complaint', 'refund', 'overpriced', 'expensive', 
                      'dirty', 'unhygienic', 'stale', 'rotten'];
  
  if (highRisk.some(k => lowerText.includes(k))) {
    return 'high';
  }
  
  if (mediumRisk.some(k => lowerText.includes(k))) {
    return 'medium';
  }
  
  return 'low';
}