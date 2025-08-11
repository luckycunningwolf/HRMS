// Indian Standard Time utilities
export const IST_TIMEZONE = 'Asia/Kolkata';

// Get current date/time in IST
export const getCurrentISTDate = () => {
  return new Date().toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE
  });
};

// Get current date in IST (date only)
export const getCurrentISTDateOnly = () => {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-'); // Convert to YYYY-MM-DD for input fields
};

// Format date to DD-MM-YYYY
export const formatDateToDDMMYYYY = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Format date to DD MMM YYYY (e.g., 15 Dec 2024)
export const formatDateToReadable = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Format full date and time in IST
export const formatDateTimeIST = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Format time only in IST
export const formatTimeIST = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Get time ago in IST context
export const getTimeAgoIST = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateToDDMMYYYY(date);
};

// Calculate tenure from joining date
export const calculateTenureFromJoining = (joiningDate) => {
  if (!joiningDate) return '0m';
  
  const joining = new Date(joiningDate);
  const now = new Date();
  
  let years = now.getFullYear() - joining.getFullYear();
  let months = now.getMonth() - joining.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years > 0) {
    return `${years}y ${months}m`;
  } else {
    return `${months}m`;
  }
};

// Get current IST time for display
export const getCurrentISTTime = () => {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Get current IST date for display
export const getCurrentISTDateDisplay = () => {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Convert date for form inputs (YYYY-MM-DD format required by HTML date inputs)
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
