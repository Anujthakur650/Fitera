import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

/**
 * Secure Storage Manager for sensitive data
 * Replaces AsyncStorage for security-critical information
 */
class SecureStorageManager {
  constructor() {
    this.keyPrefix = 'fitera_secure_';
    this.encryptionOptions = {
      keychainService: 'FiteraSecureStorage',
      sharedPreferencesName: 'FiteraSecurePrefs',
      encrypt: true,
      requireAuthentication: false, // Set to true for biometric-protected storage
    };
  }

  /**
   * Generate secure key with prefix
   */
  generateSecureKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Store sensitive data securely
   */
  async setSecureItem(key, value, requireBiometric = false) {
    try {
      const secureKey = this.generateSecureKey(key);
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      const options = {
        ...this.encryptionOptions,
        requireAuthentication: requireBiometric,
      };

      await SecureStore.setItemAsync(secureKey, stringValue, options);
      
      console.log(`Securely stored: ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      
      // Show user-friendly error
      Alert.alert(
        'Security Error',
        'Failed to securely store sensitive data. Please check your device security settings.'
      );
      
      return false;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getSecureItem(key, requireBiometric = false) {
    try {
      const secureKey = this.generateSecureKey(key);
      
      const options = {
        ...this.encryptionOptions,
        requireAuthentication: requireBiometric,
        authenticationPrompt: 'Please authenticate to access your secure data',
      };

      const value = await SecureStore.getItemAsync(secureKey, options);
      
      if (!value) return null;

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      
      if (error.message.includes('UserCancel') || error.message.includes('Authentication')) {
        Alert.alert(
          'Authentication Required',
          'Please authenticate to access your secure data.'
        );
      } else {
        Alert.alert(
          'Security Error',
          'Failed to retrieve secure data. Please check your device security settings.'
        );
      }
      
      return null;
    }
  }

  /**
   * Delete sensitive data securely
   */
  async removeSecureItem(key) {
    try {
      const secureKey = this.generateSecureKey(key);
      await SecureStore.deleteItemAsync(secureKey);
      console.log(`Securely removed: ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if secure item exists
   */
  async hasSecureItem(key) {
    try {
      const secureKey = this.generateSecureKey(key);
      const value = await SecureStore.getItemAsync(secureKey);
      return value !== null;
    } catch (error) {
      console.error(`Failed to check secure item ${key}:`, error);
      return false;
    }
  }

  /**
   * Store JWT token securely
   */
  async storeAuthToken(token, refreshToken = null) {
    try {
      const success = await this.setSecureItem('auth_token', token);
      
      if (refreshToken) {
        await this.setSecureItem('refresh_token', refreshToken);
      }
      
      // Store token metadata
      await this.setSecureItem('token_stored_at', new Date().toISOString());
      
      return success;
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve JWT token securely
   */
  async getAuthToken() {
    try {
      const token = await this.getSecureItem('auth_token');
      const storedAt = await this.getSecureItem('token_stored_at');
      
      if (!token) return null;

      // Check token age (optional expiry check)
      if (storedAt) {
        const tokenAge = Date.now() - new Date(storedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxAge) {
          console.log('Token expired, removing...');
          await this.clearAuthTokens();
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken() {
    return await this.getSecureItem('refresh_token');
  }

  /**
   * Clear all authentication tokens
   */
  async clearAuthTokens() {
    try {
      await this.removeSecureItem('auth_token');
      await this.removeSecureItem('refresh_token');
      await this.removeSecureItem('token_stored_at');
      return true;
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
      return false;
    }
  }

  /**
   * Store user credentials securely (for biometric login)
   */
  async storeUserCredentials(email, hashedPassword) {
    try {
      const credentials = {
        email,
        hashedPassword,
        storedAt: new Date().toISOString()
      };
      
      // Require biometric authentication for credentials
      return await this.setSecureItem('user_credentials', credentials, true);
    } catch (error) {
      console.error('Failed to store user credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve user credentials (with biometric authentication)
   */
  async getUserCredentials() {
    try {
      return await this.getSecureItem('user_credentials', true);
    } catch (error) {
      console.error('Failed to retrieve user credentials:', error);
      return null;
    }
  }

  /**
   * Store security settings
   */
  async storeSecuritySettings(settings) {
    try {
      const securitySettings = {
        biometricEnabled: settings.biometricEnabled || false,
        autoLockEnabled: settings.autoLockEnabled || false,
        autoLockTimeout: settings.autoLockTimeout || 300000, // 5 minutes
        pinEnabled: settings.pinEnabled || false,
        ...settings
      };
      
      return await this.setSecureItem('security_settings', securitySettings);
    } catch (error) {
      console.error('Failed to store security settings:', error);
      return false;
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings() {
    try {
      const defaultSettings = {
        biometricEnabled: false,
        autoLockEnabled: false,
        autoLockTimeout: 300000,
        pinEnabled: false
      };
      
      const settings = await this.getSecureItem('security_settings');
      return settings || defaultSettings;
    } catch (error) {
      console.error('Failed to retrieve security settings:', error);
      return {
        biometricEnabled: false,
        autoLockEnabled: false,
        autoLockTimeout: 300000,
        pinEnabled: false
      };
    }
  }

  /**
   * Store encrypted backup key
   */
  async storeBackupKey(backupKey) {
    try {
      return await this.setSecureItem('backup_encryption_key', backupKey, true);
    } catch (error) {
      console.error('Failed to store backup key:', error);
      return false;
    }
  }

  /**
   * Get backup key (with authentication)
   */
  async getBackupKey() {
    try {
      return await this.getSecureItem('backup_encryption_key', true);
    } catch (error) {
      console.error('Failed to retrieve backup key:', error);
      return null;
    }
  }

  /**
   * Store app session data
   */
  async storeSessionData(sessionData) {
    try {
      const session = {
        ...sessionData,
        lastActivity: new Date().toISOString(),
        sessionId: this.generateSessionId()
      };
      
      return await this.setSecureItem('app_session', session);
    } catch (error) {
      console.error('Failed to store session data:', error);
      return false;
    }
  }

  /**
   * Get app session data
   */
  async getSessionData() {
    try {
      return await this.getSecureItem('app_session');
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all secure storage (for logout/reset)
   */
  async clearAllSecureData() {
    try {
      const keysToRemove = [
        'auth_token',
        'refresh_token',
        'token_stored_at',
        'user_credentials',
        'app_session',
        'backup_encryption_key'
      ];
      
      for (const key of keysToRemove) {
        await this.removeSecureItem(key);
      }
      
      console.log('All secure data cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear all secure data:', error);
      return false;
    }
  }

  /**
   * Verify secure storage is available
   */
  async isSecureStorageAvailable() {
    try {
      await SecureStore.isAvailableAsync();
      return true;
    } catch (error) {
      console.error('Secure storage not available:', error);
      Alert.alert(
        'Security Warning',
        'Secure storage is not available on this device. Your data may not be fully protected.'
      );
      return false;
    }
  }

  /**
   * Get storage info for debugging
   */
  async getStorageInfo() {
    try {
      const isAvailable = await this.isSecureStorageAvailable();
      const hasToken = await this.hasSecureItem('auth_token');
      const hasCredentials = await this.hasSecureItem('user_credentials');
      const hasSession = await this.hasSecureItem('app_session');
      
      return {
        isAvailable,
        hasToken,
        hasCredentials,
        hasSession,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}

export default new SecureStorageManager(); 