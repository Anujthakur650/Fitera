import { Linking } from 'react-native';
import { verifyResetToken } from '../services/authAPI';

// Configure deep link URL patterns
const DEEP_LINK_CONFIG = {
  prefixes: ['fitera://', 'https://fitera.app', 'http://localhost:3000'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'reset-password/:token',
          Login: 'login',
          Register: 'register',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Workout: 'workout',
          Profile: 'profile',
        },
      },
    },
  },
};

// Handle incoming deep links
export const handleDeepLink = async (url, navigation) => {
  if (!url) return;

  try {
    // Parse the URL
    const route = url.replace(/.*?:\/\//g, '');
    const routeParts = route.split('/');

    // Handle password reset links
    if (routeParts[0] === 'reset-password' && routeParts[1]) {
      const token = routeParts[1];
      
      // Verify the token first
      try {
        const result = await verifyResetToken(token);
        
        // Navigate to reset password screen with token and email
        navigation.navigate('Auth', {
          screen: 'ResetPassword',
          params: {
            token: token,
            email: result.email, // Assuming API returns email
          },
        });
      } catch (error) {
        // Token is invalid or expired
        navigation.navigate('Auth', {
          screen: 'Login',
          params: {
            error: 'Password reset link is invalid or has expired. Please request a new one.',
          },
        });
      }
    }
    // Handle other deep links
    else if (routeParts[0] === 'login') {
      navigation.navigate('Auth', { screen: 'Login' });
    } else if (routeParts[0] === 'register') {
      navigation.navigate('Auth', { screen: 'Register' });
    } else if (routeParts[0] === 'home') {
      navigation.navigate('Main', { screen: 'Home' });
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
};

// Set up deep linking listeners
export const setupDeepLinking = (navigation) => {
  // Handle initial URL if app was opened from a link
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url, navigation);
    }
  });

  // Handle URLs when app is already open
  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url, navigation);
  });

  return () => {
    subscription.remove();
  };
};

// Open email app
export const openEmailApp = async () => {
  try {
    // Try to open default email app
    const emailUrl = 'mailto:';
    const canOpen = await Linking.canOpenURL(emailUrl);
    
    if (canOpen) {
      await Linking.openURL(emailUrl);
    } else {
      // Fallback to common email apps
      const emailApps = [
        { name: 'Gmail', url: 'googlegmail://' },
        { name: 'Outlook', url: 'ms-outlook://' },
        { name: 'Yahoo Mail', url: 'ymail://' },
        { name: 'Apple Mail', url: 'message://' },
      ];

      for (const app of emailApps) {
        const canOpenApp = await Linking.canOpenURL(app.url);
        if (canOpenApp) {
          await Linking.openURL(app.url);
          return;
        }
      }

      // If no email app is available
      throw new Error('No email app found');
    }
  } catch (error) {
    console.error('Error opening email app:', error);
    throw new Error('Could not open email app. Please check your email manually.');
  }
};

// Generate password reset link
export const generatePasswordResetLink = (token) => {
  // This should match your backend's reset link format
  const baseUrl = __DEV__ 
    ? 'http://localhost:3000' 
    : 'https://fitera.app';
  
  return `${baseUrl}/reset-password/${token}`;
};

export default DEEP_LINK_CONFIG;
