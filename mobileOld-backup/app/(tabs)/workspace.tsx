import React from "react";
import { View, Text, ScrollView } from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { WorkspaceSwitcher } from "@/components";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function WorkspaceScreen() {
  const { styles } = useStyles(stylesheet);
  const { currentWorkspace, activeOrganization } = useOrganization();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Workspace Settings</Text>
        <Text style={styles.subtitle}>
          Switch between your personal and team workspaces
        </Text>
      </View>

      <View style={styles.switcherContainer}>
        <WorkspaceSwitcher />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Current Workspace</Text>
          <Text style={styles.infoValue}>
            {currentWorkspace === "personal" ? "Personal" : "Team"}
          </Text>
        </View>

        {currentWorkspace === "work" && activeOrganization && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Organization</Text>
            <Text style={styles.infoValue}>{activeOrganization.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>About Workspaces</Text>
        <Text style={styles.descriptionText}>
          <Text style={styles.bold}>Personal Workspace:</Text> Your private workspace for
          individual projects and time tracking.
        </Text>
        <Text style={styles.descriptionText}>
          <Text style={styles.bold}>Team Workspace:</Text> Collaborate with your team members
          on shared projects and track time together.
        </Text>
      </View>
    </ScrollView>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  switcherContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  infoContainer: {
    gap: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  descriptionContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
}));
