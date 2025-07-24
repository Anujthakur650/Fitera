/**
 * Date formatting utilities for consistent date display across the app
 */

/**
 * Format date to a friendly readable format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string (e.g., "Mon, Jul 22, 2025")
 */
export const formatDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format date to short format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string (e.g., "Jul 22, 2025")
 */
export const formatDateShort = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format date for workout names
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string (e.g., "July 22")
 */
export const formatWorkoutDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options = { 
    month: 'long', 
    day: 'numeric' 
  };
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string (e.g., "1h 23m")
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Get relative time string
 * @param {Date|string} date - Date object or date string
 * @returns {string} Relative time string (e.g., "Today", "Yesterday", "3 days ago")
 */
export const getRelativeTime = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now - dateObj;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return formatDateShort(dateObj);
  }
};

export default {
  formatDate,
  formatDateShort,
  formatWorkoutDate,
  formatDuration,
  getRelativeTime,
};
