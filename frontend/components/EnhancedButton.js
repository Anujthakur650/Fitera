import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import THEME from '../constants/theme';

const EnhancedButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  gradient = false,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  testID,
  showSpinnerOnLoading = true,
  ...props
}) => {
  const animatedValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(animatedValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = () => {
    const baseStyle = styles.button;
    const variantStyle = styles[variant] || styles.primary;
    const sizeStyle = styles[size] || styles.medium;
    
    return [
      baseStyle,
      variantStyle,
      sizeStyle,
      disabled && styles.disabled,
      style,
    ];
  };

  const getTextStyle = () => {
    const baseTextStyle = styles.text;
    const variantTextStyle = styles[`${variant}Text`] || styles.primaryText;
    const sizeTextStyle = styles[`${size}Text`] || styles.mediumText;
    
    return [
      baseTextStyle,
      variantTextStyle,
      sizeTextStyle,
      disabled && styles.disabledText,
      textStyle,
    ];
  };

  const getIconColor = () => {
    const textStyles = getTextStyle();
    return textStyles.find(style => style && style.color)?.color || THEME.colors.white;
  };

  const renderContent = () => (
    <View style={styles.content}>
      {icon && iconPosition === 'left' && (
        <MaterialIcons 
          name={icon} 
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
          color={getIconColor()}
          style={styles.iconLeft}
        />
      )}
      {loading && showSpinnerOnLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size={size === 'small' ? 'small' : 'small'} color={getIconColor()} />
          <Text style={[getTextStyle(), styles.loadingText]}>{title}</Text>
        </View>
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
      {icon && iconPosition === 'right' && (
        <MaterialIcons 
          name={icon} 
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
          color={getIconColor()}
          style={styles.iconRight}
        />
      )}
    </View>
  );

  const buttonContent = gradient && variant === 'primary' ? (
    <LinearGradient
      colors={THEME.colors.gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[getButtonStyle(), { backgroundColor: 'transparent' }]}
    >
      {renderContent()}
    </LinearGradient>
  ) : gradient && variant === 'secondary' ? (
    <LinearGradient
      colors={THEME.colors.gradients.secondary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[getButtonStyle(), { backgroundColor: 'transparent' }]}
    >
      {renderContent()}
    </LinearGradient>
  ) : (
    <View style={getButtonStyle()}>
      {renderContent()}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={accessibilityLabel || title}
      testID={testID}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <Animated.View
        style={[
          { transform: [{ scale: animatedValue }] },
        ]}
      >
        {buttonContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  
  // Variants
  primary: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.primary,
  },
  secondary: {
    backgroundColor: THEME.colors.white,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.sm,
  },
  success: {
    backgroundColor: THEME.colors.secondary,
    ...THEME.shadows.secondary,
  },
  warning: {
    backgroundColor: THEME.colors.accent,
    ...THEME.shadows.sm,
  },
  danger: {
    backgroundColor: THEME.colors.error,
    ...THEME.shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Sizes
  small: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    minHeight: 36,
  },
  medium: {
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl,
    minHeight: 44,
  },
  large: {
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing['2xl'],
    minHeight: 52,
  },
  
  // Text styles
  text: {
    fontWeight: THEME.typography.fontWeight.semibold,
    textAlign: 'center',
    letterSpacing: THEME.typography.letterSpacing.wide,
  },
  
  // Variant text styles
  primaryText: {
    color: THEME.colors.white,
  },
  secondaryText: {
    color: THEME.colors.primary,
  },
  successText: {
    color: THEME.colors.white,
  },
  warningText: {
    color: THEME.colors.white,
  },
  dangerText: {
    color: THEME.colors.white,
  },
  ghostText: {
    color: THEME.colors.primary,
  },
  outlineText: {
    color: THEME.colors.white,
  },
  
  // Size text styles
  smallText: {
    fontSize: THEME.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: THEME.typography.fontSize.base,
  },
  largeText: {
    fontSize: THEME.typography.fontSize.lg,
  },
  
  // States
  disabled: {
    opacity: 0.6,
    ...THEME.shadows.none,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  // Content layout
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: THEME.spacing.sm,
  },
  iconLeft: {
    marginRight: THEME.spacing.sm,
  },
  iconRight: {
    marginLeft: THEME.spacing.sm,
  },
});

export default memo(EnhancedButton);