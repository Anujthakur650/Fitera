// Minimal Firebase test
import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDx19DsXdiGMXJo5q6ZxJ_BIv83cKYP9g8",
  authDomain: "fitera-61e97.firebaseapp.com",
  projectId: "fitera-61e97",
  storageBucket: "fitera-61e97.firebasestorage.app",
  messagingSenderId: "1062153751807",
  appId: "1:1062153751807:web:ff0c5600aec1edc9c710ca",
  measurementId: "G-LFYD5GJVEF"
};

console.log('Initializing Firebase with config:', firebaseConfig);

try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
  
  const auth = getAuth(app);
  console.log('✅ Auth instance created');
  
  // Test password reset
  sendPasswordResetEmail(auth, 'test@example.com')
    .then(() => {
      console.log('✅ Password reset email sent successfully!');
    })
    .catch((error) => {
      console.error('❌ Error sending password reset:', error.code, error.message);
    });
    
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}
