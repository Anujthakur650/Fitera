/**
 * Security Audit System
 * Tracks and logs all security-related events for compliance and monitoring
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseManager from './database';
import ErrorHandler from './errorHandler';

class SecurityAudit {
  constructor() {
    this.auditQueue = [];
    this.maxQueueSize = 100;
    this.isProcessing = false;
  }

  /**
   * Security event types
   */
  EVENT_TYPES = {
    // Authentication events
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    REGISTER_SUCCESS: 'REGISTER_SUCCESS',
    REGISTER_FAILED: 'REGISTER_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    USER_MIGRATED: 'USER_MIGRATED',
    
    // Authorization events
    ACCESS_GRANTED: 'ACCESS_GRANTED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    
    // Data access events
    DATA_READ: 'DATA_READ',
    DATA_WRITE: 'DATA_WRITE',
    DATA_DELETE: 'DATA_DELETE',
    DATA_EXPORT: 'DATA_EXPORT',
    
    // Security violations
    SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
    XSS_ATTEMPT: 'XSS_ATTEMPT',
    BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    
    // System events
    DATABASE_ERROR: 'DATABASE_ERROR',
    SECURITY_UPDATE: 'SECURITY_UPDATE',
    SYSTEM_ERROR: 'SYSTEM_ERROR',
  };

  /**
   * Initialize audit system
   */
  async initialize() {
    try {
      // Create audit table if it doesn't exist
      await DatabaseManager.db?.execAsync(`
        CREATE TABLE IF NOT EXISTS security_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          user_id INTEGER,
          user_email TEXT,
          event_data TEXT,
          ip_address TEXT,
          device_info TEXT,
          success BOOLEAN DEFAULT 1,
          risk_level TEXT DEFAULT 'LOW',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          session_id TEXT
        )
      `);

      // Process any queued events
      await this.processQueue();
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'initialize' }, 'CRITICAL');
      return false;
    }
  }

  /**
   * Log security event
   */
  async logEvent(eventType, eventData = {}, success = true, riskLevel = 'LOW') {
    try {
      const user = await this.getCurrentUser();
      const deviceInfo = await this.getDeviceInfo();
      const sessionId = await this.getSessionId();

      const auditEvent = {
        event_type: eventType,
        user_id: user?.id || null,
        user_email: user?.email || null,
        event_data: JSON.stringify(this.sanitizeEventData(eventData)),
        ip_address: await this.getIPAddress(),
        device_info: JSON.stringify(deviceInfo),
        success: success ? 1 : 0,
        risk_level: riskLevel,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      };

      // Add to queue
      this.auditQueue.push(auditEvent);

      // Process immediately for high-risk events
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.processQueue();
      } else if (this.auditQueue.length >= this.maxQueueSize) {
        // Process when queue is full
        await this.processQueue();
      }

      // Alert on critical security events
      if (riskLevel === 'CRITICAL') {
        await this.handleCriticalSecurityEvent(eventType, eventData);
      }

    } catch (error) {
      // Fail silently to prevent audit errors from breaking the app
      if (__DEV__) {
        console.error('Security audit logging failed:', error);
      }
    }
  }

  /**
   * Process queued audit events
   */
  async processQueue() {
    if (this.isProcessing || this.auditQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const eventsToProcess = [...this.auditQueue];
      this.auditQueue = [];

      for (const event of eventsToProcess) {
        try {
          await DatabaseManager.runAsync(
            `INSERT INTO security_audit 
            (event_type, user_id, user_email, event_data, ip_address, device_info, success, risk_level, timestamp, session_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              event.event_type,
              event.user_id,
              event.user_email,
              event.event_data,
              event.ip_address,
              event.device_info,
              event.success,
              event.risk_level,
              event.timestamp,
              event.session_id
            ]
          );
        } catch (dbError) {
          // Re-queue failed events
          this.auditQueue.unshift(event);
          throw dbError;
        }
      }

      // Clean up old audit logs (keep last 30 days)
      await this.cleanupOldLogs();

    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'processQueue' }, 'ERROR');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sanitize event data to remove sensitive information
   */
  sanitizeEventData(data) {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'credit_card', 'ssn'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    try {
      const { Platform } = require('react-native');
      const Constants = require('expo-constants').default;
      
      return {
        platform: Platform.OS,
        version: Platform.Version,
        model: Constants.deviceName || 'Unknown',
        brand: Platform.OS === 'ios' ? 'Apple' : 'Android',
        deviceId: Constants.sessionId || 'Unknown',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
      };
    } catch (error) {
      return {
        platform: 'unknown',
        error: 'Unable to get device info'
      };
    }
  }

  /**
   * Get IP address (mock for mobile)
   */
  async getIPAddress() {
    // In a real app, this would make a request to get the actual IP
    return 'mobile-app';
  }

  /**
   * Get session ID
   */
  async getSessionId() {
    try {
      let sessionId = await SecureStore.getItemAsync('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync('session_id', sessionId);
      }
      return sessionId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle critical security events
   */
  async handleCriticalSecurityEvent(eventType, eventData) {
    // In production, this would send alerts to security team
    console.error(`🚨 CRITICAL SECURITY EVENT: ${eventType}`, eventData);

    // Store critical event separately
    try {
      const criticalEvents = await this.getCriticalEvents();
      criticalEvents.unshift({
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 critical events
      const trimmed = criticalEvents.slice(0, 50);
      
      await SecureStore.setItemAsync(
        'critical_security_events',
        JSON.stringify(trimmed)
      );
    } catch (error) {
      // Fail silently
    }
  }

  /**
   * Get critical security events
   */
  async getCriticalEvents() {
    try {
      const stored = await SecureStore.getItemAsync('critical_security_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await DatabaseManager.runAsync(
        'DELETE FROM security_audit WHERE timestamp < ?',
        [thirtyDaysAgo.toISOString()]
      );
    } catch (error) {
      // Fail silently
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId, limit = 100) {
    try {
      return await DatabaseManager.getAllAsync(
        `SELECT * FROM security_audit 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [userId, limit]
      );
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'getUserAuditLogs' });
      return [];
    }
  }

  /**
   * Get suspicious activity for a user
   */
  async getSuspiciousActivity(userId, timeWindowHours = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

      return await DatabaseManager.getAllAsync(
        `SELECT * FROM security_audit 
         WHERE user_id = ? 
         AND timestamp > ? 
         AND (risk_level IN ('HIGH', 'CRITICAL') OR success = 0)
         ORDER BY timestamp DESC`,
        [userId, cutoffTime.toISOString()]
      );
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'getSuspiciousActivity' });
      return [];
    }
  }

  /**
   * Check for brute force attempts
   */
  async checkBruteForce(userId, email, threshold = 5, timeWindowMinutes = 15) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeWindowMinutes);

      const query = userId 
        ? `SELECT COUNT(*) as count FROM security_audit 
           WHERE user_id = ? 
           AND event_type = ? 
           AND success = 0 
           AND timestamp > ?`
        : `SELECT COUNT(*) as count FROM security_audit 
           WHERE user_email = ? 
           AND event_type = ? 
           AND success = 0 
           AND timestamp > ?`;

      const result = await DatabaseManager.getFirstAsync(
        query,
        [userId || email, this.EVENT_TYPES.LOGIN_FAILED, cutoffTime.toISOString()]
      );

      if (result.count >= threshold) {
        await this.logEvent(
          this.EVENT_TYPES.BRUTE_FORCE_DETECTED,
          { 
            userId: userId || null,
            email: email || null,
            attemptCount: result.count,
            timeWindow: timeWindowMinutes 
          },
          false,
          'CRITICAL'
        );
        return true;
      }

      return false;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'checkBruteForce' });
      return false;
    }
  }

  /**
   * Export audit logs (admin only)
   */
  async exportAuditLogs(startDate, endDate) {
    try {
      const logs = await DatabaseManager.getAllAsync(
        `SELECT * FROM security_audit 
         WHERE timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp DESC`,
        [startDate, endDate]
      );

      return {
        success: true,
        data: logs,
        exportDate: new Date().toISOString(),
        recordCount: logs.length,
      };
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'SecurityAudit', action: 'exportAuditLogs' });
      return {
        success: false,
        message: 'Unable to export audit logs',
      };
    }
  }
}

// Create singleton instance
const securityAudit = new SecurityAudit();

// Export individual functions for easier usage
export const logSecurityEvent = securityAudit.logEvent.bind(securityAudit);
export const getAuditLogs = securityAudit.getUserAuditLogs.bind(securityAudit);
export const clearOldLogs = securityAudit.cleanupOldLogs.bind(securityAudit);

export default securityAudit;
