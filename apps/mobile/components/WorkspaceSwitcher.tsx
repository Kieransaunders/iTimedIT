import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Modal,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { useOrganization, type MembershipWithOrganization } from "@/contexts/OrganizationContext";
import { WorkspaceTransitionOverlay } from "./common/WorkspaceTransitionOverlay";
import type { Id } from "@/convex/_generated/dataModel";

export interface WorkspaceSwitcherProps {
  style?: StyleProp<ViewStyle>;
  onWorkspaceChange?: (workspace: "personal" | "work") => void;
}

export function WorkspaceSwitcher({ style, onWorkspaceChange }: WorkspaceSwitcherProps) {
  const {
    currentWorkspace,
    switchWorkspace,
    switchOrganization,
    isReady,
    activeOrganization,
    memberships,
    isSwitchingWorkspace,
    isSwitchingOrganization,
  } = useOrganization();
  const { styles, theme } = useStyles(stylesheet);
  const [isOpen, setIsOpen] = useState(false);

  const isSwitching = isSwitchingWorkspace || isSwitchingOrganization;

  // Filter memberships into personal and work
  const personalMembership = memberships.find(
    (item) => item.organization?.isPersonalWorkspace === true
  );
  const workMemberships = memberships.filter(
    (item) => item.organization?.isPersonalWorkspace !== true
  );

  const handleWorkspaceSelect = async (
    organizationId: Id<"organizations">,
    isPersonal: boolean
  ) => {
    if (isSwitching) return;

    try {
      await switchOrganization(organizationId);
      await switchWorkspace(isPersonal ? "personal" : "work");
      onWorkspaceChange?.(isPersonal ? "personal" : "work");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
      // Error handling is done in the context with toast messages
    }
  };

  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  // Display name and color for the button
  const isPersonal = currentWorkspace === "personal";
  const displayName = isPersonal ? "Personal" : (activeOrganization?.name || "Work");
  const iconName = isPersonal ? "account" : "account-group";
  const displayColor =
    currentWorkspace === "personal"
      ? "#3b82f6" // Blue for personal
      : activeOrganization?.color || "#8b5cf6"; // Purple default for work

  const renderWorkspaceItem = ({
    item,
    isPersonal,
  }: {
    item: MembershipWithOrganization;
    isPersonal: boolean;
  }) => {
    const organization = item.organization;
    if (!organization) return null;

    const isActive =
      (isPersonal && currentWorkspace === "personal") ||
      (!isPersonal &&
        currentWorkspace === "work" &&
        activeOrganization?._id === organization._id);

    const workspaceColor = isPersonal
      ? "#3b82f6"
      : organization.color || "#8b5cf6";
    const workspaceName = isPersonal ? "Personal" : organization.name;

    return (
      <TouchableOpacity
        style={[styles.option, isActive && styles.optionSelected]}
        onPress={() => handleWorkspaceSelect(organization._id, isPersonal)}
        disabled={isSwitching}
        accessible={true}
        accessibilityLabel={`Select ${workspaceName} workspace`}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionInfo}>
            <View style={styles.optionHeader}>
              <View
                style={[styles.colorDot, { backgroundColor: workspaceColor }]}
              />
              <Text
                style={[
                  styles.optionTitle,
                  isActive && styles.optionTitleSelected,
                ]}
              >
                {workspaceName}
              </Text>
            </View>
          </View>
          {isActive && (
            <View style={styles.activeIndicator}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.trigger,
          isPersonal ? styles.triggerPersonal : styles.triggerWork,
          { borderColor: isPersonal ? theme.colors.border : displayColor }
        ]}
        onPress={() => setIsOpen(true)}
        disabled={isSwitching}
        accessible={true}
        accessibilityLabel={`Current workspace: ${displayName}. Tap to change.`}
        accessibilityRole="button"
        accessibilityHint="Opens workspace selection"
      >
        <MaterialCommunityIcons
          name={iconName as any}
          size={14}
          color={isPersonal ? theme.colors.textSecondary : "#ffffff"}
        />
        <Text style={[
          styles.triggerText,
          isPersonal ? styles.triggerTextPersonal : styles.triggerTextWork
        ]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[
          styles.chevron,
          isPersonal ? styles.chevronPersonal : styles.chevronWork
        ]}>▼</Text>
        {isSwitching && (
          <ActivityIndicator
            size="small"
            color={isPersonal ? theme.colors.primary : "#ffffff"}
            style={styles.loadingIndicator}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Workspace</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close workspace selector"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[
                ...(personalMembership ? [{ item: personalMembership, isPersonal: true }] : []),
                ...workMemberships.map((item) => ({ item, isPersonal: false })),
              ]}
              keyExtractor={(data) => data.item.membership._id}
              renderItem={({ item: data }) =>
                renderWorkspaceItem({ item: data.item, isPersonal: data.isPersonal })
              }
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <WorkspaceTransitionOverlay
        visible={isSwitching}
        type="workspace"
        targetName={displayName}
      />
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  trigger: {
    borderRadius: 999, // Fully rounded pill shape
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  triggerPersonal: {
    backgroundColor: theme.colors.surface,
  },
  triggerWork: {
    backgroundColor: theme.colors.primary,
  },
  triggerText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  triggerTextPersonal: {
    color: theme.colors.textSecondary,
  },
  triggerTextWork: {
    color: "#ffffff",
  },
  chevron: {
    fontSize: 10,
    marginLeft: 2,
  },
  chevronPersonal: {
    color: theme.colors.textTertiary,
  },
  chevronWork: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  loadingIndicator: {
    marginLeft: theme.spacing.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `rgba(0, 0, 0, ${theme.opacity.overlay})`,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.sm,
    minWidth: theme.sizing.minTouchTarget,
    minHeight: theme.sizing.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    padding: theme.spacing.lg,
    minHeight: theme.sizing.minTouchTarget + theme.spacing.md,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary + "10", // 10% opacity
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  optionTitleSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
}));