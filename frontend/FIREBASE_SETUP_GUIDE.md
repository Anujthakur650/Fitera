# 🔥 Firebase Authentication Setup Guide for Fitera

This guide will walk you through setting up Firebase Authentication for production deployment, removing all mock server dependencies.

## 📋 Prerequisites

- Google account for Firebase Console access
- Your app's production domain (for web deployment)
- Basic understanding of Firebase console

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Sign in with your Google account

2. **Create New Project**
   - Click "Create a project" or "Add project"
   - Enter project name: `Fitera` (or your preferred name)
   - Accept Firebase terms
   - Click "Continue"

3. **Configure Google Analytics** (Optional)
   - You can enable or disable analytics
   - If enabled, select or create an Analytics account
   - Click "Create project"

## 🔐 Step 2: Enable Authentication

1. **Navigate to Authentication**
   - In Firebase Console, click "Authentication" in the left sidebar
   - Click "Get started"

2. **Enable Email/Password Provider**
   - Go to "Sign-in method" tab
   - Click on "Email/Password"
   - Toggle "Enable" switch ON
   - Optionally enable "Email link (passwordless sign-in)"
   - Click "Save"

## 📱 Step 3: Add Your App to Firebase

### For Web/React Native:

1. **Add Web App**
   - In Project Overview, click the web icon (`</>`)
   - Enter app nickname: "Fitera Web"
   - Check "Also set up Firebase Hosting" if you plan to use it
   - Click "Register app"

2. **Copy Configuration**
   - You'll see a configuration object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
   - Copy this configuration

3. **Update Your App**
   - Open `/frontend/config/firebase.js`
   - Replace the placeholder configuration with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_ACTUAL_API_KEY",
     authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
     projectId: "YOUR_ACTUAL_PROJECT_ID",
     storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
     messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
     appId: "YOUR_ACTUAL_APP_ID"
   };
   ```

### For iOS (if using React Native CLI):

1. **Add iOS App**
   - Click "Add app" > iOS icon
   - Enter iOS bundle ID: `com.fitera.workouttracker` (or your bundle ID)
   - Enter app nickname: "Fitera iOS"
   - Click "Register app"

2. **Download Config File**
   - Download `GoogleService-Info.plist`
   - Add to your iOS project in Xcode:
     - Right-click on your project name
     - Select "Add Files to [project name]"
     - Select the downloaded file
     - Make sure "Copy items if needed" is checked

### For Android (if using React Native CLI):

1. **Add Android App**
   - Click "Add app" > Android icon
   - Enter Android package name: `com.fitera.workouttracker` (or your package name)
   - Enter app nickname: "Fitera Android"
   - Click "Register app"

2. **Download Config File**
   - Download `google-services.json`
   - Place in: `/android/app/google-services.json`

## 📧 Step 4: Configure Email Templates

1. **Go to Authentication > Templates**
   - In Firebase Console, navigate to Authentication
   - Click on "Templates" tab

2. **Customize Password Reset Email**
   - Click on "Password reset"
   - Click the pencil icon to edit
   - Customize:
     - **From name**: Fitera
     - **From email**: noreply@yourdomain.com (verify domain first)
     - **Subject**: Reset your Fitera password
     - **Message**: Customize the email body with your branding

3. **Customize Email Verification** (if using)
   - Follow same process for email verification template

## 🌐 Step 5: Configure Authorized Domains

1. **Go to Authentication > Settings**
   - Click on "Authorized domains" tab

2. **Add Your Domains**
   - Add your production domain(s)
   - Add any staging/development domains
   - Default Firebase domains are already included

## 🔧 Step 6: Security Rules (Optional but Recommended)

1. **Configure Security Settings**
   - Go to Authentication > Settings > User actions
   - Configure:
     - Password requirements
     - Multi-factor authentication (if needed)
     - Account deletion protection

2. **Set Up App Check** (for production)
   - Helps protect your backend resources
   - Go to App Check in Firebase Console
   - Follow setup for your platform

## ✅ Step 7: Test Your Implementation

1. **Test Password Reset Flow**
   ```javascript
   // In your app, test the forgot password feature
   // Enter a valid email address
   // Check that email is actually sent
   // Verify the reset link works
   ```

2. **Check Firebase Console**
   - Go to Authentication > Users
   - You should see registered users
   - Check usage stats

## 🚨 Step 8: Remove Mock Server Code

1. **Delete Mock API Files**
   ```bash
   # Remove mock authentication API
   rm frontend/services/authAPI.js
   
   # Remove mock backend server (if exists)
   rm -rf backend/
   ```

2. **Update Environment Config**
   - Remove any references to localhost:5001
   - Remove mock API URL configurations

3. **Clean Package Dependencies**
   - Remove any mock server dependencies from package.json

## 📊 Step 9: Monitor and Maintain

1. **Set Up Monitoring**
   - Enable Firebase Performance Monitoring
   - Set up Firebase Crashlytics
   - Configure alerts for authentication issues

2. **Regular Maintenance**
   - Monitor authentication quotas
   - Review security rules regularly
   - Keep Firebase SDK updated

## 🎯 Production Checklist

Before deploying to production, ensure:

- [ ] Firebase project created and configured
- [ ] Authentication enabled with Email/Password
- [ ] Configuration files added to your app
- [ ] Email templates customized with your branding
- [ ] Authorized domains configured
- [ ] Mock server code completely removed
- [ ] All authentication flows tested
- [ ] Security rules configured
- [ ] Error handling implemented
- [ ] Rate limiting understood (Firebase has built-in protection)

## 🆘 Troubleshooting

### Common Issues:

1. **"auth/api-key-not-valid" Error**
   - Ensure you copied the correct API key
   - Check that the API key matches your Firebase project
   - Verify Firebase project is active

2. **Emails Not Sending**
   - Check spam folder
   - Verify email templates are configured
   - Ensure user email exists in Authentication > Users

3. **"auth/too-many-requests" Error**
   - Firebase has built-in rate limiting
   - Wait before retrying
   - Implement exponential backoff

4. **Network Errors**
   - Check internet connectivity
   - Verify Firebase services are accessible
   - Check for firewall restrictions

## 🔗 Useful Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [React Native Firebase](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Status](https://status.firebase.google.com)

## 💡 Next Steps

After completing this setup:

1. Implement user registration with Firebase
2. Add login functionality
3. Implement user profile management
4. Add social authentication (optional)
5. Set up user data synchronization

---

**Remember**: This setup enables real email sending for password resets, removing all mock server dependencies and making your app ready for production deployment! 🚀
