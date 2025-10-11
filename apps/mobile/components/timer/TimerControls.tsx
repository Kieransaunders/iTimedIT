import { Button } from "@/components/ui/Button";
import { spacing } from "@/utils/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  loading?: boolean;
  projectColor?: string;
}

/**
 * Timer control buttons component
 * Shows Start and Reset buttons side by side (matching web app)
 */
export function TimerControls({
  isRunning,
  onStart,
  onStop,
  onReset,
  disabled = false,
  loading = false,
  projectColor = "#a855f7",
}: TimerControlsProps) {
  const startButtonStyle = projectColor
    ? [styles.startButton, { backgroundColor: projectColor }]
    : styles.startButton;

  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        {!isRunning ? (
          <Button
            onPress={onStart}
            disabled={disabled}
            loading={loading}
            size="lg"
            style={startButtonStyle}
            icon={(props) => <MaterialCommunityIcons name="play" {...props} />}
            accessibilityLabel="Start timer"
            accessibilityHint="Starts tracking time for the selected project"
          >
            Start
          </Button>
        ) : (
          <Button
            onPress={onStop}
            loading={loading}
            size="lg"
            style={startButtonStyle}
            icon={(props) => <MaterialCommunityIcons name="stop" {...props} />}
            accessibilityLabel="Stop timer"
            accessibilityHint="Stops the running timer and saves the time entry"
          >
            Stop
          </Button>
        )}
        <Button
          onPress={onReset}
          variant="secondary"
          size="lg"
          style={styles.resetButton}
          accessibilityLabel="Reset timer"
          accessibilityHint="Resets the current timer without saving an entry"
        >
          Reset
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  startButton: {
    flex: 1,
  },
  resetButton: {
    minWidth: 100,
  },
});
