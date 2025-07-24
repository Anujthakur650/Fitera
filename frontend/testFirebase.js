// Test Firebase connection
import { auth } from './config/firebase';
import { sendPasswordResetEmail } from './services/firebaseAuth';

console.log('🔥 Testing Firebase connection...');
console.log('Auth instance:', auth);

// Test password reset with a test email
const testEmail = 'test@example.com';

sendPasswordResetEmail(testEmail)
  .then(result => {
    console.log('✅ Firebase test result:', result);
    if (result.success) {
      console.log('🎉 Firebase is working! Password reset email would be sent to:', testEmail);
    } else {
      console.log('❌ Error:', result.message);
    }
  })
  .catch(error => {
    console.error('❌ Firebase test failed:', error);
  });
