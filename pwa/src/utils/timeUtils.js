/**
 * Format timestamp to human-readable "last seen" or "last updated" text
 */
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never';
  
  // Convert Firestore timestamp to Date if needed
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

/**
 * Get status emoji - if it's already an emoji, return it. Otherwise return default
 */
export const getStatusEmoji = (status) => {
  // If status is already an emoji (not a text status), return it
  if (!status) return '⚪';
  
  // Check if it's a legacy text status
  const legacyStatuses = {
    Safe: '✅',
    Busy: '🟡',
    Offline: '⚪',
    Help: '🆘'
  };
  
  // If it's a legacy status, return the emoji
  if (legacyStatuses[status]) {
    return legacyStatuses[status];
  }
  
  // Otherwise, assume it's already an emoji and return it
  return status;
};

/**
 * Get status display - emoji only, no text
 */
export const getStatusDisplay = (status) => {
  return getStatusEmoji(status);
};

