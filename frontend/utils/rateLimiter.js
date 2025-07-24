import * as SecureStore from 'expo-secure-store';
import ErrorHandler from './errorHandler';

/**
 * Rate Limiter for Authentication
 * Implements progressive rate limiting to prevent brute force attacks
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map(); // In-memory storage for attempts
    this.ipAttempts = new Map(); // Track attempts by IP
    this.config = {
      maxAttempts: 5,
      initialDelay: 1000, // 1 second
      maxDelay: 300000, // 5 minutes
      lockoutDuration: 900000, // 15 minutes
      cleanupInterval: 3600000, // 1 hour
      ipMaxAttempts: 10, // Max attempts from single IP
      ipWindowMs: 900000 // 15 minute window for IP tracking
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Record a failed login attempt
   * @param {string} identifier - Email or username
   * @param {string} ipAddress - IP address of the request
   * @returns {Object} Rate limit status
   */
  async recordFailedAttempt(identifier, ipAddress = 'unknown') {
    try {
      const now = Date.now();
      
      // Track by identifier (email)
      let userAttempts = this.attempts.get(identifier) || {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      };

      // Check if currently locked out
      if (userAttempts.lockedUntil && userAttempts.lockedUntil > now) {
        const remainingTime = Math.ceil((userAttempts.lockedUntil - now) / 1000);
        return {
          isLocked: true,
          remainingLockTime: remainingTime,
          message: `Account locked. Try again in ${this.formatTime(remainingTime)}`
        };
      }

      // Increment attempt count
      userAttempts.count++;
      userAttempts.lastAttempt = now;

      // Check if should lock account
      if (userAttempts.count >= this.config.maxAttempts) {
        userAttempts.lockedUntil = now + this.config.lockoutDuration;
        this.attempts.set(identifier, userAttempts);
        
        // Log security event
        ErrorHandler.logError(
          { message: 'Account locked due to multiple failed login attempts', code: 'ACCOUNT_LOCKED' },
          { identifier, attempts: userAttempts.count, ipAddress },
          'HIGH'
        );

        return {
          isLocked: true,
          remainingLockTime: Math.ceil(this.config.lockoutDuration / 1000),
          message: `Too many failed attempts. Account locked for ${this.formatTime(this.config.lockoutDuration / 1000)}`
        };
      }

      // Calculate progressive delay
      const delay = this.calculateDelay(userAttempts.count);
      this.attempts.set(identifier, userAttempts);

      // Track by IP
      await this.trackIpAttempt(ipAddress);

      // Store persistent rate limit data
      await this.persistRateLimit(identifier, userAttempts);

      return {
        isLocked: false,
        attemptCount: userAttempts.count,
        remainingAttempts: this.config.maxAttempts - userAttempts.count,
        delay: delay,
        message: `${this.config.maxAttempts - userAttempts.count} attempts remaining`
      };
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'RateLimiter', action: 'recordFailedAttempt' }, 'MEDIUM');
      // Don't block login on rate limiter error
      return { isLocked: false, attemptCount: 0, remainingAttempts: this.config.maxAttempts };
    }
  }

  /**
   * Clear failed attempts after successful login
   * @param {string} identifier - Email or username
   */
  async clearAttempts(identifier) {
    try {
      this.attempts.delete(identifier);
      // SecureStore requires alphanumeric keys with only ., -, and _ characters
      const safeKey = `rate_limit_${identifier.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await SecureStore.deleteItemAsync(safeKey);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'RateLimiter', action: 'clearAttempts' }, 'LOW');
    }
  }

  /**
   * Check if identifier is rate limited
   * @param {string} identifier - Email or username
   * @returns {Object} Rate limit status
   */
  async checkRateLimit(identifier) {
    try {
      const now = Date.now();
      
      // Check in-memory first
      let userAttempts = this.attempts.get(identifier);
      
      // If not in memory, check persistent storage
      if (!userAttempts) {
        // SecureStore requires alphanumeric keys with only ., -, and _ characters
        const safeKey = `rate_limit_${identifier.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const stored = await SecureStore.getItemAsync(safeKey);
        if (stored) {
          userAttempts = JSON.parse(stored);
          this.attempts.set(identifier, userAttempts);
        }
      }

      if (!userAttempts) {
        return { isLocked: false, attemptCount: 0, remainingAttempts: this.config.maxAttempts };
      }

      // Check if locked
      if (userAttempts.lockedUntil && userAttempts.lockedUntil > now) {
        const remainingTime = Math.ceil((userAttempts.lockedUntil - now) / 1000);
        return {
          isLocked: true,
          remainingLockTime: remainingTime,
          message: `Account locked. Try again in ${this.formatTime(remainingTime)}`
        };
      }

      // Check if attempts have expired (reset after lockout period)
      if (userAttempts.lastAttempt + this.config.lockoutDuration < now) {
        await this.clearAttempts(identifier);
        return { isLocked: false, attemptCount: 0, remainingAttempts: this.config.maxAttempts };
      }

      return {
        isLocked: false,
        attemptCount: userAttempts.count,
        remainingAttempts: this.config.maxAttempts - userAttempts.count,
        delay: this.calculateDelay(userAttempts.count)
      };
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'RateLimiter', action: 'checkRateLimit' }, 'MEDIUM');
      return { isLocked: false, attemptCount: 0, remainingAttempts: this.config.maxAttempts };
    }
  }

  /**
   * Track attempts by IP address
   * @param {string} ipAddress - IP address
   */
  async trackIpAttempt(ipAddress) {
    if (!ipAddress || ipAddress === 'unknown') return;

    const now = Date.now();
    let ipData = this.ipAttempts.get(ipAddress) || {
      attempts: [],
      blocked: false
    };

    // Add new attempt
    ipData.attempts.push(now);

    // Remove old attempts outside window
    ipData.attempts = ipData.attempts.filter(
      timestamp => timestamp > now - this.config.ipWindowMs
    );

    // Check if IP should be blocked
    if (ipData.attempts.length >= this.config.ipMaxAttempts) {
      ipData.blocked = true;
      
      // Log security event
      ErrorHandler.logError(
        { message: 'IP address blocked due to multiple failed attempts', code: 'IP_BLOCKED' },
        { ipAddress, attempts: ipData.attempts.length },
        'HIGH'
      );
    }

    this.ipAttempts.set(ipAddress, ipData);
  }

  /**
   * Check if IP is blocked
   * @param {string} ipAddress - IP address
   * @returns {boolean} Whether IP is blocked
   */
  isIpBlocked(ipAddress) {
    if (!ipAddress || ipAddress === 'unknown') return false;
    
    const ipData = this.ipAttempts.get(ipAddress);
    return ipData?.blocked || false;
  }

  /**
   * Calculate progressive delay based on attempt count
   * @param {number} attemptCount - Number of failed attempts
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attemptCount) {
    if (attemptCount <= 1) return 0;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.min(
      this.config.initialDelay * Math.pow(2, attemptCount - 2),
      this.config.maxDelay
    );
    
    return delay;
  }

  /**
   * Persist rate limit data to secure storage
   * @param {string} identifier - Email or username
   * @param {Object} attemptData - Attempt data to store
   */
  async persistRateLimit(identifier, attemptData) {
    try {
      // SecureStore requires alphanumeric keys with only ., -, and _ characters
      const safeKey = `rate_limit_${identifier.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await SecureStore.setItemAsync(
        safeKey,
        JSON.stringify(attemptData)
      );
    } catch (error) {
      // Don't throw - rate limiting should not break authentication
      console.error('Failed to persist rate limit data:', error);
    }
  }

  /**
   * Format time in human readable format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  /**
   * Clean up old attempts periodically
   */
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up user attempts
      for (const [identifier, attempts] of this.attempts.entries()) {
        if (attempts.lastAttempt + this.config.lockoutDuration < now) {
          this.attempts.delete(identifier);
        }
      }
      
      // Clean up IP attempts
      for (const [ip, data] of this.ipAttempts.entries()) {
        data.attempts = data.attempts.filter(
          timestamp => timestamp > now - this.config.ipWindowMs
        );
        
        if (data.attempts.length === 0) {
          this.ipAttempts.delete(ip);
        } else if (data.blocked && data.attempts.length < this.config.ipMaxAttempts) {
          data.blocked = false;
        }
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Get rate limiter statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    const blockedUsers = Array.from(this.attempts.entries())
      .filter(([_, data]) => data.lockedUntil && data.lockedUntil > Date.now())
      .length;
    
    const blockedIps = Array.from(this.ipAttempts.values())
      .filter(data => data.blocked)
      .length;
    
    return {
      totalTrackedUsers: this.attempts.size,
      blockedUsers,
      totalTrackedIps: this.ipAttempts.size,
      blockedIps,
      config: this.config
    };
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset() {
    this.attempts.clear();
    this.ipAttempts.clear();
  }
}

// Export singleton instance
export default new RateLimiter();
