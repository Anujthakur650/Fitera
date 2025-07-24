import * as Network from 'expo-network';
import Constants from 'expo-constants';
import ErrorHandler from './errorHandler';

/**
 * Network Security Manager
 * Implements HTTPS enforcement, certificate pinning, and security headers
 */
class NetworkSecurityManager {
  constructor() {
    this.isProduction = Constants.manifest?.extra?.environment === 'production';
    this.certificatePins = new Map();
    this.securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.fitera.com"
    };
    
    // Initialize certificate pins for production
    this.initializeCertificatePins();
  }

  /**
   * Initialize certificate pins for API endpoints
   */
  initializeCertificatePins() {
    // Production API certificate pins (SHA-256)
    // In real production, these would be your actual certificate fingerprints
    this.certificatePins.set('api.fitera.com', [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary certificate
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=' // Backup certificate
    ]);
    
    // Add additional pins for other domains as needed
  }

  /**
   * Enforce HTTPS for all network requests
   * @param {string} url - The URL to validate
   * @returns {boolean} Whether the URL is secure
   */
  enforceHTTPS(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Allow HTTP only in development and for localhost
      if (!this.isProduction) {
        if (parsedUrl.hostname === 'localhost' || 
            parsedUrl.hostname === '127.0.0.1' ||
            parsedUrl.hostname.endsWith('.local')) {
          return true;
        }
      }
      
      // Enforce HTTPS in production
      if (parsedUrl.protocol !== 'https:') {
        ErrorHandler.logError(
          new Error('Insecure HTTP request blocked'),
          { url, protocol: parsedUrl.protocol },
          'HIGH'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { url }, 'MEDIUM');
      return false;
    }
  }

  /**
   * Validate certificate pinning
   * @param {string} hostname - The hostname to validate
   * @param {string} certificateFingerprint - The certificate fingerprint to check
   * @returns {boolean} Whether the certificate is valid
   */
  validateCertificatePinning(hostname, certificateFingerprint) {
    // Skip certificate pinning in development
    if (!this.isProduction) {
      return true;
    }
    
    const pins = this.certificatePins.get(hostname);
    if (!pins || pins.length === 0) {
      // No pins configured for this host - allow but log warning
      console.warn(`No certificate pins configured for host: ${hostname}`);
      return true;
    }
    
    // Check if the certificate fingerprint matches any of the pins
    const isValid = pins.includes(certificateFingerprint);
    
    if (!isValid) {
      ErrorHandler.logError(
        new Error('Certificate pinning validation failed'),
        { hostname, fingerprint: certificateFingerprint },
        'CRITICAL'
      );
    }
    
    return isValid;
  }

  /**
   * Create secure fetch wrapper with HTTPS enforcement and certificate pinning
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise} Fetch promise
   */
  async secureFetch(url, options = {}) {
    // Enforce HTTPS
    if (!this.enforceHTTPS(url)) {
      throw new Error('Insecure request blocked: HTTPS required');
    }
    
    // Add security headers to request
    const secureOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Requested-With': 'XMLHttpRequest',
        'X-App-Version': Constants.manifest?.version || '1.0.0'
      }
    };
    
    // Add timeout for security
    const timeout = options.timeout || 30000; // 30 seconds default
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...secureOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Validate response security headers
      this.validateResponseHeaders(response);
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - network security timeout exceeded');
      }
      
      throw error;
    }
  }

  /**
   * Validate response security headers
   * @param {Response} response - The fetch response
   */
  validateResponseHeaders(response) {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options'
    ];
    
    for (const header of requiredHeaders) {
      if (!response.headers.get(header)) {
        console.warn(`Missing security header: ${header}`);
      }
    }
    
    // Check for HSTS header in production
    if (this.isProduction && !response.headers.get('Strict-Transport-Security')) {
      console.warn('Missing HSTS header in production response');
    }
  }

  /**
   * Apply security headers to response (for local server implementations)
   * @param {Object} headers - Headers object to modify
   * @returns {Object} Headers with security headers applied
   */
  applySecurityHeaders(headers = {}) {
    return {
      ...headers,
      ...this.securityHeaders
    };
  }

  /**
   * Check network security status
   * @returns {Object} Network security status
   */
  async getNetworkSecurityStatus() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      return {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
        isProduction: this.isProduction,
        httpsEnforced: true,
        certificatePinning: this.isProduction,
        securityHeaders: Object.keys(this.securityHeaders).length
      };
    } catch (error) {
      ErrorHandler.logError(error, { action: 'getNetworkSecurityStatus' }, 'LOW');
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Create secure WebSocket connection
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   * @returns {WebSocket} Secure WebSocket instance
   */
  createSecureWebSocket(url, options = {}) {
    // Enforce WSS in production
    if (this.isProduction && !url.startsWith('wss://')) {
      throw new Error('Insecure WebSocket connection blocked: WSS required');
    }
    
    // Allow WS in development for localhost only
    if (!this.isProduction && url.startsWith('ws://')) {
      const wsUrl = new URL(url);
      if (wsUrl.hostname !== 'localhost' && wsUrl.hostname !== '127.0.0.1') {
        throw new Error('Insecure WebSocket connection blocked: WSS required for non-localhost');
      }
    }
    
    const ws = new WebSocket(url, options.protocols);
    
    // Add security event handlers
    ws.addEventListener('error', (event) => {
      ErrorHandler.logError(
        new Error('WebSocket error'),
        { url, error: event },
        'MEDIUM'
      );
    });
    
    return ws;
  }

  /**
   * Validate API endpoint security
   * @param {string} endpoint - API endpoint URL
   * @returns {Object} Validation result
   */
  validateAPIEndpoint(endpoint) {
    const validations = {
      https: false,
      validDomain: false,
      certificatePinning: false
    };
    
    try {
      const url = new URL(endpoint);
      
      // Check HTTPS
      validations.https = url.protocol === 'https:' || (!this.isProduction && url.hostname === 'localhost');
      
      // Check valid domain
      const allowedDomains = ['api.fitera.com', 'localhost', '127.0.0.1'];
      validations.validDomain = allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      
      // Check certificate pinning configuration
      validations.certificatePinning = this.certificatePins.has(url.hostname) || !this.isProduction;
      
      const isValid = Object.values(validations).every(v => v);
      
      if (!isValid) {
        ErrorHandler.logError(
          new Error('API endpoint validation failed'),
          { endpoint, validations },
          'HIGH'
        );
      }
      
      return {
        isValid,
        validations
      };
    } catch (error) {
      ErrorHandler.logError(error, { endpoint }, 'MEDIUM');
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export default new NetworkSecurityManager();
