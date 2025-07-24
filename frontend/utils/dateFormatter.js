/**
 * Date formatting utilities for consistent date display across the app
 */

/**
 * Parse SQLite datetime format to Date object
 * @param {string|Date} date - Date string or Date object
 * @returns {Date} Date object
 */
export const parseSQLiteDate = (date) => {
  if (date instanceof Date) return date;
  
  // SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
  const parts = date.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (parts) {
    return new Date(
      parseInt(parts[1]),     // year
      parseInt(parts[2]) - 1, // month (0-indexed)
      parseInt(parts[3]),     // day
      parseInt(parts[4]),     // hour
      parseInt(parts[5]),     // minute
      parseInt(parts[6])      // second
    );
  }
  
  // Fallback to standard parsing
  return new Date(date);
};

/**
 * Format date to a friendly readable format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string (e.g., "Mon, Jul 22, 2025")
 */
export const formatDate = (date) => {
  const dateObj = parseSQLiteDate(date);
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
  const dateObj = parseSQLiteDate(date);
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
  // If date is a Date object, use it directly to preserve timezone
  const dateObj = date instanceof Date ? date : parseSQLiteDate(date);
  const options = { 
    month: 'long', 
    day: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use local timezone
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
  // Use the consistent date parsing function
  const dateObj = parseSQLiteDate(date);
  
  // Ensure we have a valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  
  // Set both dates to start of day in local timezone for accurate day comparison
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  const diffInMs = nowStart - dateStart;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays === -1) {
    return 'Tomorrow';
  } else if (diffInDays < 0) {
    // Future dates
    return formatDateShort(dateObj);
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
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
