import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/utils/ThemeContext";
import { spacing, borderRadius } from "@/utils/theme";

interface WebTimerBadgeProps {
  visible: boolean;
}

/**
 * Badge component that indicates when a timer was started from the web app
 * Shows a subtle indicator with an icon and text
 */
export function WebTimerBadge({ visible }: WebTimerBadgeProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary + "15", // 15% opacity
          borderColor: colors.primary + "30", // 30% opacity
        },
      ]}
    >
      <MaterialCommunityIcons name="monitor" size={16} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>
        Started from Web
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
