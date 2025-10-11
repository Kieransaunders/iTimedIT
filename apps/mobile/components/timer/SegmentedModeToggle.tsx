import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing } from "@/utils/theme";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface SegmentedModeToggleProps {
  mode: "normal" | "pomodoro";
  onModeChange: (mode: "normal" | "pomodoro") => void;
  disabled?: boolean;
}

/**
 * Segmented control for timer mode selection
 * Matches web app's sleek segmented toggle design with sliding indicator
 */
export function SegmentedModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: SegmentedModeToggleProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.segment,
          mode === "normal" && {
            backgroundColor: colors.surfaceElevated,
          },
        ]}
        onPress={() => !disabled && onModeChange("normal")}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.segmentText,
            {
              color: mode === "normal" ? colors.textPrimary : colors.textSecondary,
              fontWeight: mode === "normal" ? "600" : "400",
            },
          ]}
        >
          Normal
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        style={[
          styles.segment,
          mode === "pomodoro" && {
            backgroundColor: colors.surfaceElevated,
          },
        ]}
        onPress={() => !disabled && onModeChange("pomodoro")}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.segmentText,
            {
              color:
                mode === "pomodoro" ? colors.textPrimary : colors.textSecondary,
              fontWeight: mode === "pomodoro" ? "600" : "400",
            },
          ]}
        >
          Pomodoro
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 4,
    marginHorizontal: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 16,
  },
  divider: {
    width: 1,
    marginVertical: spacing.xs,
  },
});
