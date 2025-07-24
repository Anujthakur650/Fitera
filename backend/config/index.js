/**
 * Centralized Configuration Module
 * Provides validated configuration to all parts of the application
 */

const validateEnvironment = require('./validateEnv');

// Validate and get configuration on module load
const config = validateEnvironment();

// Export individual config sections for easier access
module.exports = {
  // Full config object
  ...config,
  
  // Convenience methods
  isDevelopment: () => config.server.env === 'development',
  isProduction: () => config.server.env === 'production',
  isTest: () => config.server.env === 'test',
  
  // Formatted connection strings
  getMongoUri: () => config.mongodb.uri,
  getJwtSecret: () => config.jwt.secret,
  getFrontendUrl: () => config.server.frontendUrl,
  
  // API configuration helpers
  getApiPrefix: () => config.api.prefix || '/api',
  getApiVersion: () => config.api.version || 'v1',
  getFullApiPrefix: () => `${config.api.prefix}/${config.api.version}`,
  
  // Security helpers
  getBcryptRounds: () => config.security.bcryptRounds,
  getSessionSecret: () => config.security.sessionSecret,
  getRateLimitConfig: () => config.security.rateLimit,
  
  // Feature flags (can be extended)
  features: {
    emailEnabled: () => !!(config.email.host && config.email.user && config.email.pass),
    awsEnabled: () => !!(config.aws.accessKeyId && config.aws.secretAccessKey),
    loggingEnabled: () => config.logging.level !== 'none'
  }
};
