import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface IconProps {
  size: number;
  color: string;
}

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ComponentType<IconProps> | ((props: IconProps) => React.ReactElement);
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Hardcoded colors for MVP (matching theme)
const colors = {
  primary: "#FF6B35",
  surface: "#2D3748",
  textPrimary: "#ffffff",
  background: "#1A202C",
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon: Icon,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Get variant styles
  const buttonVariantStyle = variant === "primary"
    ? styles.primaryButton
    : variant === "secondary"
    ? styles.secondaryButton
    : variant === "outline"
    ? styles.outlineButton
    : styles.ghostButton;

  const textVariantStyle = variant === "primary"
    ? styles.primaryText
    : variant === "secondary"
    ? styles.secondaryText
    : variant === "outline"
    ? styles.outlineText
    : styles.ghostText;

  // Get size styles
  const buttonSizeStyle = size === "sm"
    ? styles.smButton
    : size === "lg"
    ? styles.lgButton
    : styles.mdButton;

  const textSizeStyle = size === "sm"
    ? styles.smText
    : size === "lg"
    ? styles.lgText
    : styles.mdText;

  const iconColor = variant === "primary" ? "#ffffff" : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonVariantStyle,
        buttonSizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={accessibilityLabel || (typeof children === "string" ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          color={iconColor}
          size="small"
        />
      ) : (
        <>
          {Icon && <Icon size={18} color={iconColor} />}
          <Text style={[styles.text, textVariantStyle, textSizeStyle, textStyle]}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
  },

  // Variant styles
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: "transparent",
  },

  // Size styles
  smButton: {
    height: 36,
    paddingHorizontal: 16,
  },
  mdButton: {
    height: 48,
    paddingHorizontal: 24,
  },
  lgButton: {
    height: 56,
    paddingHorizontal: 32,
  },

  // State styles
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },

  // Text base
  text: {
    fontWeight: "600",
  },

  // Text variant styles
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },

  // Text size styles
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 20,
    fontWeight: "700",
  },
});
