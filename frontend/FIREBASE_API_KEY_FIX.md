# 🔧 Fix Firebase API Key Error

## Quick Fix (2 minutes)

The error `auth/api-key-not-valid` usually means your API key has restrictions. Here's how to fix it:

### Option 1: Remove API Key Restrictions (Recommended for Testing)

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Select your project**: "fitera-61e97" from the dropdown
3. **Navigate to**: APIs & Services → Credentials
4. **Find your Web API Key**: 
   - Look for "Web API Key" or "Browser key"
   - It should start with "AIzaSyDx19..."
5. **Click on the API key**
6. **Remove all restrictions**:
   - Set "Application restrictions" to **"None"**
   - Set "API restrictions" to **"Don't restrict key"**
7. **Click "SAVE"**
8. **Wait 1-2 minutes** for changes to propagate

### Option 2: Check Firebase Project Settings

1. In Firebase Console, go to Project Settings
2. Check that your project is on the "Spark" (free) or "Blaze" (pay-as-you-go) plan
3. Make sure you're not hitting any quotas

### Option 3: Create a New Unrestricted API Key

1. In Google Cloud Console → APIs & Services → Credentials
2. Click "+ CREATE CREDENTIALS" → "API Key"
3. Copy the new key
4. Update your `firebase.js` with the new key
5. Don't add any restrictions for now

## Test After Fixing

Once you've removed restrictions:

1. Restart your Expo app
2. Go to Login → Forgot Password
3. Enter any email
4. You should see "Password reset email sent!"

## For Production

Once it's working, you can add these safe restrictions:
- **Application restrictions**: HTTP referrers (for web)
- **API restrictions**: Select only Firebase APIs you need

## Still Not Working?

Check if these APIs are enabled:
- Identity Toolkit API
- Firebase Auth API
- Token Service API

In Google Cloud Console → APIs & Services → Library, search for each and click "ENABLE".
