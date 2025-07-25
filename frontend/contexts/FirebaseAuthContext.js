import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  getCurrentUser,
  sendPasswordResetEmail 
} from '../services/firebaseAuth';
import DatabaseManager from '../utils/database';
import ErrorHandler from '../utils/errorHandler';
import SecurityAudit from '../utils/securityAudit';
import RateLimiter from '../utils/rateLimiter';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Initialize security audit system
    SecurityAudit.initialize();
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          const userData = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            emailVerified: firebaseUser.emailVerified,
            photoURL: firebaseUser.photoURL,
          };
          
          // Store user data locally
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          
          // Migrate user data to local database if needed
          await migrateUserToLocalDB(userData);
        } else {
          // User is signed out
          setUser(null);
          await AsyncStorage.removeItem('user');
        }
      } catch (error) {
        ErrorHandler.logError(error, { screen: 'AuthContext', action: 'onAuthStateChanged' });
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Migrate user data to local database for fitness data association
  const migrateUserToLocalDB = async (userData) => {
    try {
      await DatabaseManager.initDatabase();
      
      // Check if user exists in local database
      const existingUsers = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE id = ? OR email = LOWER(?) LIMIT 1', 
        [userData.uid, userData.email]
      );
      
      if (existingUsers.length === 0) {
        // Create user in local database with Firebase UID as ID
        await DatabaseManager.runAsync(
          'INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)',
          [userData.uid, userData.username, userData.email, new Date().toISOString()]
        );
        console.log('✅ User migrated to local database');
      }
    } catch (error) {
      console.error('Error migrating user to local DB:', error);
      // Non-critical error, don't block the user
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🚀 Starting Firebase login process for:', email);
      
      // Check rate limit before proceeding
      const rateLimitStatus = await RateLimiter.checkRateLimit(email);
      if (rateLimitStatus.isLocked) {
        const error = new Error(rateLimitStatus.message);
        error.code = 'AUTH_RATE_LIMITED';
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'login' });
      }
      
      // Sign in with Firebase
      const result = await signInWithEmail(email, password);
      
      if (result.success) {
        // Clear rate limit on successful login
        await RateLimiter.clearAttempts(email);
        
        // Log successful login
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_SUCCESS,
          { userId: result.user.uid, email: result.user.email },
          true,
          'LOW'
        );
        
        return { success: true };
      } else {
        // Record failed attempt
        await RateLimiter.recordFailedAttempt(email);
        
        // Log failed login attempt
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_FAILED,
          { email, reason: result.message },
          false,
          'MEDIUM'
        );
        
        return { 
          success: false, 
          message: result.message 
        };
      }
    } catch (error) {
      return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'login' });
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('🚀 Starting Firebase registration process for:', { username, email });
      
      // Validate inputs
      if (!username || username.length < 3) {
        return ErrorHandler.handleValidationError(
          ['Username must be at least 3 characters long'], 
          { screen: 'Register', action: 'register' }
        );
      }
      
      if (!email || !email.includes('@')) {
        return ErrorHandler.handleValidationError(
          ['Please enter a valid email address'], 
          { screen: 'Register', action: 'register' }
        );
      }
      
      if (!password || password.length < 6) {
        return ErrorHandler.handleValidationError(
          ['Password must be at least 6 characters long'], 
          { screen: 'Register', action: 'register' }
        );
      }
      
      // Sign up with Firebase
      const result = await signUpWithEmail(email, password, username);
      
      if (result.success) {
        // Log successful registration
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.REGISTER_SUCCESS,
          { userId: result.user.uid, email: result.user.email },
          true,
          'LOW'
        );
        
        return { 
          success: true,
          message: result.message 
        };
      } else {
        return { 
          success: false, 
          message: result.message 
        };
      }
    } catch (error) {
      return ErrorHandler.handleAuthError(error, { screen: 'Register', action: 'register' });
    }
  };

  const logout = async () => {
    try {
      // Log logout event before clearing user data
      if (user) {
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGOUT,
          { userId: user.id, email: user.email },
          true,
          'LOW'
        );
      }
      
      // Sign out from Firebase
      const result = await firebaseSignOut();
      
      if (result.success) {
        // Clear local storage
        await SecureStore.deleteItemAsync('token');
        await AsyncStorage.removeItem('user');
        setUser(null);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: result.message 
        };
      }
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'AuthContext', action: 'logout' });
      return { 
        success: false, 
        message: 'Failed to sign out' 
      };
    }
  };

  // New forgot password function using Firebase
  const forgotPassword = async (email) => {
    try {
      console.log('🔑 Initiating password reset for:', email);
      
      const result = await sendPasswordResetEmail(email);
      
      if (result.success) {
        // Log password reset request
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.PASSWORD_RESET_REQUEST,
          { email },
          true,
          'MEDIUM'
        );
      }
      
      return result;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'ForgotPassword', action: 'forgotPassword' });
      return { 
        success: false, 
        message: 'Failed to send password reset email' 
      };
    }
  };

  // Debug function to check database contents (keeping for compatibility)
  const debugDatabase = async () => {
    try {
      console.log('🔍 Debugging database...');
      await DatabaseManager.initDatabase();
      
      // Get all users
      const allUsers = await DatabaseManager.getAllAsync('SELECT * FROM users');
      console.log('📊 All users in database:', allUsers);
      
      // Get table structure
      const tableInfo = await DatabaseManager.getAllAsync('PRAGMA table_info(users)');
      console.log('📋 Users table structure:', tableInfo);
      
      // Get current Firebase user
      const firebaseUser = getCurrentUser();
      console.log('🔥 Current Firebase user:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        emailVerified: firebaseUser.emailVerified
      } : 'No user signed in');
      
      return { allUsers, tableInfo, firebaseUser };
    } catch (error) {
      console.error('❌ Debug database error:', error);
      return { error: error.message };
    }
  };

  const value = {
    user,
    loading: loading || initializing,
    login,
    register,
    logout,
    forgotPassword, // New function for Firebase password reset
    debugDatabase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
