import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { storage } from "@/services/storage";
import Constants from "expo-constants";

export interface WebAppPromptProps {
  message: string;
  actionText: string;
  onOpenWebApp?: () => void;
  variant?: "info" | "warning" | "success";
  style?: StyleProp<ViewStyle>;
  dismissible?: boolean;
  persistDismissal?: boolean;
  dismissalKey?: string;
}

const WEB_APP_URL =
  Constants.expoConfig?.extra?.webAppUrl ||
  process.env.EXPO_PUBLIC_WEB_APP_URL ||
  "https://itimedit.com";

export function WebAppPrompt({
  message,
  actionText,
  onOpenWebApp,
  variant = "info",
  style,
  dismissible = true,
  persistDismissal = false,
  dismissalKey,
}: WebAppPromptProps) {
  const { styles, theme } = useStyles(stylesheet, { variant });
  const [isDismissed, setIsDismissed] = useState(false);

  const handleOpenWebApp = async () => {
    try {
      const url = WEB_APP_URL;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        onOpenWebApp?.();
      } else {
        Alert.alert(
          "Cannot Open Web App",
          "Unable to open the web app. Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Failed to open web app:", error);
      Alert.alert(
        "Error",
        "Failed to open the web app. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleDismiss = async () => {
    setIsDismissed(true);
    
    if (persistDismissal && dismissalKey) {
      try {
        await storage.setItem(`dismissed_prompt_${dismissalKey}`, "true");
      } catch (error) {
        console.error("Failed to persist dismissal:", error);
      }
    }
  };

  // Check if prompt was previously dismissed
  React.useEffect(() => {
    const checkDismissalStatus = async () => {
      if (persistDismissal && dismissalKey) {
        try {
          const dismissed = await storage.getItem(`dismissed_prompt_${dismissalKey}`);
          if (dismissed === "true") {
            setIsDismissed(true);
          }
        } catch (error) {
          console.error("Failed to check dismissal status:", error);
        }
      }
    };

    checkDismissalStatus();
  }, [persistDismissal, dismissalKey]);

  if (isDismissed) {
    return null;
  }

  const getVariantIcon = () => {
    switch (variant) {
      case "info":
        return "ℹ️";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>{getVariantIcon()}</Text>
          {dismissible && (
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.dismissButton}
              accessible={true}
              accessibilityLabel="Dismiss prompt"
              accessibilityRole="button"
            >
              <Text style={styles.dismissButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.message}>{message}</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleOpenWebApp}
          accessible={true}
          accessibilityLabel={actionText}
          accessibilityRole="button"
          accessibilityHint="Opens the web app in your browser"
        >
          <Text style={styles.actionButtonText}>{actionText}</Text>
          <Text style={styles.externalIcon}>↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Utility function to create web app deep links
export function createWebAppLink(path: string = ""): string {
  const baseUrl = WEB_APP_URL;
  return path ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}` : baseUrl;
}

// Utility function to open web app with specific path
export async function openWebApp(path?: string): Promise<void> {
  try {
    const url = createWebAppLink(path);
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error("Cannot open URL");
    }
  } catch (error) {
    console.error("Failed to open web app:", error);
    Alert.alert(
      "Cannot Open Web App",
      "Unable to open the web app. Please check your internet connection and try again.",
      [{ text: "OK" }]
    );
  }
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    variants: {
      variant: {
        info: {
          backgroundColor: theme.colors.primary + "10",
          borderColor: theme.colors.primary + "30",
        },
        warning: {
          backgroundColor: theme.colors.warning + "10",
          borderColor: theme.colors.warning + "30",
        },
        success: {
          backgroundColor: theme.colors.success + "10",
          borderColor: theme.colors.success + "30",
        },
      },
    },
  },
  content: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 16,
  },
  dismissButton: {
    padding: theme.spacing.xs,
    minWidth: theme.sizing.minTouchTarget / 2,
    minHeight: theme.sizing.minTouchTarget / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
    minHeight: theme.sizing.minTouchTarget,
    variants: {
      variant: {
        info: {
          borderColor: theme.colors.primary,
        },
        warning: {
          borderColor: theme.colors.warning,
        },
        success: {
          borderColor: theme.colors.success,
        },
      },
    },
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    variants: {
      variant: {
        info: {
          color: theme.colors.primary,
        },
        warning: {
          color: theme.colors.warning,
        },
        success: {
          color: theme.colors.success,
        },
      },
    },
  },
  externalIcon: {
    fontSize: 12,
    variants: {
      variant: {
        info: {
          color: theme.colors.primary,
        },
        warning: {
          color: theme.colors.warning,
        },
        success: {
          color: theme.colors.success,
        },
      },
    },
  },
}));