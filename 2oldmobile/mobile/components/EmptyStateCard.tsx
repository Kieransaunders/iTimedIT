import React from "react";
import {
  Text,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { Button } from "@/components/ui/Button";

export interface EmptyStateCardProps {
  title: string;
  description: string;
  actionText: string;
  onActionPress: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "info" | "warning";
}

export function EmptyStateCard({
  title,
  description,
  actionText,
  onActionPress,
  icon,
  style,
  variant = "info",
}: EmptyStateCardProps) {
  const { styles, theme } = useStyles(stylesheet, { variant });

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Button
        onPress={onActionPress}
        variant="outline"
        size="md"
        style={styles.actionButton}
        accessibilityLabel={actionText}
        accessibilityHint="Opens web app for management tasks"
      >
        {actionText}
      </Button>
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.lg,
    ...theme.shadows.sm,
    variants: {
      variant: {
        default: {
          borderColor: theme.colors.border,
        },
        info: {
          borderColor: theme.colors.primary + "40",
          backgroundColor: theme.colors.primary + "05",
        },
        warning: {
          borderColor: theme.colors.warning + "40",
          backgroundColor: theme.colors.warning + "05",
        },
      },
    },
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.borderLight,
  },
  content: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    minWidth: 160,
  },
}));