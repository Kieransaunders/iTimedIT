import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  TouchableOpacity,
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

export interface ProjectTimeData {
  project: Project;
  seconds: number;
  percentage: number;
}

export interface TimeEntry {
  _id: string;
  projectId: string;
  startedAt: number;
  stoppedAt?: number;
  seconds: number;
  project?: Project;
}

export interface TodaySummaryCardProps {
  /** Total time tracked today in seconds */
  todaysTotalSeconds: number;
  /** Number of entries created today */
  entriesCount: number;
  /** Top project worked on today (by time) */
  topProject: Project | null;
  /** Total earnings today based on hourly rates */
  todaysEarnings: number;
  /** All time entries for filtering */
  entries: TimeEntry[];
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
export type TimePeriod = "day" | "week" | "month" | "year";

export function TodaySummaryCard({
  todaysTotalSeconds,
  entriesCount,
  topProject,
  todaysEarnings,
  entries,
}: TodaySummaryCardProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");

  // Calculate date range based on selected period
  const getDateRange = useCallback((period: TimePeriod): { start: number; end: number } => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (period) {
      case "day":
        return {
          start: today.getTime(),
          end: now,
        };
      case "week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        return {
          start: startOfWeek.getTime(),
          end: now,
        };
      }
      case "month": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: startOfMonth.getTime(),
          end: now,
        };
      }
      case "year": {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return {
          start: startOfYear.getTime(),
          end: now,
        };
      }
    }
  }, []);

  // Filter entries by selected time period and calculate project data
  const projectTimeData = React.useMemo((): ProjectTimeData[] => {
    const { start, end } = getDateRange(timePeriod);

    // Filter entries within date range
    const filteredEntries = entries.filter(
      (entry) => entry.startedAt >= start && entry.startedAt <= end
    );

    // Group by project and sum seconds
    const projectMap = new Map<string, { project: Project; seconds: number }>();

    filteredEntries.forEach((entry) => {
      if (!entry.project) return;

      // Ensure seconds is a valid number
      const entrySeconds = typeof entry.seconds === "number" && !isNaN(entry.seconds)
        ? entry.seconds
        : 0;

      const existing = projectMap.get(entry.projectId);
      if (existing) {
        existing.seconds += entrySeconds;
      } else {
        projectMap.set(entry.projectId, {
          project: entry.project,
          seconds: entrySeconds,
        });
      }
    });

    // Calculate total seconds
    const totalSeconds = Array.from(projectMap.values()).reduce(
      (sum, item) => sum + (typeof item.seconds === "number" && !isNaN(item.seconds) ? item.seconds : 0),
      0
    );

    if (totalSeconds === 0) return [];

    // Create time data with percentages
    const timeData: ProjectTimeData[] = Array.from(projectMap.values()).map((item) => {
      const validSeconds = typeof item.seconds === "number" && !isNaN(item.seconds) ? item.seconds : 0;
      const percentage = totalSeconds > 0 ? (validSeconds / totalSeconds) * 100 : 0;

      return {
        project: item.project,
        seconds: validSeconds,
        percentage: !isNaN(percentage) ? percentage : 0,
      };
    });

    // Sort by time (most time first)
    return timeData.sort((a, b) => b.seconds - a.seconds);
  }, [entries, timePeriod, getDateRange]);

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
            <Text
              style={[styles.entriesCount, { color: colors.primary }]}
              accessibilityLabel={`${entriesCount} entries`}
            >
              {entriesCount}
            </Text>
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

          {/* Time Period Filter */}
          <View style={styles.timePeriodFilter}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                timePeriod === "day" && styles.periodButtonActive,
                { borderColor: colors.border, backgroundColor: timePeriod === "day" ? colors.primary : colors.surface },
              ]}
              onPress={() => {
                lightTap();
                setTimePeriod("day");
              }}
            >
              <Text style={[styles.periodButtonText, { color: timePeriod === "day" ? "#ffffff" : colors.textSecondary }]}>
                Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                timePeriod === "week" && styles.periodButtonActive,
                { borderColor: colors.border, backgroundColor: timePeriod === "week" ? colors.primary : colors.surface },
              ]}
              onPress={() => {
                lightTap();
                setTimePeriod("week");
              }}
            >
              <Text style={[styles.periodButtonText, { color: timePeriod === "week" ? "#ffffff" : colors.textSecondary }]}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                timePeriod === "month" && styles.periodButtonActive,
                { borderColor: colors.border, backgroundColor: timePeriod === "month" ? colors.primary : colors.surface },
              ]}
              onPress={() => {
                lightTap();
                setTimePeriod("month");
              }}
            >
              <Text style={[styles.periodButtonText, { color: timePeriod === "month" ? "#ffffff" : colors.textSecondary }]}>
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                timePeriod === "year" && styles.periodButtonActive,
                { borderColor: colors.border, backgroundColor: timePeriod === "year" ? colors.primary : colors.surface },
              ]}
              onPress={() => {
                lightTap();
                setTimePeriod("year");
              }}
            >
              <Text style={[styles.periodButtonText, { color: timePeriod === "year" ? "#ffffff" : colors.textSecondary }]}>
                Year
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time by Project Breakdown */}
          {projectTimeData.length > 0 ? (
            <View style={styles.projectBreakdown}>
              <Text style={[styles.breakdownTitle, { color: colors.textPrimary }]}>
                Time by Project
              </Text>
              {projectTimeData.map((item, index) => {
                const projectColor = item.project.client?.color || item.project.color || colors.primary;
                return (
                  <View
                    key={item.project._id}
                    style={[
                      styles.projectBarItem,
                      index === projectTimeData.length - 1 && styles.projectBarItemLast,
                    ]}
                  >
                    <View style={styles.projectBarHeader}>
                      <View style={styles.projectBarInfo}>
                        <View
                          style={[styles.projectColorDot, { backgroundColor: projectColor }]}
                        />
                        <Text
                          style={[styles.projectBarName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.project.name}
                        </Text>
                      </View>
                      <View style={styles.projectBarStats}>
                        <Text style={[styles.projectBarTime, { color: colors.textPrimary }]}>
                          {formatDuration(item.seconds)}
                        </Text>
                        <Text style={[styles.projectBarPercentage, { color: colors.textSecondary }]}>
                          {Math.round(item.percentage)}%
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.projectBarContainer, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.projectBar,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: projectColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={[
                styles.chartPlaceholder,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TrendingUp size={32} color={colors.textTertiary} />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                No project data yet
              </Text>
              <Text style={[styles.placeholderSubtext, { color: colors.textTertiary }]}>
                Start tracking time to see breakdown
              </Text>
            </View>
          )}

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
  entriesCount: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 20,
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
  projectBreakdown: {
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  projectBarItem: {
    marginBottom: spacing.md,
  },
  projectBarItemLast: {
    marginBottom: 0,
  },
  projectBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  projectBarInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  projectBarName: {
    ...typography.caption,
    fontWeight: "600",
    flex: 1,
  },
  projectBarStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  projectBarTime: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 13,
  },
  projectBarPercentage: {
    ...typography.caption,
    fontSize: 12,
    minWidth: 35,
    textAlign: "right",
  },
  projectBarContainer: {
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  projectBar: {
    height: "100%",
    borderRadius: borderRadius.sm,
  },
  timePeriodFilter: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodButtonActive: {
    // Active styles applied inline
  },
  periodButtonText: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 12,
  },
});
