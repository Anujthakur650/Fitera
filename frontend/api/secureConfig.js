import axios from 'axios';
import { Platform } from 'react-native';
import SecurityMigrationManager from '../utils/securityMigration';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_TIMEOUT, ENABLE_DEBUG_MODE } from '../constants/config';

/**
 * Enhanced API Configuration with Security Features
 * Backward compatible with existing API config
 */
class SecureApiConfig {
  constructor() {
    this.baseURL = API_URL;
    this.timeout = API_TIMEOUT;
    this.initialized = false;
  }

  /**
   * Initialize secure API configuration
   */
  async initialize() {
    if (this.initialized) return this.api;

    // Create axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
    });

    // Enhanced request interceptor with security
    this.api.interceptors.request.use(
      async (config) => {
        try {
          // Get token safely (with fallback)
          const token = await SecurityMigrationManager.safeGetAuthToken();
          
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }

          // Add security headers
          config.headers['X-Requested-With'] = 'XMLHttpRequest';
          config.headers['X-Client-Version'] = '1.0.0';
          
          return config;
        } catch (error) {
          console.warn('Error in request interceptor:', error);
          return config;
        }
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Enhanced response interceptor with security
    this.api.interceptors.response.use(
      (response) => {
        // Log successful API calls for security audit
        this.logApiCall(response.config, 'success');
        return response;
      },
      async (error) => {
        // Log failed API calls
        this.logApiCall(error.config, 'error', error.response?.status);

        // Handle token expiration
        if (error.response?.status === 401) {
          await this.handleTokenExpiration();
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          this.handleRateLimit(error.response);
        }

        return Promise.reject(error);
      }
    );

    this.initialized = true;
    return this.api;
  }

  /**
   * Get API instance (initialize if needed)
   */
  async getApi() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.api;
  }

  /**
   * Handle token expiration
   */
  async handleTokenExpiration() {
    try {
      console.log('🔄 Token expired, attempting refresh...');
      
      // Try to refresh token using security manager
      const newToken = await SecurityMigrationManager.safeGetAuthToken();
      
      if (!newToken) {
        // Clear expired tokens and redirect to login
        await SecurityMigrationManager.safeStorageRemove('token');
        await SecurityMigrationManager.safeStorageRemove('user');
        
        console.log('❌ Token refresh failed, user needs to re-authenticate');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }

  /**
   * Handle rate limiting
   */
  handleRateLimit(response) {
    const retryAfter = response.headers['retry-after'];
    if (retryAfter) {
      console.warn(`⏳ Rate limited. Retry after ${retryAfter} seconds`);
    }
  }

  /**
   * Log API calls for security audit
   */
  logApiCall(config, status, statusCode = null) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: config?.method?.toUpperCase(),
        url: config?.url,
        status: status,
        statusCode: statusCode,
        userAgent: 'StrongClone/1.0.0'
      };

      // Only log in development or for security events
      if (__DEV__ || status === 'error') {
        console.log(`[API ${status.toUpperCase()}]`, logEntry);
      }
    } catch (error) {
      // Fail silently to not interrupt app flow
    }
  }

  /**
   * Enhanced secure request method
   */
  async secureRequest(method, url, data = null, options = {}) {
    try {
      const api = await this.getApi();
      
      // Validate input data if provided
      if (data) {
        const validation = SecurityMigrationManager.validateInput(data, 'api_request');
        if (!validation.isValid) {
          throw new Error(`Invalid request data: ${validation.errors.join(', ')}`);
        }
        data = validation.sanitizedData;
      }

      const config = {
        method,
        url,
        ...options
      };

      if (data) {
        if (method.toLowerCase() === 'get') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await api(config);
      return response;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data?.message || `API Error: ${error.response.status}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
      } else {
        // Other error
        throw error;
      }
    }
  }

  /**
   * Backward compatible API methods
   */
  async get(url, params = null) {
    return await this.secureRequest('GET', url, params);
  }

  async post(url, data = null) {
    return await this.secureRequest('POST', url, data);
  }

  async put(url, data = null) {
    return await this.secureRequest('PUT', url, data);
  }

  async delete(url) {
    return await this.secureRequest('DELETE', url);
  }

  /**
   * Get security status for UI
   */
  async getSecurityInfo() {
    return {
      secureApiEnabled: this.initialized,
      hasValidToken: !!(await SecurityMigrationManager.safeGetAuthToken()),
      securityActive: SecurityMigrationManager.isSecurityActive()
    };
  }
}

// Create and export secure API instance
const secureApi = new SecureApiConfig();

// For backward compatibility, create a wrapper that matches the original API
const createCompatibleApi = async () => {
  const apiInstance = await secureApi.getApi();
  
  // Add the enhanced methods to the axios instance
  apiInstance.secureRequest = secureApi.secureRequest.bind(secureApi);
  apiInstance.getSecurityInfo = secureApi.getSecurityInfo.bind(secureApi);
  
  return apiInstance;
};

// Export both the secure API class and a compatible instance
export { SecureApiConfig };
export default createCompatibleApi(); 