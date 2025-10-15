import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing, typography } from "@/utils/theme";

export interface WebRedirectBannerProps {
  message: string;
  targetPath?: string;
  buttonText?: string;
  showLearnMore?: boolean;
  variant?: "info" | "primary";
}

/**
 * WebRedirectBanner component
 * Displays a banner with a message encouraging users to use the web app
 * for management tasks, with a button to open the web app in their browser
 */
export function WebRedirectBanner({
  message,
  targetPath = "",
  buttonText = "Open Web App",
  showLearnMore = false,
  variant = "info",
}: WebRedirectBannerProps) {
  const { colors } = useTheme();
  const webAppUrl = "https://itimedit.com";
  const fullUrl = targetPath ? `${webAppUrl}${targetPath}` : webAppUrl;

  const handleOpenWebApp = async () => {
    try {
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
      } else {
        console.error("Cannot open URL:", fullUrl);
      }
    } catch (error) {
      console.error("Failed to open web app:", error);
    }
  };

  const handleLearnMore = async () => {
    try {
      const canOpen = await Linking.canOpenURL(webAppUrl);
      if (canOpen) {
        await Linking.openURL(webAppUrl);
      }
    } catch (error) {
      console.error("Failed to open web app:", error);
    }
  };

  const backgroundColor = variant === "primary" ? colors.primary : colors.surface;
  const textColor = variant === "primary" ? "#FFFFFF" : colors.textPrimary;
  const iconColor = variant === "primary" ? "#FFFFFF" : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor, borderColor: colors.border }]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="monitor" size={24} color={iconColor} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              variant === "primary" ? styles.buttonSecondary : styles.buttonPrimary,
              { borderColor: variant === "primary" ? "#FFFFFF" : colors.primary },
            ]}
            onPress={handleOpenWebApp}
            accessible={true}
            accessibilityLabel={buttonText}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color={variant === "primary" ? "#FFFFFF" : colors.primary}
            />
            <Text
              style={[
                styles.buttonText,
                { color: variant === "primary" ? "#FFFFFF" : colors.primary },
              ]}
            >
              {buttonText}
            </Text>
          </TouchableOpacity>

          {showLearnMore && (
            <TouchableOpacity
              onPress={handleLearnMore}
              accessible={true}
              accessibilityLabel="Learn more"
              accessibilityRole="button"
            >
              <Text style={[styles.learnMoreText, { color: textColor }]}>Learn More</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconContainer: {
    paddingTop: spacing.xs,
  },
  content: {
    flex: 1,
    gap: spacing.md,
  },
  message: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  buttonPrimary: {
    // borderColor set dynamically
  },
  buttonSecondary: {
    // borderColor set dynamically
  },
  buttonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
  },
  learnMoreText: {
    ...typography.body,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
