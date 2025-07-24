// Fitera App Theme Constants
// A unique fitness-focused design system that differentiates from Strong

export const COLORS = {
  // Primary Brand Colors - Deep Purple & Emerald Theme
  primary: '#6366F1',        // Indigo-600 - main brand color
  primaryDark: '#4F46E5',    // Indigo-700 - pressed states
  primaryLight: '#A5B4FC',   // Indigo-300 - light accents
  primaryUltraLight: '#EEF2FF', // Indigo-50 - backgrounds

  // Secondary Colors - Emerald Accents
  secondary: '#10B981',      // Emerald-500 - success, progress
  secondaryDark: '#059669',  // Emerald-600 - pressed states
  secondaryLight: '#6EE7B7', // Emerald-300 - light accents
  secondaryUltraLight: '#ECFDF5', // Emerald-50 - backgrounds

  // Accent Colors
  accent: '#F59E0B',         // Amber-500 - highlights, warnings
  accentDark: '#D97706',     // Amber-600 - pressed states
  accentLight: '#FDE68A',    // Amber-200 - light accents

  // UI Grays - Warmer tone
  black: '#0F172A',          // Slate-900 - primary text
  gray900: '#1E293B',        // Slate-800 - secondary text
  gray800: '#334155',        // Slate-700 - tertiary text
  gray700: '#475569',        // Slate-600 - disabled text
  gray600: '#64748B',        // Slate-500 - placeholder text
  gray500: '#94A3B8',        // Slate-400 - borders, dividers
  gray400: '#CBD5E1',        // Slate-300 - light borders
  gray300: '#E2E8F0',        // Slate-200 - backgrounds
  gray200: '#F1F5F9',        // Slate-100 - card backgrounds
  gray100: '#F8FAFC',        // Slate-50 - page backgrounds
  white: '#FFFFFF',          // Pure white

  // Semantic Colors
  success: '#10B981',        // Emerald-500
  successLight: '#D1FAE5',   // Emerald-100
  warning: '#F59E0B',        // Amber-500
  warningLight: '#FEF3C7',   // Amber-100
  error: '#EF4444',          // Red-500
  errorLight: '#FEE2E2',     // Red-100
  info: '#3B82F6',           // Blue-500
  infoLight: '#DBEAFE',      // Blue-100

  // Workout-specific Colors
  rest: '#EF4444',           // Red-500 - rest timer
  restLight: '#FEE2E2',      // Red-100 - rest backgrounds
  warmup: '#F97316',         // Orange-500 - warmup sets
  workingSet: '#6366F1',     // Primary - working sets
  pr: '#DC2626',             // Red-600 - personal records
  prGold: '#F59E0B',         // Amber-500 - special achievements

  // Gradient Colors
  gradients: {
    primary: ['#6366F1', '#8B5CF6'],       // Indigo to Purple
    secondary: ['#10B981', '#059669'],      // Emerald gradient
    success: ['#10B981', '#6EE7B7'],       // Emerald to light
    warning: ['#F59E0B', '#FCD34D'],       // Amber gradient
    sunset: ['#F59E0B', '#EF4444'],        // Amber to Red
    ocean: ['#3B82F6', '#6366F1'],         // Blue to Indigo
  }
};

export const TYPOGRAPHY = {
  // Font sizes with enhanced hierarchy
  fontSize: {
    xs: 11,      // Captions, fine print
    sm: 13,      // Small text, metadata
    base: 15,    // Body text (increased from 14)
    lg: 17,      // Large body text
    xl: 19,      // Small headings
    '2xl': 22,   // Medium headings
    '3xl': 26,   // Large headings
    '4xl': 32,   // Extra large headings
    '5xl': 40,   // Display text
    '6xl': 52,   // Hero text
  },

  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights for better readability
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },

  // Letter spacing for premium feel
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  }
};

export const SPACING = {
  // Enhanced spacing system
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
};

export const RADIUS = {
  // Border radius values
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const SHADOWS = {
  // Enhanced shadow system for depth
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  // Colored shadows for brand elements
  primary: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const BUTTON_STYLES = {
  // Enhanced button style presets
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.primary,
  },
  secondary: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  success: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  pill: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  }
};

export const CARD_STYLES = {
  // Enhanced card style presets
  default: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  elevated: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  bordered: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    ...SHADOWS.xs,
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  }
};

export const ANIMATIONS = {
  // Animation timing
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Easing curves
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  }
};

// Convenience function to create gradient styles
export const createGradient = (colors, direction = '45deg') => ({
  background: `linear-gradient(${direction}, ${colors.join(', ')})`,
});

// Theme context values
export const THEME = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  buttons: BUTTON_STYLES,
  cards: CARD_STYLES,
  animations: ANIMATIONS,
};

export default THEME; 