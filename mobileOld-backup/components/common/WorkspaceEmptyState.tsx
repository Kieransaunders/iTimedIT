import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTheme } from "@/utils/ThemeContext";
import { EmptyStateCard, openWebApp } from "../";
import { spacing, typography } from "@/utils/theme";

export interface WorkspaceEmptyStateProps {
  type: "projects" | "clients" | "entries";
  searchTerm?: string;
  customTitle?: string;
  customDescription?: string;
}

export function WorkspaceEmptyState({
  type,
  searchTerm,
  customTitle,
  customDescription,
}: WorkspaceEmptyStateProps) {
  const { currentWorkspace, activeOrganization } = useOrganization();
  const { colors } = useTheme();

  const getEmptyStateConfig = () => {
    const isPersonal = currentWorkspace === "personal";
    const workspaceLabel = isPersonal ? "personal workspace" : `${activeOrganization?.name || "team workspace"}`;
    
    if (searchTerm) {
      return {
        title: `No ${type} found`,
        description: `No ${type} match "${searchTerm}" in your ${workspaceLabel}. Try adjusting your search or check a different workspace.`,
        actionText: `Browse All ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        path: `/${type}`,
        icon: "magnify-close",
      };
    }

    switch (type) {
      case "projects":
        return {
          title: isPersonal ? "No personal projects yet" : "No team projects yet",
          description: isPersonal 
            ? "Create projects in your personal workspace using the web app to start tracking time on your personal work."
            : `Create projects for ${activeOrganization?.name || "your team"} using the web app. Team projects can be shared with other members and include budget tracking.`,
          actionText: "Create Projects",
          path: "/projects",
          icon: "folder-plus-outline",
        };

      case "clients":
        return {
          title: isPersonal ? "No personal clients yet" : "No team clients yet",
          description: isPersonal
            ? "Add clients to your personal workspace using the web app. Clients help organize your projects and track billing information."
            : `Add clients to ${activeOrganization?.name || "your team"} using the web app. Team clients can be shared across projects and team members.`,
          actionText: "Add Clients",
          path: "/clients",
          icon: "account-plus-outline",
        };

      case "entries":
        return {
          title: "No time entries yet",
          description: `Start tracking time in your ${workspaceLabel} to see entries here. Use the timer on the main screen or add entries manually using the web app.`,
          actionText: "View Dashboard",
          path: "/dashboard",
          icon: "clock-plus-outline",
        };

      default:
        return {
          title: "No data available",
          description: `No ${type} found in your ${workspaceLabel}.`,
          actionText: "Open Web App",
          path: "/",
          icon: "database-outline",
        };
    }
  };

  const config = getEmptyStateConfig();
  const title = customTitle || config.title;
  const description = customDescription || config.description;

  return (
    <View style={styles.container}>
      {/* Workspace context indicator */}
      <View style={[styles.workspaceIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons
          name={currentWorkspace === "personal" ? "account" : "account-group"}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={[styles.workspaceText, { color: colors.textSecondary }]}>
          {currentWorkspace === "personal" ? "Personal Workspace" : activeOrganization?.name || "Team Workspace"}
        </Text>
      </View>

      {/* Empty state card */}
      <EmptyStateCard
        title={title}
        description={description}
        actionText={config.actionText}
        onActionPress={() => openWebApp(config.path)}
        icon={
          <MaterialCommunityIcons
            name={config.icon as any}
            size={48}
            color={colors.textSecondary}
          />
        }
        variant="info"
      />

      {/* Additional guidance */}
      <View style={[styles.guidanceContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.guidanceText, { color: colors.textSecondary }]}>
          💡 This mobile app is designed for quick time tracking. Use the web app for comprehensive {type} management, reporting, and team collaboration.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  workspaceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
  },
  workspaceText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "500",
  },
  guidanceContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    maxWidth: 320,
  },
  guidanceText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});