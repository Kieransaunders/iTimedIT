import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useProjects } from "../../hooks/useProjects";
import { useClients } from "../../hooks/useClients";
import { Project } from "../../types/models";
import { Id } from "../../convex/_generated/dataModel";
import {
    borderRadius,
    colors,
    sizing,
    spacing,
    typography,
} from "../../utils/theme";
import { useTheme } from "../../utils/ThemeContext";
import { ProjectCard } from "./ProjectCard";
import Toast from "react-native-toast-message";

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
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const { projects, isLoading, createProject } = useProjects({ searchTerm, workspaceType });
  const { clients, createClient } = useClients();
  const { colors: themeColors } = useTheme();

  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    clientId: "" as Id<"clients"> | "",
    hourlyRate: 100,
    budgetType: "hours" as "hours" | "amount",
    budgetHours: undefined as number | undefined,
    budgetAmount: undefined as number | undefined,
  });

  const [newClientForm, setNewClientForm] = useState({
    name: "",
    color: "#8b5cf6",
  });

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    resetForms();
    onClose();
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const resetForms = () => {
    setSearchTerm("");
    setShowCreateProject(false);
    setShowCreateClient(false);
    setNewProjectForm({
      name: "",
      clientId: "",
      hourlyRate: 100,
      budgetType: "hours",
      budgetHours: undefined,
      budgetAmount: undefined,
    });
    setNewClientForm({
      name: "",
      color: "#8b5cf6",
    });
  };

  const handleCreateProjectClick = () => {
    setShowCreateProject(true);
    setShowCreateClient(false);
    setSearchTerm("");
  };

  const handleCreateClientClick = () => {
    setShowCreateClient(true);
  };

  const handleClientCreated = async () => {
    if (!newClientForm.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Client name is required",
      });
      return;
    }

    setIsCreatingClient(true);
    try {
      const clientId = await createClient({
        name: newClientForm.name.trim(),
        color: newClientForm.color,
      });

      setNewProjectForm((prev) => ({ ...prev, clientId }));
      setShowCreateClient(false);
      setNewClientForm({ name: "", color: "#8b5cf6" });

      Toast.show({
        type: "success",
        text1: `Client "${newClientForm.name.trim()}" created`,
      });
    } catch (error: any) {
      console.error("Failed to create client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to create client",
        text2: error.message,
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleProjectCreated = async () => {
    if (!newProjectForm.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Project name is required",
      });
      return;
    }
    // Only require client for team workspace
    if (workspaceType === "team" && !newProjectForm.clientId) {
      Toast.show({
        type: "error",
        text1: "Please select a client",
      });
      return;
    }

    setIsCreatingProject(true);
    try {
      // For personal workspace, clientId can be empty/undefined
      const projectId = await createProject({
        name: newProjectForm.name.trim(),
        clientId: newProjectForm.clientId || undefined,
        hourlyRate: newProjectForm.hourlyRate,
        budgetType: newProjectForm.budgetType,
        budgetHours:
          newProjectForm.budgetType === "hours"
            ? newProjectForm.budgetHours
            : undefined,
        budgetAmount:
          newProjectForm.budgetType === "amount"
            ? newProjectForm.budgetAmount
            : undefined,
      });

      // Find the created project and select it
      const createdProject = projects.find((p) => p._id === projectId);
      if (createdProject) {
        handleSelectProject(createdProject);
      } else {
        // Project was created but not yet in the list, just close and reset
        resetForms();
        onClose();
      }

      Toast.show({
        type: "success",
        text1: `Project "${newProjectForm.name.trim()}" created`,
      });
    } catch (error: any) {
      console.error("Failed to create project:", error);
      Toast.show({
        type: "error",
        text1: "Failed to create project",
        text2: error.message,
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateProject(false);
    setShowCreateClient(false);
    setNewProjectForm({
      name: "",
      clientId: "",
      hourlyRate: 100,
      budgetType: "hours",
      budgetHours: undefined,
      budgetAmount: undefined,
    });
    setNewClientForm({
      name: "",
      color: "#8b5cf6",
    });
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

        {!showCreateProject && !showCreateClient ? (
          <>
            {/* Create New Project Button */}
            <View style={styles.createButtonContainer}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateProjectClick}
                accessible={true}
                accessibilityLabel="Create new project"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                <Text style={styles.createButtonText}>Create New Project</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
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

            {/* Project List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading projects...</Text>
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="folder-outline" size={48} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textPrimary }]}>
                  {searchTerm
                    ? "No projects found matching your search"
                    : "No projects yet"}
                </Text>
                <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                  Create your first project above to get started
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
          </>
        ) : null}

        {/* Create Client Form */}
        {showCreateClient && (
          <ScrollView style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>New Client</Text>
              <TouchableOpacity
                onPress={handleCancelCreate}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Client Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter client name"
                  placeholderTextColor={colors.textSecondary}
                  value={newClientForm.name}
                  onChangeText={(text) => setNewClientForm((prev) => ({ ...prev, name: text }))}
                  autoFocus
                  accessible={true}
                  accessibilityLabel="Client name"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorPickerContainer}>
                  <View style={[styles.colorPreview, { backgroundColor: newClientForm.color }]} />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="#8b5cf6"
                    placeholderTextColor={colors.textSecondary}
                    value={newClientForm.color}
                    onChangeText={(text) => setNewClientForm((prev) => ({ ...prev, color: text }))}
                    autoCapitalize="none"
                    accessible={true}
                    accessibilityLabel="Client color"
                  />
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setShowCreateClient(false)}
                  accessible={true}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formButton,
                    styles.submitButton,
                    (isCreatingClient || !newClientForm.name.trim()) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleClientCreated}
                  disabled={isCreatingClient || !newClientForm.name.trim()}
                  accessible={true}
                  accessibilityLabel="Create client"
                  accessibilityRole="button"
                >
                  {isCreatingClient ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Client</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Create Project Form */}
        {showCreateProject && !showCreateClient && (
          <ScrollView style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>New Project</Text>
              <TouchableOpacity
                onPress={handleCancelCreate}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Project Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter project name"
                  placeholderTextColor={colors.textSecondary}
                  value={newProjectForm.name}
                  onChangeText={(text) => setNewProjectForm((prev) => ({ ...prev, name: text }))}
                  autoFocus
                  accessible={true}
                  accessibilityLabel="Project name"
                />
              </View>

              {/* Only show client field for team workspace */}
              {workspaceType === "team" && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Client *</Text>
                  <View style={styles.clientPickerContainer}>
                    <View style={styles.pickerWrapper}>
                      <TextInput
                        style={[styles.formInput, styles.pickerInput]}
                        placeholder="Select a client..."
                        placeholderTextColor={colors.textSecondary}
                        value={
                          newProjectForm.clientId
                            ? clients?.find((c) => c._id === newProjectForm.clientId)?.name || ""
                            : ""
                        }
                        editable={false}
                        accessible={true}
                        accessibilityLabel="Selected client"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.newClientButton}
                      onPress={handleCreateClientClick}
                      accessible={true}
                      accessibilityLabel="Create new client"
                      accessibilityRole="button"
                    >
                      <Text style={styles.newClientButtonText}>+ New</Text>
                    </TouchableOpacity>
                  </View>
                  {clients && clients.length > 0 && (
                    <View style={styles.clientListContainer}>
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client._id}
                          style={[
                            styles.clientOption,
                            newProjectForm.clientId === client._id && styles.clientOptionSelected,
                          ]}
                          onPress={() => setNewProjectForm((prev) => ({ ...prev, clientId: client._id }))}
                          accessible={true}
                          accessibilityLabel={`Select ${client.name}`}
                          accessibilityRole="button"
                        >
                          <View style={[styles.clientColor, { backgroundColor: client.color || "#8b5cf6" }]} />
                          <Text
                            style={[
                              styles.clientOptionText,
                              newProjectForm.clientId === client._id && styles.clientOptionTextSelected,
                            ]}
                          >
                            {client.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Hourly Rate *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  value={newProjectForm.hourlyRate.toString()}
                  onChangeText={(text) => setNewProjectForm((prev) => ({ ...prev, hourlyRate: Number(text) || 0 }))}
                  keyboardType="decimal-pad"
                  accessible={true}
                  accessibilityLabel="Hourly rate"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Budget Type</Text>
                <View style={styles.budgetTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      newProjectForm.budgetType === "hours" && styles.budgetTypeButtonActive,
                    ]}
                    onPress={() => setNewProjectForm((prev) => ({ ...prev, budgetType: "hours" }))}
                    accessible={true}
                    accessibilityLabel="Budget by hours"
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        newProjectForm.budgetType === "hours" && styles.budgetTypeButtonTextActive,
                      ]}
                    >
                      Hours
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.budgetTypeButton,
                      newProjectForm.budgetType === "amount" && styles.budgetTypeButtonActive,
                    ]}
                    onPress={() => setNewProjectForm((prev) => ({ ...prev, budgetType: "amount" }))}
                    accessible={true}
                    accessibilityLabel="Budget by amount"
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.budgetTypeButtonText,
                        newProjectForm.budgetType === "amount" && styles.budgetTypeButtonTextActive,
                      ]}
                    >
                      Amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {newProjectForm.budgetType === "hours" && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Budget Hours</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="40"
                    placeholderTextColor={colors.textSecondary}
                    value={newProjectForm.budgetHours?.toString() || ""}
                    onChangeText={(text) =>
                      setNewProjectForm((prev) => ({
                        ...prev,
                        budgetHours: text ? Number(text) : undefined,
                      }))
                    }
                    keyboardType="decimal-pad"
                    accessible={true}
                    accessibilityLabel="Budget hours"
                  />
                </View>
              )}

              {newProjectForm.budgetType === "amount" && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Budget Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="4000"
                    placeholderTextColor={colors.textSecondary}
                    value={newProjectForm.budgetAmount?.toString() || ""}
                    onChangeText={(text) =>
                      setNewProjectForm((prev) => ({
                        ...prev,
                        budgetAmount: text ? Number(text) : undefined,
                      }))
                    }
                    keyboardType="decimal-pad"
                    accessible={true}
                    accessibilityLabel="Budget amount"
                  />
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={handleCancelCreate}
                  accessible={true}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formButton,
                    styles.submitButton,
                    (isCreatingProject ||
                     !newProjectForm.name.trim() ||
                     (workspaceType === "team" && !newProjectForm.clientId)) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={handleProjectCreated}
                  disabled={
                    isCreatingProject ||
                    !newProjectForm.name.trim() ||
                    (workspaceType === "team" && !newProjectForm.clientId)
                  }
                  accessible={true}
                  accessibilityLabel="Create project"
                  accessibilityRole="button"
                >
                  {isCreatingProject ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Project</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  createButtonContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  createButtonText: {
    ...typography.body,
    color: colors.primary,
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
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.body,
    fontSize: 14,
    textAlign: "center",
  },
  // Form styles
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  formContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  formField: {
    gap: spacing.sm,
  },
  formLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  colorPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  clientPickerContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pickerWrapper: {
    flex: 1,
  },
  pickerInput: {
    color: colors.textSecondary,
  },
  newClientButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  newClientButtonText: {
    ...typography.body,
    color: "#fff",
    fontWeight: "600",
  },
  clientListContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    maxHeight: 150,
  },
  clientOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clientOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  clientColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  clientOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  clientOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  budgetTypeContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  budgetTypeButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  budgetTypeButtonTextActive: {
    color: colors.primary,
  },
  formActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  formButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body,
    color: "#fff",
    fontWeight: "600",
  },
});
