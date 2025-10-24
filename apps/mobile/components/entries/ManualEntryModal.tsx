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
import { spacing, typography } from "../../utils/theme";
import { useTheme } from "../../utils/ThemeContext";
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
  const { colors } = useTheme();
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const { projects, isLoading: isLoadingProjects } = useProjects({ searchTerm: projectSearchTerm });
  const { categories } = useCategories();
  const { createManualEntry } = useEntries();

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 3600000)); // Default to 1 hour later
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
      const newStartDate = new Date();
      setStartDate(newStartDate);
      setEndDate(new Date(newStartDate.getTime() + 3600000)); // +1 hour
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Add Time Entry</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Project Selector */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Project *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowProjectSelector(!showProjectSelector)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: selectedProject ? colors.textPrimary : colors.textSecondary },
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
                <View style={[styles.inlinePickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Search Input */}
                  <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                    <MaterialCommunityIcons
                      name="magnify"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={[styles.searchInput, { color: colors.textPrimary }]}
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
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
                      </View>
                    ) : projects.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                          name="folder-outline"
                          size={32}
                          color={colors.textSecondary}
                        />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
                            { borderBottomColor: colors.border },
                            selectedProject?._id === item._id && {
                              backgroundColor: `${colors.primary}10`,
                            },
                          ]}
                          onPress={() => handleProjectSelect(item)}
                        >
                          <View style={styles.projectItemContent}>
                            <Text
                              style={[
                                styles.projectItemText,
                                { color: selectedProject?._id === item._id ? colors.primary : colors.textPrimary },
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.client && (
                              <Text style={[styles.projectClientText, { color: colors.textSecondary }]}>
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>Start Time *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.textPrimary }]}>
                  {formatDateTime(startDate.getTime())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Date/Time */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>End Time *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={[styles.selectorText, { color: colors.textPrimary }]}>
                  {formatDateTime(endDate.getTime())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Duration Display */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Duration</Text>
              <View style={[styles.durationDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.durationText, { color: colors.primary }]}>
                  {formatDuration(duration)}
                </Text>
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Category</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: selectedCategory ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {selectedCategory || "Select a category (optional)"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note Input */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Note</Text>
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
              <View style={[styles.errorContainer, { backgroundColor: `${colors.error}20` }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
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
        {Platform.OS === "ios" && showStartPicker && (
          <Modal
            visible={showStartPicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowStartPicker(false)}
          >
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Start Time</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={[styles.cancelButton, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setStartDate(date);
                    // Auto-adjust end date if it's before start date
                    if (date > endDate) {
                      setEndDate(new Date(date.getTime() + 3600000)); // +1 hour
                    }
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        )}

        {Platform.OS === "android" && showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display="default"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) {
                setStartDate(date);
                if (date > endDate) {
                  setEndDate(new Date(date.getTime() + 3600000));
                }
              }
            }}
          />
        )}

        {Platform.OS === "ios" && showEndPicker && (
          <Modal
            visible={showEndPicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowEndPicker(false)}
          >
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>End Time</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={[styles.cancelButton, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display="spinner"
                minimumDate={startDate}
                onChange={(event, date) => {
                  if (date) setEndDate(date);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        )}

        {Platform.OS === "android" && showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display="default"
            minimumDate={startDate}
            onChange={(event, date) => {
              setShowEndPicker(false);
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
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Text style={[styles.cancelButton, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Select Category</Text>
                <TouchableOpacity onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryPicker(false);
                }}>
                  <Text style={[styles.clearButton, { color: colors.error }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedCategory(category.name);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{category.name}</Text>
                    {selectedCategory === category.name && (
                      <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.heading,
  },
  cancelButton: {
    ...typography.body,
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
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  selector: {
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: {
    ...typography.body,
    flex: 1,
  },
  inlinePickerContainer: {
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
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
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  projectItemContent: {
    flex: 1,
  },
  projectItemText: {
    ...typography.body,
  },
  projectClientText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  durationDisplay: {
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
  },
  durationText: {
    ...typography.body,
    fontWeight: "600",
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorContainer: {
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    ...typography.heading,
  },
  clearButton: {
    ...typography.body,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    ...typography.body,
  },
  checkmark: {
    ...typography.heading,
  },
});
