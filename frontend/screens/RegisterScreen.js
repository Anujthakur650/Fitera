import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
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

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { register } = useAuth();

  const validateInputs = () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the Terms & Privacy Policy');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    const result = await register(username, email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
    }
  };

  return (
    <LinearGradient
      colors={THEME.colors.gradients.secondary}
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <MaterialIcons name="fitness-center" size={48} color={THEME.colors.white} />
              <Text style={styles.appTitle}>Join Fitera</Text>
              <Text style={styles.appSubtitle}>Start your fitness transformation today</Text>
            </View>

            {/* Registration Form */}
            <EnhancedCard variant="glass" style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join thousands of fitness enthusiasts</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor={THEME.colors.gray500}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                  />
                </View>

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
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={THEME.colors.gray500}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color={THEME.colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={THEME.colors.gray500}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                  />
                </View>

                {/* Terms Acceptance */}
                <View style={styles.termsContainer}>
                  <EnhancedButton
                    title=""
                    variant={acceptedTerms ? "success" : "outline"}
                    size="small"
                    icon={acceptedTerms ? "check" : ""}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                    style={styles.checkboxButton}
                  />
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text style={styles.termsLink}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                  </View>
                </View>

                <EnhancedButton
                  title={loading ? "Creating Account..." : "Create Account"}
                  variant="secondary"
                  size="large"
                  onPress={handleRegister}
                  disabled={loading}
                  loading={loading}
                  icon="person-add"
                  gradient={true}
                  style={styles.registerButton}
                />

                <View style={styles.linkContainer}>
                  <Text style={styles.linkText}>Already have an account? </Text>
                  <EnhancedButton
                    title="Sign In"
                    variant="ghost"
                    size="small"
                    onPress={() => navigation.navigate('Login')}
                    textStyle={styles.linkButtonText}
                  />
                </View>
              </View>
            </EnhancedCard>
          </ScrollView>

          {/* Loading Overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <LoadingSpinner size={60} gradient={true} />
              <Text style={styles.loadingText}>Creating your account...</Text>
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
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  appTitle: {
    fontSize: THEME.typography.fontSize['3xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    marginTop: THEME.spacing.md,
    letterSpacing: THEME.typography.letterSpacing.wide,
  },
  appSubtitle: {
    fontSize: THEME.typography.fontSize.base,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: THEME.spacing.sm,
  },
  checkboxButton: {
    minWidth: 32,
    minHeight: 32,
    marginRight: THEME.spacing.sm,
  },
  termsTextContainer: {
    flex: 1,
    paddingTop: THEME.spacing.xs,
  },
  termsText: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray600,
    lineHeight: 20,
  },
  termsLink: {
    color: THEME.colors.secondary,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  registerButton: {
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
    color: THEME.colors.secondary,
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
