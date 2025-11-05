import { Card } from "@/components/ui/Card";
import { Project } from "@/types/models";
import { formatCurrency } from "@/utils/formatters";
import { colors, spacing } from "@/utils/theme";
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

export interface ProjectInfoProps {
  project: Project;
  stats: ProjectStats;
}

/**
 * Project information card component
 * Displays hourly rate, time used, allocated time, and remaining budget
 */
export function ProjectInfo({ project, stats }: ProjectInfoProps) {
  const isOverBudget = stats.budgetRemaining < 0;
  const budgetColor = isOverBudget ? colors.error : colors.success;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <InfoItem
          label="Hourly Rate"
          value={formatCurrency(project.hourlyRate)}
        />
        <InfoItem
          label="Time Used"
          value={stats.totalHoursFormatted}
        />
      </View>
      <View style={styles.row}>
        <InfoItem
          label="Allocated"
          value={
            project.budgetType === "hours"
              ? `${project.budgetHours ?? 0}h`
              : formatCurrency(project.budgetAmount ?? 0)
          }
        />
        <InfoItem
          label="Remaining"
          value={stats.budgetRemainingFormatted}
          valueColor={budgetColor}
        />
      </View>
      {/* Budget progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(stats.budgetPercentUsed, 100)}%`,
                backgroundColor: isOverBudget ? colors.error : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {stats.budgetPercentUsed.toFixed(0)}% used
        </Text>
      </View>
    </Card>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoItem({ label, value, valueColor }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
