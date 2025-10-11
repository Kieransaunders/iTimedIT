import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyleSheet, useStyles } from "react-native-unistyles";

/**
 * Theme toggle button component
 * Switches between light and dark mode
 * Uses Unistyles for theming
 */
export function ThemeToggle() {
  const { styles, theme } = useStyles(stylesheet);

  const handleToggle = () => {
    theme.setTheme(theme.name === "light" ? "dark" : "light");
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      style={styles.container}
      accessible={true}
      accessibilityLabel="Toggle theme"
      accessibilityRole="button"
      accessibilityHint={`Switch to ${theme.name === "light" ? "dark" : "light"} mode`}
    >
      <Ionicons
        name={theme.name === "light" ? "sunny" : "moon"}
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
}));
