/**
 * Production Monitoring Configuration
 * Sets up comprehensive monitoring for production environment
 */

// Note: Production monitoring dependencies are commented out
// They should be installed and configured for production deployment
// import * as Sentry from '@sentry/react-native';
// import analytics from '@react-native-firebase/analytics';
// import crashlytics from '@react-native-firebase/crashlytics';
// import performance from '@react-native-firebase/perf';
import { Platform } from 'react-native';
import ProductionConfig from '../config/production';
import ErrorHandler from './errorHandler';
import SecurityAudit from './securityAudit';

class ProductionMonitoring {
  constructor() {
    this.initialized = false;
    this.performanceTrace = null;
  }

  /**
   * Initialize all monitoring services
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Only initialize in production
      if (!ProductionConfig.app.isProduction) {
        console.log('⚠️ Skipping production monitoring in development environment');
        return;
      }

      // Initialize Sentry for error tracking
      if (ProductionConfig.services.sentryDSN) {
        await this.initializeSentry();
      }

      // Initialize Firebase Analytics
      if (ProductionConfig.services.analyticsKey) {
        await this.initializeAnalytics();
      }

      // Initialize Crashlytics
      if (ProductionConfig.services.crashReportingKey) {
        await this.initializeCrashlytics();
      }

      // Initialize Performance Monitoring
      if (ProductionConfig.performance.enablePerformanceMonitoring) {
        await this.initializePerformanceMonitoring();
      }

      // Set up automatic error reporting
      this.setupErrorReporting();

      // Set up security event monitoring
      this.setupSecurityMonitoring();

      this.initialized = true;
      console.log('✅ Production monitoring initialized');

    } catch (error) {
      console.error('Failed to initialize production monitoring:', error);
      // Don't throw - app should still work without monitoring
    }
  }

  /**
   * Initialize Sentry error tracking
   */
  async initializeSentry() {
    try {
      Sentry.init({
        dsn: ProductionConfig.services.sentryDSN,
        environment: 'production',
        release: `${ProductionConfig.app.name}@${ProductionConfig.app.version}+${ProductionConfig.app.buildNumber}`,
        dist: ProductionConfig.app.buildNumber,
        debug: false,
        attachStacktrace: true,
        attachThreads: true,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        tracesSampleRate: 0.2, // 20% of transactions
        integrations: [
          new Sentry.ReactNativeTracing({
            tracingOrigins: [ProductionConfig.api.baseUrl],
            routingInstrumentation: Sentry.reactNavigationInstrumentation,
          }),
        ],
        beforeSend: (event, hint) => {
          // Filter out non-critical errors
          if (this.shouldFilterError(event, hint)) {
            return null;
          }
          // Sanitize sensitive data
          return this.sanitizeEvent(event);
        },
      });

      // Set user context
      const user = await this.getCurrentUser();
      if (user) {
        Sentry.setUser({
          id: user.id.toString(),
          email: user.email,
        });
      }

    } catch (error) {
      console.error('Sentry initialization failed:', error);
    }
  }

  /**
   * Initialize Firebase Analytics
   */
  async initializeAnalytics() {
    try {
      await analytics().setAnalyticsCollectionEnabled(true);
      
      // Set default user properties
      await analytics().setUserProperties({
        app_version: ProductionConfig.app.version,
        platform: Platform.OS,
      });

      // Log app open event
      await analytics().logAppOpen();

    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  }

  /**
   * Initialize Firebase Crashlytics
   */
  async initializeCrashlytics() {
    try {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      
      // Set custom keys
      await crashlytics().setAttributes({
        app_version: ProductionConfig.app.version,
        build_number: ProductionConfig.app.buildNumber,
        environment: 'production',
      });

    } catch (error) {
      console.error('Crashlytics initialization failed:', error);
    }
  }

  /**
   * Initialize Performance Monitoring
   */
  async initializePerformanceMonitoring() {
    try {
      await performance().setPerformanceCollectionEnabled(true);
      
      // Start app startup trace
      this.performanceTrace = await performance().startTrace('app_startup');

    } catch (error) {
      console.error('Performance monitoring initialization failed:', error);
    }
  }

  /**
   * Set up automatic error reporting
   */
  setupErrorReporting() {
    // Override ErrorHandler to report to monitoring services
    const originalLogError = ErrorHandler.logError;
    ErrorHandler.logError = (error, context, severity) => {
      // Call original error handler
      originalLogError.call(ErrorHandler, error, context, severity);

      // Report to Sentry
      if (this.initialized && ProductionConfig.services.sentryDSN) {
        Sentry.captureException(error, {
          contexts: { custom: context },
          level: this.mapSeverityToSentryLevel(severity),
        });
      }

      // Report to Crashlytics
      if (this.initialized && ProductionConfig.services.crashReportingKey) {
        crashlytics().recordError(error);
      }
    };
  }

  /**
   * Set up security event monitoring
   */
  setupSecurityMonitoring() {
    // Monitor critical security events
    const originalLogEvent = SecurityAudit.logEvent;
    SecurityAudit.logEvent = async (eventType, eventData, success, riskLevel) => {
      // Call original security audit
      await originalLogEvent.call(SecurityAudit, eventType, eventData, success, riskLevel);

      // Report critical security events
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
        this.logSecurityEvent(eventType, eventData, riskLevel);
      }
    };
  }

  /**
   * Track custom events
   */
  async trackEvent(eventName, parameters = {}) {
    try {
      // Firebase Analytics
      if (this.initialized && ProductionConfig.services.analyticsKey) {
        await analytics().logEvent(eventName, parameters);
      }

      // Sentry breadcrumb
      if (this.initialized && ProductionConfig.services.sentryDSN) {
        Sentry.addBreadcrumb({
          message: eventName,
          category: 'custom',
          data: parameters,
          level: 'info',
        });
      }
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  /**
   * Track user properties
   */
  async setUserProperties(properties) {
    try {
      // Firebase Analytics
      if (this.initialized && ProductionConfig.services.analyticsKey) {
        await analytics().setUserProperties(properties);
      }

      // Sentry context
      if (this.initialized && ProductionConfig.services.sentryDSN) {
        Sentry.setContext('user_properties', properties);
      }
    } catch (error) {
      console.error('Setting user properties failed:', error);
    }
  }

  /**
   * Track screen views
   */
  async trackScreenView(screenName, screenClass = null) {
    try {
      // Firebase Analytics
      if (this.initialized && ProductionConfig.services.analyticsKey) {
        await analytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass || screenName,
        });
      }

      // Sentry breadcrumb
      if (this.initialized && ProductionConfig.services.sentryDSN) {
        Sentry.addBreadcrumb({
          message: `Screen: ${screenName}`,
          category: 'navigation',
          level: 'info',
        });
      }
    } catch (error) {
      console.error('Screen tracking failed:', error);
    }
  }

  /**
   * Start performance trace
   */
  async startTrace(traceName) {
    try {
      if (this.initialized && ProductionConfig.performance.enablePerformanceMonitoring) {
        const trace = await performance().startTrace(traceName);
        return trace;
      }
    } catch (error) {
      console.error('Starting trace failed:', error);
    }
    return null;
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, eventData, riskLevel) {
    try {
      // Log to analytics
      await this.trackEvent('security_event', {
        event_type: eventType,
        risk_level: riskLevel,
        ...this.sanitizeEventData(eventData),
      });

      // Log to Sentry as warning/error
      if (ProductionConfig.services.sentryDSN) {
        Sentry.captureMessage(`Security Event: ${eventType}`, {
          level: riskLevel === 'CRITICAL' ? 'error' : 'warning',
          contexts: {
            security: {
              event_type: eventType,
              risk_level: riskLevel,
              data: this.sanitizeEventData(eventData),
            },
          },
        });
      }
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
  }

  /**
   * Helper methods
   */
  
  shouldFilterError(event, hint) {
    // Filter out known non-critical errors
    const message = event.message || hint?.originalException?.message || '';
    
    const ignoredErrors = [
      'Network request failed',
      'Possible Unhandled Promise Rejection',
      'Task orphaned',
    ];

    return ignoredErrors.some(ignored => message.includes(ignored));
  }

  sanitizeEvent(event) {
    // Remove sensitive data from events
    if (event.contexts?.custom) {
      const sensitiveKeys = ['password', 'token', 'email', 'phone'];
      sensitiveKeys.forEach(key => {
        if (event.contexts.custom[key]) {
          event.contexts.custom[key] = '[REDACTED]';
        }
      });
    }
    return event;
  }

  sanitizeEventData(data) {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'email', 'api_key'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  mapSeverityToSentryLevel(severity) {
    const mapping = {
      'CRITICAL': 'fatal',
      'HIGH': 'error',
      'MEDIUM': 'warning',
      'LOW': 'info',
      'INFO': 'info',
    };
    return mapping[severity] || 'error';
  }

  async getCurrentUser() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Complete app startup trace
   */
  async completeAppStartup() {
    try {
      if (this.performanceTrace) {
        await this.performanceTrace.stop();
        this.performanceTrace = null;
      }
    } catch (error) {
      console.error('Completing app startup trace failed:', error);
    }
  }
}

// Export singleton instance
export default new ProductionMonitoring();
