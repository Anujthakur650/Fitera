// API Configuration
// Firebase is now used for authentication instead of a custom backend
// For other API needs (workout data, etc.), configure your production API here
const DEV_API_URL = 'https://api.fitera.app'; // Replace with your API URL
const PROD_API_URL = 'https://api.fitera.app'; // Replace with your production API

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const API_BASE_URL = API_URL; // Alias for compatibility
export const API_TIMEOUT = 10000;
export const MAX_RETRY_ATTEMPTS = 3;

// App Configuration
export const APP_NAME = 'StrongClone';
export const ENV_TYPE = __DEV__ ? 'development' : 'production';

// Feature Flags
export const ENABLE_DEBUG_MODE = __DEV__;
export const ENABLE_ANALYTICS = !__DEV__;
export const ENABLE_CRASH_REPORTING = !__DEV__;
export const ENABLE_BIOMETRIC_AUTH = true;
export const ENABLE_SECURE_STORAGE = true;

// Helper functions
export const isDevelopment = () => ENV_TYPE === 'development';
export const isProduction = () => ENV_TYPE === 'production';
export const isTest = () => ENV_TYPE === 'test';

// Environment validation
if (!API_URL) {
  console.warn('⚠️ API_URL not configured properly');
}

// Log configuration in development
if (ENABLE_DEBUG_MODE) {
  console.log('📱 App Configuration:', {
    API_URL,
    ENV_TYPE,
    APP_NAME,
    Features: {
      DEBUG: ENABLE_DEBUG_MODE,
      ANALYTICS: ENABLE_ANALYTICS,
      CRASH_REPORTING: ENABLE_CRASH_REPORTING,
      BIOMETRIC: ENABLE_BIOMETRIC_AUTH,
      SECURE_STORAGE: ENABLE_SECURE_STORAGE
    }
  });
}
