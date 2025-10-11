import { Platform } from "react-native";

/**
 * Color palettes for light and dark themes
 */
export const lightColors = {
  background: "#f3f4f6", // Light gray background matching web app
  surface: "#ffffff", // White cards on gray background
  surfaceElevated: "#ffffff",
  primary: "#FF6B35", // iConnectIT orange
  primaryHover: "#E55A2B",
  accent: "#FFD93D", // iConnectIT yellow
  accentHover: "#E6C335",
  textPrimary: "#1f2937", // Darker for better contrast on light bg
  textSecondary: "#6b7280", // Gray-500
  textTertiary: "#9ca3af", // Gray-400
  success: "#10b981", // Green-500
  warning: "#f59e0b", // Amber-500
  error: "#ef4444", // Red-500
  border: "#e5e7eb", // Gray-200
  borderLight: "#f3f4f6", // Gray-100
};

export const darkColors = {
  background: "#1A202C", // iConnectIT dark
  surface: "#2D3748",
  surfaceElevated: "#374151",
  primary: "#FF6B35", // iConnectIT orange (same in dark)
  primaryHover: "#E55A2B",
  accent: "#FFD93D", // iConnectIT yellow
  accentHover: "#E6C335",
  textPrimary: "#ffffff",
  textSecondary: "#cbd5e0",
  textTertiary: "#a0aec0",
  success: "#06d6a0",
  warning: "#ff9f1c",
  error: "#ef476f",
  border: "#4a5568",
  borderLight: "#2d3748",
};

/**
 * Typography styles
 */
export const typography = {
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: Platform.select({ ios: "System", android: "Roboto" }),
  },
  heading: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  timer: {
    fontSize: 48,
    fontWeight: "700" as const,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
};

/**
 * Spacing constants
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border radius constants
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/**
 * Shadow styles
 */
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    android: {
      elevation: 8,
    },
  }),
};

/**
 * Sizing constants
 */
export const sizing = {
  buttonHeight: 48,
  inputHeight: 48,
  iconSize: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },
  minTouchTarget: 44, // Accessibility minimum
  cardPadding: 16,
  screenPadding: 16,
};

/**
 * Animation durations (in milliseconds)
 */
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/**
 * Opacity values
 */
export const opacity = {
  disabled: 0.5,
  pressed: 0.7,
  overlay: 0.8,
};

/**
 * Complete theme objects for Unistyles
 */
export const lightTheme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  sizing,
  animations,
  opacity,
} as const;

export const darkTheme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  sizing,
  animations,
  opacity,
} as const;

// Legacy exports for backward compatibility during migration
export const colors = lightColors;
export const theme = lightTheme;
