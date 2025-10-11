import { Button } from "@/components/ui/Button";
import { spacing } from "@/utils/theme";
import { Play, Square, RotateCcw } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Timer control buttons component
 * Shows Start button when timer is not running, Stop and Reset buttons when running
 */
export function TimerControls({
  isRunning,
  onStart,
  onStop,
  onReset,
  disabled = false,
  loading = false,
}: TimerControlsProps) {
  return (
    <View style={styles.container}>
      {!isRunning ? (
        <Button
          onPress={onStart}
          disabled={disabled}
          loading={loading}
          size="lg"
          fullWidth
          icon={Play}
          accessibilityLabel="Start timer"
          accessibilityHint="Starts tracking time for the selected project"
        >
          Start
        </Button>
      ) : (
        <View style={styles.runningControlsContainer}>
          <Button
            onPress={onStop}
            variant="secondary"
            loading={loading}
            size="lg"
            style={styles.stopButton}
            icon={Square}
            accessibilityLabel="Stop timer"
            accessibilityHint="Stops the running timer and saves the time entry"
          >
            Stop
          </Button>
          <Button
            onPress={onReset}
            variant="ghost"
            size="md"
            icon={RotateCcw}
            accessibilityLabel="Reset timer"
            accessibilityHint="Resets the current timer without saving an entry"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  runningControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stopButton: {
    flex: 1,
  },
});
