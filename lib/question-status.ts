// lib/question-status.ts
// Question status management

export type QuestionStatus = 
  | 'pending'           // New question from Google
  | 'ai_generated'      // AI reply generated
  | 'approved'          // User approved (manual)
  | 'posted'            // Posted to Google
  | 'failed'            // Failed to post
  | 'external_replied'; // Already answered on Google

export interface Question {
  id: string;
  uid: string;
  locationId: string;
  text: string;
  askerName: string;
  status: QuestionStatus;
  aiReply?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
  createdAt: Date;
  answeredAt?: Date;
  postedAt?: Date;
  regenerateCount: number;
}

// Status transition rules
export function canTransitionTo(
  currentStatus: QuestionStatus,
  newStatus: QuestionStatus
): boolean {
  
  const allowedTransitions: Record<QuestionStatus, QuestionStatus[]> = {
    pending: ['ai_generated', 'external_replied', 'posted'],
    ai_generated: ['approved', 'posted', 'pending'],
    approved: ['posted', 'pending'],
    posted: ['pending'],  // Only if repost needed
    failed: ['pending', 'ai_generated'],
    external_replied: ['pending']  // Can override if needed
  };
  
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

// Get status label for UI
export function getStatusLabel(status: QuestionStatus): string {
  const labels: Record<QuestionStatus, string> = {
    pending: 'Pending',
    ai_generated: 'AI Generated',
    approved: 'Approved',
    posted: 'Posted',
    failed: 'Failed',
    external_replied: 'External Reply'
  };
  return labels[status];
}

// Get status color for UI badges
export function getStatusColor(status: QuestionStatus): string {
  const colors: Record<QuestionStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ai_generated: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    posted: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
    external_replied: 'bg-purple-100 text-purple-800'
  };
  return colors[status];
}