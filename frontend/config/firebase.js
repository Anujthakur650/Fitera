import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration for Fitera
const firebaseConfig = {
  apiKey: "AIzaSyDxi9DsXdtGMXJo5o67xJ_BIv83cKYP0g0",
  authDomain: "fitera-61e97.firebaseapp.com",
  projectId: "fitera-61e97",
  storageBucket: "fitera-61e97.firebasestorage.app",
  messagingSenderId: "1062153751807",
  appId: "1:1062153751807:web:ff0c5600aec1edc9c710ca",
  measurementId: "G-LFYD5GJVEF"
};

// Initialize Firebase only if it hasn't been initialized
let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Get Auth instance
auth = getAuth(app);

// Export auth instance
export { auth };
export default app;
