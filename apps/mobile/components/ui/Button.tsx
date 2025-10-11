import React from "react";
import {
    ActivityIndicator,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";

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
  const { styles, theme } = useStyles(stylesheet, { variant, size, fullWidth, disabled: disabled || loading });
  const isDisabled = disabled || loading;

  const iconColor = variant === "primary" ? "#ffffff" : theme.colors.primary;

  return (
    <TouchableOpacity
      style={[styles.button, style]}
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
          <Text style={[styles.text, textStyle]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.md,
    flexDirection: "row",
    gap: theme.spacing.sm,

    variants: {
      variant: {
        primary: {
          backgroundColor: theme.colors.primary,
        },
        secondary: {
          backgroundColor: theme.colors.surface,
        },
        outline: {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: theme.colors.primary,
        },
        ghost: {
          backgroundColor: "transparent",
        },
      },
      size: {
        sm: {
          height: 36,
          paddingHorizontal: theme.spacing.md,
        },
        md: {
          height: theme.sizing.buttonHeight,
          paddingHorizontal: theme.spacing.lg,
        },
        lg: {
          height: 56,
          paddingHorizontal: theme.spacing.xl,
        },
      },
      fullWidth: {
        true: {
          width: "100%",
        },
      },
      disabled: {
        true: {
          opacity: theme.opacity.disabled,
        },
      },
    },
  },
  text: {
    fontWeight: "600",
    fontSize: 16,

    variants: {
      variant: {
        primary: {
          color: "#ffffff",
        },
        secondary: {
          color: theme.colors.textPrimary,
        },
        outline: {
          color: theme.colors.primary,
        },
        ghost: {
          color: theme.colors.primary,
        },
      },
      size: {
        sm: {
          fontSize: 14,
        },
        md: {
          fontSize: 16,
        },
        lg: {
          fontSize: 20,
          fontWeight: "700",
        },
      },
    },
  },
}));
