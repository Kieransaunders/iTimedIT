import { Project } from "@/types/models";
import { borderRadius, colors, opacity, sizing, spacing, typography } from "@/utils/theme";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
      <View style={styles.container}>
        <Text style={styles.label}>Project</Text>
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
          <Text
            style={[
              styles.triggerText,
              !selectedProject && styles.triggerTextPlaceholder,
            ]}
          >
            {selectedProject ? selectedProject.name : "Select a project"}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>
      </View>

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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  triggerDisabled: {
    opacity: opacity.disabled,
  },
  triggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  triggerTextPlaceholder: {
    color: colors.textSecondary,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
});
