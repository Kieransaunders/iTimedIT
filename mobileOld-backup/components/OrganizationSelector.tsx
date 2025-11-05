import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createStyleSheet, useStyles } from "react-native-unistyles";
import { useOrganization, type MembershipWithOrganization } from "@/contexts/OrganizationContext";
import { WorkspaceTransitionOverlay } from "./common/WorkspaceTransitionOverlay";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export interface OrganizationSelectorProps {
  style?: StyleProp<ViewStyle>;
  onOrganizationChange?: (organizationId: Id<"organizations">) => void;
  showLabel?: boolean;
  compact?: boolean;
}

export function OrganizationSelector({ 
  style, 
  onOrganizationChange,
  showLabel = true,
  compact = false 
}: OrganizationSelectorProps) {
  const { 
    memberships, 
    activeOrganization, 
    switchOrganization, 
    isReady,
    isSwitchingOrganization
  } = useOrganization();
  const { styles, theme } = useStyles(stylesheet, { compact });
  const [isOpen, setIsOpen] = useState(false);

  const handleOrganizationSelect = async (organizationId: Id<"organizations">) => {
    if (organizationId === activeOrganization?._id || isSwitchingOrganization) return;

    try {
      await switchOrganization(organizationId);
      onOrganizationChange?.(organizationId);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch organization:", error);
      // Error handling is done in the context with toast messages
    }
  };

  const renderOrganizationItem = ({ item }: { item: MembershipWithOrganization }) => {
    const organization = item.organization;
    if (!organization) return null;

    const isActive = activeOrganization?._id === organization._id;
    const isDefaultWorkspace = organization.isPersonalWorkspace === true;

    return (
      <TouchableOpacity
        style={[styles.option, isActive && styles.optionSelected]}
        onPress={() => handleOrganizationSelect(organization._id)}
        disabled={isSwitchingOrganization}
        accessible={true}
        accessibilityLabel={`Select ${organization.name} organization`}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, isActive && styles.optionTitleSelected]}>
              {organization.name}
            </Text>
            <View style={styles.optionMeta}>
              <Text style={[styles.optionRole, isActive && styles.optionRoleSelected]}>
                {item.membership.role}
              </Text>
              {isDefaultWorkspace && (
                <Text style={[styles.optionBadge, isActive && styles.optionBadgeSelected]}>
                  Default
                </Text>
              )}
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

  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  const displayName = activeOrganization?.name || "No Organization";
  const availableOrganizations = memberships.filter(m => m.organization);

  return (
    <View style={[styles.container, style]}>
      {showLabel && !compact && (
        <Text style={styles.label}>Organization</Text>
      )}
      
      <TouchableOpacity
        style={[styles.trigger, compact && styles.triggerCompact]}
        onPress={() => setIsOpen(true)}
        disabled={isSwitchingOrganization || availableOrganizations.length <= 1}
        accessible={true}
        accessibilityLabel={`Current organization: ${displayName}. Tap to change.`}
        accessibilityRole="button"
        accessibilityHint="Opens organization selection"
      >
        <View style={styles.triggerContent}>
          <Text 
            style={[styles.triggerText, compact && styles.triggerTextCompact]} 
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {availableOrganizations.length > 1 && (
            <Text style={styles.chevron}>▼</Text>
          )}
        </View>
        {isSwitchingOrganization && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary} 
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
              <Text style={styles.modalTitle}>Select Organization</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close organization selector"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableOrganizations}
              keyExtractor={(item) => item.organization?._id || item.membership._id}
              renderItem={renderOrganizationItem}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <WorkspaceTransitionOverlay
        visible={isSwitchingOrganization}
        type="organization"
        targetName={activeOrganization?.name}
      />
    </View>
  );
}

const stylesheet = createStyleSheet((theme) => ({
  container: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  trigger: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: theme.sizing.minTouchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    variants: {
      compact: {
        true: {
          minHeight: 36,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        },
      },
    },
  },
  triggerCompact: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  triggerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    flex: 1,
    variants: {
      compact: {
        true: {
          fontSize: 14,
        },
      },
    },
  },
  triggerTextCompact: {
    fontSize: 14,
  },
  chevron: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: theme.spacing.sm,
  },
  loadingIndicator: {
    marginLeft: theme.spacing.sm,
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
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
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  optionTitleSelected: {
    color: theme.colors.primary,
  },
  optionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  optionRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },
  optionRoleSelected: {
    color: theme.colors.primary,
  },
  optionBadge: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  optionBadgeSelected: {
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + "20",
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
}));