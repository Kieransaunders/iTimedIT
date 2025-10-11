import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Clock } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";

interface InterruptModalProps {
  visible: boolean;
  projectName: string;
  onContinue: () => void;
  onStop: () => void;
  gracePeriodSeconds?: number;
}

/**
 * Modal that appears when timer interrupt is triggered
 * Shows countdown and auto-stops if no action is taken
 */
export function InterruptModal({
  visible,
  projectName,
  onContinue,
  onStop,
  gracePeriodSeconds = 60, // Default 60 seconds like backend
}: InterruptModalProps) {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState(gracePeriodSeconds);

  useEffect(() => {
    if (!visible) {
      setCountdown(gracePeriodSeconds);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-stop when countdown reaches 0
          clearInterval(interval);
          onStop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, gracePeriodSeconds]);

  const progress = ((gracePeriodSeconds - countdown) / gracePeriodSeconds) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStop}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Clock size={64} color="#ef4444" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Still working on{" "}
            <Text style={styles.projectName}>{projectName}</Text>?
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            We noticed you've been working for a while. Are you still actively working on this project?
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
              Auto-stop in {countdown} seconds
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: countdown <= 10 ? "#ef4444" : "#f59e0b",
                  },
                ]}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onContinue}
              accessibilityLabel="Continue working"
            >
              <Text style={styles.continueButtonText}>Yes, Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={onStop}
              accessibilityLabel="Stop timer"
            >
              <Text style={styles.stopButtonText}>Stop Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 28,
  },
  projectName: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  countdownContainer: {
    marginBottom: 24,
  },
  countdownText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 1s linear",
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButton: {
    backgroundColor: "#22c55e",
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: "#ef4444",
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
