import Config from 'react-native-config';

// API Configuration
export const API_URL = Config.API_URL || 'http://localhost:5000/api';
export const API_TIMEOUT = parseInt(Config.API_TIMEOUT || '10000', 10);
export const MAX_RETRY_ATTEMPTS = parseInt(Config.MAX_RETRY_ATTEMPTS || '3', 10);

// App Configuration
export const APP_NAME = Config.APP_NAME || 'StrongClone';
export const ENV_TYPE = Config.ENV_TYPE || 'development';

// Feature Flags
export const ENABLE_DEBUG_MODE = Config.ENABLE_DEBUG_MODE === 'true';
export const ENABLE_ANALYTICS = Config.ENABLE_ANALYTICS === 'true';
export const ENABLE_CRASH_REPORTING = Config.ENABLE_CRASH_REPORTING === 'true';
export const ENABLE_BIOMETRIC_AUTH = Config.ENABLE_BIOMETRIC_AUTH === 'true';
export const ENABLE_SECURE_STORAGE = Config.ENABLE_SECURE_STORAGE === 'true';

// Helper functions
export const isDevelopment = () => ENV_TYPE === 'development';
export const isProduction = () => ENV_TYPE === 'production';
export const isTest = () => ENV_TYPE === 'test';

// Environment validation
if (!Config.API_URL) {
  console.warn('⚠️ API_URL not configured in environment variables');
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
