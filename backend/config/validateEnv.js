/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before starting the application
 */

const requiredEnvVars = {
  // Critical security variables (no defaults allowed)
  critical: [
    'JWT_SECRET',
    'MONGODB_URI'
  ],
  
  // Required variables with acceptable defaults
  required: [
    { name: 'PORT', default: '5000' },
    { name: 'NODE_ENV', default: 'development' },
    { name: 'JWT_EXPIRE', default: '30d' },
    { name: 'FRONTEND_URL', default: 'http://localhost:19006' },
    { name: 'BCRYPT_ROUNDS', default: '10' },
    { name: 'RATE_LIMIT_WINDOW_MS', default: '900000' },
    { name: 'RATE_LIMIT_MAX_REQUESTS', default: '100' }
  ],
  
  // Optional variables
  optional: [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_BUCKET_NAME',
    'AWS_REGION',
    'SESSION_SECRET',
    'LOG_LEVEL',
    'LOG_FORMAT',
    'API_VERSION',
    'API_PREFIX'
  ]
};

/**
 * Validate environment variables
 * @throws {Error} If critical environment variables are missing
 */
function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  const errors = [];
  const warnings = [];
  
  // Check critical variables
  requiredEnvVars.critical.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`❌ Critical: ${varName} is not set`);
    } else {
      // Additional validation for specific variables
      if (varName === 'JWT_SECRET' && process.env[varName].length < 32) {
        errors.push(`❌ Critical: JWT_SECRET must be at least 32 characters long`);
      }
      
      if (varName === 'MONGODB_URI' && !process.env[varName].startsWith('mongodb')) {
        errors.push(`❌ Critical: MONGODB_URI must be a valid MongoDB connection string`);
      }
    }
  });
  
  // Check required variables with defaults
  requiredEnvVars.required.forEach(({ name, default: defaultValue }) => {
    if (!process.env[name]) {
      process.env[name] = defaultValue;
      warnings.push(`⚠️  Warning: ${name} not set, using default: ${defaultValue}`);
    }
  });
  
  // Check for insecure values
  if (process.env.JWT_SECRET && (
    process.env.JWT_SECRET.includes('your_') ||
    process.env.JWT_SECRET.includes('test_') ||
    process.env.JWT_SECRET.includes('demo_') ||
    process.env.JWT_SECRET.includes('example_') ||
    process.env.JWT_SECRET === 'secret'
  )) {
    errors.push('❌ Critical: JWT_SECRET contains insecure placeholder value');
  }
  
  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    // In production, no localhost URLs should be used
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
      errors.push('❌ Critical: FRONTEND_URL contains localhost in production');
    }
    
    if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
      warnings.push('⚠️  Warning: MONGODB_URI contains localhost in production');
    }
    
    // Session secret should be set in production
    if (!process.env.SESSION_SECRET) {
      warnings.push('⚠️  Warning: SESSION_SECRET not set in production');
    }
  }
  
  // Display results
  if (warnings.length > 0) {
    console.log('\\n⚠️  Environment Warnings:');
    warnings.forEach(warning => console.log(warning));
  }
  
  if (errors.length > 0) {
    console.log('\\n❌ Environment Errors:');
    errors.forEach(error => console.log(error));
    throw new Error('Environment validation failed. Please fix the errors above.');
  }
  
  console.log('✅ Environment validation passed\\n');
  
  // Return configuration object
  return {
    mongodb: {
      uri: process.env.MONGODB_URI
    },
    server: {
      port: parseInt(process.env.PORT, 10),
      env: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expire: process.env.JWT_EXPIRE
    },
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10),
      sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
      }
    },
    email: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucketName: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'combined'
    },
    api: {
      version: process.env.API_VERSION || 'v1',
      prefix: process.env.API_PREFIX || '/api'
    }
  };
}

module.exports = validateEnvironment;
