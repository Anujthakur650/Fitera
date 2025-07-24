/**
 * Production Configuration Helper
 * Centralizes all production environment settings
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Load environment variables with fallbacks
const getEnvVar = (key, fallback = '') => {
  return process.env[key] || Constants.expoConfig?.extra?.[key] || fallback;
};

// Production Configuration
export const ProductionConfig = {
  // Application Info
  app: {
    name: getEnvVar('APP_NAME', 'Fitera'),
    version: getEnvVar('APP_VERSION', '1.0.0'),
    buildNumber: getEnvVar('BUILD_NUMBER', '1'),
    environment: isProduction ? 'production' : 'development',
    isProduction,
    isDevelopment,
  },

  // API Configuration
  api: {
    baseUrl: isProduction 
      ? getEnvVar('API_BASE_URL', 'https://api.fitera.com')
      : 'http://localhost:3000',
    version: getEnvVar('API_VERSION', 'v1'),
    timeout: parseInt(getEnvVar('API_TIMEOUT', '30000')),
    retryAttempts: parseInt(getEnvVar('MAX_RETRY_ATTEMPTS', '3')),
    enableRequestLogging: !isProduction,
  },

  // Security Configuration
  security: {
    enableHTTPS: isProduction || getEnvVar('ENABLE_HTTPS_ENFORCEMENT', 'true') === 'true',
    enableCertificatePinning: isProduction && getEnvVar('ENABLE_CERTIFICATE_PINNING', 'true') === 'true',
    enableSecurityHeaders: getEnvVar('ENABLE_SECURITY_HEADERS', 'true') === 'true',
    enableRateLimiting: getEnvVar('ENABLE_RATE_LIMITING', 'true') === 'true',
    enableDebugMode: !isProduction && getEnvVar('ENABLE_DEBUG_MODE', 'false') === 'true',
    enableSecureStorage: getEnvVar('ENABLE_SECURE_STORAGE', 'true') === 'true',
    enableBiometricAuth: getEnvVar('ENABLE_BIOMETRIC_AUTH', 'true') === 'true',
  },

  // Database Configuration
  database: {
    name: getEnvVar('DATABASE_NAME', 'fitera_prod.db'),
    version: parseInt(getEnvVar('DATABASE_VERSION', '1')),
    enableEncryption: isProduction && getEnvVar('ENABLE_DATABASE_ENCRYPTION', 'true') === 'true',
    enableForeignKeys: getEnvVar('ENABLE_FOREIGN_KEYS', 'true') === 'true',
    enableWALMode: getEnvVar('ENABLE_WAL_MODE', 'true') === 'true',
    cacheSize: parseInt(getEnvVar('DATABASE_CACHE_SIZE', '10000')),
  },

  // Logging Configuration
  logging: {
    level: isProduction ? 'error' : 'debug',
    enableCrashReporting: isProduction && getEnvVar('ENABLE_CRASH_REPORTING', 'true') === 'true',
    enableAnalytics: isProduction && getEnvVar('ENABLE_ANALYTICS', 'true') === 'true',
    enableSecurityAudit: getEnvVar('ENABLE_SECURITY_AUDIT', 'true') === 'true',
    securityLogRetentionDays: parseInt(getEnvVar('SECURITY_LOG_RETENTION_DAYS', '90')),
    errorLogRetentionDays: parseInt(getEnvVar('ERROR_LOG_RETENTION_DAYS', '30')),
  },

  // Performance Configuration
  performance: {
    enableCache: getEnvVar('ENABLE_CACHE', 'true') === 'true',
    cacheSizeMB: parseInt(getEnvVar('CACHE_SIZE_MB', '50')),
    imageCacheSizeMB: parseInt(getEnvVar('IMAGE_CACHE_SIZE_MB', '100')),
    enableLazyLoading: getEnvVar('ENABLE_LAZY_LOADING', 'true') === 'true',
    enablePerformanceMonitoring: isProduction && getEnvVar('ENABLE_PERFORMANCE_MONITORING', 'true') === 'true',
  },

  // Feature Flags
  features: {
    enableOfflineMode: getEnvVar('ENABLE_OFFLINE_MODE', 'true') === 'true',
    enableCloudSync: getEnvVar('ENABLE_CLOUD_SYNC', 'true') === 'true',
    enablePushNotifications: getEnvVar('ENABLE_PUSH_NOTIFICATIONS', 'true') === 'true',
    enableSocialFeatures: getEnvVar('ENABLE_SOCIAL_FEATURES', 'false') === 'true',
    enablePremiumFeatures: getEnvVar('ENABLE_PREMIUM_FEATURES', 'true') === 'true',
  },

  // Third Party Services
  services: {
    sentryDSN: isProduction ? getEnvVar('SENTRY_DSN', '') : '',
    analyticsKey: isProduction ? getEnvVar('ANALYTICS_KEY', '') : '',
    crashReportingKey: isProduction ? getEnvVar('CRASH_REPORTING_KEY', '') : '',
    pushNotificationKey: isProduction ? getEnvVar('PUSH_NOTIFICATION_KEY', '') : '',
  },

  // CDN Configuration
  cdn: {
    baseUrl: getEnvVar('CDN_BASE_URL', 'https://cdn.fitera.com'),
    assetVersion: getEnvVar('ASSET_VERSION', '1.0.0'),
    enableFallback: getEnvVar('ENABLE_CDN_FALLBACK', 'true') === 'true',
  },

  // Support Configuration
  support: {
    email: getEnvVar('SUPPORT_EMAIL', 'support@fitera.com'),
    privacyPolicyUrl: getEnvVar('PRIVACY_POLICY_URL', 'https://fitera.com/privacy'),
    termsOfServiceUrl: getEnvVar('TERMS_OF_SERVICE_URL', 'https://fitera.com/terms'),
    helpCenterUrl: getEnvVar('HELP_CENTER_URL', 'https://help.fitera.com'),
  },

  // Certificate Pinning
  certificates: {
    pins: isProduction ? [
      getEnvVar('CERT_PIN_PRIMARY', ''),
      getEnvVar('CERT_PIN_BACKUP', ''),
    ].filter(Boolean) : [],
  },

  // Rate Limiting
  rateLimiting: {
    auth: {
      requests: parseInt(getEnvVar('RATE_LIMIT_AUTH_REQUESTS', '5')),
      windowSeconds: parseInt(getEnvVar('RATE_LIMIT_AUTH_WINDOW', '900')),
    },
    api: {
      requests: parseInt(getEnvVar('RATE_LIMIT_API_REQUESTS', '100')),
      windowSeconds: parseInt(getEnvVar('RATE_LIMIT_API_WINDOW', '60')),
    },
  },

  // Monitoring
  monitoring: {
    healthCheckUrl: getEnvVar('HEALTH_CHECK_URL', 'https://api.fitera.com/health'),
    statusPageUrl: getEnvVar('STATUS_PAGE_URL', 'https://status.fitera.com'),
  },
};

// Production validation
export const validateProductionConfig = () => {
  const errors = [];
  const warnings = [];

  // Critical checks
  if (isProduction) {
    if (!ProductionConfig.api.baseUrl.startsWith('https://')) {
      errors.push('Production API URL must use HTTPS');
    }

    if (!ProductionConfig.services.sentryDSN) {
      warnings.push('Sentry DSN not configured for production error tracking');
    }

    if (!ProductionConfig.services.analyticsKey) {
      warnings.push('Analytics key not configured for production');
    }

    if (ProductionConfig.certificates.pins.length === 0) {
      warnings.push('Certificate pinning not configured for production');
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
};

// Device-specific configuration
export const getDeviceConfig = () => {
  return {
    isDevice: Device.isDevice,
    deviceName: Device.deviceName,
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    deviceYearClass: Device.deviceYearClass,
  };
};

// Export production-ready API configuration
export const getAPIConfig = () => {
  const config = {
    baseURL: ProductionConfig.api.baseUrl,
    timeout: ProductionConfig.api.timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Version': ProductionConfig.app.version,
      'X-Platform': Device.osName,
      'X-Device-Id': Constants.deviceId || 'unknown',
    },
  };

  // Add security headers in production
  if (isProduction && ProductionConfig.security.enableSecurityHeaders) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['X-App-Environment'] = 'production';
  }

  return config;
};

// Log configuration (only in development)
if (isDevelopment) {
  console.log('🔧 Production Configuration Loaded:', {
    environment: ProductionConfig.app.environment,
    apiUrl: ProductionConfig.api.baseUrl,
    securityEnabled: ProductionConfig.security.enableHTTPS,
    features: ProductionConfig.features,
  });
}

export default ProductionConfig;
