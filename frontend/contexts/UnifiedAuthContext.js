import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { onAuthStateChanged, auth } from '../config/firebase';
import { 
  signInWithEmail as firebaseSignIn, 
  signUpWithEmail as firebaseSignUp, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail 
} from '../services/firebaseAuth';
import DatabaseManager from '../utils/database';
import * as Crypto from 'expo-crypto';
import ErrorHandler from '../utils/errorHandler';
import SecurityAudit from '../utils/securityAudit';
import RateLimiter from '../utils/rateLimiter';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('firebase'); // 'firebase' or 'local'

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize security audit system
      SecurityAudit.initialize();
      
      // Initialize database
      await DatabaseManager.initDatabase();
      
      // Check for stored auth mode preference
      const storedAuthMode = await AsyncStorage.getItem('authMode');
      if (storedAuthMode) {
        setAuthMode(storedAuthMode);
      }
      
      // Set up Firebase auth state listener
      const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser && authMode === 'firebase') {
          await handleFirebaseUser(firebaseUser);
        } else if (!firebaseUser && authMode === 'firebase') {
          // User signed out from Firebase
          await clearUserSession();
        }
      });
      
      // Check for locally stored user
      if (authMode === 'local') {
        await loadLocalUser();
      }
      
      setLoading(false);
      
      return () => unsubscribe();
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'UnifiedAuthContext', action: 'initializeAuth' });
      setLoading(false);
    }
  };

  const handleFirebaseUser = async (firebaseUser) => {
    try {
      // Create or update user in local database
      const localUserId = await DatabaseManager.createOrUpdateFirebaseUser(firebaseUser);
      
      // Get the complete user record from database
      const localUser = await DatabaseManager.getUserById(localUserId);
      
      // Create unified user object
      const unifiedUser = {
        id: localUser.id, // SQLite ID for local operations
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: localUser.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        name: localUser.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        emailVerified: firebaseUser.emailVerified,
        photoURL: firebaseUser.photoURL,
        authMode: 'firebase'
      };
      
      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(unifiedUser));
      await AsyncStorage.setItem('authMode', 'firebase');
      
      setUser(unifiedUser);
      setAuthMode('firebase');
      
      console.log('✅ Firebase user synced with local database:', unifiedUser);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'UnifiedAuthContext', action: 'handleFirebaseUser' });
    }
  };

  const loadLocalUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        // Ensure user has consistent structure
        const unifiedUser = {
          ...userData,
          authMode: 'local'
        };
        setUser(unifiedUser);
      }
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'UnifiedAuthContext', action: 'loadLocalUser' });
    }
  };

  const clearUserSession = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'UnifiedAuthContext', action: 'clearUserSession' });
    }
  };

  const login = async (email, password, preferredMode = 'firebase') => {
    try {
      console.log(`🚀 Starting ${preferredMode} login for:`, email);
      
      // Check rate limit
      const rateLimitStatus = await RateLimiter.checkRateLimit(email);
      if (rateLimitStatus.isLocked) {
        const error = new Error(rateLimitStatus.message);
        error.code = 'AUTH_RATE_LIMITED';
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'login' });
      }
      
      if (preferredMode === 'firebase') {
        // Try Firebase login
        const result = await firebaseSignIn(email, password);
        
        if (result.success) {
          await RateLimiter.clearAttempts(email);
          await SecurityAudit.logEvent(
            SecurityAudit.EVENT_TYPES.LOGIN_SUCCESS,
            { email, authMode: 'firebase' },
            true,
            'LOW'
          );
          
          // handleFirebaseUser will be called by onAuthStateChanged
          return { success: true };
        } else {
          await RateLimiter.recordFailedAttempt(email);
          await SecurityAudit.logEvent(
            SecurityAudit.EVENT_TYPES.LOGIN_FAILED,
            { email, reason: result.message, authMode: 'firebase' },
            false,
            'MEDIUM'
          );
          
          // If Firebase login fails, optionally fall back to local
          if (__DEV__) {
            console.log('Firebase login failed, trying local login...');
            return await localLogin(email, password);
          }
          
          return { success: false, message: result.message };
        }
      } else {
        // Use local login
        return await localLogin(email, password);
      }
    } catch (error) {
      return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'login' });
    }
  };

  const localLogin = async (email, password) => {
    try {
      await DatabaseManager.initDatabase();
      
      // Check if user exists in local database
      const users = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', 
        [email]
      );
      
      if (users.length === 0) {
        const error = new Error('User not found');
        error.code = 'AUTH_USER_NOT_FOUND';
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'localLogin' });
      }
      
      const localUser = users[0];
      
      // Validate password
      let passwordMatch = false;
      
      if (localUser.password && localUser.password.length < 60) {
        // Legacy plain-text password
        passwordMatch = password === localUser.password;
      } else if (localUser.password) {
        // Hashed password
        const hashedInput = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password + 'fitera_salt_2025'
        );
        passwordMatch = hashedInput === localUser.password;
      }
      
      if (passwordMatch) {
        const unifiedUser = {
          id: localUser.id,
          firebase_uid: localUser.firebase_uid,
          username: localUser.name,
          email: localUser.email,
          name: localUser.name,
          authMode: 'local'
        };
        
        // Generate token
        const token = `local_token_${Date.now()}_${localUser.id}`;
        
        await SecureStore.setItemAsync('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(unifiedUser));
        await AsyncStorage.setItem('authMode', 'local');
        
        setUser(unifiedUser);
        setAuthMode('local');
        
        await RateLimiter.clearAttempts(email);
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_SUCCESS,
          { userId: localUser.id, email, authMode: 'local' },
          true,
          'LOW'
        );
        
        return { success: true };
      } else {
        const error = new Error('Invalid password');
        error.code = 'AUTH_INVALID_CREDENTIALS';
        
        await RateLimiter.recordFailedAttempt(email);
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_FAILED,
          { email, reason: 'Invalid password', authMode: 'local' },
          false,
          'HIGH'
        );
        
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'localLogin' });
      }
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, { screen: 'Login', action: 'localLogin' });
    }
  };

  const register = async (username, email, password, preferredMode = 'firebase') => {
    try {
      console.log(`🚀 Starting ${preferredMode} registration for:`, { username, email });
      
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
      
      if (preferredMode === 'firebase') {
        // Firebase registration
        const result = await firebaseSignUp(email, password, username);
        
        if (result.success) {
          await SecurityAudit.logEvent(
            SecurityAudit.EVENT_TYPES.REGISTER_SUCCESS,
            { email, authMode: 'firebase' },
            true,
            'LOW'
          );
          
          return { success: true, message: result.message };
        } else {
          return { success: false, message: result.message };
        }
      } else {
        // Local registration
        return await localRegister(username, email, password);
      }
    } catch (error) {
      return ErrorHandler.handleAuthError(error, { screen: 'Register', action: 'register' });
    }
  };

  const localRegister = async (username, email, password) => {
    try {
      await DatabaseManager.initDatabase();
      
      // Check if user already exists
      const existingUsers = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', 
        [email]
      );
      
      if (existingUsers.length > 0) {
        const error = new Error('User already exists');
        error.code = 'AUTH_USER_EXISTS';
        return ErrorHandler.handleAuthError(error, { screen: 'Register', action: 'localRegister' });
      }
      
      // Hash password
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'fitera_salt_2025'
      );
      
      // Create user
      const result = await DatabaseManager.runAsync(
        'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, new Date().toISOString()]
      );
      
      const unifiedUser = {
        id: result.lastInsertRowId,
        username: username,
        email: email,
        name: username,
        authMode: 'local'
      };
      
      // Generate token
      const token = `local_token_${Date.now()}_${result.lastInsertRowId}`;
      
      await SecureStore.setItemAsync('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(unifiedUser));
      await AsyncStorage.setItem('authMode', 'local');
      
      setUser(unifiedUser);
      setAuthMode('local');
      
      await SecurityAudit.logEvent(
        SecurityAudit.EVENT_TYPES.REGISTER_SUCCESS,
        { userId: result.lastInsertRowId, email, authMode: 'local' },
        true,
        'LOW'
      );
      
      return { success: true };
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, { screen: 'Register', action: 'localRegister' });
    }
  };

  const logout = async () => {
    try {
      // Log logout event
      if (user) {
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGOUT,
          { userId: user.id, email: user.email, authMode: user.authMode },
          true,
          'LOW'
        );
      }
      
      if (authMode === 'firebase') {
        await firebaseSignOut();
      }
      
      await clearUserSession();
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'UnifiedAuthContext', action: 'logout' });
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      if (authMode === 'firebase') {
        return await sendPasswordResetEmail(email);
      } else {
        // For local auth, we would need to implement a different password reset mechanism
        return {
          success: false,
          message: 'Password reset is only available for Firebase accounts. Please use Firebase authentication to enable this feature.'
        };
      }
    } catch (error) {
      return ErrorHandler.handleAuthError(error, { screen: 'ForgotPassword', action: 'requestPasswordReset' });
    }
  };

  // Helper method to get the current user's ID for database operations
  const getCurrentUserId = () => {
    return user?.id || null;
  };

  const value = {
    user,
    loading,
    authMode,
    login,
    register,
    logout,
    requestPasswordReset,
    getCurrentUserId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
