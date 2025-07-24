# Firebase Authentication Migration Guide for Fitera

## 🚀 Quick Start - Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create Project" and name it "Fitera" or "StrongClone"
3. Enable Google Analytics (optional)
4. Wait for project creation to complete

### Step 2: Enable Authentication

1. In Firebase Console, navigate to "Authentication" from the left sidebar
2. Click "Get Started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Enable "Email link (passwordless sign-in)" if desired

### Step 3: Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. In "Your apps" section, click the web icon (</>) to add a web app
3. Register app with nickname "Fitera Web"
4. Copy the Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Step 4: Update Firebase Configuration in Your App

1. Open `/frontend/config/firebase.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...", // Your actual API key
  authDomain: "fitera-app.firebaseapp.com",
  projectId: "fitera-app",
  storageBucket: "fitera-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 5: Configure Email Templates (Important!)

1. In Firebase Console, go to Authentication → Templates
2. Customize each template with your Fitera branding:
   - **Password Reset Email**
   - **Email Verification**
   - **Email Address Change**

Example Password Reset template:
```
Subject: Reset your Fitera password

Hi %DISPLAY_NAME%,

We received a request to reset your Fitera password. Click the link below to create a new password:

%LINK%

If you didn't request this, please ignore this email.

Stay strong!
The Fitera Team
```

## 📱 React Native Firebase Setup

### For iOS (if using React Native CLI):

1. Install pods:
```bash
cd ios && pod install
```

2. Add GoogleService-Info.plist to your iOS project
3. Update AppDelegate.m to initialize Firebase

### For Android (if using React Native CLI):

1. Add google-services.json to `android/app/`
2. Update android/build.gradle and android/app/build.gradle

### For Expo (Managed Workflow):

Since you're using Expo, you'll need to use the Firebase JS SDK instead:

```bash
npm uninstall @react-native-firebase/app @react-native-firebase/auth
npm install firebase
```

Then update the firebase config and auth service files to use the web SDK.

## 🔄 Migration Steps

### 1. Switch to Firebase Auth Context

Update your App.js to use the Firebase Auth Context:

```javascript
// In App.js
import { AuthProvider } from './contexts/FirebaseAuthContext';
// Instead of: import { AuthProvider } from './contexts/AuthContext';
```

### 2. Update Login Screen

The Login screen automatically works with the new Firebase auth through the context.

### 3. Test the Migration

1. Start your app: `npm start`
2. Test registration of a new user
3. Test login with the new user
4. Test forgot password functionality
5. Check email delivery

## ✅ Features Now Available

With Firebase Authentication, you now have:

1. **Working Forgot Password** - Users receive professional password reset emails
2. **Email Verification** - New users get verification emails
3. **Secure Authentication** - Google-managed security
4. **Rate Limiting** - Built-in protection against attacks
5. **Session Management** - Automatic token refresh
6. **Account Security** - Protection against common vulnerabilities

## 🎯 Next Steps

1. **Custom Domain**: Set up a custom domain for email sending
2. **Social Login**: Add Google/Apple/Facebook login
3. **Multi-Factor Auth**: Enable 2FA for enhanced security
4. **Analytics**: Monitor authentication metrics in Firebase Console

## 🐛 Troubleshooting

### Common Issues:

1. **"No Firebase App" Error**
   - Ensure firebase is initialized before using auth
   - Check that config values are correct

2. **Email Not Sending**
   - Check spam folder
   - Verify email templates are configured
   - Check Firebase quotas

3. **Login Failing**
   - Ensure email/password auth is enabled
   - Check for typos in email
   - Verify password meets requirements

### Debug Commands:

```javascript
// Check current user
import { getCurrentUser } from './services/firebaseAuth';
console.log('Current user:', getCurrentUser());

// Check auth state
import auth from '@react-native-firebase/auth';
console.log('Auth state:', auth().currentUser);
```

## 📊 Monitoring

Monitor your authentication in Firebase Console:
- Active users
- New registrations
- Authentication methods used
- Error rates
- Email delivery status

## 🔒 Security Best Practices

1. **Enable App Check** for additional security
2. **Set up authorized domains** in Authentication settings
3. **Configure rate limits** for API calls
4. **Monitor suspicious activity** in Firebase Console
5. **Regular security rules review**

## 💡 Tips

- Firebase emails might go to spam initially - ask users to check spam folder
- Customize email templates to match your brand
- Use Firebase Analytics to track user engagement
- Consider Firebase Cloud Messaging for push notifications later
- Firebase Authentication integrates well with other Firebase services

## 🎉 Congratulations!

Your Fitera app now has enterprise-grade authentication with working forgot password functionality, all managed by Google Firebase!
