import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";

/**
 * Theme toggle button component
 * Switches between light and dark mode
 * Uses ThemeContext for theming
 */
export function ThemeToggle() {
  const { theme, colors, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.container, { backgroundColor: colors.surface }]}
      accessible={true}
      accessibilityLabel="Toggle theme"
      accessibilityRole="button"
      accessibilityHint={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <Ionicons
        name={theme === "light" ? "sunny" : "moon"}
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
