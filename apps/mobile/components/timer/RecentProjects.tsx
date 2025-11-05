import { Card } from "@/components/ui/Card";
import { useProjects } from "@/hooks/useProjects";
import { Project } from "@/types/models";
import { colors, spacing, typography } from "@/utils/theme";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface RecentProjectsProps {
  onProjectSelect?: (project: Project) => void;
}

/**
 * Recent projects section component
 * Displays 2-3 most recent projects with quick selection
 */
export function RecentProjects({ onProjectSelect }: RecentProjectsProps) {
  const { recentProjects, isLoading } = useProjects();

  const handleProjectPress = (project: Project) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Recent Projects</Text>
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.primary} />
        </Card>
      </View>
    );
  }

  if (recentProjects.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Recent Projects</Text>
        <Card style={styles.card}>
          <Text style={styles.placeholderText}>
            No recent projects. Start a timer to see projects here.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Projects</Text>
      {recentProjects.map((project) => (
        <TouchableOpacity
          key={project._id}
          onPress={() => handleProjectPress(project)}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel={`Select project ${project.name}`}
          accessibilityRole="button"
        >
          <Card style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project.name}
              </Text>
              {project.client && (
                <Text style={styles.clientName} numberOfLines={1}>
                  {project.client.name}
                </Text>
              )}
            </View>
            <View style={styles.projectFooter}>
              <Text style={styles.hourlyRate}>
                ${project.hourlyRate.toFixed(2)}/hr
              </Text>
              {project.totalHoursFormatted && (
                <Text style={styles.timeUsed}>
                  {project.totalHoursFormatted} used
                </Text>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.lg,
  },
  loadingCard: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  projectCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  projectHeader: {
    marginBottom: spacing.sm,
  },
  projectName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  clientName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hourlyRate: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  timeUsed: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
