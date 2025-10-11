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
import { useProjects } from "../../hooks/useProjects";
import { Project } from "../../types/models";
import {
    borderRadius,
    colors,
    sizing,
    spacing,
    typography,
} from "../../utils/theme";
import { ProjectCard } from "./ProjectCard";

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

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    setSearchTerm(""); // Reset search on selection
    onClose();
  };

  const handleClose = () => {
    setSearchTerm(""); // Reset search on close
    onClose();
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
