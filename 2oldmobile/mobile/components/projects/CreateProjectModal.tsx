import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/utils/ThemeContext";
import { useClients } from "@/hooks/useClients";
import { useOrganization } from "@/contexts/OrganizationContext";
import { borderRadius, spacing, typography, sizing } from "@/utils/theme";
import { lightTap, mediumTap } from "@/utils/haptics";
import { Toast } from "@/components/ui/Toast";
import { Plus } from "lucide-react-native";

export interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  workspaceType?: "personal" | "work"; // Deprecated: now uses context
}

export function CreateProjectModal({
  visible,
  onClose,
  onSuccess,
  workspaceType, // Ignored - use context instead
}: CreateProjectModalProps) {
  const { colors } = useTheme();
  const { clients, createClient: createClientMutation, currentWorkspace } = useClients();
  const createProject = useMutation(api.projects.create);

  // State for inline client creation
  const [showClientInput, setShowClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState("50");
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const [budgetHours, setBudgetHours] = useState("10");
  const [budgetAmount, setBudgetAmount] = useState("500");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const handleClose = () => {
    lightTap();
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setClientId(null);
    setHourlyRate("50");
    setBudgetType("hours");
    setBudgetHours("10");
    setBudgetAmount("500");
    setShowClientInput(false);
    setNewClientName("");
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      showErrorToast("Client name is required");
      return;
    }

    try {
      lightTap();
      const newClientId = await createClientMutation({
        name: newClientName.trim(),
      });

      // Auto-select the newly created client
      setClientId(newClientId as string);
      setShowClientInput(false);
      setNewClientName("");
      showSuccessToast(`Client "${newClientName}" created!`);
    } catch (error: any) {
      console.error("Failed to create client:", error);
      showErrorToast(error.message || "Failed to create client");
    }
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType("error");
    setShowToast(true);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType("success");
    setShowToast(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      showErrorToast("Project name is required");
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      showErrorToast("Hourly rate must be a positive number");
      return;
    }

    let budgetHoursValue: number | undefined;
    let budgetAmountValue: number | undefined;

    if (budgetType === "hours") {
      const hours = parseFloat(budgetHours);
      if (isNaN(hours) || hours <= 0) {
        showErrorToast("Budget hours must be a positive number");
        return;
      }
      budgetHoursValue = hours;
    } else {
      const amount = parseFloat(budgetAmount);
      if (isNaN(amount) || amount <= 0) {
        showErrorToast("Budget amount must be a positive number");
        return;
      }
      budgetAmountValue = amount;
    }

    try {
      setIsSubmitting(true);
      mediumTap();

      await createProject({
        name: name.trim(),
        clientId: clientId ? (clientId as any) : undefined, // Pass undefined, not null
        hourlyRate: rate,
        budgetType,
        budgetHours: budgetHoursValue,
        budgetAmount: budgetAmountValue,
        workspaceType: currentWorkspace, // Use workspace from context
      });

      showSuccessToast(`Project "${name}" created successfully!`);
      resetForm();

      // Wait a moment for toast to show, then close
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error("Failed to create project:", error);
      showErrorToast(error.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Create Project
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* Project Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Project Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Website Redesign"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Client Selection */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Client (Optional)
            </Text>
            <View style={styles.clientButtons}>
              {/* No Client Option */}
              <TouchableOpacity
                onPress={() => {
                  lightTap();
                  setClientId(null);
                }}
                style={[
                  styles.clientButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !clientId && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Text
                  style={[
                    styles.clientButtonText,
                    { color: colors.textSecondary },
                    !clientId && { color: colors.primary, fontWeight: "600" },
                  ]}
                >
                  No Client
                </Text>
              </TouchableOpacity>

              {/* Existing Clients */}
              {clients.map((client) => (
                <TouchableOpacity
                  key={client._id}
                  onPress={() => {
                    lightTap();
                    setClientId(client._id);
                  }}
                  style={[
                    styles.clientButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    clientId === client._id && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.clientButtonText,
                      { color: colors.textSecondary },
                      clientId === client._id && { color: colors.primary, fontWeight: "600" },
                    ]}
                  >
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Add New Client Button */}
              {!showClientInput && (
                <TouchableOpacity
                  onPress={() => {
                    lightTap();
                    setShowClientInput(true);
                  }}
                  style={[
                    styles.clientButton,
                    styles.newClientButton,
                    { backgroundColor: colors.surface, borderColor: colors.success, borderStyle: "dashed" },
                  ]}
                >
                  <Plus size={16} color={colors.success} />
                  <Text style={[styles.clientButtonText, { color: colors.success, fontWeight: "600" }]}>
                    New Client
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Inline Client Creation Input */}
            {showClientInput && (
              <View style={styles.inlineClientForm}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inlineClientInput,
                    { backgroundColor: colors.surface, borderColor: colors.success, color: colors.textPrimary },
                  ]}
                  value={newClientName}
                  onChangeText={setNewClientName}
                  placeholder="Client name..."
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateClient}
                />
                <View style={styles.inlineClientActions}>
                  <TouchableOpacity
                    onPress={() => {
                      lightTap();
                      setShowClientInput(false);
                      setNewClientName("");
                    }}
                    style={[styles.inlineButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.inlineButtonText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateClient}
                    style={[styles.inlineButton, { backgroundColor: colors.success }]}
                  >
                    <Text style={[styles.inlineButtonText, { color: "#ffffff" }]}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Hourly Rate */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Hourly Rate ($) *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="50"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Budget Type Toggle */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Budget Type *
            </Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => {
                  lightTap();
                  setBudgetType("hours");
                }}
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  budgetType === "hours" && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    budgetType === "hours" && { color: "#ffffff", fontWeight: "600" },
                  ]}
                >
                  Hours
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  lightTap();
                  setBudgetType("amount");
                }}
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  budgetType === "amount" && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    budgetType === "amount" && { color: "#ffffff", fontWeight: "600" },
                  ]}
                >
                  Amount
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Value */}
          {budgetType === "hours" ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Budget Hours *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
                ]}
                value={budgetHours}
                onChangeText={setBudgetHours}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Budget Amount ($) *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
                ]}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder="500"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          )}
        </ScrollView>

        {/* Footer with Actions */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            disabled={isSubmitting}
          >
            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
            disabled={isSubmitting}
          >
            <Text style={[styles.buttonText, { color: "#ffffff" }]}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            visible={showToast}
            onHide={() => setShowToast(false)}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
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
    ...typography.title,
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    height: sizing.inputHeight,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  clientButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  clientButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  clientButtonText: {
    ...typography.body,
    fontSize: 14,
  },
  newClientButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  inlineClientForm: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  inlineClientInput: {
    borderWidth: 2,
  },
  inlineClientActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inlineButton: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  inlineButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  toggleText: {
    ...typography.body,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: sizing.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 2,
  },
  submitButton: {},
  buttonText: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 16,
  },
});
