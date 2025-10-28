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
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock } from "lucide-react-native";

export interface LargeTimerDisplayProps {
  elapsedTime: number; // in seconds
  project: any;
  isRunning: boolean;
  isNearBudget?: boolean;
  isOverBudget?: boolean;
  startedAt?: number; // Timestamp when timer started
  nextInterruptAt?: number; // Timestamp for next interrupt
  pomodoroPhase?: "work" | "break"; // Current Pomodoro phase
  pomodoroWorkDuration?: number; // Pomodoro work duration in minutes
  pomodoroBreakDuration?: number; // Pomodoro break duration in minutes
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
  nextInterruptAt,
  pomodoroPhase,
  pomodoroWorkDuration = 25,
  pomodoroBreakDuration = 5,
}: LargeTimerDisplayProps) {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Calculate budget status from actual project data including current elapsed time
  // When timer is running, add current elapsed time to the project's total
  const projectWithCurrentTime = project && isRunning ? {
    ...project,
    totalSeconds: (project.totalSeconds || 0) + elapsedTime
  } : project;

  const budgetInfo = calculateBudgetStatus(projectWithCurrentTime);
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

  // Update current time every minute for time remaining display
  useEffect(() => {
    if (!isRunning) return;

    const updateTime = () => setCurrentTime(Date.now());

    // Update immediately
    updateTime();

    // Then update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Calculate time remaining based on context
  const calculateTimeRemaining = (): { label: string; time: string } | null => {
    if (!isRunning) return null;

    // For Pomodoro mode
    if (pomodoroPhase) {
      const phaseStarted = startedAt || Date.now();
      const phaseDuration = pomodoroPhase === "work"
        ? pomodoroWorkDuration * 60 * 1000
        : pomodoroBreakDuration * 60 * 1000;
      const phaseEnd = phaseStarted + phaseDuration;
      const remaining = Math.max(0, phaseEnd - currentTime);

      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return {
          label: pomodoroPhase === "work" ? "Work time left" : "Break time left",
          time: `${minutes}:${seconds.toString().padStart(2, "0")}`
        };
      }
    }

    // For interrupt intervals
    if (nextInterruptAt) {
      const remaining = Math.max(0, nextInterruptAt - currentTime);

      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        // Only show if more than 1 minute remaining
        if (minutes > 0) {
          return {
            label: "Next check-in",
            time: `${minutes}:${seconds.toString().padStart(2, "0")}`
          };
        }
      }
    }

    // For budget time remaining - use the budget info calculated with current time
    if (budgetInfo.status !== "none" && budgetInfo.totalBudget > 0) {
      const remainingBudget = budgetInfo.totalBudget - budgetInfo.totalUsed;

      if (remainingBudget > 0) {
        // For hours budget
        if (project?.budgetType === "hours") {
          const hours = Math.floor(remainingBudget);
          const minutes = Math.floor((remainingBudget % 1) * 60);

          if (hours > 0) {
            return {
              label: "Budget remaining",
              time: `${hours}h ${minutes}m`
            };
          } else if (minutes > 0) {
            return {
              label: "Budget remaining",
              time: `${minutes}m`
            };
          }
        } else if (project?.budgetType === "amount") {
          // For amount budget
          return {
            label: "Budget remaining",
            time: `$${remainingBudget.toFixed(0)}`
          };
        }
      }
    }

    return null;
  };

  const timeRemaining = calculateTimeRemaining();

  // Use the budget utilities for consistent budget display
  // Pass current elapsed time for real-time budget countdown
  const budgetRemainingText = formatBudgetRemaining(
    project,
    isRunning ? elapsedTime : 0
  );

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

      {/* Timer Info Section - Show started time and time remaining */}
      {isRunning && (
        <View style={styles.timerInfoContainer}>
          {/* Started Time */}
          {startedAt && (
            <View style={styles.timerInfoItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.timerInfoLabel, { color: colors.textSecondary }]}>
                Started
              </Text>
              <Text style={[styles.timerInfoValue, { color: colors.textPrimary }]}>
                {formatStartTime(startedAt)}
              </Text>
            </View>
          )}

          {/* Time Remaining */}
          {timeRemaining && (
            <View style={styles.timerInfoItem}>
              <AlertCircle size={14} color={colors.textSecondary} />
              <Text style={[styles.timerInfoLabel, { color: colors.textSecondary }]}>
                {timeRemaining.label}
              </Text>
              <Text style={[styles.timerInfoValue, { color: colors.textPrimary }]}>
                {timeRemaining.time}
              </Text>
            </View>
          )}
        </View>
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
    paddingVertical: 20,
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
    marginTop: 12,
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
  timerInfoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 20,
  },
  timerInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerInfoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  timerInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "Menlo-Regular",
      android: "monospace",
    }),
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
