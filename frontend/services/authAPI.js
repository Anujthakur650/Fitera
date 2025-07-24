import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

// Base API configuration
const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Request password reset email
export const requestPasswordReset = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      ...API_CONFIG,
      body: JSON.stringify({ email }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Request password reset error:', error);
    throw error;
  }
};

// Verify reset token
export const verifyResetToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-reset-token`, {
      method: 'POST',
      ...API_CONFIG,
      body: JSON.stringify({ token }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Verify reset token error:', error);
    throw error;
  }
};

// Reset password with token
export const resetPasswordWithToken = async (token, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      ...API_CONFIG,
      body: JSON.stringify({ 
        token, 
        password: newPassword 
      }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      ...API_CONFIG,
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleResponse(response);
    
    // Store token if login successful
    if (data.token) {
      await AsyncStorage.setItem('userToken', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Register user
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      ...API_CONFIG,
      body: JSON.stringify(userData),
    });
    
    const data = await handleResponse(response);
    
    // Store token if registration successful
    if (data.token) {
      await AsyncStorage.setItem('userToken', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
    }
    
    // Clear local storage
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local storage even if API call fails
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await handleResponse(response);
    
    // Update stored token
    if (data.token) {
      await AsyncStorage.setItem('userToken', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Refresh token error:', error);
    throw error;
  }
};
