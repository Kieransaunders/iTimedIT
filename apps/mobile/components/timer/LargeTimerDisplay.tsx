import { useTheme } from "@/utils/ThemeContext";
import { StyleSheet, Text, View } from "react-native";
import React from "react";

export interface LargeTimerDisplayProps {
  elapsedTime: number; // in seconds
  project: any;
  isRunning: boolean;
  isNearBudget?: boolean;
  isOverBudget?: boolean;
}

/**
 * Large centered timer display - hero element of the dashboard
 * Matches web app's massive centered timer design
 */
export function LargeTimerDisplay({
  elapsedTime,
  project,
  isRunning,
  isNearBudget = false,
  isOverBudget = false,
}: LargeTimerDisplayProps) {
  const { colors } = useTheme();

  // Format time as HH:MM:SS or MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine timer color based on client/project color (matching web app)
  const getTimerColor = () => {
    if (isOverBudget) return "#ef4444"; // red
    if (isNearBudget) return "#f59e0b"; // amber
    // Use project color if available, fallback to purple
    if (project?.color) return project.color;
    return "#a855f7"; // fallback purple
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.timer,
          {
            color: getTimerColor(),
          },
          isNearBudget && styles.pulse,
        ]}
      >
        {formatTime(elapsedTime)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  timer: {
    fontSize: 80, // Massive font size
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: -2,
    textAlign: "center",
  },
  pulse: {
    // Pulse animation would be added via Animated API if needed
    opacity: 0.9,
  },
});
