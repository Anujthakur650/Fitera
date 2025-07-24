import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';
import { resetPasswordWithToken } from '../services/authAPI';

export default function ResetPasswordScreen({ navigation, route }) {
  const { token, email } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '' });

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let score = 0;
    const checks = [
      { regex: /.{8,}/, weight: 1 }, // At least 8 characters
      { regex: /[a-z]/, weight: 1 }, // Lowercase letter
      { regex: /[A-Z]/, weight: 1 }, // Uppercase letter
      { regex: /[0-9]/, weight: 1 }, // Number
      { regex: /[^A-Za-z0-9]/, weight: 1 } // Special character
    ];

    checks.forEach(check => {
      if (check.regex.test(password)) score += check.weight;
    });

    let label = '';
    let color = '';
    if (score === 0) {
      label = '';
    } else if (score <= 2) {
      label = 'Weak';
      color = THEME.colors.error;
    } else if (score <= 3) {
      label = 'Fair';
      color = THEME.colors.warning;
    } else if (score <= 4) {
      label = 'Good';
      color = THEME.colors.info;
    } else {
      label = 'Strong';
      color = THEME.colors.success;
    }

    setPasswordStrength({ score, label, color });
  };

  const validatePassword = () => {
    if (!password) {
      Alert.alert('Error', 'Please enter a new password.');
      return false;
    }
    if (password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    if (passwordStrength.score < 3) {
      Alert.alert('Weak Password', 'Please choose a stronger password.');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await resetPasswordWithToken(token, password);
      
      navigation.navigate('PasswordResetSuccess');
    } catch (error) {
      Alert.alert(
        'Error', 
        error.message || 'Failed to reset password. Please try again.'
      );
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
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
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
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>Your new password must be different from previous passwords</Text>
            </View>

            {/* Form Card */}
            <EnhancedCard variant="glass" style={styles.formCard}>
              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={THEME.colors.gray500}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      checkPasswordStrength(text);
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons 
                      name={showPassword ? "visibility" : "visibility-off"} 
                      size={20} 
                      color={THEME.colors.gray500} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Indicator */}
                {password && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View 
                          key={level}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: level <= passwordStrength.score ? passwordStrength.color : THEME.colors.gray300 }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor={THEME.colors.gray500}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <MaterialIcons 
                      name={showConfirmPassword ? "visibility" : "visibility-off"} 
                      size={20} 
                      color={THEME.colors.gray500} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirements}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color={password.length >= 8 ? THEME.colors.success : THEME.colors.gray400} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: password.length >= 8 ? THEME.colors.gray700 : THEME.colors.gray500 }
                  ]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color={/[A-Z]/.test(password) && /[a-z]/.test(password) ? THEME.colors.success : THEME.colors.gray400} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /[A-Z]/.test(password) && /[a-z]/.test(password) ? THEME.colors.gray700 : THEME.colors.gray500 }
                  ]}>
                    Both uppercase and lowercase letters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color={/[0-9]/.test(password) ? THEME.colors.success : THEME.colors.gray400} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /[0-9]/.test(password) ? THEME.colors.gray700 : THEME.colors.gray500 }
                  ]}>
                    At least one number
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name="check-circle" 
                    size={16} 
                    color={/[^A-Za-z0-9]/.test(password) ? THEME.colors.success : THEME.colors.gray400} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: /[^A-Za-z0-9]/.test(password) ? THEME.colors.gray700 : THEME.colors.gray500 }
                  ]}>
                    At least one special character
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <EnhancedButton
                title={loading ? "Resetting..." : "Reset Password"}
                variant="primary"
                size="large"
                onPress={handleResetPassword}
                disabled={loading || !password || !confirmPassword}
                loading={loading}
                gradient={true}
                icon="check"
                style={styles.submitButton}
              />

              {/* Cancel Link */}
              <TouchableOpacity 
                style={styles.cancelLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </EnhancedCard>
          </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xl,
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
    marginTop: THEME.spacing.xl,
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
  inputGroup: {
    marginBottom: THEME.spacing.lg,
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray700,
    marginBottom: THEME.spacing.sm,
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
  strengthContainer: {
    marginTop: THEME.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: THEME.spacing.xs,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: THEME.radius.sm,
  },
  strengthLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.semibold,
    marginLeft: THEME.spacing.sm,
  },
  requirements: {
    backgroundColor: THEME.colors.info + '10',
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
  },
  requirementsTitle: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray700,
    marginBottom: THEME.spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  requirementText: {
    fontSize: THEME.typography.fontSize.sm,
    marginLeft: THEME.spacing.xs,
  },
  submitButton: {
    marginTop: THEME.spacing.sm,
  },
  cancelLink: {
    marginTop: THEME.spacing.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
    fontWeight: THEME.typography.fontWeight.medium,
  },
});
