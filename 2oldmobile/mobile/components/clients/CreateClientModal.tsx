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
import { borderRadius, spacing, typography, sizing } from "@/utils/theme";
import { lightTap, mediumTap } from "@/utils/haptics";
import { Toast } from "@/components/ui/Toast";

export interface CreateClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  workspaceType?: "personal" | "work"; // Deprecated: now uses context
}

export function CreateClientModal({
  visible,
  onClose,
  onSuccess,
  workspaceType, // Ignored - use context instead
}: CreateClientModalProps) {
  const { colors } = useTheme();
  const { createClient: createClientMutation, currentWorkspace } = useClients();

  // Form state
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
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
    setNote("");
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
      showErrorToast("Client name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      mediumTap();

      await createClientMutation({
        name: name.trim(),
        note: note.trim() || undefined,
      });

      showSuccessToast(`Client "${name}" created successfully!`);
      resetForm();

      // Wait a moment for toast to show, then close
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error("Failed to create client:", error);
      showErrorToast(error.message || "Failed to create client");
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
            Create Client
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
          {/* Client Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Client Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Acme Corporation"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Note (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add any notes about this client..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>
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
              {isSubmitting ? "Creating..." : "Create Client"}
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
  textArea: {
    height: 100,
    paddingTop: spacing.sm,
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
