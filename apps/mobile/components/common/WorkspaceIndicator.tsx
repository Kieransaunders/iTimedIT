import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing, typography } from "@/utils/theme";

export interface WorkspaceIndicatorProps {
  style?: ViewStyle;
  variant?: "compact" | "full";
  showIcon?: boolean;
}

export function WorkspaceIndicator({ 
  style, 
  variant = "compact", 
  showIcon = true 
}: WorkspaceIndicatorProps) {
  const { currentWorkspace, activeOrganization } = useOrganization();
  const { colors } = useTheme();

  const isPersonal = currentWorkspace === "personal";
  const iconName = isPersonal ? "account" : "account-group";
  const workspaceLabel = isPersonal ? "Personal" : "Team";
  
  // Get organization name, fallback to "Personal Workspace" for personal
  const organizationName = isPersonal 
    ? "Personal Workspace" 
    : (activeOrganization?.name || "Team Workspace");

  const indicatorStyles = [
    styles.container,
    {
      backgroundColor: isPersonal ? colors.surface : colors.primary + "15",
      borderColor: isPersonal ? colors.border : colors.primary + "40",
    },
    style,
  ];

  if (variant === "compact") {
    return (
      <View style={indicatorStyles}>
        {showIcon && (
          <MaterialCommunityIcons
            name={iconName}
            size={16}
            color={isPersonal ? colors.textSecondary : colors.primary}
          />
        )}
        <Text
          style={[
            styles.workspaceText,
            {
              color: isPersonal ? colors.textSecondary : colors.primary,
              fontWeight: isPersonal ? "500" : "600",
            },
          ]}
        >
          {workspaceLabel}
        </Text>
      </View>
    );
  }

  return (
    <View style={indicatorStyles}>
      {showIcon && (
        <MaterialCommunityIcons
          name={iconName}
          size={18}
          color={isPersonal ? colors.textSecondary : colors.primary}
        />
      )}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.workspaceText,
            {
              color: isPersonal ? colors.textSecondary : colors.primary,
              fontWeight: isPersonal ? "500" : "600",
            },
          ]}
        >
          {workspaceLabel}
        </Text>
        <Text
          style={[
            styles.organizationText,
            { color: colors.textSecondary },
          ]}
        >
          {organizationName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  textContainer: {
    flex: 1,
  },
  workspaceText: {
    ...typography.caption,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  organizationText: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
});