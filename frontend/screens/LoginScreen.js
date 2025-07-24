import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';
import LoadingSpinner from '../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.message);
    }
  };

  return (
    <LinearGradient
      colors={THEME.colors.gradients.primary}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="fitness-center" size={64} color={THEME.colors.white} />
            <Text style={styles.appTitle}>Fitera</Text>
            <Text style={styles.appSubtitle}>Your Smart Fitness Companion</Text>
          </View>

          {/* Login Form */}
          <EnhancedCard variant="glass" style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={THEME.colors.gray500}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={THEME.colors.gray500}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                />
              </View>

              <EnhancedButton
                title={loading ? "Signing In..." : "Sign In"}
                variant="primary"
                size="large"
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                icon="login"
                gradient={true}
                style={styles.loginButton}
              />

              <View style={styles.linkContainer}>
                <Text style={styles.linkText}>Don't have an account? </Text>
                <EnhancedButton
                  title="Create Account"
                  variant="ghost"
                  size="small"
                  onPress={() => navigation.navigate('Register')}
                  textStyle={styles.linkButtonText}
                />
              </View>
            </View>
          </EnhancedCard>

          {/* Loading Overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <LoadingSpinner size={60} gradient={true} />
              <Text style={styles.loadingText}>Signing you in...</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing['2xl'],
  },
  appTitle: {
    fontSize: THEME.typography.fontSize['4xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    marginTop: THEME.spacing.md,
    letterSpacing: THEME.typography.letterSpacing.wide,
  },
  appSubtitle: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.white,
    opacity: 0.9,
    marginTop: THEME.spacing.sm,
    textAlign: 'center',
  },
  formCard: {
    marginHorizontal: THEME.spacing.md,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  title: {
    fontSize: THEME.typography.fontSize['2xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
    textAlign: 'center',
  },
  form: {
    gap: THEME.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.gray50,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.gray300,
    paddingHorizontal: THEME.spacing.md,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray900,
    paddingVertical: THEME.spacing.md,
  },
  loginButton: {
    marginTop: THEME.spacing.md,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
  },
  linkText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
  },
  linkButtonText: {
    color: THEME.colors.primary,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.white,
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.medium,
    marginTop: THEME.spacing.lg,
  },
});
