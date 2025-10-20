import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { FolderPlus, UserPlus } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, spacing, typography, shadows } from "@/utils/theme";
import { lightTap } from "@/utils/haptics";

export interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onCreateProject: () => void;
  onCreateClient: () => void;
}

/**
 * Quick Action Menu - Shows options when FAB is pressed
 */
export function QuickActionMenu({
  visible,
  onClose,
  onCreateProject,
  onCreateClient,
}: QuickActionMenuProps) {
  const { colors } = useTheme();

  const handleClose = () => {
    lightTap();
    onClose();
  };

  const handleCreateProject = () => {
    lightTap();
    onClose();
    // Small delay to let modal close
    setTimeout(() => onCreateProject(), 100);
  };

  const handleCreateClient = () => {
    lightTap();
    onClose();
    // Small delay to let modal close
    setTimeout(() => onCreateClient(), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
      </Pressable>

      {/* Menu */}
      <View style={styles.menuContainer}>
        <View style={[styles.menu, { backgroundColor: colors.surface }, shadows.lg]}>
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
            Create New
          </Text>

          <TouchableOpacity
            onPress={handleCreateProject}
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            accessible={true}
            accessibilityLabel="Create new project"
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <FolderPlus size={24} color={colors.primary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                Project
              </Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Create a new billable project
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateClient}
            style={styles.menuItem}
            accessible={true}
            accessibilityLabel="Create new client"
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: `${colors.success}20` }]}>
              <UserPlus size={24} color={colors.success} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                Client
              </Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Add a new client for projects
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  menu: {
    width: "100%",
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  menuTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemContent: {
    flex: 1,
    gap: spacing.xs,
  },
  menuItemTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
  },
  menuItemSubtitle: {
    ...typography.caption,
    fontSize: 13,
  },
});
