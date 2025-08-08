import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';

const EnhancedCard = ({
  children,
  variant = 'default',
  onPress,
  gradient = false,
  gradientColors,
  style,
  ...props
}) => {
  const getCardStyle = () => {
    const baseStyle = styles.card;
    const variantStyle = styles[variant] || styles.default;
    
    return [
      baseStyle,
      variantStyle,
      style,
    ];
  };

  const cardContent = gradient ? (
    <LinearGradient
      colors={gradientColors || THEME.colors.gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[getCardStyle(), { backgroundColor: 'transparent' }]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={getCardStyle()}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
        accessibilityRole="button"
        {...props}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.radius.xl,
    overflow: 'hidden',
  },
  
  // Variants
  default: {
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.lg,
    ...THEME.shadows.sm,
  },
  elevated: {
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.xl,
    ...THEME.shadows.md,
  },
  outlined: {
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.gray300,
    ...THEME.shadows.xs,
  },
  flat: {
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.lg,
    ...THEME.shadows.none,
  },
  primary: {
    backgroundColor: THEME.colors.primary,
    padding: THEME.spacing.xl,
    ...THEME.shadows.primary,
  },
  secondary: {
    backgroundColor: THEME.colors.secondary,
    padding: THEME.spacing.xl,
    ...THEME.shadows.secondary,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: THEME.spacing.lg,
    ...THEME.shadows.md,
    backdropFilter: 'blur(10px)',
  },
  
  touchable: {
    borderRadius: THEME.radius.xl,
  },
});

export default memo(EnhancedCard);