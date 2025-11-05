import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useOrganization } from "@/contexts/OrganizationContext";
import { WebAppPrompt, openWebApp } from "../WebAppPrompt";
import { useTheme } from "@/utils/ThemeContext";
import { spacing, typography, borderRadius } from "@/utils/theme";

export interface CompanionAppGuidanceProps {
  context: "projects" | "clients" | "timer" | "entries" | "settings";
  hasData?: boolean;
  customMessage?: string;
  customPath?: string;
}

export function CompanionAppGuidance({
  context,
  hasData = false,
  customMessage,
  customPath,
}: CompanionAppGuidanceProps) {
  const { currentWorkspace, activeOrganization } = useOrganization();
  const { colors } = useTheme();

  const getContextualGuidance = () => {
    const workspaceLabel = currentWorkspace === "personal" ? "personal" : "work";
    const orgName = activeOrganization?.name || "your organization";

    switch (context) {
      case "projects":
        if (!hasData) {
          return {
            message: `Create and manage projects in your ${workspaceLabel} workspace using the full-featured web app. The mobile app is optimized for quick project browsing and timer control.`,
            actionText: "Create Projects",
            path: "/projects",
            icon: "folder-plus-outline",
          };
        }
        return {
          message: `Manage project details, budgets, and team assignments using the web app. Use this mobile view to quickly browse and start timers.`,
          actionText: "Manage Projects",
          path: "/projects",
          icon: "folder-edit-outline",
        };

      case "clients":
        if (!hasData) {
          return {
            message: `Add clients to your ${workspaceLabel} workspace using the web app. Client management includes contact details, billing rates, and project organization.`,
            actionText: "Add Clients",
            path: "/clients",
            icon: "account-plus-outline",
          };
        }
        return {
          message: `Edit client details, manage billing rates, and organize client projects using the comprehensive web interface.`,
          actionText: "Manage Clients",
          path: "/clients",
          icon: "account-edit-outline",
        };

      case "timer":
        return {
          message: `This mobile app is designed for quick and easy time tracking. For detailed project setup, reporting, and team management, use the web app.`,
          actionText: "Open Dashboard",
          path: "/dashboard",
          icon: "monitor-dashboard",
        };

      case "entries":
        return {
          message: `View and edit time entries on mobile, or use the web app for advanced features like bulk editing, detailed reporting, and data export.`,
          actionText: "Advanced Reports",
          path: "/reports",
          icon: "chart-line",
        };

      case "settings":
        return {
          message: `Configure ${currentWorkspace === "work" ? `${orgName} team settings` : "workspace preferences"}, billing, integrations, and advanced features using the web app.`,
          actionText: "Open Settings",
          path: "/settings",
          icon: "cog-outline",
        };

      default:
        return {
          message: `Access full features and management tools using the web app. This mobile app focuses on quick time tracking and project browsing.`,
          actionText: "Open Web App",
          path: "/",
          icon: "open-in-app",
        };
    }
  };

  const guidance = getContextualGuidance();
  const message = customMessage || guidance.message;
  const path = customPath || guidance.path;

  return (
    <WebAppPrompt
      message={message}
      actionText={guidance.actionText}
      onOpenWebApp={() => openWebApp(path)}
      variant="info"
      dismissible={true}
      persistDismissal={true}
      dismissalKey={`companion_guidance_${context}_${currentWorkspace}`}
    />
  );
}

export function CompanionAppFooter() {
  const { colors } = useTheme();

  return (
    <View style={[styles.footer, { backgroundColor: colors.surface }]}>
      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        💡 This mobile app is optimized for quick time tracking. Use the web app for comprehensive project and team management.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerText: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});