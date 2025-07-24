import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import THEME from '../constants/theme';

const LoadingSpinner = ({ 
  size = 40, 
  color = THEME.colors.primary,
  gradient = false,
  style 
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinValue, scaleValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinnerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: size / 10,
    borderTopColor: gradient ? 'transparent' : color,
    borderRightColor: gradient ? 'transparent' : `${color}80`,
    borderBottomColor: gradient ? 'transparent' : `${color}40`,
    borderLeftColor: gradient ? 'transparent' : `${color}20`,
    transform: [
      { rotate },
      { scale: scaleValue }
    ],
  };

  if (gradient) {
    return (
      <View style={[styles.container, style]}>
        <Animated.View style={spinnerStyle}>
          <LinearGradient
            colors={THEME.colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: size / 2,
              }
            ]}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={spinnerStyle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingSpinner; 