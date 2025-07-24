# 🔧 Environment Configuration Setup Guide

## Overview
This guide explains how to properly configure environment variables for both the backend and frontend of the StrongClone application.

## 🔒 Security First
- **NEVER** commit `.env` files to version control
- **ALWAYS** use strong, randomly generated secrets
- **ROTATE** secrets regularly in production

## Backend Configuration

### 1. Create Backend Environment File
```bash
cd backend
cp .env.example .env
```

### 2. Generate Secure Secrets
```bash
# Generate JWT Secret (macOS/Linux)
openssl rand -base64 32

# Generate Session Secret
openssl rand -base64 32
```

### 3. Configure MongoDB
- For local development: `mongodb://localhost:27017/strongclone`
- For production: Use MongoDB Atlas or your cloud provider's connection string

### 4. Required Environment Variables
```env
# Critical (No defaults allowed)
JWT_SECRET=<your-generated-secret>
MONGODB_URI=<your-mongodb-connection-string>

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:19006

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=<your-generated-session-secret>
```

### 5. Validate Configuration
The backend will automatically validate environment variables on startup. Look for:
- ✅ Environment validation passed
- ❌ Critical errors that must be fixed

## Frontend Configuration

### 1. Create Frontend Environment Files
```bash
cd frontend
cp .env.example .env
```

### 2. Environment-Specific Files
- `.env` - Default (development)
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.staging` - Staging environment (optional)

### 3. Required Frontend Variables
```env
# API Configuration
API_URL=http://localhost:5000/api
API_TIMEOUT=10000

# App Configuration
APP_NAME=StrongClone
ENV_TYPE=development

# Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_ANALYTICS=false
ENABLE_BIOMETRIC_AUTH=true
```

### 4. Platform-Specific Setup

#### iOS
After adding react-native-config:
```bash
cd ios && pod install
```

Add to your `ios/YourProject/Info.plist`:
```xml
<key>API_URL</key>
<string>$(API_URL)</string>
```

#### Android
The package should work automatically. If issues arise, clean and rebuild:
```bash
cd android && ./gradlew clean
```

## 🚀 Development Workflow

### Starting the Backend
```bash
cd backend
npm run dev
```
The server will validate environment variables and display configuration status.

### Starting the Frontend
```bash
cd frontend
npm start
```
The app will load environment variables from `.env` file.

## 🏭 Production Deployment

### Backend Production Setup
1. Set `NODE_ENV=production`
2. Use secure, unique secrets (minimum 32 characters)
3. Configure proper MongoDB cluster
4. Set appropriate CORS origin
5. Enable all security features

### Frontend Production Build

#### iOS
```bash
# Use production environment
ENVFILE=.env.production react-native run-ios --configuration Release
```

#### Android
```bash
# Use production environment
ENVFILE=.env.production react-native run-android --variant=release
```

### Environment Variable Checklist
- [ ] All secrets are unique and secure
- [ ] No localhost URLs in production
- [ ] Debug mode is disabled
- [ ] Analytics/crash reporting configured
- [ ] API URLs use HTTPS
- [ ] Rate limiting is properly configured

## 🔍 Troubleshooting

### Backend Issues
1. **"JWT_SECRET is not set"** - Create `.env` file with required variables
2. **"JWT_SECRET must be at least 32 characters"** - Generate a stronger secret
3. **"MONGODB_URI must be valid"** - Check your MongoDB connection string

### Frontend Issues
1. **API calls failing** - Verify `API_URL` matches your backend
2. **Environment variables not loading** - Restart Metro bundler
3. **Build issues** - Clean build folders and reinstall dependencies

### Verification Commands
```bash
# Check backend config
cd backend && node -e "require('dotenv').config(); console.log(process.env)"

# Check frontend config (in app)
console.log(Config.API_URL)
```

## 📊 Security Best Practices

1. **Secret Generation**
   - Use cryptographically secure random generators
   - Minimum 256-bit entropy for secrets
   - Never use dictionary words or predictable patterns

2. **Secret Storage**
   - Use environment variables or secret management services
   - Never hardcode secrets in source code
   - Implement secret rotation policies

3. **Access Control**
   - Limit who has access to production secrets
   - Use different secrets for each environment
   - Audit secret access regularly

4. **Monitoring**
   - Log authentication failures
   - Monitor for unusual API patterns
   - Set up alerts for security events

## 🆘 Getting Help
If you encounter issues:
1. Check the security audit report
2. Review server startup logs
3. Verify all required variables are set
4. Ensure no trailing spaces in `.env` values

Remember: Security is not optional - it's fundamental to protecting user data!
