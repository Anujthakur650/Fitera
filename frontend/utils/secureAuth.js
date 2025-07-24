import SecureStorageManager from './secureStorage';
import BiometricAuthManager from './biometricAuth';
import { Alert } from 'react-native';

/**
 * Secure Authentication Manager
 * Enhanced JWT security with refresh tokens, automatic renewal, and security monitoring
 */
class SecureAuthManager {
  constructor() {
    this.tokenCheckInterval = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.failedAttempts = 0;
    this.maxFailedAttempts = 3;
    this.lockoutDuration = 300000; // 5 minutes
    this.lockoutEndTime = null;
  }

  /**
   * Initialize secure authentication system
   */
  async initialize() {
    try {
      // Check if user is locked out
      await this.checkLockoutStatus();
      
      // Start token monitoring
      this.startTokenMonitoring();
      
      // Check for existing session
      const hasValidSession = await this.hasValidSession();
      
      return {
        hasValidSession,
        isLocked: this.isLockedOut(),
        failedAttempts: this.failedAttempts
      };
    } catch (error) {
      console.error('Failed to initialize secure auth:', error);
      return {
        hasValidSession: false,
        isLocked: false,
        failedAttempts: 0
      };
    }
  }

  /**
   * Secure login with enhanced security features
   */
  async login(credentials) {
    try {
      // Check if user is locked out
      if (this.isLockedOut()) {
        const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
        throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
      }

      // Validate credentials
      if (!this.validateCredentials(credentials)) {
        await this.handleFailedAttempt();
        throw new Error('Invalid credentials format');
      }

      // Make login request to backend
      const loginResult = await this.performLogin(credentials);
      
      if (loginResult.success) {
        // Reset failed attempts on successful login
        await this.resetFailedAttempts();
        
        // Store tokens securely
        await this.storeAuthTokens(loginResult.tokens);
        
        // Store user data
        await SecureStorageManager.storeSessionData({
          userId: loginResult.user.id,
          email: loginResult.user.email,
          loginTime: new Date().toISOString(),
          deviceId: await this.getDeviceId()
        });

        // Log successful login
        await this.logSecurityEvent('login_success', {
          userId: loginResult.user.id,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          user: loginResult.user,
          tokens: loginResult.tokens
        };
      } else {
        await this.handleFailedAttempt();
        throw new Error(loginResult.error || 'Login failed');
      }
    } catch (error) {
      await this.logSecurityEvent('login_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Secure logout with cleanup
   */
  async logout() {
    try {
      // Stop token monitoring
      this.stopTokenMonitoring();
      
      // Get current session for logging
      const session = await SecureStorageManager.getSessionData();
      
      // Clear all secure data
      await SecureStorageManager.clearAllSecureData();
      
      // Log logout event
      await this.logSecurityEvent('logout', {
        userId: session?.userId,
        sessionDuration: session?.loginTime ? 
          Date.now() - new Date(session.loginTime).getTime() : null,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current authentication token
   */
  async getAuthToken() {
    try {
      const token = await SecureStorageManager.getAuthToken();
      
      if (!token) {
        return null;
      }

      // Check if token is expired
      if (this.isTokenExpired(token)) {
        console.log('Token expired, attempting refresh...');
        return await this.refreshToken();
      }

      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      // Prevent multiple concurrent refresh attempts
      if (this.isRefreshing) {
        return await this.refreshPromise;
      }

      this.isRefreshing = true;
      this.refreshPromise = this.performTokenRefresh();
      
      const result = await this.refreshPromise;
      
      this.isRefreshing = false;
      this.refreshPromise = null;
      
      return result;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      
      console.error('Token refresh failed:', error);
      
      // If refresh fails, logout user
      await this.logout();
      
      return null;
    }
  }

  /**
   * Perform actual token refresh
   */
  async performTokenRefresh() {
    try {
      const refreshToken = await SecureStorageManager.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Make refresh request to backend
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Store new tokens
      await this.storeAuthTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      });

      await this.logSecurityEvent('token_refreshed', {
        timestamp: new Date().toISOString()
      });

      return data.access_token;
    } catch (error) {
      await this.logSecurityEvent('token_refresh_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      // Decode JWT token (basic implementation)
      const payload = this.decodeJWT(token);
      
      if (!payload.exp) {
        return true; // No expiration claim
      }

      // Check if token expires within next 5 minutes (refresh early)
      const expirationTime = payload.exp * 1000;
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      
      return Date.now() >= (expirationTime - bufferTime);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if can't decode
    }
  }

  /**
   * Basic JWT token decoder (for client-side checks only)
   */
  decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Failed to decode JWT token');
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeAuthTokens(tokens) {
    try {
      await SecureStorageManager.storeAuthToken(
        tokens.accessToken,
        tokens.refreshToken
      );
      
      return true;
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
      return false;
    }
  }

  /**
   * Check if user has valid session
   */
  async hasValidSession() {
    try {
      const token = await this.getAuthToken();
      const session = await SecureStorageManager.getSessionData();
      
      return !!(token && session);
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Start monitoring token expiration
   */
  startTokenMonitoring() {
    // Check token every minute
    this.tokenCheckInterval = setInterval(async () => {
      try {
        const token = await SecureStorageManager.getAuthToken();
        
        if (token && this.isTokenExpired(token)) {
          console.log('Token expired during monitoring, refreshing...');
          await this.refreshToken();
        }
      } catch (error) {
        console.error('Error during token monitoring:', error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Validate credentials format
   */
  validateCredentials(credentials) {
    if (!credentials || typeof credentials !== 'object') {
      return false;
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!credentials.email || !emailRegex.test(credentials.email)) {
      return false;
    }

    // Check password strength
    if (!credentials.password || credentials.password.length < 8) {
      return false;
    }

    return true;
  }

  /**
   * Perform login request to backend
   */
  async performLogin(credentials) {
    try {
      // In a real implementation, this would make an API call
      // For now, simulate the backend call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || 'Login failed'
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        user: data.user,
        tokens: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedAttempt() {
    try {
      this.failedAttempts++;
      
      await SecureStorageManager.setSecureItem('failed_attempts', this.failedAttempts);
      
      if (this.failedAttempts >= this.maxFailedAttempts) {
        this.lockoutEndTime = Date.now() + this.lockoutDuration;
        await SecureStorageManager.setSecureItem('lockout_end_time', this.lockoutEndTime);
        
        await this.logSecurityEvent('account_locked', {
          failedAttempts: this.failedAttempts,
          lockoutDuration: this.lockoutDuration,
          timestamp: new Date().toISOString()
        });

        Alert.alert(
          'Account Locked',
          `Too many failed attempts. Your account has been locked for ${this.lockoutDuration / 60000} minutes.`
        );
      } else {
        const remaining = this.maxFailedAttempts - this.failedAttempts;
        Alert.alert(
          'Login Failed',
          `Invalid credentials. ${remaining} attempts remaining before account lockout.`
        );
      }
    } catch (error) {
      console.error('Failed to handle failed attempt:', error);
    }
  }

  /**
   * Reset failed attempts counter
   */
  async resetFailedAttempts() {
    try {
      this.failedAttempts = 0;
      this.lockoutEndTime = null;
      
      await SecureStorageManager.removeSecureItem('failed_attempts');
      await SecureStorageManager.removeSecureItem('lockout_end_time');
    } catch (error) {
      console.error('Failed to reset failed attempts:', error);
    }
  }

  /**
   * Check lockout status
   */
  async checkLockoutStatus() {
    try {
      const failedAttempts = await SecureStorageManager.getSecureItem('failed_attempts');
      const lockoutEndTime = await SecureStorageManager.getSecureItem('lockout_end_time');
      
      this.failedAttempts = failedAttempts || 0;
      this.lockoutEndTime = lockoutEndTime;
      
      // Check if lockout has expired
      if (this.lockoutEndTime && Date.now() > this.lockoutEndTime) {
        await this.resetFailedAttempts();
      }
    } catch (error) {
      console.error('Failed to check lockout status:', error);
    }
  }

  /**
   * Check if user is currently locked out
   */
  isLockedOut() {
    return this.lockoutEndTime && Date.now() < this.lockoutEndTime;
  }

  /**
   * Get device ID for session tracking
   */
  async getDeviceId() {
    try {
      // In a real implementation, use expo-device or similar
      return 'device_' + Math.random().toString(36).substr(2, 9);
    } catch (error) {
      return 'unknown_device';
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometricAuth() {
    try {
      const result = await BiometricAuthManager.enableBiometricAuth();
      
      if (result) {
        await this.logSecurityEvent('biometric_enabled', {
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric() {
    try {
      const result = await BiometricAuthManager.authenticate({
        promptMessage: 'Authenticate to access Fitera'
      });
      
      if (result.success) {
        await this.logSecurityEvent('biometric_auth_success', {
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, eventData) {
    try {
      const logEntry = {
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0' // Get from app config
      };
      
      // Store in secure logs (implement as needed)
      console.log('[SECURITY LOG]', logEntry);
      
      // In production, you might want to send critical events to your backend
      if (['account_locked', 'multiple_failed_attempts'].includes(eventType)) {
        // Send to security monitoring service
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security status for UI
   */
  async getSecurityStatus() {
    try {
      const hasValidSession = await this.hasValidSession();
      const biometricStatus = await BiometricAuthManager.getBiometricStatus();
      const securitySettings = await SecureStorageManager.getSecuritySettings();
      
      return {
        isAuthenticated: hasValidSession,
        isLocked: this.isLockedOut(),
        failedAttempts: this.failedAttempts,
        biometric: biometricStatus,
        settings: securitySettings,
        lastActivity: await this.getLastActivity()
      };
    } catch (error) {
      console.error('Failed to get security status:', error);
      return {
        isAuthenticated: false,
        isLocked: false,
        failedAttempts: 0,
        biometric: { deviceSupported: false },
        settings: {},
        lastActivity: null
      };
    }
  }

  /**
   * Get last activity timestamp
   */
  async getLastActivity() {
    try {
      const session = await SecureStorageManager.getSessionData();
      return session?.lastActivity || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update last activity
   */
  async updateLastActivity() {
    try {
      const session = await SecureStorageManager.getSessionData();
      
      if (session) {
        session.lastActivity = new Date().toISOString();
        await SecureStorageManager.storeSessionData(session);
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Check for session timeout
   */
  async checkSessionTimeout() {
    try {
      const settings = await SecureStorageManager.getSecuritySettings();
      const lastActivity = await this.getLastActivity();
      
      if (!lastActivity || !settings.autoLockEnabled) {
        return false; // No timeout configured
      }

      const timeoutDuration = settings.autoLockTimeout || 300000; // 5 minutes default
      const timeSinceActivity = Date.now() - new Date(lastActivity).getTime();
      
      if (timeSinceActivity > timeoutDuration) {
        await this.logout();
        return true; // Session timed out
      }
      
      return false;
    } catch (error) {
      console.error('Error checking session timeout:', error);
      return false;
    }
  }
}

export default new SecureAuthManager(); 