import { borderRadius, colors, shadows, spacing, typography } from "@/utils/theme";
import { useMutation, useQuery } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";

/**
 * Global Interrupt Banner
 *
 * Displays at the top of the screen (iOS notification style) when a timer
 * interrupt is triggered. Appears on ALL screens, not just the timer screen.
 *
 * Features:
 * - Top-positioned banner that pushes content down
 * - Static message: "Still working on [Project Name]?"
 * - Two actions: Continue (primary) and Stop (secondary)
 * - Shows brief confirmation after Continue is pressed
 */
export function InterruptBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const runningTimer = useQuery(api.timer.getRunningTimer);
  const acknowledgeInterrupt = useMutation(api.timer.ackInterrupt);

  const [confirmationType, setConfirmationType] = useState<"continue" | "stop" | null>(null);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isInterruptActive = runningTimer?.awaitingInterruptAck && !confirmationType;

  useEffect(() => {
    if (isInterruptActive) {
      // Show banner with slide-down animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isInterruptActive && !confirmationType) {
      // Hide banner with slide-up animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -200,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isInterruptActive, confirmationType]);

  const handleContinue = async () => {
    try {
      await acknowledgeInterrupt({ continue: true });

      // Show confirmation
      setConfirmationType("continue");

      // Hide confirmation after 2 seconds
      setTimeout(() => {
        setConfirmationType(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to acknowledge interrupt:", error);
      // Still hide on error to avoid stuck state
      setConfirmationType(null);
    }
  };

  const handleStop = async () => {
    try {
      await acknowledgeInterrupt({ continue: false });

      // Show confirmation
      setConfirmationType("stop");

      // Navigate to Timer tab after 2 seconds
      setTimeout(() => {
        setConfirmationType(null);
        router.push("/(tabs)");
      }, 2000);
    } catch (error) {
      console.error("Failed to stop timer:", error);
      // Still navigate on error
      setConfirmationType(null);
      router.push("/(tabs)");
    }
  };

  // Don't render if no interrupt and no confirmation
  if (!isInterruptActive && !confirmationType) {
    return null;
  }

  const projectName = runningTimer?.project?.name || "this project";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {confirmationType ? (
        // Confirmation state
        <View style={styles.content}>
          <View style={styles.confirmationContainer}>
            {confirmationType === "continue" ? (
              <Text style={styles.continueConfirmationText}>✓ Timer continued!</Text>
            ) : (
              <Text style={styles.stopConfirmationText}>✓ Timer stopped!</Text>
            )}
          </View>
        </View>
      ) : (
        // Interrupt prompt state
        <View style={styles.content}>
          <View style={styles.messageContainer}>
            <Text style={styles.projectName}>{projectName}</Text>
            <Text style={styles.message}>Still working on this?</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={handleContinue}
              activeOpacity={0.7}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  projectName: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937", // Dark text on warning background
    marginBottom: 2,
  },
  message: {
    ...typography.body,
    fontSize: 15,
    color: "#374151", // Slightly lighter than projectName
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  continueButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  stopButton: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
  },
  stopButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  confirmationContainer: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  continueConfirmationText: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "600",
    color: colors.success,
  },
  stopConfirmationText: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280", // Gray - neutral confirmation
  },
});
