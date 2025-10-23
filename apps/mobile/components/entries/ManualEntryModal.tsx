import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Id } from "../../convex/_generated/dataModel";
import { useCategories } from "../../hooks/useCategories";
import { useEntries } from "../../hooks/useEntries";
import { useProjects } from "../../hooks/useProjects";
import { formatDateTime, formatDuration } from "../../utils/formatters";
import { colors, spacing, typography } from "../../utils/theme";
import { ProjectSelectorModal } from "../projects";
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
  const { projects } = useProjects();
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
    onClose();
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
                onPress={() => setShowProjectSelector(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedProject && styles.placeholderText,
                  ]}
                >
                  {selectedProject?.name || "Select a project"}
                </Text>
              </TouchableOpacity>
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

      {/* Project Selector Modal - Rendered outside to avoid modal-on-modal */}
      {showProjectSelector && (
        <ProjectSelectorModal
          visible={showProjectSelector}
          selectedProject={selectedProject}
          onClose={() => setShowProjectSelector(false)}
          onSelect={(project) => {
            setSelectedProject(project);
            setShowProjectSelector(false);
          }}
        />
      )}
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
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
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
