import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const features = [
    {
      icon: 'fitness-center',
      title: 'Track Workouts',
      description: 'Log your exercises, sets, and reps with ease'
    },
    {
      icon: 'trending-up',
      title: 'Monitor Progress',
      description: 'See your strength gains and personal records'
    },
    {
      icon: 'analytics',
      title: 'Smart Analytics',
      description: 'Get insights into your training patterns'
    },
    {
      icon: 'security',
      title: 'Secure & Private',
      description: 'Your data stays safe with advanced security'
    }
  ];

  const renderFeature = (feature, index) => (
    <EnhancedCard key={index} variant="elevated" style={styles.featureCard}>
      <MaterialIcons 
        name={feature.icon} 
        size={32} 
        color={THEME.colors.primary} 
        style={styles.featureIcon}
      />
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </EnhancedCard>
  );

  return (
    <LinearGradient
      colors={[...THEME.colors.gradients.primary, THEME.colors.primary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="fitness-center" size={80} color={THEME.colors.white} />
              <Text style={styles.appName}>Fitera</Text>
              <Text style={styles.tagline}>Your Smart Fitness Companion</Text>
            </View>

            <Text style={styles.heroDescription}>
              Transform your fitness journey with intelligent workout tracking, 
              comprehensive analytics, and personalized insights.
            </Text>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Why Choose Fitera?</Text>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => renderFeature(feature, index))}
            </View>
          </View>

          {/* Call-to-Action */}
          <View style={styles.ctaSection}>
            <EnhancedButton
              title="Get Started"
              variant="secondary"
              size="large"
              icon="arrow-forward"
              gradient={true}
              onPress={() => navigation.navigate('Register')}
              style={styles.primaryCTA}
            />
            
            <View style={styles.loginSection}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <EnhancedButton
                title="Sign In"
                variant="ghost"
                size="medium"
                onPress={() => navigation.navigate('Login')}
                textStyle={styles.loginButtonText}
                style={styles.loginButton}
              />
            </View>
          </View>
        </ScrollView>
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
scrollContent: {
    flexGrow: 1,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
  },
heroSection: {
    alignItems: 'center',
    paddingTop: THEME.spacing['2xl'],
    paddingBottom: THEME.spacing.lg,
  },
logoContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
appName: {
    fontSize: THEME.typography.fontSize['4xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    marginTop: THEME.spacing.md,
    letterSpacing: THEME.typography.letterSpacing.wider,
  },
  tagline: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.white,
    opacity: 0.9,
    marginTop: THEME.spacing.sm,
    fontWeight: THEME.typography.fontWeight.medium,
  },
  heroDescription: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: THEME.spacing.md,
  },
featuresSection: {
    paddingVertical: THEME.spacing.lg,
  },
  featuresTitle: {
    fontSize: THEME.typography.fontSize['2xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: THEME.spacing.md,
  },
featureCard: {
    width: (width - THEME.spacing.lg * 2 - THEME.spacing.md) / 2,
    alignItems: 'center',
    padding: THEME.spacing.md,
    minHeight: 120,
  },
  featureIcon: {
    marginBottom: THEME.spacing.md,
  },
  featureTitle: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },
  featureDescription: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
ctaSection: {
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
    alignItems: 'center',
  },
primaryCTA: {
    width: '100%',
    marginBottom: THEME.spacing.lg,
  },
  loginSection: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    opacity: 0.9,
    marginBottom: THEME.spacing.sm,
  },
  loginButton: {
    paddingHorizontal: THEME.spacing.xl,
  },
  loginButtonText: {
    color: THEME.colors.white,
    fontWeight: THEME.typography.fontWeight.semibold,
    fontSize: THEME.typography.fontSize.base,
  },
}); 