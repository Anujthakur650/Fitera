import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import SecureStorageManager from './secureStorage';

/**
 * Biometric Authentication Manager
 * Handles Face ID, Touch ID, and fingerprint authentication
 */
class BiometricAuthManager {
  constructor() {
    this.isSupported = false;
    this.availableTypes = [];
    this.isEnrolled = false;
  }

  /**
   * Initialize biometric authentication system
   */
  async initialize() {
    try {
      // Check if biometric authentication is supported
      this.isSupported = await LocalAuthentication.hasHardwareAsync();
      
      if (this.isSupported) {
        // Get available biometric types
        this.availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        // Check if user has enrolled biometrics
        this.isEnrolled = await LocalAuthentication.isEnrolledAsync();
      }
      
      console.log('Biometric Auth Status:', {
        isSupported: this.isSupported,
        availableTypes: this.availableTypes,
        isEnrolled: this.isEnrolled
      });
      
      return {
        isSupported: this.isSupported,
        availableTypes: this.availableTypes,
        isEnrolled: this.isEnrolled
      };
    } catch (error) {
      console.error('Failed to initialize biometric auth:', error);
      return {
        isSupported: false,
        availableTypes: [],
        isEnrolled: false
      };
    }
  }

  /**
   * Get human-readable biometric type names
   */
  getBiometricTypeNames() {
    const typeNames = [];
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeNames.push(Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition');
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeNames.push(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
    }
    
    if (this.availableTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeNames.push('Iris Recognition');
    }
    
    return typeNames;
  }

  /**
   * Check if biometric authentication is available and configured
   */
  async isAvailable() {
    try {
      await this.initialize();
      return this.isSupported && this.isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(options = {}) {
    try {
      // Check if biometrics are available
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const defaultOptions = {
        promptMessage: 'Authenticate to access Fitera',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      };

      const authOptions = { ...defaultOptions, ...options };

      // Perform authentication
      const result = await LocalAuthentication.authenticateAsync(authOptions);
      
      if (result.success) {
        console.log('Biometric authentication successful');
        
        // Log successful authentication
        await this.logAuthenticationEvent('biometric_success', 'User authenticated with biometrics');
        
        return {
          success: true,
          authType: 'biometric',
          timestamp: new Date().toISOString()
        };
      } else {
        console.log('Biometric authentication failed:', result.error);
        
        // Log failed authentication
        await this.logAuthenticationEvent('biometric_failed', result.error || 'Authentication failed');
        
        return {
          success: false,
          error: result.error,
          userCancel: result.error === 'UserCancel'
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      
      await this.logAuthenticationEvent('biometric_error', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Quick biometric authentication for app unlock
   */
  async quickUnlock() {
    try {
      const result = await this.authenticate({
        promptMessage: 'Unlock Fitera',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });
      
      return result;
    } catch (error) {
      console.error('Quick unlock failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate for sensitive operations (data export, settings change)
   */
  async authenticateForSensitiveOperation(operationType) {
    try {
      const operationMessages = {
        'data_export': 'Authenticate to export your workout data',
        'data_delete': 'Authenticate to delete your data',
        'settings_change': 'Authenticate to change security settings',
        'backup_restore': 'Authenticate to restore from backup',
        'account_delete': 'Authenticate to delete your account'
      };

      const message = operationMessages[operationType] || 'Authenticate to continue';

      const result = await this.authenticate({
        promptMessage: message,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        await this.logAuthenticationEvent('sensitive_operation_auth', `Authenticated for ${operationType}`);
      }
      
      return result;
    } catch (error) {
      console.error('Sensitive operation authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometricAuth() {
    try {
      // Check if biometrics are available
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or you haven\'t set it up in your device settings.'
        );
        return false;
      }

      // Test authentication to ensure it works
      const testAuth = await this.authenticate({
        promptMessage: 'Test biometric authentication to enable it for Fitera',
        cancelLabel: 'Cancel'
      });

      if (testAuth.success) {
        // Store biometric preference
        await SecureStorageManager.storeSecuritySettings({
          biometricEnabled: true,
          enabledAt: new Date().toISOString()
        });
        
        await this.logAuthenticationEvent('biometric_enabled', 'User enabled biometric authentication');
        
        Alert.alert(
          'Biometric Authentication Enabled',
          `${this.getBiometricTypeNames().join(' and ')} authentication has been enabled for Fitera.`
        );
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication.');
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth() {
    try {
      // Update security settings
      const currentSettings = await SecureStorageManager.getSecuritySettings();
      await SecureStorageManager.storeSecuritySettings({
        ...currentSettings,
        biometricEnabled: false,
        disabledAt: new Date().toISOString()
      });
      
      await this.logAuthenticationEvent('biometric_disabled', 'User disabled biometric authentication');
      
      Alert.alert(
        'Biometric Authentication Disabled',
        'Biometric authentication has been disabled. You can re-enable it in security settings.'
      );
      
      return true;
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      return false;
    }
  }

  /**
   * Check if biometric auth is enabled in app settings
   */
  async isBiometricEnabled() {
    try {
      const settings = await SecureStorageManager.getSecuritySettings();
      return settings.biometricEnabled === true;
    } catch (error) {
      console.error('Failed to check biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Get biometric authentication status for UI
   */
  async getBiometricStatus() {
    try {
      await this.initialize();
      const isEnabled = await this.isBiometricEnabled();
      
      return {
        deviceSupported: this.isSupported,
        deviceEnrolled: this.isEnrolled,
        appEnabled: isEnabled,
        availableTypes: this.getBiometricTypeNames(),
        canEnable: this.isSupported && this.isEnrolled,
        recommendation: this.getSecurityRecommendation()
      };
    } catch (error) {
      console.error('Failed to get biometric status:', error);
      return {
        deviceSupported: false,
        deviceEnrolled: false,
        appEnabled: false,
        availableTypes: [],
        canEnable: false,
        recommendation: 'Unable to determine biometric status'
      };
    }
  }

  /**
   * Get security recommendation based on device capabilities
   */
  getSecurityRecommendation() {
    if (!this.isSupported) {
      return 'Your device does not support biometric authentication. Consider using a PIN for additional security.';
    }
    
    if (!this.isEnrolled) {
      return `Your device supports ${this.getBiometricTypeNames().join(' and ')} but you haven't set it up. Enable it in your device settings for better security.`;
    }
    
    return `Your device supports ${this.getBiometricTypeNames().join(' and ')}. Enable it in Fitera for quick and secure access.`;
  }

  /**
   * Handle biometric authentication changes (called when user changes device biometrics)
   */
  async handleBiometricChange() {
    try {
      const wasEnabled = await this.isBiometricEnabled();
      const isNowAvailable = await this.isAvailable();
      
      if (wasEnabled && !isNowAvailable) {
        // User disabled biometrics on device, disable in app
        await this.disableBiometricAuth();
        
        Alert.alert(
          'Biometric Authentication Disabled',
          'Biometric authentication has been disabled in Fitera because it\'s no longer available on your device.'
        );
      }
    } catch (error) {
      console.error('Failed to handle biometric change:', error);
    }
  }

  /**
   * Log authentication events for security auditing
   */
  async logAuthenticationEvent(eventType, details) {
    try {
      // This would integrate with your secure database logging
      console.log(`[BIOMETRIC AUTH] ${eventType}: ${details}`);
      
      // You could also store this in your secure database
      // await SecureDatabaseManager.logSecurityEvent(eventType, details);
    } catch (error) {
      console.error('Failed to log authentication event:', error);
    }
  }

  /**
   * Biometric authentication with retry logic
   */
  async authenticateWithRetry(maxRetries = 3, options = {}) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      const result = await this.authenticate(options);
      
      if (result.success) {
        return result;
      }
      
      if (result.userCancel) {
        // User cancelled, don't retry
        return result;
      }
      
      attempts++;
      
      if (attempts < maxRetries) {
        Alert.alert(
          'Authentication Failed',
          `Authentication failed. ${maxRetries - attempts} attempts remaining.`
        );
      }
    }
    
    // All attempts failed
    await this.logAuthenticationEvent('biometric_max_attempts', `Failed after ${maxRetries} attempts`);
    
    return {
      success: false,
      error: 'Maximum authentication attempts exceeded',
      maxAttemptsReached: true
    };
  }
}

export default new BiometricAuthManager(); 