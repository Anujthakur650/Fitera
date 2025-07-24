import React, { createContext, useState, useContext, useEffect } from 'react';
import SecurityMigrationManager from '../utils/securityMigration';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/config';

const EnhancedAuthContext = createContext({});

export const useEnhancedAuth = () => useContext(EnhancedAuthContext);

export const EnhancedAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Initialize security system
      const securityResult = await SecurityMigrationManager.initializeSecurity();
      setSecurityEnabled(securityResult.securityEnabled);
      
      if (securityResult.status?.biometrics?.deviceSupported) {
        setBiometricAvailable(true);
      }
      
      // Load stored user (try secure storage first, fallback to AsyncStorage)
      await loadStoredUser();
      
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredUser = async () => {
    try {
      // Try secure storage first, then fallback to AsyncStorage
      const token = await SecurityMigrationManager.safeGetAuthToken();
      const userData = await SecurityMigrationManager.safeStorageGet('user');
      
      if (token && userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load stored user:', error);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Try secure authentication first
      const secureResult = await SecurityMigrationManager.safeAuthenticate({ email, password });
      
      if (secureResult) {
        // Secure authentication succeeded
        setUser(secureResult.user);
        return { success: true, enhanced: true };
      }
      
      // Fallback to original authentication
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      // Store using safe storage methods
      await SecurityMigrationManager.safeStorageSet('token', token);
      await SecurityMigrationManager.safeStorageSet('user', userData);
      
      setUser(userData);
      return { success: true, enhanced: false };
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setLoading(true);
      
      // Use original registration endpoint
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user: userData } = response.data;
      
      // Store using safe storage methods
      await SecurityMigrationManager.safeStorageSet('token', token);
      await SecurityMigrationManager.safeStorageSet('user', userData);
      
      setUser(userData);
      return { success: true };
      
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Use safe storage removal
      await SecurityMigrationManager.safeStorageRemove('token');
      await SecurityMigrationManager.safeStorageRemove('user');
      
      // Clean up security resources
      await SecurityMigrationManager.cleanup();
      
      setUser(null);
      
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      if (!biometricAvailable) {
        throw new Error('Biometric authentication not available');
      }
      
      const result = await SecurityMigrationManager.authenticateForSensitiveOperation('app_access');
      
      if (result.success) {
        // Load user data after successful biometric auth
        await loadStoredUser();
        return { success: true };
      }
      
      return { success: false, message: 'Biometric authentication failed' };
      
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, message: error.message };
    }
  };

  const enableEnhancedSecurity = async () => {
    try {
      await SecurityMigrationManager.enableEnhancedSecurity();
      setSecurityEnabled(true);
      return { success: true };
    } catch (error) {
      console.error('Failed to enable enhanced security:', error);
      return { success: false, message: error.message };
    }
  };

  const getSecurityStatus = async () => {
    try {
      const status = await SecurityMigrationManager.getSecurityStatus();
      const recommendations = await SecurityMigrationManager.getSecurityRecommendations();
      
      return {
        ...status,
        securityEnabled,
        biometricAvailable,
        recommendations
      };
    } catch (error) {
      console.error('Error getting security status:', error);
      return {
        securityEnabled: false,
        biometricAvailable: false,
        recommendations: []
      };
    }
  };

  // Check if user session is still valid
  const validateSession = async () => {
    try {
      const token = await SecurityMigrationManager.safeGetAuthToken();
      return !!token;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  // Enhanced security check for sensitive operations
  const requireSecurityCheck = async (operationType = 'sensitive_operation') => {
    try {
      if (!securityEnabled) {
        return { success: true, authType: 'none' }; // No additional security in legacy mode
      }
      
      return await SecurityMigrationManager.authenticateForSensitiveOperation(operationType);
    } catch (error) {
      console.error('Security check error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    // Core authentication
    user,
    loading,
    login,
    register,
    logout,
    
    // Enhanced security features
    securityEnabled,
    biometricAvailable,
    authenticateWithBiometric,
    enableEnhancedSecurity,
    getSecurityStatus,
    validateSession,
    requireSecurityCheck,
    
    // Utility methods
    isAuthenticated: !!user,
    isSecurityActive: SecurityMigrationManager.isSecurityActive()
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

// Backward compatibility wrapper
export const AuthProvider = EnhancedAuthProvider;
export const useAuth = () => {
  const context = useEnhancedAuth();
  
  // Return only the core authentication methods for backward compatibility
  return {
    user: context.user,
    loading: context.loading,
    login: context.login,
    register: context.register,
    logout: context.logout,
    isAuthenticated: context.isAuthenticated
  };
}; 