import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';

export default function PasswordResetSuccessScreen({ navigation }) {
  return (
    <LinearGradient
      colors={THEME.colors.gradients.primary}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="check-circle" size={80} color={THEME.colors.success} />
          </View>
          
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been successfully reset.
            You can now log in with your new password.
          </Text>
          
          <EnhancedButton
            title="Go to Login"
            variant="primary"
            size="large"
            onPress={() => navigation.navigate('Login')}
            gradient={true}
            style={styles.button}
            icon="login"
          />
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
    marginBottom: THEME.spacing['2xl'],
    lineHeight: 24,
  },
  button: {
    width: '100%',
  },
});
