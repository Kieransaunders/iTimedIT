import { Button } from "@/components/ui/Button";
import { spacing } from "@/utils/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface TimerControlsProps {
  isRunning: boolean;
  onStop: () => void;
  onReset: () => void;
  loading?: boolean;
  projectColor?: string;
}

/**
 * Timer control buttons component
 * Shows Stop and Reset buttons only when timer is running
 */
export function TimerControls({
  isRunning,
  onStop,
  onReset,
  loading = false,
}: TimerControlsProps) {
  // Don't render anything if timer isn't running
  if (!isRunning) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Primary Action Row - Stop button */}
      <View style={styles.primaryRow}>
        <Button
          onPress={onStop}
          loading={loading}
          size="lg"
          style={styles.stopButton}
          icon={(props: { size: number; color: string }) => <MaterialCommunityIcons name="square" size={props.size} color={props.color} />}
          accessibilityLabel="Stop timer"
          accessibilityHint="Stops the running timer and saves the time entry"
        >
          Stop
        </Button>
      </View>

      {/* Secondary Action Row - Reset */}
      <View style={styles.secondaryRow}>
        <Button
          onPress={onReset}
          variant="ghost"
          size="md"
          style={styles.resetButton}
          icon={(props: { size: number; color: string }) => <MaterialCommunityIcons name="refresh" size={props.size} color={props.color} />}
          accessibilityLabel="Reset timer"
          accessibilityHint="Resets the current timer without saving an entry"
        >
          {/* Empty children for ghost button with icon only */}
          {""}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  primaryRow: {
    width: "100%",
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButton: {
    width: "100%",
    backgroundColor: "#ef4444", // Red color matching web app
  },
  resetButton: {
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
});
