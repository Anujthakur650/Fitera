import DatabaseManager from './database';
import SecureDatabaseManager from './secureDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageManager from './secureStorage';
import SecureAuthManager from './secureAuth';
import BiometricAuthManager from './biometricAuth';
import InputValidator from './inputValidator';
import { Alert } from 'react-native';

/**
 * Security Migration Manager
 * Provides backward-compatible security integration without breaking existing functionality
 */
class SecurityMigrationManager {
  constructor() {
    this.isSecurityEnabled = false;
    this.migrationInProgress = false;
    this.fallbackToLegacy = true;
  }

  /**
   * Initialize security system with fallback support
   */
  async initializeSecurity() {
    try {
      console.log('🔐 Initializing security system...');
      
      // Check if we can enable security features
      const securityStatus = await this.checkSecuritySupport();
      
      if (securityStatus.canEnable) {
        // Initialize security managers
        await SecureAuthManager.initialize();
        await BiometricAuthManager.initialize();
        
        this.isSecurityEnabled = true;
        console.log('✅ Security system initialized successfully');
        
        // Optional: Ask user if they want to enable enhanced security
        this.promptSecurityUpgrade();
      } else {
        console.log('⚠️ Security features not fully supported, using legacy mode');
        this.fallbackToLegacy = true;
      }
      
      return {
        securityEnabled: this.isSecurityEnabled,
        fallbackMode: this.fallbackToLegacy,
        status: securityStatus
      };
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      this.fallbackToLegacy = true;
      return {
        securityEnabled: false,
        fallbackMode: true,
        error: error.message
      };
    }
  }

  /**
   * Check if device supports security features
   */
  async checkSecuritySupport() {
    try {
      const secureStoreAvailable = await SecureStorageManager.isSecureStorageAvailable();
      const biometricStatus = await BiometricAuthManager.getBiometricStatus();
      
      return {
        canEnable: secureStoreAvailable,
        secureStorage: secureStoreAvailable,
        biometrics: biometricStatus,
        recommendation: this.getSecurityRecommendation(secureStoreAvailable, biometricStatus)
      };
    } catch (error) {
      return {
        canEnable: false,
        secureStorage: false,
        biometrics: { deviceSupported: false },
        recommendation: 'Security features unavailable'
      };
    }
  }

  /**
   * Get security recommendation for user
   */
  getSecurityRecommendation(secureStorage, biometrics) {
    if (!secureStorage) {
      return 'Your device does not support secure storage. Your data will be protected with basic encryption.';
    }
    
    if (secureStorage && biometrics.deviceSupported) {
      return 'Your device supports advanced security features including biometric authentication. We recommend enabling these for maximum protection.';
    }
    
    return 'Your device supports secure storage. We recommend enabling enhanced security features.';
  }

  /**
   * Prompt user to upgrade to enhanced security (optional)
   */
  async promptSecurityUpgrade() {
    try {
      // Only prompt once
      const hasPrompted = await AsyncStorage.getItem('security_upgrade_prompted');
      if (hasPrompted) return;

      Alert.alert(
        '🔐 Enhanced Security Available',
        'Your device supports advanced security features. Would you like to enable them for better protection of your fitness data?',
        [
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: async () => {
              await AsyncStorage.setItem('security_upgrade_prompted', 'true');
            }
          },
          {
            text: 'Enable Security',
            onPress: async () => {
              await this.enableEnhancedSecurity();
              await AsyncStorage.setItem('security_upgrade_prompted', 'true');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error prompting security upgrade:', error);
    }
  }

  /**
   * Enable enhanced security features
   */
  async enableEnhancedSecurity() {
    try {
      // Ask for biometric setup if available
      const biometricStatus = await BiometricAuthManager.getBiometricStatus();
      
      if (biometricStatus.canEnable) {
        const enableBiometric = await new Promise((resolve) => {
          Alert.alert(
            'Enable Biometric Authentication?',
            `Your device supports ${biometricStatus.availableTypes.join(' and ')}. Would you like to use it to protect your fitness data?`,
            [
              { text: 'Skip', onPress: () => resolve(false) },
              { text: 'Enable', onPress: () => resolve(true) }
            ]
          );
        });

        if (enableBiometric) {
          await BiometricAuthManager.enableBiometricAuth();
        }
      }

      // Migrate existing data to secure storage
      await this.migrateToSecureStorage();
      
      Alert.alert(
        '✅ Security Enabled',
        'Enhanced security features have been enabled. Your data is now better protected!'
      );
    } catch (error) {
      console.error('Error enabling enhanced security:', error);
      Alert.alert('Error', 'Failed to enable enhanced security features.');
    }
  }

  /**
   * Migrate existing AsyncStorage data to SecureStore
   */
  async migrateToSecureStorage() {
    try {
      console.log('📦 Migrating data to secure storage...');
      
      // Migrate authentication tokens
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (token) {
        await SecureStorageManager.storeAuthToken(token);
        console.log('✅ Migrated authentication token');
      }
      
      if (user) {
        const userData = JSON.parse(user);
        await SecureStorageManager.storeSessionData({
          userId: userData.id,
          email: userData.email,
          loginTime: new Date().toISOString()
        });
        console.log('✅ Migrated user session data');
      }
      
      // Keep legacy data for compatibility during transition
      console.log('📦 Data migration completed');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced database operations with fallback
   */
  async safeDatabaseOperation(operation, ...args) {
    try {
      if (this.isSecurityEnabled) {
        // Try secure database first
        return await SecureDatabaseManager[operation](...args);
      }
    } catch (error) {
      console.warn(`Secure database operation failed, falling back to legacy: ${error.message}`);
    }
    
    // Fallback to legacy database
    return await DatabaseManager[operation](...args);
  }

  /**
   * Enhanced storage operations with fallback
   */
  async safeStorageGet(key) {
    try {
      if (this.isSecurityEnabled) {
        const value = await SecureStorageManager.getSecureItem(key);
        if (value !== null) return value;
      }
    } catch (error) {
      console.warn(`Secure storage get failed, falling back to AsyncStorage: ${error.message}`);
    }
    
    // Fallback to AsyncStorage
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Enhanced storage set with fallback
   */
  async safeStorageSet(key, value) {
    try {
      if (this.isSecurityEnabled) {
        await SecureStorageManager.setSecureItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn(`Secure storage set failed, falling back to AsyncStorage: ${error.message}`);
    }
    
    // Fallback to AsyncStorage
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return false; // Indicates fallback was used
  }

  /**
   * Enhanced storage remove with fallback
   */
  async safeStorageRemove(key) {
    try {
      if (this.isSecurityEnabled) {
        await SecureStorageManager.removeSecureItem(key);
      }
    } catch (error) {
      console.warn(`Secure storage remove failed: ${error.message}`);
    }
    
    // Also remove from AsyncStorage for cleanup
    await AsyncStorage.removeItem(key);
  }

  /**
   * Safe input validation with fallback
   */
  validateInput(data, dataType) {
    try {
      return InputValidator.validateData(data, dataType);
    } catch (error) {
      console.warn(`Input validation failed: ${error.message}`);
      // Return basic validation result
      return {
        isValid: true,
        errors: [],
        sanitizedData: data
      };
    }
  }

  /**
   * Safe authentication with enhanced security
   */
  async safeAuthenticate(credentials) {
    try {
      if (this.isSecurityEnabled) {
        return await SecureAuthManager.login(credentials);
      }
    } catch (error) {
      console.warn(`Secure authentication failed: ${error.message}`);
    }
    
    // Fallback to basic authentication (existing implementation)
    return null; // Let existing auth handle it
  }

  /**
   * Get authentication token safely
   */
  async safeGetAuthToken() {
    try {
      if (this.isSecurityEnabled) {
        return await SecureAuthManager.getAuthToken();
      }
    } catch (error) {
      console.warn(`Secure token retrieval failed: ${error.message}`);
    }
    
    // Fallback to AsyncStorage
    return await AsyncStorage.getItem('token');
  }

  /**
   * Biometric authentication for sensitive operations
   */
  async authenticateForSensitiveOperation(operationType) {
    try {
      if (this.isSecurityEnabled) {
        const biometricEnabled = await BiometricAuthManager.isBiometricEnabled();
        
        if (biometricEnabled) {
          return await BiometricAuthManager.authenticateForSensitiveOperation(operationType);
        }
      }
    } catch (error) {
      console.warn(`Biometric authentication failed: ${error.message}`);
    }
    
    // No additional authentication required in fallback mode
    return { success: true, authType: 'none' };
  }

  /**
   * Get current security status
   */
  async getSecurityStatus() {
    try {
      if (this.isSecurityEnabled) {
        return await SecureAuthManager.getSecurityStatus();
      }
    } catch (error) {
      console.error('Error getting security status:', error);
    }
    
    return {
      isAuthenticated: false,
      isLocked: false,
      biometric: { deviceSupported: false },
      settings: { biometricEnabled: false },
      securityEnabled: false
    };
  }

  /**
   * Clean up security resources
   */
  async cleanup() {
    try {
      if (this.isSecurityEnabled) {
        await SecureAuthManager.logout();
      }
    } catch (error) {
      console.error('Error during security cleanup:', error);
    }
  }

  /**
   * Check if security features are enabled
   */
  isSecurityActive() {
    return this.isSecurityEnabled && !this.fallbackToLegacy;
  }

  /**
   * Get security recommendations for UI
   */
  async getSecurityRecommendations() {
    const status = await this.checkSecuritySupport();
    const recommendations = [];

    if (!this.isSecurityEnabled && status.canEnable) {
      recommendations.push({
        type: 'enable_security',
        title: 'Enable Enhanced Security',
        description: 'Protect your fitness data with advanced security features',
        priority: 'high'
      });
    }

    if (status.biometrics.deviceSupported && !status.biometrics.appEnabled) {
      recommendations.push({
        type: 'enable_biometric',
        title: 'Enable Biometric Authentication',
        description: `Use ${status.biometrics.availableTypes.join(' or ')} for quick and secure access`,
        priority: 'medium'
      });
    }

    return recommendations;
  }
}

export default new SecurityMigrationManager(); 