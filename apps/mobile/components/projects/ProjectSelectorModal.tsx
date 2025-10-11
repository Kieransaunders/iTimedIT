import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useProjects } from "../../hooks/useProjects";
import { Project } from "../../types/models";
import {
    borderRadius,
    colors,
    sizing,
    spacing,
    typography,
} from "../../utils/theme";
import { useTheme } from "../../utils/ThemeContext";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectModal } from "./CreateProjectModal";
import { Id } from "../../convex/_generated/dataModel";

export interface ProjectSelectorModalProps {
  visible: boolean;
  selectedProject: Project | null;
  onSelect: (project: Project) => void;
  onClose: () => void;
  workspaceType?: "personal" | "team";
}

/**
 * ProjectSelectorModal component
 * Modal with project list, search functionality, and project selection
 */
export function ProjectSelectorModal({
  visible,
  selectedProject,
  onSelect,
  onClose,
  workspaceType,
}: ProjectSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { projects, isLoading } = useProjects({ searchTerm, workspaceType });
  const { colors: themeColors } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    setSearchTerm(""); // Reset search on selection
    onClose();
  };

  const handleClose = () => {
    setSearchTerm(""); // Reset search on close
    onClose();
  };

  const handleProjectCreated = async (projectId: Id<"projects">) => {
    // Find the newly created project and select it
    const newProject = projects.find((p) => p._id === projectId);
    if (newProject) {
      onSelect(newProject);
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Project</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Create New Project Button */}
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            style={[styles.createButton, { borderColor: themeColors.primary }]}
            onPress={() => setShowCreateModal(true)}
            accessible={true}
            accessibilityLabel="Create new project"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={20} color={themeColors.primary} />
            <Text style={[styles.createButtonText, { color: themeColors.primary }]}>
              Create New Project
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Search projects"
            accessibilityHint="Type to filter projects by name or client"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm
                ? "No projects found matching your search"
                : "No projects available"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <ProjectCard
                project={item}
                onPress={() => handleSelectProject(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
          />
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
          workspaceType={workspaceType}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  closeButton: {
    width: sizing.minTouchTarget,
    height: sizing.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    ...typography.title,
    color: colors.textSecondary,
    fontSize: 24,
  },
  createButtonContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  createButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
