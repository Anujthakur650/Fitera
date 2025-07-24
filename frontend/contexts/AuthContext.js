import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from '../api/config';
import DatabaseManager from '../utils/database';
import * as Crypto from 'expo-crypto';
import ErrorHandler from '../utils/errorHandler';
import SecurityAudit from '../utils/securityAudit';
import RateLimiter from '../utils/rateLimiter';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Alert } from 'react-native';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
    // Initialize security audit system
    SecurityAudit.initialize();
  }, []);

  const loadStoredUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'AuthContext', action: 'loadStoredUser' });
    } finally {
      setLoading(false);
    }
  };

  // Local authentication using SQLite
  const localLogin = async (email, password) => {
    try {
      console.log('🔍 Local login attempt for email:', email);
      
      // Check rate limit before proceeding
      const rateLimitStatus = await RateLimiter.checkRateLimit(email);
      if (rateLimitStatus.isLocked) {
        const error = new Error(rateLimitStatus.message);
        error.code = 'AUTH_RATE_LIMITED';
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'localLogin' });
      }
      
      await DatabaseManager.initDatabase();
      
      // Check if user exists in local database (case-insensitive)
      const users = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', 
        [email]
      );
      
      console.log('🔍 Users found in database:', users.length);
      console.log('🔍 User data:', users[0] ? { id: users[0].id, email: users[0].email, hasPassword: !!users[0].password } : 'No user');
      
      if (users.length === 0) {
        const error = new Error('User not found');
        error.code = 'AUTH_USER_NOT_FOUND';
        
        // Log failed login attempt
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_FAILED,
          { email, reason: 'User not found' },
          false,
          'MEDIUM'
        );
        
        // Record failed attempt
        await RateLimiter.recordFailedAttempt(email);
        
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'localLogin' });
      }
      
      const localUser = users[0];
      
      // Validate password and use bcrypt for secure password comparison
      if (!password || typeof password !== 'string') {
        const error = new Error('Invalid password provided');
        error.code = 'VALIDATION_FAILED';
        return ErrorHandler.handleValidationError(['Password is required'], { screen: 'Login', action: 'localLogin' });
      }
      
      let passwordMatch = false;

      // Legacy plain-text password check (not hashed)
      if (localUser.password && localUser.password.length < 60) {
        console.log('🔄 Detected legacy plain-text password, performing direct comparison');
        if (password.toString() === localUser.password) {
          console.log('✅ Plain-text password matched');
          passwordMatch = true;
        } else {
          console.log('❌ Plain-text password mismatch');
        }
      } else {
        // Use expo-crypto for password verification
        console.log('🔄 Using expo-crypto for password verification...');
        const hashedInput = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password.toString() + 'fitera_salt_2025'
        );
        passwordMatch = hashedInput === localUser.password;
        console.log('✅ Password comparison completed');
      }
      
      if (localUser.password && passwordMatch) {
        console.log('✅ Password match - login successful');
        const userData = {
          id: localUser.id,
          username: localUser.name,
          email: localUser.email,
          name: localUser.name
        };
        
        // Generate a simple token for local use
        const token = `local_token_${Date.now()}_${localUser.id}`;
        
        await SecureStore.setItemAsync('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        
        // Clear rate limit on successful login
        await RateLimiter.clearAttempts(email);
        
        // Log successful login
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_SUCCESS,
          { userId: localUser.id, email: localUser.email },
          true,
          'LOW'
        );
        
        return { success: true };
      } else {
        const error = new Error('Invalid password');
        error.code = 'AUTH_INVALID_CREDENTIALS';
        
        // Log failed login attempt
        await SecurityAudit.logEvent(
          SecurityAudit.EVENT_TYPES.LOGIN_FAILED,
          { userId: localUser.id, email: localUser.email, reason: 'Invalid password' },
          false,
          'HIGH'
        );
        
        // Record failed attempt with rate limiter
        const rateLimitResult = await RateLimiter.recordFailedAttempt(email);
        if (rateLimitResult.isLocked) {
          error.code = 'AUTH_ACCOUNT_LOCKED';
          error.message = rateLimitResult.message;
        } else if (rateLimitResult.delay > 0) {
          error.code = 'AUTH_RATE_LIMITED';
          error.message = `Please wait ${Math.ceil(rateLimitResult.delay / 1000)} seconds before trying again. ${rateLimitResult.message}`;
        }
        
        return ErrorHandler.handleAuthError(error, { screen: 'Login', action: 'localLogin', userId: localUser.id });
      }
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, { screen: 'Login', action: 'localLogin' });
    }
  };

  // Local registration using SQLite
  const localRegister = async (username, email, password) => {
    try {
      console.log('📝 Local registration attempt:', { username, email, passwordLength: password?.length, passwordType: typeof password });
      console.log('🔍 Password debug:', { password, isString: typeof password === 'string', isNull: password === null, isUndefined: password === undefined });
      await DatabaseManager.initDatabase();
      
      // Check if user already exists (case-insensitive)
      const existingUsers = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', 
        [email]
      );
      
      console.log('🔍 Existing users found:', existingUsers.length);
      
      if (existingUsers.length > 0) {
        const error = new Error('User already exists');
        error.code = 'AUTH_USER_EXISTS';
        return ErrorHandler.handleAuthError(error, { screen: 'Register', action: 'localRegister' });
      }
      
      // Validate and sanitize password before hashing
      console.log('🔍 Password validation:', { 
        password, 
        type: typeof password, 
        length: password?.length,
        isString: typeof password === 'string',
        isNull: password === null,
        isUndefined: password === undefined
      });
      
      if (!password) {
        return ErrorHandler.handleValidationError(['Password is required'], { screen: 'Register', action: 'localRegister' });
      }
      
      // Convert to string and validate
      const passwordStr = String(password).trim();
      if (!passwordStr || passwordStr.length < 6) {
        return ErrorHandler.handleValidationError(['Password must be at least 6 characters long'], { screen: 'Register', action: 'localRegister' });
      }
      
      console.log('✅ Password validated, hashing with expo-crypto...');
      
      // Use expo-crypto for password hashing (works reliably in React Native)
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        passwordStr + 'fitera_salt_2025'
      );
      console.log('✅ Password hashed successfully with expo-crypto');
      
      // Create new user with hashed password
      const result = await DatabaseManager.runAsync(
        'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, new Date().toISOString()]
      );
      
      console.log('✅ User created with ID:', result.lastInsertRowId);
      
      const userData = {
        id: result.lastInsertRowId,
        username: username,
        email: email,
        name: username
      };
      
      // Generate a simple token for local use
      const token = `local_token_${Date.now()}_${result.lastInsertRowId}`;
      
      await SecureStore.setItemAsync('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      console.log('✅ Local registration successful');
      
      // Log successful registration
      await SecurityAudit.logEvent(
        SecurityAudit.EVENT_TYPES.REGISTER_SUCCESS,
        { userId: result.lastInsertRowId, email: email },
        true,
        'LOW'
      );
      
      return { success: true };
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, { screen: 'Register', action: 'localRegister' });
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🚀 Starting login process for:', email);
      // Rate limit check
      const rateLimitStatus = await RateLimiter.checkRateLimit(email);
      if (rateLimitStatus.isLocked) {
        ErrorHandler.logError({ message: rateLimitStatus.message }, { screen: 'Login', action: 'rateLimit' }, 'HIGH');
        return { error: rateLimitStatus.message };
      }

      // Skip API login in development if configured
      const skipAPIInDev = __DEV__ && process.env.SKIP_API_LOGIN === 'true';
      if (skipAPIInDev) {
        console.log('📱 Development mode: Skipping API login, using local authentication');
        return await localLogin(email, password);
      }

      // Try API login first
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // Clear rate limit data if login is successful
      await RateLimiter.clearAttempts(email);

      await SecureStore.setItemAsync('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      console.log('✅ API login successful');
      return { success: true };
    } catch (error) {
      // Record failed login attempt
      await RateLimiter.recordFailedAttempt(email);

      ErrorHandler.logError(error, { screen: 'Login', action: 'apiLogin' });
      // Fallback to local authentication
      return await localLogin(email, password);
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('🚀 Starting registration process for:', { username, email });
      // Try API registration first
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      console.log('✅ API registration successful');
      return { success: true };
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'Register', action: 'apiRegister' });
      // Fallback to local registration
      return await localRegister(username, email, password);
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
      
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'AuthContext', action: 'logout' });
    }
  };

  // Forgot password with auto-migration to Firebase
  const forgotPassword = async (email) => {
    try {
      console.log('🔑 Starting password reset process for:', email);
      
      // First, check if user exists locally
      await DatabaseManager.initDatabase();
      const localUsers = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [email]
      );
      
      if (localUsers.length > 0) {
        const localUser = localUsers[0];
        
        // Check if user already has Firebase UID (already migrated)
        if (localUser.firebase_uid) {
          console.log('✅ User already migrated to Firebase, sending reset email');
          await sendPasswordResetEmail(auth, email);
          return { success: true, message: 'Password reset email sent!' };
        }
        
        // User exists locally but not in Firebase - offer migration
        console.log('🔄 Local user found, needs Firebase migration');
        
        return new Promise((resolve) => {
          Alert.alert(
            'Account Security Upgrade',
            'To reset your password, we need to upgrade your account with enhanced security features. This will enable password reset via email and cloud backup for your workouts.\n\nYour existing workout data will be preserved.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve({ 
                  success: false, 
                  message: 'Password reset cancelled' 
                })
              },
              {
                text: 'Upgrade & Reset',
                style: 'default',
                onPress: async () => {
                  try {
                    // Generate a secure temporary password
                    const tempPassword = Math.random().toString(36).slice(-8) + 
                                        Math.random().toString(36).slice(-8).toUpperCase() + 
                                        '!@#$'[Math.floor(Math.random() * 4)] + 
                                        Math.floor(Math.random() * 100);
                    
                    console.log('🔄 Creating Firebase account for existing user');
                    
                    // Create Firebase user
                    const userCredential = await createUserWithEmailAndPassword(
                      auth,
                      email,
                      tempPassword
                    );
                    
                    const firebaseUser = userCredential.user;
                    console.log('✅ Firebase account created:', firebaseUser.uid);
                    
                    // Link Firebase UID to local user
                    await DatabaseManager.linkFirebaseUidToExistingUser(
                      localUser.id,
                      firebaseUser.uid
                    );
                    
                    console.log('✅ Accounts linked successfully');
                    
                    // Send password reset email
                    await sendPasswordResetEmail(auth, email);
                    
                    // Log the migration
                    await SecurityAudit.logEvent(
                      SecurityAudit.EVENT_TYPES.USER_MIGRATED,
                      { 
                        userId: localUser.id, 
                        email: email,
                        firebaseUid: firebaseUser.uid 
                      },
                      true,
                      'MEDIUM'
                    );
                    
                    Alert.alert(
                      'Success!',
                      'Your account has been upgraded. Please check your email for password reset instructions.\n\nAll your workout data has been preserved.',
                      [{ text: 'OK' }]
                    );
                    
                    resolve({ 
                      success: true, 
                      message: 'Account upgraded and password reset email sent!' 
                    });
                  } catch (error) {
                    console.error('❌ Migration error:', error);
                    
                    let errorMessage = 'Failed to upgrade account. ';
                    if (error.code === 'auth/email-already-in-use') {
                      // Firebase account already exists, just send reset email
                      console.log('🔄 Firebase account already exists, sending reset email directly');
                      try {
                        await sendPasswordResetEmail(auth, email);
                        Alert.alert(
                          'Password Reset Email Sent',
                          'A Firebase account already exists for this email. We\'ve sent you a password reset link. Please check your email.',
                          [{ text: 'OK' }]
                        );
                        resolve({ 
                          success: true, 
                          message: 'Password reset email sent to existing Firebase account!' 
                        });
                        return;
                      } catch (resetError) {
                        console.error('❌ Failed to send reset email:', resetError);
                        errorMessage = 'Failed to send password reset email. Please try again.';
                      }
                    } else if (error.code === 'auth/weak-password') {
                      errorMessage = 'Security upgrade failed. Please try again.';
                    } else if (error.code === 'auth/network-request-failed') {
                      errorMessage = 'Network error. Please check your connection and try again.';
                    }
                    
                    Alert.alert('Error', errorMessage);
                    resolve({ success: false, message: errorMessage });
                  }
                }
              }
            ]
          );
        });
      } else {
        // User doesn't exist locally, try Firebase directly
        console.log('🔍 No local user found, trying Firebase');
        try {
          await sendPasswordResetEmail(auth, email);
          return { success: true, message: 'Password reset email sent!' };
        } catch (error) {
          console.error('❌ Firebase password reset error:', error);
          
          let errorMessage = 'Failed to send reset email.';
          if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
          }
          
          return { success: false, message: errorMessage };
        }
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again.' 
      };
    }
  };

  // Debug function to check database contents
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
      
      // Search for specific email (case-insensitive)
      const specificUser = await DatabaseManager.getAllAsync(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?)', 
        ['anujthakur650@gmail.com']
      );
      console.log('🔍 User with email anujthakur650@gmail.com:', specificUser);
      
      return { allUsers, tableInfo, specificUser };
    } catch (error) {
      console.error('❌ Debug database error:', error);
      return { error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword, // Add forgot password method
    debugDatabase // Add debug function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
