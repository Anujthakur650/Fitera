import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { openEmailApp } from '../utils/deepLinking';

export default function ForgotPasswordSentScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  // Mask email for privacy
  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  };

  // Timer for resend button
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      // Use Firebase Authentication to resend password reset email
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert('Success', 'Reset email has been resent.');
      setCanResend(false);
      setResendTimer(60);
    } catch (error) {
      // Handle Firebase specific errors
      let errorMessage = 'Failed to resend email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      await openEmailApp();
    } catch (error) {
      Alert.alert('Info', error.message || 'Please check your email app for the reset link.');
    }
  };

  return (
    <LinearGradient
      colors={THEME.colors.gradients.primary}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="mark-email-read" size={80} color={THEME.colors.white} />
          </View>

          {/* Header */}
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent password reset instructions to:
          </Text>
          <Text style={styles.email}>{maskEmail(email)}</Text>

          {/* Instruction Card */}
          <EnhancedCard variant="glass" style={styles.card}>
            <MaterialIcons name="info-outline" size={24} color={THEME.colors.primary} />
            <Text style={styles.cardTitle}>What's Next?</Text>
            <View style={styles.instructionList}>
              <Text style={styles.instruction}>• Check your inbox (and spam folder)</Text>
              <Text style={styles.instruction}>• Click the reset link in the email</Text>
              <Text style={styles.instruction}>• Create a new secure password</Text>
              <Text style={styles.instruction}>• The link expires in 30 minutes</Text>
            </View>

            <EnhancedButton
              title="Open Email App"
              variant="primary"
              size="large"
              onPress={handleOpenEmailApp}
              icon="email"
              gradient={true}
              style={styles.emailButton}
            />

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text style={styles.resendText}>Didn't receive the email?</Text>
              <TouchableOpacity 
                onPress={handleResendEmail}
                disabled={!canResend || loading}
              >
                <Text style={[
                  styles.resendLink,
                  (!canResend || loading) && styles.resendLinkDisabled
                ]}>
                  {loading ? 'Sending...' : canResend ? 'Resend Email' : `Resend in ${resendTimer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </EnhancedCard>

          {/* Back to Login */}
          <TouchableOpacity 
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  iconContainer: {
    marginBottom: THEME.spacing.xl,
  },
  title: {
    fontSize: THEME.typography.fontSize['3xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    marginBottom: THEME.spacing.md,
    letterSpacing: THEME.typography.letterSpacing.wide,
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },
  email: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.white,
    marginBottom: THEME.spacing['2xl'],
  },
  card: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  instructionList: {
    width: '100%',
    marginBottom: THEME.spacing.xl,
  },
  instruction: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray700,
    lineHeight: 24,
    marginBottom: THEME.spacing.sm,
  },
  emailButton: {
    width: '100%',
    marginBottom: THEME.spacing.xl,
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
    marginBottom: THEME.spacing.xs,
  },
  resendLink: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.primary,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  resendLinkDisabled: {
    color: THEME.colors.gray400,
  },
  backToLogin: {
    marginTop: THEME.spacing['2xl'],
    padding: THEME.spacing.md,
  },
  backToLoginText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    fontWeight: THEME.typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
});
