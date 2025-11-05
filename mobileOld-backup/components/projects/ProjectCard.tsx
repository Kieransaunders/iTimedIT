import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { Project } from "../../types/models";
import { borderRadius, colors, shadows, spacing, typography } from "../../utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { openWebApp } from "../WebAppPrompt";

export interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onStartTimer?: () => void;
  showEditOption?: boolean;
}

/**
 * ProjectCard component displays project information in a card format
 * Shows project name, client name (if available), and hourly rate
 */
export function ProjectCard({ project, onPress, onStartTimer, showEditOption = true }: ProjectCardProps) {
  // Debug log
  console.log('ProjectCard render:', {
    projectName: project.name,
    hasOnStartTimer: !!onStartTimer
  });

  const handleLongPress = () => {
    if (!showEditOption) {
      return;
    }

    Alert.alert(
      project.name,
      "What would you like to do?",
      [
        {
          text: "Edit in Web App",
          onPress: () => {
            // Open web app to project edit page
            openWebApp(`/projects/${project._id}`);
          },
        },
        ...(onStartTimer
          ? [
              {
                text: "Start Timer",
                onPress: onStartTimer,
              },
            ]
          : []),
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`Project: ${project.name}${
        project.client ? `, Client: ${project.client.name}` : ""
      }, Hourly rate: $${project.hourlyRate}`}
      accessibilityRole="button"
      accessibilityHint="Tap to select this project for time tracking. Long press for more options"
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.projectName} numberOfLines={1}>
            {project.name}
          </Text>
          {project.client && (
            <Text style={styles.clientName} numberOfLines={1}>
              {project.client.name}
            </Text>
          )}
        </View>
        {onStartTimer && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={(e) => {
              e.stopPropagation();
              console.log('Start timer button pressed for:', project.name);
              onStartTimer();
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`Start timer for ${project.name}`}
            accessibilityRole="button"
            accessibilityHint="Tap to start tracking time for this project"
          >
            <Ionicons name="play-circle" size={40} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.hourlyRate}>${project.hourlyRate.toFixed(2)}/hr</Text>
        {project.budgetRemainingFormatted && (
          <Text style={styles.budgetRemaining}>
            {project.budgetRemainingFormatted} remaining
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  startButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(157, 78, 221, 0.1)', // Subtle background for visibility
    borderRadius: 8,
  },
  projectName: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  clientName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hourlyRate: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  budgetRemaining: {
    ...typography.caption,
    color: colors.success,
  },
});
