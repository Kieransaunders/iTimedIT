import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
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
import { useTheme } from "../../utils/ThemeContext";
import { formatDateTime, formatDuration } from "../../utils/formatters";
import { spacing, typography } from "../../utils/theme";
import { ProjectSelectorModal } from "../projects";
import { Button, Input } from "../ui";

interface EditEntryModalProps {
  visible: boolean;
  entry: any | null;
  onClose: () => void;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function EditEntryModal({
  visible,
  entry,
  onClose,
  onSuccess,
  onDelete,
}: EditEntryModalProps) {
  const { colors } = useTheme();
  const { projects } = useProjects();
  const { categories } = useCategories();
  const { editEntry, deleteEntry } = useEntries();

  // Create styles with theme colors using useMemo
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Pre-fill form when entry changes
  useEffect(() => {
    if (entry && visible) {
      setSelectedProject(entry.project || null);
      const start = new Date(entry.startedAt);
      const end = new Date(entry.stoppedAt || entry.startedAt + (entry.seconds || 0) * 1000);
      setStartDate(start);
      setEndDate(end);
      setNote(entry.note || "");
      setSelectedCategory(entry.category || null);
      setError(null);

      const durationInSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
      setDurationHours(Math.floor(durationInSeconds / 3600));
      setDurationMinutes(Math.floor((durationInSeconds % 3600) / 60));
      setDurationSeconds(durationInSeconds % 60);
    }
  }, [entry, visible]);

  const duration = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
  const isValid = selectedProject && endDate > startDate;

  useEffect(() => {
    const newDurationInSeconds = (durationHours * 3600) + (durationMinutes * 60) + durationSeconds;
    if (!isNaN(newDurationInSeconds) && startDate) {
      const newEndDate = new Date(startDate.getTime() + newDurationInSeconds * 1000);
      setEndDate(newEndDate);
    }
  }, [durationHours, durationMinutes, durationSeconds, startDate]);

  const handleSubmit = async () => {
    if (!isValid || !selectedProject || !entry) {
      setError("Please ensure end time is after start time");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await editEntry(entry._id as Id<"timeEntries">, {
        startedAt: startDate.getTime(),
        stoppedAt: endDate.getTime(),
        note: note.trim() || "",
        category: selectedCategory || "",
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this time entry? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!entry) return;

            setIsDeleting(true);
            setError(null);

            try {
              await deleteEntry(entry._id as Id<"timeEntries">);
              onDelete?.();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to delete entry");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  if (!entry) {
    return null;
  }

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
            <Text style={styles.title}>Edit Time Entry</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Project Display (Read-only for now) */}
            <View style={styles.field}>
              <Text style={styles.label}>Project</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.selectorText}>
                  {selectedProject?.name || "Unknown Project"}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Project cannot be changed after entry is created
              </Text>
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

            {/* Duration Input */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Duration</Text>
              <View style={[styles.durationInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Input
                  value={String(durationHours)}
                  onChangeText={(text) => setDurationHours(Number(text) || 0)}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { color: colors.textPrimary }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.durationSeparator, { color: colors.textSecondary }]}>h</Text>
                <Input
                  value={String(durationMinutes)}
                  onChangeText={(text) => setDurationMinutes(Number(text) || 0)}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { color: colors.textPrimary }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.durationSeparator, { color: colors.textSecondary }]}>m</Text>
                <Input
                  value={String(durationSeconds)}
                  onChangeText={(text) => setDurationSeconds(Number(text) || 0)}
                  keyboardType="number-pad"
                  style={[styles.durationInput, { color: colors.textPrimary }]}
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.durationSeparator, { color: colors.textSecondary }]}>s</Text>
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
              onPress={handleDelete}
              variant="secondary"
              disabled={isSubmitting || isDeleting}
              loading={isDeleting}
              style={styles.deleteButton}
            >
              Delete Entry
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting || isDeleting}
              loading={isSubmitting}
            >
              Save Changes
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

      {/* Project Selector Modal - Disabled for editing */}
      <ProjectSelectorModal
        visible={showProjectSelector}
        selectedProject={selectedProject}
        onClose={() => setShowProjectSelector(false)}
        onSelect={(project) => {
          setSelectedProject(project);
          setShowProjectSelector(false);
        }}
      />
    </>
  );
}

const createStyles = (colors: typeof import("../../utils/theme").lightColors) => StyleSheet.create({
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
  readOnlyField: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
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
  durationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  durationInput: {
    flex: 1,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  durationSeparator: {
    ...typography.body,
    fontWeight: "bold",
    marginHorizontal: spacing.xs,
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteButton: {
    backgroundColor: colors.error,
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
