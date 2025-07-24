/**
 * Secure Error Handling System
 * Provides centralized error management without exposing sensitive information
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ErrorHandler {
  constructor() {
    this.errorLogs = [];
    this.maxLogSize = 1000; // Maximum number of error logs to keep
    this.sensitivePatterns = [
      /password/gi,
      /token/gi,
      /api[_-]?key/gi,
      /secret/gi,
      /auth/gi,
      /bearer/gi,
      /jwt/gi,
      /session/gi,
      /cookie/gi,
      /mongodb/gi,
      /database/gi,
      /sql/gi,
      /query/gi,
      /user[_-]?id/gi,
      /email/gi,
      /phone/gi,
      /credit[_-]?card/gi,
      /ssn/gi,
      /passport/gi,
    ];
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  sanitizeErrorMessage(message) {
    if (typeof message !== 'string') {
      return 'An error occurred';
    }

    let sanitized = message;

    // Replace sensitive patterns with generic text
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Remove file paths
    sanitized = sanitized.replace(/([A-Za-z]:\\|\/)[^\s]+/g, '[PATH]');

    // Remove IP addresses
    sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');

    // Remove port numbers
    sanitized = sanitized.replace(/:\d{2,5}\b/g, ':[PORT]');

    // Remove MongoDB connection strings
    sanitized = sanitized.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[DATABASE_URL]');

    // Remove URLs with potential sensitive data
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '[URL]');

    // Remove stack traces
    sanitized = sanitized.replace(/at\s+.*\(.*\)/g, '[STACK_TRACE]');

    return sanitized;
  }

  /**
   * Get user-friendly error message based on error type
   */
  getUserFriendlyMessage(error, context) {
    const errorMessages = {
      // Authentication errors
      AUTH_INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
      AUTH_USER_NOT_FOUND: 'No account found with this email address.',
      AUTH_USER_EXISTS: 'An account with this email already exists.',
      AUTH_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
      AUTH_UNAUTHORIZED: 'You are not authorized to perform this action.',
      AUTH_SESSION_INVALID: 'Your session is invalid. Please log in again.',
      
      // Database errors
      DB_CONNECTION_FAILED: 'Unable to connect to the database. Please try again later.',
      DB_QUERY_FAILED: 'Unable to retrieve data. Please try again.',
      DB_WRITE_FAILED: 'Unable to save data. Please try again.',
      DB_CONSTRAINT_VIOLATION: 'This action conflicts with existing data.',
      DB_MIGRATION_FAILED: 'Database update failed. Please restart the app.',
      
      // Network errors
      NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
      NETWORK_TIMEOUT: 'The request timed out. Please try again.',
      API_ERROR: 'Unable to communicate with the server. Please try again later.',
      API_RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
      
      // Validation errors
      VALIDATION_FAILED: 'Please check your input and try again.',
      VALIDATION_EMAIL: 'Please enter a valid email address.',
      VALIDATION_PASSWORD: 'Password must be at least 6 characters long.',
      VALIDATION_REQUIRED: 'This field is required.',
      VALIDATION_NUMERIC: 'Please enter a valid number.',
      VALIDATION_DATE: 'Please enter a valid date.',
      
      // Data errors
      DATA_NOT_FOUND: 'The requested data was not found.',
      DATA_CORRUPTED: 'Data integrity error. Please contact support.',
      DATA_ACCESS_DENIED: 'You do not have permission to access this data.',
      DATA_SYNC_FAILED: 'Unable to sync data. Changes saved locally.',
      
      // Workout-specific errors
      WORKOUT_NOT_FOUND: 'Workout not found.',
      WORKOUT_ACCESS_DENIED: 'You cannot access this workout.',
      WORKOUT_ALREADY_ACTIVE: 'You already have an active workout.',
      EXERCISE_NOT_FOUND: 'Exercise not found.',
      SET_INVALID_DATA: 'Invalid set data. Please check weight and reps.',
      
      // User errors
      USER_PROFILE_UPDATE_FAILED: 'Unable to update profile. Please try again.',
      USER_DATA_EXPORT_FAILED: 'Unable to export data. Please try again.',
      USER_DATA_DELETE_FAILED: 'Unable to delete data. Please try again.',
      
      // Generic errors
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
      OPERATION_FAILED: 'The operation failed. Please try again.',
      PERMISSION_DENIED: 'You do not have permission to perform this action.',
      FEATURE_UNAVAILABLE: 'This feature is temporarily unavailable.',
    };

    // Determine error code from error object
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code) {
      errorCode = error.code;
    } else if (error.response?.data?.code) {
      errorCode = error.response.data.code;
    } else if (error.message) {
      // Try to infer error type from message
      if (error.message.includes('Network')) {
        errorCode = 'NETWORK_ERROR';
      } else if (error.message.includes('timeout')) {
        errorCode = 'NETWORK_TIMEOUT';
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        errorCode = 'AUTH_UNAUTHORIZED';
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        errorCode = 'DATA_NOT_FOUND';
      } else if (error.message.includes('validation')) {
        errorCode = 'VALIDATION_FAILED';
      } else if (error.message.includes('database') || error.message.includes('sqlite')) {
        errorCode = 'DB_QUERY_FAILED';
      }
    }

    return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
  }

  /**
   * Log error securely without exposing sensitive information
   */
  async logError(error, context = {}, severity = 'ERROR') {
    try {
      const timestamp = new Date().toISOString();
      const sanitizedError = {
        timestamp,
        severity,
        context: {
          screen: context.screen || 'Unknown',
          action: context.action || 'Unknown',
          userId: context.userId || null,
        },
        error: {
          message: this.sanitizeErrorMessage(error.message || 'Unknown error'),
          code: error.code || 'UNKNOWN',
          type: error.name || 'Error',
        },
        // Never log full stack traces in production
        stack: __DEV__ ? this.sanitizeErrorMessage(error.stack || '') : null,
      };

      // Add to in-memory log
      this.errorLogs.unshift(sanitizedError);
      
      // Trim logs if exceeding max size
      if (this.errorLogs.length > this.maxLogSize) {
        this.errorLogs = this.errorLogs.slice(0, this.maxLogSize);
      }

      // Store critical errors securely
      if (severity === 'CRITICAL' || severity === 'SECURITY') {
        await this.storeCriticalError(sanitizedError);
      }

      // Log to console in development
      if (__DEV__) {
        console.error(`[${severity}] ${context.screen || 'App'} - ${context.action || 'Action'}:`, error);
      }

      return sanitizedError;
    } catch (logError) {
      // Prevent logging errors from breaking the app
      if (__DEV__) {
        console.error('Error logging failed:', logError);
      }
    }
  }

  /**
   * Store critical errors securely
   */
  async storeCriticalError(errorLog) {
    try {
      const criticalErrors = await this.getCriticalErrors();
      criticalErrors.unshift(errorLog);
      
      // Keep only last 100 critical errors
      const trimmedErrors = criticalErrors.slice(0, 100);
      
      await SecureStore.setItemAsync(
        'critical_errors',
        JSON.stringify(trimmedErrors)
      );
    } catch (error) {
      // Fail silently to prevent cascading errors
      if (__DEV__) {
        console.error('Failed to store critical error:', error);
      }
    }
  }

  /**
   * Get stored critical errors
   */
  async getCriticalErrors() {
    try {
      const stored = await SecureStore.getItemAsync('critical_errors');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error, context = {}) {
    let errorCode = 'AUTH_INVALID_CREDENTIALS';
    let severity = 'ERROR';

    if (error.response?.status === 401) {
      errorCode = 'AUTH_UNAUTHORIZED';
    } else if (error.response?.status === 403) {
      errorCode = 'AUTH_UNAUTHORIZED';
      severity = 'SECURITY';
    } else if (error.message?.includes('User not found')) {
      errorCode = 'AUTH_USER_NOT_FOUND';
    } else if (error.message?.includes('already exists')) {
      errorCode = 'AUTH_USER_EXISTS';
    } else if (error.message?.includes('Invalid password')) {
      errorCode = 'AUTH_INVALID_CREDENTIALS';
      severity = 'SECURITY';
    }

    this.logError(error, { ...context, errorCode }, severity);
    
    return {
      success: false,
      message: this.getUserFriendlyMessage({ code: errorCode }),
      code: errorCode,
    };
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error, context = {}) {
    let errorCode = 'DB_QUERY_FAILED';
    let severity = 'ERROR';

    if (error.message?.includes('UNIQUE constraint')) {
      errorCode = 'DB_CONSTRAINT_VIOLATION';
    } else if (error.message?.includes('FOREIGN KEY')) {
      errorCode = 'DB_CONSTRAINT_VIOLATION';
    } else if (error.message?.includes('no such table')) {
      errorCode = 'DB_MIGRATION_FAILED';
      severity = 'CRITICAL';
    } else if (error.message?.includes('database is locked')) {
      errorCode = 'DB_CONNECTION_FAILED';
    }

    this.logError(error, { ...context, errorCode }, severity);
    
    return {
      success: false,
      message: this.getUserFriendlyMessage({ code: errorCode }),
      code: errorCode,
    };
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error, context = {}) {
    let errorCode = 'NETWORK_ERROR';
    let severity = 'ERROR';

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorCode = 'NETWORK_TIMEOUT';
    } else if (error.response?.status === 429) {
      errorCode = 'API_RATE_LIMIT';
    } else if (error.response?.status >= 500) {
      errorCode = 'API_ERROR';
      severity = 'CRITICAL';
    } else if (!error.response && error.request) {
      errorCode = 'NETWORK_ERROR';
    }

    this.logError(error, { ...context, errorCode }, severity);
    
    return {
      success: false,
      message: this.getUserFriendlyMessage({ code: errorCode }),
      code: errorCode,
    };
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors, context = {}) {
    const errorLog = {
      message: 'Validation failed',
      validationErrors: errors,
    };

    this.logError(errorLog, { ...context, errorCode: 'VALIDATION_FAILED' }, 'WARNING');
    
    // Return first validation error or generic message
    const firstError = Array.isArray(errors) ? errors[0] : 'Validation failed';
    
    return {
      success: false,
      message: firstError,
      code: 'VALIDATION_FAILED',
      errors: errors,
    };
  }

  /**
   * Get error logs for debugging (sanitized)
   */
  getErrorLogs(limit = 50) {
    return this.errorLogs.slice(0, limit);
  }

  /**
   * Clear error logs
   */
  async clearErrorLogs() {
    this.errorLogs = [];
    try {
      await SecureStore.deleteItemAsync('critical_errors');
    } catch (error) {
      // Fail silently
    }
  }

  /**
   * Export error logs (for debugging)
   */
  async exportErrorLogs() {
    try {
      const criticalErrors = await this.getCriticalErrors();
      const allErrors = [...this.errorLogs, ...criticalErrors];
      
      // Sort by timestamp
      allErrors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return {
        success: true,
        data: allErrors,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Unable to export error logs',
      };
    }
  }

  /**
   * Monitor error frequency for potential security issues
   */
  async checkErrorFrequency(errorCode, threshold = 5, timeWindowMinutes = 5) {
    const recentErrors = this.errorLogs.filter(log => {
      const errorTime = new Date(log.timestamp);
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      return log.error.code === errorCode && errorTime > cutoffTime;
    });

    if (recentErrors.length >= threshold) {
      // Log security alert
      await this.logError(
        {
          message: `High frequency of ${errorCode} errors detected`,
          code: 'SECURITY_ALERT',
          count: recentErrors.length,
          timeWindow: timeWindowMinutes,
        },
        { action: 'security_monitoring' },
        'SECURITY'
      );

      return true;
    }

    return false;
  }
}

export default new ErrorHandler();
