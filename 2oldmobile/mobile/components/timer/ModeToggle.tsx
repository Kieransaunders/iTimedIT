import { borderRadius, colors, spacing } from "@/utils/theme";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface ModeToggleProps {
  mode: "normal" | "pomodoro";
  onModeChange: (mode: "normal" | "pomodoro") => void;
  disabled?: boolean;
}

/**
 * Toggle component for switching between Normal and Pomodoro timer modes
 */
export function ModeToggle({ mode, onModeChange, disabled = false }: ModeToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.leftButton,
          mode === "normal" && styles.activeButton,
          disabled && styles.disabledButton,
        ]}
        onPress={() => onModeChange("normal")}
        disabled={disabled}
        accessibilityLabel="Normal mode"
        accessibilityRole="button"
        accessibilityState={{ selected: mode === "normal", disabled }}
      >
        <Text
          style={[
            styles.buttonText,
            mode === "normal" && styles.activeButtonText,
          ]}
        >
          Normal
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          styles.rightButton,
          mode === "pomodoro" && styles.activeButton,
          disabled && styles.disabledButton,
        ]}
        onPress={() => onModeChange("pomodoro")}
        disabled={disabled}
        accessibilityLabel="Pomodoro mode"
        accessibilityRole="button"
        accessibilityState={{ selected: mode === "pomodoro", disabled }}
      >
        <Text
          style={[
            styles.buttonText,
            mode === "pomodoro" && styles.activeButtonText,
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
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  leftButton: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    borderRightWidth: 1,
  },
  rightButton: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderLeftWidth: 1,
  },
  activeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  activeButtonText: {
    color: colors.textPrimary,
  },
});
