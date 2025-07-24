# Fitera App Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment & Configuration
- [ ] Update production environment variables in `.env.production`
- [ ] Set correct Firebase project configuration
- [ ] Update EAS project ID in `app.json`
- [ ] Verify app version and build numbers

### 2. Firebase Setup
- [ ] Create/configure Firebase project for production
- [ ] Add Android app with package name: `com.fitera.workouttracker`
- [ ] Add iOS app with bundle ID: `com.fitera.workouttracker`
- [ ] Download and add configuration files:
  - `google-services.json` for Android
  - `GoogleService-Info.plist` for iOS
- [ ] Enable Authentication methods (Email/Password)
- [ ] Set up Firestore database with security rules
- [ ] Configure Firebase Analytics

### 3. Code Quality
- [ ] Run linting: `npx eslint .`
- [ ] Add and run tests
- [ ] Remove all console.log statements
- [ ] Verify error handling
- [ ] Test offline functionality

### 4. Assets & Branding
- [ ] App icon (1024x1024) - `./assets/icon.png`
- [ ] Splash screen - `./assets/splash.png`
- [ ] Adaptive icon for Android - `./assets/adaptive-icon.png`
- [ ] App Store screenshots (various sizes)
- [ ] Play Store feature graphic (1024x500)

## 🏗️ Build Process

### Initial Setup

1. **Install EAS CLI**
```bash
npm install -g eas-cli
```

2. **Login to Expo account**
```bash
eas login
```

3. **Configure EAS project**
```bash
eas build:configure
```

4. **Update EAS project ID**
Update the project ID in `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "your-actual-project-id"
  }
}
```

### iOS Build & Deployment

1. **Apple Developer Account Setup**
   - Enroll in Apple Developer Program ($99/year)
   - Create App ID
   - Create provisioning profiles
   - Create App Store Connect app

2. **Update iOS credentials in `eas.json`**
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "your-apple-team-id"
    }
  }
}
```

3. **Build for iOS**
```bash
# Production build for App Store
eas build --platform ios --profile production

# Development build for testing
eas build --platform ios --profile development
```

4. **Submit to App Store**
```bash
eas submit --platform ios --profile production
```

### Android Build & Deployment

1. **Google Play Console Setup**
   - Create developer account ($25 one-time)
   - Create new app
   - Complete store listing
   - Set up content rating
   - Configure pricing & distribution

2. **Create service account for automated submission**
   - Go to Google Play Console → Settings → API access
   - Create service account
   - Download JSON key and save as `google-service-account.json`
   - Grant "Release manager" role

3. **Build for Android**
```bash
# Production APK
eas build --platform android --profile production

# Development build
eas build --platform android --profile development
```

4. **Submit to Play Store**
```bash
eas submit --platform android --profile production
```

## 📱 Testing Before Release

### Local Testing
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical device with Expo Go
npm start
```

### Beta Testing
1. **iOS TestFlight**
   - Upload build to App Store Connect
   - Add internal/external testers
   - Send invitations

2. **Android Internal Testing**
   - Upload to internal testing track
   - Add testers via email
   - Share testing link

## 🚀 Production Release

### iOS App Store
1. Complete App Store listing:
   - App name: Fitera
   - Description (4000 chars max)
   - Keywords
   - Categories: Health & Fitness
   - Screenshots for all device sizes
   - App preview video (optional)

2. Submit for review
   - Review time: 24-48 hours typically
   - Be ready to respond to reviewer feedback

### Google Play Store
1. Complete store listing:
   - Title: Fitera - Workout Tracker
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots
   - Feature graphic
   - Categories: Health & Fitness

2. Release to production
   - Staged rollout recommended (start with 10%)
   - Monitor crash reports and reviews

## 🔧 Post-Deployment

### Monitoring
- [ ] Set up Firebase Crashlytics
- [ ] Monitor Firebase Analytics
- [ ] Track user reviews
- [ ] Monitor app performance

### Updates
```bash
# Increment version for updates
eas build:version:set --platform ios
eas build:version:set --platform android

# Build and submit updates
eas build --platform all --profile production
eas submit --platform all --profile production
```

## 📊 Success Metrics
- App Store/Play Store ratings
- Daily Active Users (DAU)
- Crash-free rate (target: >99.5%)
- User retention (Day 1, 7, 30)
- Average session duration

## 🆘 Troubleshooting

### Common Issues
1. **Build failures**
   - Check `eas build --platform [ios/android] --profile production --clear-cache`
   - Verify all dependencies are compatible
   - Check native module configurations

2. **Submission failures**
   - Verify credentials and certificates
   - Check app compliance with store guidelines
   - Ensure all required metadata is complete

3. **Firebase issues**
   - Verify configuration files are in correct locations
   - Check Firebase project settings
   - Ensure all services are enabled

## 📝 Important Links
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Firebase Console](https://console.firebase.google.com/)

---

## Next Steps

1. **Immediate actions:**
   - [ ] Create production Firebase project
   - [ ] Set up developer accounts (Apple/Google)
   - [ ] Configure EAS with correct project ID
   - [ ] Add production environment variables

2. **Before first build:**
   - [ ] Complete all pre-deployment checklist items
   - [ ] Test thoroughly on physical devices
   - [ ] Prepare all marketing materials

3. **Launch preparation:**
   - [ ] Plan launch date
   - [ ] Prepare marketing campaign
   - [ ] Set up user support channels
   - [ ] Create app website/landing page
