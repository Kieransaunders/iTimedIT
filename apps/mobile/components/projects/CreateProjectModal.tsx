import React, { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, colors, sizing, spacing, typography } from "@/utils/theme";
import { Id } from "@/convex/_generated/dataModel";
import { ClientPickerModal } from "@/components/clients/ClientPickerModal";
import { Client } from "@/types/models";

export interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (projectId: Id<"projects">) => void;
  workspaceType?: "personal" | "team";
}

type BudgetType = "hours" | "amount";

export function CreateProjectModal({
  visible,
  onClose,
  onSuccess,
  workspaceType = "team",
}: CreateProjectModalProps) {
  const { colors: themeColors } = useTheme();
  const { clients, isLoading: loadingClients } = useClients({ workspaceType });
  const { createProject } = useProjects();

  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [hourlyRate, setHourlyRate] = useState("100");
  const [budgetType, setBudgetType] = useState<BudgetType>("hours");
  const [budgetHours, setBudgetHours] = useState("40");
  const [budgetAmount, setBudgetAmount] = useState("4000");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const handleClose = () => {
    // Reset form
    setProjectName("");
    setSelectedClientId(null);
    setHourlyRate("100");
    setBudgetType("hours");
    setBudgetHours("40");
    setBudgetAmount("4000");
    setError(null);
    onClose();
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!selectedClientId) {
      setError("Please select a client");
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      setError("Please enter a valid hourly rate");
      return;
    }

    let budgetHoursNum: number | undefined;
    let budgetAmountNum: number | undefined;

    if (budgetType === "hours") {
      budgetHoursNum = parseFloat(budgetHours);
      if (isNaN(budgetHoursNum) || budgetHoursNum <= 0) {
        setError("Please enter valid budget hours");
        return;
      }
    } else {
      budgetAmountNum = parseFloat(budgetAmount);
      if (isNaN(budgetAmountNum) || budgetAmountNum <= 0) {
        setError("Please enter a valid budget amount");
        return;
      }
    }

    try {
      setIsCreating(true);
      setError(null);

      const projectId = await createProject({
        clientId: selectedClientId,
        name: projectName,
        hourlyRate: rate,
        budgetType,
        budgetHours: budgetHoursNum,
        budgetAmount: budgetAmountNum,
        workspaceType,
      });

      onSuccess?.(projectId);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>New Project</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={24} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Project Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>
              Project Name <Text style={{ color: themeColors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder="Enter project name"
              placeholderTextColor={themeColors.textSecondary}
              value={projectName}
              onChangeText={setProjectName}
              autoCapitalize="words"
            />
          </View>

          {/* Client Selector */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>
              Client <Text style={{ color: themeColors.error }}>*</Text>
            </Text>
            <View style={styles.clientSelectorRow}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    styles.clientSelector,
                    {
                      backgroundColor: themeColors.surface,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => setShowClientPicker(true)}
                >
                  <Text
                    style={[
                      styles.clientSelectorText,
                      {
                        color: selectedClientId
                          ? themeColors.textPrimary
                          : themeColors.textSecondary,
                      },
                    ]}
                  >
                    {selectedClientId
                      ? clients.find((c) => c._id === selectedClientId)?.name || "Select a client..."
                      : "Select a client..."}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.newClientButton, { borderColor: themeColors.primary }]}
                onPress={() => {
                  // TODO: Show create client modal
                }}
              >
                <Text style={[styles.newClientButtonText, { color: themeColors.primary }]}>
                  + New
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hourly Rate */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>
              Hourly Rate <Text style={{ color: themeColors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder="100"
              placeholderTextColor={themeColors.textSecondary}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Budget Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Budget Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  budgetType === "hours" && styles.segmentButtonActive,
                  {
                    backgroundColor:
                      budgetType === "hours" ? themeColors.primary : themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={() => setBudgetType("hours")}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        budgetType === "hours" ? "#FFFFFF" : themeColors.textPrimary,
                    },
                  ]}
                >
                  Hours
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  budgetType === "amount" && styles.segmentButtonActive,
                  {
                    backgroundColor:
                      budgetType === "amount" ? themeColors.primary : themeColors.surface,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={() => setBudgetType("amount")}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color:
                        budgetType === "amount" ? "#FFFFFF" : themeColors.textPrimary,
                    },
                  ]}
                >
                  Amount
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Hours/Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>
              {budgetType === "hours" ? "Budget Hours" : "Budget Amount"}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder={budgetType === "hours" ? "40" : "4000"}
              placeholderTextColor={themeColors.textSecondary}
              value={budgetType === "hours" ? budgetHours : budgetAmount}
              onChangeText={budgetType === "hours" ? setBudgetHours : setBudgetAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={themeColors.error} />
              <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: themeColors.border }]}
            onPress={handleClose}
            disabled={isCreating}
          >
            <Text style={[styles.cancelButtonText, { color: themeColors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: themeColors.primary },
              isCreating && styles.createButtonDisabled,
            ]}
            onPress={handleCreateProject}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Project</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Client Picker Modal */}
        <ClientPickerModal
          visible={showClientPicker}
          selectedClientId={selectedClientId}
          onSelect={(client: Client) => setSelectedClientId(client._id)}
          onClose={() => setShowClientPicker(false)}
          workspaceType={workspaceType}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: sizing.minTouchTarget,
    height: sizing.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  clientSelectorRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  clientSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  clientSelectorText: {
    ...typography.body,
  },
  newClientButton: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: sizing.inputHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  newClientButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    height: sizing.inputHeight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentButtonActive: {},
  segmentButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    height: sizing.buttonHeight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    height: sizing.buttonHeight,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...typography.body,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
