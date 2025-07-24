import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WorkoutProvider } from './contexts/WorkoutContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import THEME from './constants/theme';
import LoadingSpinner from './components/LoadingSpinner';

// Import security system
import SecurityMigrationManager from './utils/securityMigration';

// Import main app screens
import HomeScreen from './screens/HomeScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import ProfileScreen from './screens/ProfileScreen';
import WorkoutHistoryScreen from './screens/WorkoutHistoryScreen';

// Import authentication screens
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordEmailScreen from './screens/ForgotPasswordEmailScreen';
import ForgotPasswordSentScreen from './screens/ForgotPasswordSentScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import PasswordResetSuccessScreen from './screens/PasswordResetSuccessScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Authentication Stack Navigator
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordEmailScreen} />
      <Stack.Screen name="ForgotPasswordSent" component={ForgotPasswordSentScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="PasswordResetSuccess" component={PasswordResetSuccessScreen} />
    </Stack.Navigator>
  );
}

// Stack navigator for Home tab
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
    </Stack.Navigator>
  );
}

// Main App Tab Navigator (for authenticated users)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Workout') {
            iconName = 'fitness-center';
          } else if (route.name === 'Exercises') {
            iconName = 'list';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.gray400,
        tabBarStyle: {
          backgroundColor: THEME.colors.gray900, // Dark background for the tab bar
          borderTopColor: THEME.colors.gray700,
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 10,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: THEME.typography.fontSize.xs,
          fontWeight: THEME.typography.fontWeight.semibold,
          marginBottom: 1,
          marginTop: 1,
        },
        headerStyle: {
          backgroundColor: THEME.colors.primary,
          shadowColor: THEME.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTintColor: THEME.colors.white,
        headerTitleStyle: {
          fontWeight: THEME.typography.fontWeight.bold,
          fontSize: THEME.typography.fontSize.lg,
          letterSpacing: THEME.typography.letterSpacing.wide,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator with Authentication Logic
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaProvider style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.primary }}>
        <LoadingSpinner size={60} gradient={true} />
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer theme={{ colors: { background: THEME.colors.gray900 } }}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is authenticated - show main app
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          // User is not authenticated - show auth flow
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

let securityInitialized = false;

export default function App() {
  // Initialize security system when app starts
  useEffect(() => {
    const initSecurity = async () => {
      if (securityInitialized) return; // Prevent duplicate initialization
      
      try {
        console.log('🔐 Initializing security system...');
        await SecurityMigrationManager.initializeSecurity();
        securityInitialized = true;
        console.log('✅ Security system ready');
      } catch (error) {
        console.warn('⚠️ Security initialization failed, using legacy mode:', error.message);
      }
    };
    
    initSecurity();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WorkoutProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </WorkoutProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
