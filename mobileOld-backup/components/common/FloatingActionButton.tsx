import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  View,
} from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, shadows, spacing } from "@/utils/theme";
import { mediumTap } from "@/utils/haptics";

export interface FloatingActionButtonProps {
  onPress: () => void;
  bottom?: number;
}

/**
 * Floating Action Button (FAB) - Material Design style button
 * Positioned at bottom right of screen
 */
export function FloatingActionButton({ onPress, bottom = 80 }: FloatingActionButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    mediumTap();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.fab,
        {
          backgroundColor: colors.primary,
          bottom,
        },
        Platform.OS === "ios" ? shadows.lg : { elevation: 8 },
      ]}
      accessible={true}
      accessibilityLabel="Create new project or client"
      accessibilityRole="button"
      accessibilityHint="Opens menu to create a new project or client"
    >
      <Plus size={28} color="#ffffff" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
