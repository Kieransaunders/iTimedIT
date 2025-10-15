import { Project } from "@/types/models";
import { borderRadius, opacity, sizing, spacing, typography } from "@/utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ProjectSelectorModal } from "../projects/ProjectSelectorModal";

export interface ProjectSelectorProps {
  selectedProject: Project | null;
  onSelect: (project: Project) => void;
  disabled?: boolean;
  workspaceType?: "personal" | "team";
}

/**
 * Project selector component with modal
 */
export function ProjectSelector({
  selectedProject,
  onSelect,
  disabled = false,
  workspaceType,
}: ProjectSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleOpenModal = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
        accessible={true}
        accessibilityLabel="Select project"
        accessibilityRole="button"
        accessibilityHint="Opens project selection modal"
      >
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            {selectedProject?.color && (
              <View style={[styles.colorDot, { backgroundColor: selectedProject.color }]} />
            )}
            <Text style={[styles.projectName, !selectedProject && styles.triggerTextPlaceholder]}>
              {selectedProject ? selectedProject.name : "Select a project"}
            </Text>
          </View>
          {selectedProject?.client && (
            <Text style={styles.clientName}>– {selectedProject.client.name}</Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <ProjectSelectorModal
        visible={modalVisible}
        selectedProject={selectedProject}
        onSelect={handleSelectProject}
        onClose={() => setModalVisible(false)}
        workspaceType={workspaceType}
      />
    </>
  );
}

const createStyles = (colors: typeof import("@/utils/theme").lightColors) =>
  StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    triggerDisabled: {
      opacity: opacity.disabled,
    },
    projectInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    projectHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    projectName: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 16,
    },
    clientName: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 14,
    },
    triggerTextPlaceholder: {
      color: colors.textSecondary,
      fontWeight: "400",
    },
  });
