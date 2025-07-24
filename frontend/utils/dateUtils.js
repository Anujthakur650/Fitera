export const formatDate = (date) => {
  // Ensure we're working with a proper Date object in local timezone
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Get local timezone components to avoid UTC conversion issues
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  
  return dateObj.toLocaleDateString('en-US', options);
};

export const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const formatWorkoutDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
