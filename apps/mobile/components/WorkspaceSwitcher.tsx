import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { useOrganization } from "@/contexts/OrganizationContext";
import { WorkspaceTransitionOverlay } from "./common/WorkspaceTransitionOverlay";

export interface WorkspaceSwitcherProps {
  style?: StyleProp<ViewStyle>;
  onWorkspaceChange?: (workspace: "personal" | "team") => void;
}

export function WorkspaceSwitcher({ style, onWorkspaceChange }: WorkspaceSwitcherProps) {
  const { 
    currentWorkspace, 
    switchWorkspace, 
    isReady, 
    activeOrganization, 
    isSwitchingWorkspace 
  } = useOrganization();
  const { styles, theme } = useStyles(stylesheet);

  const handleWorkspaceSwitch = async (workspace: "personal" | "team") => {
    if (workspace === currentWorkspace || isSwitchingWorkspace) return;

    try {
      await switchWorkspace(workspace);
      onWorkspaceChange?.(workspace);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.switcher}>
        <TouchableOpacity
          style={[
            styles.option,
            styles.leftOption,
            currentWorkspace === "personal" && styles.activeOption,
          ]}
          onPress={() => handleWorkspaceSwitch("personal")}
          disabled={isSwitchingWorkspace}
          accessible={true}
          accessibilityLabel="Switch to personal workspace"
          accessibilityRole="button"
          accessibilityState={{ selected: currentWorkspace === "personal" }}
        >
          {isSwitchingWorkspace && currentWorkspace === "personal" ? (
            <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          ) : (
            <Text
              style={[
                styles.optionText,
                currentWorkspace === "personal" && styles.activeOptionText,
              ]}
            >
              Personal
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            styles.rightOption,
            currentWorkspace === "team" && styles.activeOption,
          ]}
          onPress={() => handleWorkspaceSwitch("team")}
          disabled={isSwitchingWorkspace || !activeOrganization}
          accessible={true}
          accessibilityLabel={
            activeOrganization
              ? `Switch to team workspace for ${activeOrganization.name}`
              : "Team workspace not available"
          }
          accessibilityRole="button"
          accessibilityState={{ 
            selected: currentWorkspace === "team",
            disabled: !activeOrganization 
          }}
        >
          {isSwitchingWorkspace && currentWorkspace === "team" ? (
            <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          ) : (
            <Text
              style={[
                styles.optionText,
                currentWorkspace === "team" && styles.activeOptionText,
                !activeOrganization && styles.disabledOptionText,
              ]}
            >
              Team
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {currentWorkspace === "team" && activeOrganization && (
        <Text style={styles.organizationLabel} numberOfLines={1}>
          {activeOrganization.name}
        </Text>
      )}

      <WorkspaceTransitionOverlay
        visible={isSwitchingWorkspace}
        type="workspace"
        targetName={currentWorkspace === "personal" ? "Personal" : "Team"}
      />
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 2,
    minHeight: theme.sizing.minTouchTarget,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minHeight: theme.sizing.minTouchTarget - 4, // Account for container padding
    minWidth: 80, // Ensure adequate touch target width
  },
  leftOption: {
    marginRight: 1,
  },
  rightOption: {
    marginLeft: 1,
  },
  activeOption: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  activeOptionText: {
    color: "#ffffff",
  },
  disabledOptionText: {
    color: theme.colors.textTertiary,
    opacity: theme.opacity.disabled,
  },
  organizationLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 200,
  },
}));