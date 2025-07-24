import ErrorHandler from './errorHandler';
import RateLimiter from './rateLimiter';

/**
 * API Rate Limiter
 * Extends authentication rate limiting to all API endpoints
 */
class APIRateLimiter {
  constructor() {
    // Different rate limits for different endpoints
    this.endpointLimits = new Map([
      // Authentication endpoints - use existing rate limiter
      ['/auth/login', { max: 5, window: 900000, lockout: 900000 }], // 5 per 15 min
      ['/auth/register', { max: 3, window: 3600000, lockout: 3600000 }], // 3 per hour
      
      // Workout endpoints
      ['/workouts', { max: 100, window: 60000 }], // 100 per minute
      ['/workouts/create', { max: 30, window: 60000 }], // 30 per minute
      ['/workouts/delete', { max: 20, window: 60000 }], // 20 per minute
      
      // Exercise endpoints
      ['/exercises', { max: 200, window: 60000 }], // 200 per minute
      ['/exercises/search', { max: 50, window: 60000 }], // 50 per minute
      
      // User data endpoints
      ['/users/profile', { max: 60, window: 60000 }], // 60 per minute
      ['/users/update', { max: 10, window: 300000 }], // 10 per 5 minutes
      
      // Analytics endpoints
      ['/analytics', { max: 30, window: 60000 }], // 30 per minute
      ['/progress', { max: 50, window: 60000 }], // 50 per minute
      
      // Default rate limit for unspecified endpoints
      ['default', { max: 100, window: 60000 }] // 100 per minute
    ]);
    
    // Track requests per endpoint per user
    this.requestCounts = new Map();
    
    // Cleanup old entries periodically
    this.startCleanup();
  }

  /**
   * Check if request is allowed based on rate limits
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User identifier
   * @param {string} ipAddress - IP address
   * @returns {Object} Rate limit status
   */
  async checkRateLimit(endpoint, userId, ipAddress = 'unknown') {
    // For auth endpoints, use the authentication rate limiter
    if (endpoint.includes('/auth/login')) {
      return await RateLimiter.checkRateLimit(userId);
    }
    
    const now = Date.now();
    const key = `${userId}:${endpoint}`;
    const limit = this.getEndpointLimit(endpoint);
    
    // Get or initialize request tracking
    let requestData = this.requestCounts.get(key) || {
      count: 0,
      windowStart: now,
      requests: []
    };
    
    // Clean old requests outside the window
    requestData.requests = requestData.requests.filter(
      timestamp => timestamp > now - limit.window
    );
    
    // Check if limit exceeded
    if (requestData.requests.length >= limit.max) {
      const oldestRequest = Math.min(...requestData.requests);
      const resetTime = oldestRequest + limit.window;
      const waitTime = Math.ceil((resetTime - now) / 1000);
      
      ErrorHandler.logError(
        { message: 'API rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { endpoint, userId, count: requestData.requests.length, limit: limit.max },
        'MEDIUM'
      );
      
      return {
        allowed: false,
        limit: limit.max,
        remaining: 0,
        resetTime: resetTime,
        waitTime: waitTime,
        message: `Rate limit exceeded. Try again in ${waitTime} seconds.`
      };
    }
    
    // Request is allowed
    requestData.requests.push(now);
    this.requestCounts.set(key, requestData);
    
    return {
      allowed: true,
      limit: limit.max,
      remaining: limit.max - requestData.requests.length,
      resetTime: now + limit.window,
      waitTime: 0
    };
  }

  /**
   * Record failed request for rate limiting
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User identifier
   * @param {string} ipAddress - IP address
   */
  async recordFailedRequest(endpoint, userId, ipAddress = 'unknown') {
    // For auth endpoints, use the authentication rate limiter
    if (endpoint.includes('/auth/login')) {
      return await RateLimiter.recordFailedAttempt(userId, ipAddress);
    }
    
    // For other endpoints, just count as a regular request
    return await this.checkRateLimit(endpoint, userId, ipAddress);
  }

  /**
   * Get rate limit configuration for endpoint
   * @param {string} endpoint - API endpoint
   * @returns {Object} Rate limit configuration
   */
  getEndpointLimit(endpoint) {
    // Check for exact match first
    if (this.endpointLimits.has(endpoint)) {
      return this.endpointLimits.get(endpoint);
    }
    
    // Check for partial matches
    for (const [pattern, limit] of this.endpointLimits.entries()) {
      if (endpoint.includes(pattern)) {
        return limit;
      }
    }
    
    // Return default limit
    return this.endpointLimits.get('default');
  }

  /**
   * Get rate limit headers for response
   * @param {Object} rateLimitStatus - Rate limit status
   * @returns {Object} Headers object
   */
  getRateLimitHeaders(rateLimitStatus) {
    return {
      'X-RateLimit-Limit': rateLimitStatus.limit?.toString() || '100',
      'X-RateLimit-Remaining': rateLimitStatus.remaining?.toString() || '0',
      'X-RateLimit-Reset': rateLimitStatus.resetTime?.toString() || Date.now().toString(),
      'X-RateLimit-Reset-After': rateLimitStatus.waitTime?.toString() || '0'
    };
  }

  /**
   * Apply rate limiting to axios instance
   * @param {Object} axiosInstance - Axios instance to enhance
   */
  applyToAxios(axiosInstance) {
    // Add request interceptor for rate limiting
    axiosInstance.interceptors.request.use(
      async (config) => {
        // Extract user ID (from token or other source)
        const userId = await this.getUserId();
        if (!userId) {
          return config; // No user ID, skip rate limiting
        }
        
        // Check rate limit
        const endpoint = config.url;
        const rateLimitStatus = await this.checkRateLimit(endpoint, userId);
        
        if (!rateLimitStatus.allowed) {
          // Rate limit exceeded, reject request
          const error = new Error(rateLimitStatus.message);
          error.code = 'RATE_LIMIT_EXCEEDED';
          error.rateLimitStatus = rateLimitStatus;
          throw error;
        }
        
        // Add rate limit info to config for response interceptor
        config.rateLimitStatus = rateLimitStatus;
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor to include rate limit headers
    axiosInstance.interceptors.response.use(
      (response) => {
        // Add rate limit headers to response
        if (response.config.rateLimitStatus) {
          const headers = this.getRateLimitHeaders(response.config.rateLimitStatus);
          Object.assign(response.headers, headers);
        }
        return response;
      },
      async (error) => {
        // Handle rate limit errors
        if (error.code === 'RATE_LIMIT_EXCEEDED' && error.rateLimitStatus) {
          error.response = {
            status: 429,
            statusText: 'Too Many Requests',
            headers: this.getRateLimitHeaders(error.rateLimitStatus),
            data: {
              error: 'Rate limit exceeded',
              message: error.message,
              retryAfter: error.rateLimitStatus.waitTime
            }
          };
        }
        
        // Record failed requests for certain endpoints
        if (error.response?.status >= 400 && error.config) {
          const userId = await this.getUserId();
          if (userId) {
            await this.recordFailedRequest(error.config.url, userId);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get current user ID for rate limiting
   * @returns {string|null} User ID
   */
  async getUserId() {
    try {
      // Try to get from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || user.email;
      }
    } catch (error) {
      console.error('Failed to get user ID for rate limiting:', error);
    }
    return null;
  }

  /**
   * Clean up old request data periodically
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 3600000; // 1 hour
      
      for (const [key, data] of this.requestCounts.entries()) {
        // Remove entries with no recent requests
        const latestRequest = Math.max(...data.requests, 0);
        if (latestRequest < now - maxAge) {
          this.requestCounts.delete(key);
        }
      }
    }, 300000); // Run every 5 minutes
  }

  /**
   * Get current rate limit statistics
   * @returns {Object} Rate limit stats
   */
  getStats() {
    const stats = {
      totalTrackedEndpoints: this.requestCounts.size,
      endpointStats: {}
    };
    
    // Group by endpoint
    for (const [key, data] of this.requestCounts.entries()) {
      const [userId, endpoint] = key.split(':');
      if (!stats.endpointStats[endpoint]) {
        stats.endpointStats[endpoint] = {
          users: 0,
          totalRequests: 0
        };
      }
      stats.endpointStats[endpoint].users++;
      stats.endpointStats[endpoint].totalRequests += data.requests.length;
    }
    
    return stats;
  }

  /**
   * Reset rate limits (for testing)
   */
  reset() {
    this.requestCounts.clear();
  }
}

// Export singleton instance
export default new APIRateLimiter();
