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
import { Star, Play, AlertCircle } from "lucide-react-native";
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
  /** Whether this project is favorited */
  isFavorite?: boolean;
  /** Callback when favorite star is tapped */
  onToggleFavorite?: (projectId: string) => void;
  /** Callback for quick start button */
  onQuickStart?: (project: Project) => void;
  /** Callback for long press - shows quick action menu */
  onLongPress?: (project: Project) => void;
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
  isFavorite = false,
  onToggleFavorite,
  onQuickStart,
  onLongPress,
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
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
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
    lightTap();
    if (onPress) {
      onPress(project);
    }
  }, [onPress, project]);

  const handleLongPress = useCallback(() => {
    mediumTap();
    if (onLongPress) {
      onLongPress(project);
    }
  }, [onLongPress, project]);

  const handleToggleFavorite = useCallback((e: any) => {
    // Stop event propagation to prevent card selection
    e?.stopPropagation?.();
    lightTap();
    if (onToggleFavorite) {
      onToggleFavorite(project._id);
    }
  }, [onToggleFavorite, project._id]);

  const handleQuickStart = useCallback((e: any) => {
    e?.stopPropagation?.();
    mediumTap();
    if (onQuickStart) {
      onQuickStart(project);
    }
  }, [onQuickStart, project]);

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

  // Generate subtle gradient background color (10% opacity)
  const getBackgroundGradientColor = (color: string): string => {
    // Convert hex to rgba with 10% opacity
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  };

  // Animated glow color for budget warnings
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", budgetInfo.warningColor + "40"], // 40 = 25% opacity
  });

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    isActive && styles.cardActive,
    {
      borderLeftColor: projectColor,
      backgroundColor: getBackgroundGradientColor(projectColor),
    },
    isActive && (Platform.OS === "ios" ? shadows.lg : { elevation: 8 }),
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
        {/* Favorite Star - Top Right */}
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.favoriteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              size={20}
              color={isFavorite ? "#f59e0b" : colors.textTertiary}
              fill={isFavorite ? "#f59e0b" : "transparent"}
            />
          </TouchableOpacity>
        )}

        {/* Project Name */}
        <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>
          {project.name}
        </Text>

        {/* Client Name */}
        {project.client && (
          <Text style={[styles.clientName, { color: colors.textSecondary }]} numberOfLines={1}>
            {project.client.name}
          </Text>
        )}

        {/* Footer: Hourly Rate + Today's Time */}
        <View style={styles.footer}>
          <Text style={[styles.hourlyRate, { color: projectColor }]}>
            {formatCurrency(project.hourlyRate)}/hr
          </Text>
          {todaysTime !== undefined && todaysTime > 0 && (
            <Text style={[styles.todaysTime, { color: colors.textSecondary }]}>
              Today: {formatTodaysTime(todaysTime)}
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

        {/* Budget Progress Bar */}
        {budgetInfo.status !== "none" && (
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
        )}

        {/* Quick Start Button */}
        {onQuickStart && (
          <TouchableOpacity
            onPress={handleQuickStart}
            style={[styles.quickStartButton, { backgroundColor: projectColor }]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Quick start timer for this project"
          >
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text style={styles.quickStartText}>Quick Start</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    padding: spacing.md,
    paddingTop: spacing.lg, // Extra space for favorite star
    ...Platform.select({
      ios: shadows.md,
      android: { elevation: 5 },
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
  favoriteButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
    padding: spacing.xs,
  },
  projectName: {
    ...typography.body,
    fontWeight: "700",
    marginBottom: spacing.xs,
    paddingRight: spacing.lg, // Space for star
  },
  clientName: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  hourlyRate: {
    ...typography.body,
    fontWeight: "600",
    // Color set dynamically via inline style
  },
  todaysTime: {
    ...typography.caption,
    fontWeight: "500",
  },
  quickStartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  quickStartText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
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
  budgetBarContainer: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: spacing.sm,
    marginBottom: -spacing.xs, // Negative margin to keep card compact
  },
  budgetBar: {
    height: "100%",
    borderRadius: 2,
  },
});
