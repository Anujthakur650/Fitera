import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';
import { useAuth } from '../contexts/FirebaseAuthContext';

export default function ForgotPasswordEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();
  
  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Use AuthContext forgotPassword which handles both local and Firebase users
      const result = await forgotPassword(email);
      
      if (result.success) {
        // Navigate to success screen
        navigation.navigate('ForgotPasswordSent', { email });
      } else {
        // Show error message
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={THEME.colors.white} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="lock-reset" size={64} color={THEME.colors.white} />
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>
          </View>

          {/* Form Card */}
          <EnhancedCard variant="glass" style={styles.formCard}>
            <Text style={styles.cardTitle}>Password Recovery</Text>
            <Text style={styles.cardSubtitle}>
              We'll send you an email with instructions to reset your password.
            </Text>

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

            <EnhancedButton
              title={loading ? "Sending..." : "Send Reset Link"}
              variant="primary"
              size="large"
              onPress={handleSendResetLink}
              disabled={loading}
              loading={loading}
              gradient={true}
              icon="send"
              style={styles.submitButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </EnhancedCard>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: THEME.spacing.xl,
    left: THEME.spacing.xl,
    zIndex: 1,
    padding: THEME.spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing['2xl'],
  },
  title: {
    fontSize: THEME.typography.fontSize['3xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    marginTop: THEME.spacing.md,
    letterSpacing: THEME.typography.letterSpacing.wide,
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.xl,
  },
  formCard: {
    padding: THEME.spacing.xl,
    marginHorizontal: THEME.spacing.sm,
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
    lineHeight: 22,
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
    marginBottom: THEME.spacing.lg,
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
  submitButton: {
    marginTop: THEME.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
  },
  footerText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
  },
  loginLink: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.primary,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
});

