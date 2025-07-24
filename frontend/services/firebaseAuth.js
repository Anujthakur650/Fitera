import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

/**
 * Firebase Authentication Service
 * Handles all authentication operations using Firebase
 */

// Sign up new user with email and password
export const signUpWithEmail = async (email, password, username) => {
  try {
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send user a verification email on registration
    await sendEmailVerification(user);
    
    // Update display name
    await updateProfile(user, {
      displayName: username
    });

    // Store additional user data if needed
    await AsyncStorage.setItem('userData', JSON.stringify({
      uid: user.uid,
      email: user.email,
      username: username,
      emailVerified: user.emailVerified,
    }));

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: username,
        emailVerified: user.emailVerified,
      },
      message: 'Account created successfully. Please check your email to verify your account.',
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
    };
  }
};

// Sign in existing user
export const signInWithEmail = async (email, password) => {
  try {
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user data
    await AsyncStorage.setItem('userData', JSON.stringify({
      uid: user.uid,
      email: user.email,
      username: user.displayName,
      emailVerified: user.emailVerified,
    }));

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
    };
  }
};

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem('userData');
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      message: 'Failed to sign out. Please try again.',
    };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
    };
  }
};

// Resend email verification
export const resendEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      };
    } else {
      return {
        success: false,
        message: 'No user signed in.',
      };
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
    };
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, updates);
      
      // Update stored data
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        const updatedData = { ...parsedData, ...updates };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      }
      
      return { success: true };
    } else {
      return {
        success: false,
        message: 'No user signed in.',
      };
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      message: 'Failed to update profile.',
    };
  }
};

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await user.delete();
      await AsyncStorage.removeItem('userData');
      return { success: true };
    } else {
      return {
        success: false,
        message: 'No user signed in.',
      };
    }
  } catch (error) {
    console.error('Delete account error:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
    };
  }
};

// Check if email is already in use
export const checkEmailExists = async (email) => {
  try {
    // This method is not available in Firebase v9+
    // We'll handle this by attempting to create an account and catching the error
    return false;
  } catch (error) {
    console.error('Check email error:', error);
    return false;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen to authentication state changes
export const onAuthStateChanged = (callback) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

// Helper function to get user-friendly error messages
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/requires-recent-login':
      return 'This operation requires recent authentication. Please sign in again.';
    case 'auth/missing-email':
      return 'Please enter your email address.';
    default:
      return 'An error occurred. Please try again.';
  }
};
