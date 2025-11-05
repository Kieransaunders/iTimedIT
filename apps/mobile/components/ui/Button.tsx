import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import { darkTheme } from "@/utils/theme";

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
  const theme = darkTheme;
  const iconColor = variant === "primary" ? "#ffffff" : theme.colors.primary;

  // Build combined button style
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.button_fullWidth,
    isDisabled && styles.button_disabled,
    style,
  ];

  // Build combined text style
  const textStyleCombined = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={theme.opacity.pressed}
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
          {Icon && (typeof Icon === 'function' ? <Icon size={18} color={iconColor} /> : <Icon size={18} color={iconColor} />)}
          <Text style={textStyleCombined}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: darkTheme.borderRadius.md,
    flexDirection: "row",
    gap: darkTheme.spacing.sm,
  },
  // Variant styles
  button_primary: {
    backgroundColor: darkTheme.colors.primary,
  },
  button_secondary: {
    backgroundColor: darkTheme.colors.surface,
  },
  button_outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
  },
  button_ghost: {
    backgroundColor: "transparent",
  },
  // Size styles
  button_sm: {
    height: 36,
    paddingHorizontal: darkTheme.spacing.md,
  },
  button_md: {
    height: darkTheme.sizing.buttonHeight,
    paddingHorizontal: darkTheme.spacing.lg,
  },
  button_lg: {
    height: 56,
    paddingHorizontal: darkTheme.spacing.xl,
  },
  // Modifiers
  button_fullWidth: {
    width: "100%",
  },
  button_disabled: {
    opacity: darkTheme.opacity.disabled,
  },
  // Text styles
  text: {
    fontWeight: "600",
    fontSize: 16,
  },
  text_primary: {
    color: "#ffffff",
  },
  text_secondary: {
    color: darkTheme.colors.textPrimary,
  },
  text_outline: {
    color: darkTheme.colors.primary,
  },
  text_ghost: {
    color: darkTheme.colors.primary,
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 20,
    fontWeight: "700",
  },
});
