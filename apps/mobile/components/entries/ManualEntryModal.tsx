import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";
import { useCategories } from "../../hooks/useCategories";
import { useEntries } from "../../hooks/useEntries";
import { useProjects } from "../../hooks/useProjects";
import { formatDateTime, formatDuration } from "../../utils/formatters";
import { colors, spacing, typography } from "../../utils/theme";
import { Button, Input } from "../ui";

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ManualEntryModal({
  visible,
  onClose,
  onSuccess,
}: ManualEntryModalProps) {
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const { projects, isLoading: isLoadingProjects } = useProjects({ searchTerm: projectSearchTerm });
  const { categories } = useCategories();
  const { createManualEntry } = useEntries();

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
  const isValid = selectedProject && endDate > startDate;

  const handleSubmit = async () => {
    if (!isValid || !selectedProject) {
      setError("Please select a project and ensure end time is after start time");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createManualEntry({
        projectId: selectedProject._id as Id<"projects">,
        startedAt: startDate.getTime(),
        stoppedAt: endDate.getTime(),
        note: note.trim() || undefined,
        category: selectedCategory || undefined,
      });

      // Reset form
      setSelectedProject(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setNote("");
      setSelectedCategory(null);
      setError(null);

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setShowProjectSelector(false);
    setProjectSearchTerm("");
    onClose();
  };

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    setShowProjectSelector(false);
    setProjectSearchTerm("");
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Time Entry</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Project Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Project *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowProjectSelector(!showProjectSelector)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedProject && styles.placeholderText,
                  ]}
                >
                  {selectedProject?.name || "Select a project"}
                </Text>
                <MaterialCommunityIcons
                  name={showProjectSelector ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Inline Project Picker */}
              {showProjectSelector && (
                <View style={styles.inlinePickerContainer}>
                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <MaterialCommunityIcons
                      name="magnify"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search projects..."
                      placeholderTextColor={colors.textSecondary}
                      value={projectSearchTerm}
                      onChangeText={setProjectSearchTerm}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Project List */}
                  <ScrollView
                    style={styles.projectListContainer}
                    nestedScrollEnabled
                  >
                    {isLoadingProjects ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading...</Text>
                      </View>
                    ) : projects.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                          name="folder-outline"
                          size={32}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.emptyText}>
                          {projectSearchTerm
                            ? "No projects found"
                            : "No projects yet"}
                        </Text>
                      </View>
                    ) : (
                      projects.map((item) => (
                        <TouchableOpacity
                          key={item._id}
                          style={[
                            styles.projectItem,
                            selectedProject?._id === item._id &&
                              styles.projectItemSelected,
                          ]}
                          onPress={() => handleProjectSelect(item)}
                        >
                          <View style={styles.projectItemContent}>
                            <Text
                              style={[
                                styles.projectItemText,
                                selectedProject?._id === item._id &&
                                  styles.projectItemTextSelected,
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.client && (
                              <Text style={styles.projectClientText}>
                                {item.client.name}
                              </Text>
                            )}
                          </View>
                          {selectedProject?._id === item._id && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Start Date/Time */}
            <View style={styles.field}>
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.selectorText}>
                  {formatDateTime(startDate.getTime())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Date/Time */}
            <View style={styles.field}>
              <Text style={styles.label}>End Time *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.selectorText}>
                  {formatDateTime(endDate.getTime())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Duration Display */}
            <View style={styles.field}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationDisplay}>
                <Text style={styles.durationText}>
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedCategory && styles.placeholderText,
                  ]}
                >
                  {selectedCategory || "Select a category (optional)"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Note</Text>
              <Input
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                multiline
                numberOfLines={3}
                style={styles.noteInput}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
            >
              Add Entry
            </Button>
          </View>
        </View>

        {/* Date/Time Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowStartPicker(Platform.OS === "ios");
              if (date) {
                setStartDate(date);
                // Auto-adjust end date if it's before start date
                if (date > endDate) {
                  setEndDate(new Date(date.getTime() + 3600000)); // +1 hour
                }
              }
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={startDate}
            onChange={(event, date) => {
              setShowEndPicker(Platform.OS === "ios");
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Category Picker Modal */}
        {showCategoryPicker && (
          <Modal
            visible={showCategoryPicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryPicker(false);
                }}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedCategory(category.name);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{category.name}</Text>
                    {selectedCategory === category.name && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  cancelButton: {
    ...typography.body,
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  selector: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  inlinePickerContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  projectListContainer: {
    maxHeight: 200,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  projectItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  projectItemContent: {
    flex: 1,
  },
  projectItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  projectItemTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  projectClientText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  durationDisplay: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorContainer: {
    backgroundColor: `${colors.error}20`,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  clearButton: {
    ...typography.body,
    color: colors.error,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  checkmark: {
    ...typography.heading,
    color: colors.primary,
  },
});
