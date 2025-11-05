import { useTheme } from "@/utils/ThemeContext";
import { Project } from "@/types/models";
import { formatCurrency } from "@/utils/formatters";
import { borderRadius, spacing } from "@/utils/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface ProjectStats {
  totalSeconds: number;
  totalHours: number;
  totalAmount: number;
  budgetRemaining: number;
  budgetRemainingFormatted: string;
  totalHoursFormatted: string;
  budgetPercentUsed: number;
}

export interface InlineProjectStatsProps {
  project: Project;
  stats: ProjectStats;
}

/**
 * Compact inline project stats - horizontal layout
 * Matches web app's minimal stats display
 */
export function InlineProjectStats({ project, stats }: InlineProjectStatsProps) {
  const { colors } = useTheme();
  const isOverBudget = stats.budgetRemaining < 0;
  const budgetColor = isOverBudget ? colors.error : colors.success;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${colors.surface}20`, // 20% opacity
          borderColor: `${colors.border}40`,
        },
      ]}
    >
      {/* Hourly Rate */}
      <View style={styles.statItem}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          HOURLY RATE
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {formatCurrency(project.hourlyRate)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Time Used */}
      <View style={styles.statItem}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          TIME USED
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {stats.totalHoursFormatted}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Remaining */}
      <View style={styles.statItem}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          REMAINING
        </Text>
        <Text style={[styles.value, { color: budgetColor }]}>
          {stats.budgetRemainingFormatted}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    marginVertical: spacing.xs,
  },
});
