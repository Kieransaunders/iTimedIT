import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing, typography } from "@/utils/theme";

export interface WorkspaceBadgeProps {
  style?: ViewStyle;
  size?: "small" | "medium" | "large";
}

export function WorkspaceBadge({ style, size = "medium" }: WorkspaceBadgeProps) {
  const { currentWorkspace, activeOrganization } = useOrganization();
  const { colors } = useTheme();

  const isPersonal = currentWorkspace === "personal";
  const iconName = isPersonal ? "account" : "account-group";
  const workspaceLabel = isPersonal ? "Personal" : "Team";
  
  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 12,
      fontSize: 10,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    medium: {
      iconSize: 14,
      fontSize: 11,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    large: {
      iconSize: 16,
      fontSize: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
  };

  const config = sizeConfig[size];

  const badgeStyles = [
    styles.badge,
    {
      backgroundColor: isPersonal ? colors.surface : colors.primary,
      borderColor: isPersonal ? colors.border : colors.primary,
      paddingHorizontal: config.paddingHorizontal,
      paddingVertical: config.paddingVertical,
    },
    style,
  ];

  return (
    <View style={badgeStyles}>
      <MaterialCommunityIcons
        name={iconName}
        size={config.iconSize}
        color={isPersonal ? colors.textSecondary : colors.background}
      />
      <Text
        style={[
          styles.badgeText,
          {
            color: isPersonal ? colors.textSecondary : colors.background,
            fontSize: config.fontSize,
          },
        ]}
      >
        {workspaceLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});