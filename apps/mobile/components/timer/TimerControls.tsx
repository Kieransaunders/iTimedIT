import { Button } from "@/components/ui/Button";
import { spacing } from "@/utils/theme";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Timer control buttons component
 * Shows Start button when timer is not running, Reset button when running
 */
export function TimerControls({
  isRunning,
  onStart,
  onStop,
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
          accessibilityLabel="Start timer"
          accessibilityHint="Starts tracking time for the selected project"
        >
          Start
        </Button>
      ) : (
        <Button
          onPress={onStop}
          variant="secondary"
          loading={loading}
          size="lg"
          fullWidth
          accessibilityLabel="Stop timer"
          accessibilityHint="Stops the running timer and saves the time entry"
        >
          Reset
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
