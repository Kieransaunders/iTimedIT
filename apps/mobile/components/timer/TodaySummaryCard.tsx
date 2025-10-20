import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ChevronDown, Clock, DollarSign, TrendingUp, XCircle } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";
import {
  borderRadius,
  shadows,
  spacing,
  typography,
  animations,
} from "@/utils/theme";
import { lightTap, mediumTap } from "@/utils/haptics";
import { formatDuration, formatCurrency } from "@/utils/formatters";
import { storage } from "@/services/storage";
import type { Project } from "@/types/models";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// AsyncStorage key for dismissal state
const DISMISSAL_KEY = "todaySummaryCard_dismissed";

export interface TodaySummaryCardProps {
  /** Total time tracked today in seconds */
  todaysTotalSeconds: number;
  /** Number of entries created today */
  entriesCount: number;
  /** Top project worked on today (by time) */
  topProject: Project | null;
  /** Total earnings today based on hourly rates */
  todaysEarnings: number;
}

/**
 * TodaySummaryCard - Collapsible summary of today's time tracking
 *
 * Features:
 * - Large, prominent display of today's total time
 * - Number of entries badge
 * - Top project with color indicator
 * - Today's earnings
 * - Collapsible with smooth animation
 * - Dismissible with AsyncStorage persistence
 * - Placeholder for future hourly breakdown chart
 * - Full accessibility support
 * - Haptic feedback on interactions
 */
export function TodaySummaryCard({
  todaysTotalSeconds,
  entriesCount,
  topProject,
  todaysEarnings,
}: TodaySummaryCardProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Animated values
  const rotationValue = useSharedValue(0);
  const heightValue = useSharedValue(0);

  // Load dismissal state on mount
  useEffect(() => {
    loadDismissalState();
  }, []);

  const loadDismissalState = async () => {
    try {
      const dismissed = await storage.getItem(DISMISSAL_KEY);
      setIsDismissed(dismissed === "true");
    } catch (error) {
      console.error("Failed to load dismissal state:", error);
    }
  };

  const handleToggleExpand = useCallback(() => {
    lightTap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
    rotationValue.value = withSpring(isExpanded ? 0 : 180, {
      damping: 15,
      stiffness: 150,
    });
  }, [isExpanded, rotationValue]);

  const handleDismiss = useCallback(async () => {
    mediumTap();
    try {
      await storage.setItem(DISMISSAL_KEY, "true");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsDismissed(true);
    } catch (error) {
      console.error("Failed to save dismissal state:", error);
    }
  }, []);

  // Animated styles
  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  const projectColor = topProject?.color || colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        Platform.OS === "ios" ? shadows.md : { elevation: 5 },
      ]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Today's summary: ${formatDuration(todaysTotalSeconds)} tracked, ${entriesCount} entries, earned ${formatCurrency(todaysEarnings)}`}
    >
      {/* Card Header - Always Visible */}
      <Pressable
        onPress={handleToggleExpand}
        style={styles.header}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Today's summary, ${isExpanded ? "expanded" : "collapsed"}. Tap to ${isExpanded ? "collapse" : "expand"}`}
        accessibilityHint="Double tap to toggle summary details"
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
            Today&apos;s Summary
          </Text>
          <Animated.View style={chevronAnimatedStyle}>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Main Stats - Always Visible */}
      <View style={styles.mainStats}>
        {/* Total Time - Prominent Display */}
        <View style={styles.totalTimeContainer}>
          <Clock size={32} color={colors.primary} style={styles.totalTimeIcon} />
          <Text
            style={[
              styles.totalTime,
              { color: colors.textPrimary },
            ]}
            accessibilityLabel={`Total time today: ${formatDuration(todaysTotalSeconds)}`}
          >
            {formatDuration(todaysTotalSeconds)}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Entries Count */}
          <View style={styles.statItem}>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: colors.primary }]}
                accessibilityLabel={`${entriesCount} entries`}
              >
                {entriesCount}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {entriesCount === 1 ? "Entry" : "Entries"}
            </Text>
          </View>

          {/* Top Project */}
          {topProject && (
            <View style={styles.statItem}>
              <View style={styles.projectIndicator}>
                <View
                  style={[
                    styles.projectColorDot,
                    { backgroundColor: projectColor },
                  ]}
                  accessible={false}
                />
                <Text
                  style={[styles.projectName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  accessibilityLabel={`Top project: ${topProject.name}`}
                >
                  {topProject.name}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Top Project
              </Text>
            </View>
          )}

          {/* Earnings */}
          <View style={styles.statItem}>
            <View style={styles.earningsContainer}>
              <DollarSign size={20} color={colors.success} />
              <Text
                style={[styles.earningsAmount, { color: colors.success }]}
                accessibilityLabel={`Earnings today: ${formatCurrency(todaysEarnings)}`}
              >
                {formatCurrency(todaysEarnings)}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Earned Today
            </Text>
          </View>
        </View>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Placeholder for Hourly Breakdown Chart */}
          <View
            style={[
              styles.chartPlaceholder,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <TrendingUp size={32} color={colors.textTertiary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Hourly Breakdown Chart
            </Text>
            <Text style={[styles.placeholderSubtext, { color: colors.textTertiary }]}>
              Coming soon
            </Text>
          </View>

          {/* Dismiss Button */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.dismissButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Don't show this summary again"
            accessibilityHint="You can re-enable this in settings"
          >
            <XCircle size={16} color={colors.textTertiary} />
            <Text style={[styles.dismissButtonText, { color: colors.textTertiary }]}>
              Don&apos;t show again
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Re-enable the Today's Summary Card after dismissal
 * Call this function from settings or onboarding screens
 */
export async function reEnableTodaySummaryCard(): Promise<void> {
  try {
    await storage.removeItem(DISMISSAL_KEY);
  } catch (error) {
    console.error("Failed to re-enable today's summary card:", error);
    throw error;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainStats: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  totalTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  totalTimeIcon: {
    marginRight: spacing.sm,
  },
  totalTime: {
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...typography.body,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    textAlign: "center",
  },
  projectIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "100%",
  },
  projectColorDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  projectName: {
    ...typography.caption,
    fontWeight: "600",
    flex: 1,
  },
  earningsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  earningsAmount: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 15,
  },
  expandedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  chartPlaceholder: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
    marginBottom: spacing.md,
  },
  placeholderText: {
    ...typography.body,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  placeholderSubtext: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  dismissButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    ...typography.caption,
    fontWeight: "500",
  },
});
