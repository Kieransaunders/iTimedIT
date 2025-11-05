import { Project } from "@/types/models";
import {
  animations,
  borderRadius,
  opacity,
  shadows,
  spacing,
  typography,
} from "@/utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import { calculateBudgetStatus, formatBudgetRemaining, getBudgetProgressPercent } from "@/utils/budget";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
} from "react-native";
import { AlertCircle, Play } from "lucide-react-native";
import { lightTap, mediumTap } from "@/utils/haptics";

export interface ProjectCardProps {
  /** Project data with name, client, color, hourlyRate */
  project: Project;
  /** Whether this project card is currently active/selected */
  isActive?: boolean;
  /** Callback when card is pressed */
  onPress?: (project: Project) => void;
  /** Today's accumulated time in seconds (optional) */
  todaysTime?: number;
  /** Callback for quick start button */
  onQuickStart?: (project: Project) => void;
  /** Callback for long press - shows quick action menu */
  onLongPress?: (project: Project) => void;
  /** Callback to toggle favorite status */
  onToggleFavorite?: (projectId: string) => Promise<void>;
  /** Whether this project is favorited */
  isFavorite?: boolean;
  /** Whether timer is currently running (globally) */
  isTimerRunning?: boolean;
}

/**
 * ProjectCard - Mobile-optimized project selection card
 *
 * Features:
 * - 280px fixed width for horizontal scrolling
 * - 4px colored left border matching project color
 * - Subtle gradient background (10% opacity of project color)
 * - Displays: Project name, client name, hourly rate
 * - Shows "Today: Xh Ym" if todaysTime is provided
 * - Active state: elevated shadow + subtle scale effect
 * - Smooth press animation with proper feedback
 * - Full accessibility support
 */
export function ProjectCard({
  project,
  isActive = false,
  onPress,
  todaysTime,
  onQuickStart,
  onLongPress,
  isTimerRunning = false,
}: ProjectCardProps) {
  const { colors } = useTheme();
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Use client color if available, otherwise project color, fallback to primary
  const projectColor = project.client?.color || project.color || colors.primary;

  // Calculate budget status
  const budgetInfo = calculateBudgetStatus(project);
  const shouldPulse = budgetInfo.status === "warning" || budgetInfo.status === "critical";

  // Pulse animation for budget warnings
  useEffect(() => {
    if (shouldPulse) {
      // Continuous pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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

      // Continuous glow animation
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );

      pulse.start();
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [shouldPulse, pulseAnim, glowAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(animatedScale, {
      toValue: 0.96, // Slightly more pronounced
      useNativeDriver: true,
      friction: 10,
      tension: 120,
    }).start();
  }, [animatedScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(animatedScale, {
      toValue: isActive ? 1.02 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [animatedScale, isActive]);

  const handlePress = useCallback(() => {
    // Use stronger haptic feedback when starting timer
    if (onQuickStart) {
      mediumTap(); // Stronger feedback for timer start
      onQuickStart(project);
    } else if (onPress) {
      lightTap(); // Lighter feedback for selection only
      onPress(project);
    }
  }, [onPress, onQuickStart, project]);

  const handleLongPress = useCallback(() => {
    mediumTap();
    if (onLongPress) {
      onLongPress(project);
    }
  }, [onLongPress, project]);

  // Format today's time as "Xh Ym"
  const formatTodaysTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(0)}`;
  };

  // Calculate today's earnings
  const calculateTodaysEarnings = (): number => {
    if (!todaysTime || todaysTime === 0) return 0;
    const hours = todaysTime / 3600;
    return hours * project.hourlyRate;
  };

  // Animated glow color for budget warnings
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", budgetInfo.warningColor + "40"], // 40 = 25% opacity
  });

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface, // White in light mode, grey in dark mode
      borderColor: colors.border,
      borderLeftColor: projectColor,
    },
    isActive && styles.cardActive,
    // Enhanced shadow for active card
    isActive && Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
    // Dim non-active cards when timer is running
    isTimerRunning && !isActive && { opacity: 0.6 },
  ];

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      {/* Glow effect for budget warnings */}
      {shouldPulse && (
        <Animated.View
          style={[
            styles.glowContainer,
            {
              shadowColor: budgetInfo.warningColor,
              shadowOpacity: glowAnim,
            },
          ]}
        />
      )}
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={cardStyle}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${project.name}, ${project.client?.name || "No client"}, ${formatCurrency(project.hourlyRate)} per hour${todaysTime ? `, ${formatTodaysTime(todaysTime)} worked today` : ""}`}
        accessibilityState={{ selected: isActive }}
        accessibilityHint="Tap to select this project. Long press for quick actions"
      >
        {/* Running Badge - Top Left (when timer is active for this project) */}
        {isActive && isTimerRunning && (
          <View style={[styles.runningBadge, { backgroundColor: projectColor }]}>
            <Text style={styles.runningBadgeText}>⏱️ Running</Text>
          </View>
        )}

        {/* Project Name & Client Name - Unified on one line */}
        <View style={styles.titleRow}>
          <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>
            {project.name}
            {project.client && (
              <Text style={[styles.clientNameInline, { color: colors.textSecondary }]}>
                {" · " + project.client.name}
              </Text>
            )}
          </Text>
        </View>

        {/* Today's Time and Earnings - Prominent Display */}
        {todaysTime !== undefined && todaysTime > 0 && (
          <View style={styles.todaysStatsContainer}>
            <Text style={[styles.todaysTimeDisplay, { color: projectColor }]}>
              Today: {formatTodaysTime(todaysTime)}
            </Text>
          </View>
        )}

        {/* Footer: Hourly Rate + Today's Earnings */}
        <View style={styles.footer}>
          <Text style={[styles.hourlyRate, { color: colors.textSecondary }]}>
            {formatCurrency(project.hourlyRate)}/hr
          </Text>
          {todaysTime !== undefined && todaysTime > 0 && (
            <Text style={[styles.todaysEarnings, { color: projectColor }]}>
              {formatCurrency(calculateTodaysEarnings())}
            </Text>
          )}
        </View>

        {/* Budget Warning Badge (if warning or critical) */}
        {budgetInfo.status !== "none" && budgetInfo.status !== "safe" && (
          <View style={[styles.budgetBadge, { backgroundColor: budgetInfo.warningColor }]}>
            <AlertCircle size={12} color="#ffffff" />
            <Text style={styles.budgetBadgeText}>
              {formatBudgetRemaining(project)}
            </Text>
          </View>
        )}

        {/* Spacer to push budget to bottom */}
        <View style={styles.spacer} />

        {/* Budget Progress Bar with Context - At Bottom */}
        {budgetInfo.status !== "none" && (
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
                Budget
              </Text>
              <Text style={[styles.budgetPercentage, { color: budgetInfo.warningColor }]}>
                {Math.round(getBudgetProgressPercent(project))}%
              </Text>
            </View>
            <View style={styles.budgetBarContainer}>
              <View
                style={[
                  styles.budgetBar,
                  {
                    width: `${getBudgetProgressPercent(project)}%`,
                    backgroundColor: budgetInfo.warningColor,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Play Icon Overlay - Only show when timer is not running */}
        {!isTimerRunning && onQuickStart && (
          <View style={styles.playIconContainer}>
            <View style={[styles.playIconCircle, { backgroundColor: projectColor }]}>
              <Play size={18} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300, // Increased from 280
    height: 150, // Reduced from 180 for more compact appearance
    borderRadius: borderRadius.lg, // Larger radius
    borderLeftWidth: 5, // Increased from 4 for more prominence
    borderWidth: 1,
    paddingHorizontal: 16, // Reduced from 20 for compactness
    paddingVertical: 14, // Reduced from 20 for compactness
    // Subtle drop shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  cardActive: {
    // Active card gets elevated shadow (handled inline)
    // Scale effect handled by Animated.Value
    transform: [{ scale: 1.02 }],
  },
  glowContainer: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: borderRadius.md,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  titleRow: {
    marginBottom: spacing.xs, // Reduced from sm
  },
  projectName: {
    fontSize: 18, // Reduced from 20 for compactness
    fontWeight: "700", // Bold but not ultra-bold (fixes blurriness)
    letterSpacing: -0.2, // Slightly looser for clarity
  },
  clientName: {
    fontSize: 14, // Increased from 13px
    fontWeight: "600", // Medium weight
    marginBottom: spacing.sm,
    opacity: 0.7, // Reduced from 0.8 for better contrast
  },
  clientNameInline: {
    fontSize: 14, // Reduced from 16 for compactness
    fontWeight: "600", // Medium weight
    opacity: 0.7, // Subtle but visible
  },
  todaysStatsContainer: {
    marginBottom: spacing.xs / 2, // Reduced spacing
  },
  todaysTimeDisplay: {
    fontSize: 14, // Reduced from 15
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs / 2, // Reduced spacing
    marginBottom: 0, // Remove bottom margin
  },
  spacer: {
    flex: 1, // Takes up remaining space to push budget to bottom
  },
  hourlyRate: {
    fontSize: 14, // Reduced from 17px - less prominent now
    fontWeight: "600", // Medium weight instead of bold
    letterSpacing: -0.1,
    opacity: 0.8,
    // Color set dynamically via inline style
  },
  todaysTime: {
    fontSize: 13,
    fontWeight: "600", // Increased weight
    opacity: 0.85,
  },
  todaysEarnings: {
    fontSize: 17, // Larger for prominence (earnings more important than rate)
    fontWeight: "700", // Bold
    letterSpacing: -0.2,
    // Color set dynamically via inline style
  },
  runningBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    zIndex: 10,
  },
  runningBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  budgetBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  budgetBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  budgetSection: {
    marginTop: spacing.xs, // Position at bottom
    marginBottom: 0,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs / 2,
  },
  budgetLabel: {
    fontSize: 11, // Reduced from 12
    fontWeight: "600",
    opacity: 0.8,
  },
  budgetPercentage: {
    fontSize: 12, // Reduced from 13
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  budgetBarContainer: {
    height: 6, // Reduced from 8px for compactness
    backgroundColor: "rgba(0,0,0,0.12)", // Increased from 0.08 for better contrast
    borderRadius: 3,
    overflow: "hidden",
  },
  budgetBar: {
    height: "100%",
    borderRadius: 3,
  },
  playIconContainer: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 5,
  },
  playIconCircle: {
    width: 36, // Reduced from 48 for smaller, more subtle appearance
    height: 36, // Reduced from 48
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Glassmorphism backdrop
  },
});
