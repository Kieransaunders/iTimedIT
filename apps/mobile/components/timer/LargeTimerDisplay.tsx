import { useTheme } from "@/utils/ThemeContext";
import { calculateBudgetStatus, formatBudgetRemaining } from "@/utils/budget";
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react-native";

export interface LargeTimerDisplayProps {
  elapsedTime: number; // in seconds
  project: any;
  isRunning: boolean;
  isNearBudget?: boolean;
  isOverBudget?: boolean;
  startedAt?: number; // Timestamp when timer started
}

/**
 * Large centered timer display - hero element of the dashboard
 * Matches web app's massive centered timer design with enhanced animations
 */
export function LargeTimerDisplay({
  elapsedTime,
  project,
  isRunning,
  isNearBudget = false,
  isOverBudget = false,
  startedAt,
}: LargeTimerDisplayProps) {
  const { colors } = useTheme();

  // Calculate budget status from actual project data
  const budgetInfo = calculateBudgetStatus(project);
  const actualIsNearBudget = budgetInfo.isNearBudget || isNearBudget;
  const actualIsOverBudget = budgetInfo.isOverBudget || isOverBudget;

  // Animated values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const warningPulse = useRef(new Animated.Value(1)).current;

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

  // Determine timer color based on budget status and client/project color
  const getTimerColor = () => {
    if (actualIsOverBudget) return "#ef4444"; // red
    if (actualIsNearBudget) return "#f59e0b"; // amber
    // Use client color if available, otherwise project color, fallback to purple
    if (project?.client?.color) return project.client.color;
    if (project?.color) return project.color;
    return "#a855f7"; // fallback purple
  };

  // Adaptive font size based on screen width
  const getAdaptiveFontSize = () => {
    const screenWidth = Dimensions.get("window").width;
    if (screenWidth < 375) {
      return 100; // Small phones
    } else if (screenWidth < 414) {
      return 110; // Medium phones
    } else {
      return 120; // Large phones and tablets
    }
  };

  // Pulsing glow effect when running
  useEffect(() => {
    if (isRunning) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRunning, pulseAnim]);

  // Budget warning pulse (faster pulse for warning badge)
  useEffect(() => {
    if ((actualIsNearBudget || actualIsOverBudget) && isRunning) {
      const budgetPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(warningPulse, {
            toValue: 1.1,
            duration: actualIsOverBudget ? 400 : 600,
            useNativeDriver: true,
          }),
          Animated.timing(warningPulse, {
            toValue: 1,
            duration: actualIsOverBudget ? 400 : 600,
            useNativeDriver: true,
          }),
        ])
      );
      budgetPulse.start();
      return () => budgetPulse.stop();
    } else {
      warningPulse.setValue(1);
    }
  }, [actualIsNearBudget, actualIsOverBudget, isRunning, warningPulse]);

  // Get the appropriate monospace font
  const getMonospaceFont = () => {
    if (Platform.OS === "ios") {
      return "Menlo-Regular"; // SF Mono alternative for iOS
    } else {
      return "monospace"; // System monospace for Android
    }
  };

  const fontSize = getAdaptiveFontSize();

  // Format started time as HH:MM
  const formatStartTime = (timestamp?: number): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Use the budget utilities for consistent budget display
  const budgetRemainingText = formatBudgetRemaining(project);

  return (
    <View style={styles.container}>
      {/* Main Timer Display */}
      <Animated.Text
        style={[
          styles.timer,
          {
            fontSize: fontSize,
            fontFamily: getMonospaceFont(),
            color: getTimerColor(),
            opacity: pulseAnim,
            textShadowColor: getTimerColor(),
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: isRunning ? 20 : 10,
          },
        ]}
      >
        {formatTime(elapsedTime)}
      </Animated.Text>

      {/* Project and Client Name */}
      {project && (
        <View style={styles.projectInfo}>
          <Text style={[styles.projectName, { color: colors.textPrimary }]}>
            {project.name}
          </Text>
          {project.client && (
            <Text style={[styles.clientName, { color: colors.textSecondary }]}>
              {project.client.name}
            </Text>
          )}
        </View>
      )}

      {/* Started Time - Only show when timer is running */}
      {isRunning && startedAt && (
        <Text style={[styles.startedText, { color: colors.textSecondary }]}>
          Started: {formatStartTime(startedAt)}
        </Text>
      )}

      {/* Budget Warning Badge - Show when approaching or over budget */}
      {budgetInfo.status !== "none" && budgetInfo.status !== "safe" && (
        <Animated.View
          style={[
            styles.budgetWarningBadge,
            {
              backgroundColor: budgetInfo.warningColor,
              transform: [{ scale: warningPulse }],
            },
          ]}
        >
          <AlertCircle size={16} color="#ffffff" />
          <Text style={styles.budgetWarningText}>
            {actualIsOverBudget ? "Over Budget" : "Budget Warning"}
          </Text>
          <Text style={styles.budgetRemainingText}>
            {budgetRemainingText}
          </Text>
        </Animated.View>
      )}

      {/* Budget Progress - Show percentage when running and has budget */}
      {isRunning && budgetInfo.status !== "none" && (
        <View style={styles.budgetProgressContainer}>
          <View style={styles.budgetProgressBar}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${Math.min(budgetInfo.usagePercent, 100)}%`,
                  backgroundColor: budgetInfo.warningColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.budgetPercentText, { color: colors.textSecondary }]}>
            {budgetInfo.usagePercent.toFixed(0)}% used
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  timer: {
    fontWeight: "700",
    letterSpacing: -2,
    textAlign: "center",
    // Shadow for depth (iOS will use textShadow, Android might need elevation)
    ...Platform.select({
      ios: {
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
      android: {
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  projectInfo: {
    marginTop: 16,
    alignItems: "center",
  },
  projectName: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  clientName: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  startedText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  budgetWarningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  budgetWarningText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  budgetRemainingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  budgetProgressContainer: {
    marginTop: 16,
    width: "80%",
    alignItems: "center",
  },
  budgetProgressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  budgetProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  budgetPercentText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});
