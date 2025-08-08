import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from '../utils/secureStorage';
import NetworkSecurity from '../utils/networkSecurity';
import APIRateLimiter from '../utils/apiRateLimiter';
import ProductionConfig, { getAPIConfig } from '../config/production';

// Use production configuration
const apiConfig = getAPIConfig();

const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

api.interceptors.request.use(
  async (config) => {
    try {
      // Validate endpoint security
      const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
      const validation = NetworkSecurity.validateAPIEndpoint(fullUrl);
      
      if (!validation.isValid) {
        throw new Error(`API endpoint security validation failed: ${fullUrl}`);
      }
      
      // Enforce HTTPS
      if (!NetworkSecurity.enforceHTTPS(fullUrl)) {
        throw new Error('HTTPS required for all API requests');
      }
      
      // Prefer secure storage; fall back to AsyncStorage for backward compatibility
      const secureToken = await SecureStorage.getAuthToken();
      const legacyToken = secureToken || (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('userToken'));
      if (legacyToken) {
        config.headers['Authorization'] = `Bearer ${legacyToken}`;
      }
      
      // Security headers are already added from production config
      // Additional runtime headers can be added here if needed
      
      // Apply additional security headers
      config.headers = NetworkSecurity.applySecurityHeaders(config.headers);
      
      if (ProductionConfig.security.enableDebugMode) {
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request configuration error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (ProductionConfig.security.enableDebugMode) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    if (ProductionConfig.security.enableDebugMode) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    }
    
    // Handle common errors
    if (error.response?.status === 401) {
      // Token expired or invalid - could trigger logout here
      console.log('🔒 Authentication error - token may be expired');
    }
    
    return Promise.reject(error);
  }
);

// Apply API rate limiting
APIRateLimiter.applyToAxios(api);

export default api;
