export type ReviewStatus =
  | 'new'
  | 'ai_generated'
  | 'approved'
  | 'posted'
  | 'failed';

export function canTransitionTo(
  currentStatus: ReviewStatus,
  newStatus: ReviewStatus
): boolean {
  const allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
    new: ['ai_generated', 'failed'],
    ai_generated: ['approved', 'failed', 'new'],
    approved: ['posted', 'failed'],
    posted: ['new'],
    failed: ['new', 'ai_generated']
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

export function getStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    new: 'New Review',
    ai_generated: 'AI Reply Ready',
    approved: 'Approved',
    posted: 'Posted to Google',
    failed: 'Failed'
  };

  return labels[status];
}

export function getStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    new: 'bg-blue-100 text-blue-800',
    ai_generated: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    posted: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800'
  };

  return colors[status];
}

export function needsAttention(status: ReviewStatus): boolean {
  return status === 'new' || status === 'failed';
}

export function getNextAction(status: ReviewStatus): string {
  const actions: Record<ReviewStatus, string> = {
    new: 'Generate AI reply',
    ai_generated: 'Review and approve',
    approved: 'Post to Google',
    posted: 'Completed',
    failed: 'Retry'
  };

  return actions[status];
}

export function canPostToGoogle(status: ReviewStatus): boolean {
  return status === 'approved' || status === 'ai_generated';
}
