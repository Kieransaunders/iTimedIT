import { borderRadius, colors, opacity, sizing, spacing, typography } from "@/utils/theme";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

export interface DropdownOption<T = string> {
  label: string;
  value: T;
}

interface DropdownProps<T = string> {
  label?: string;
  placeholder?: string;
  options: DropdownOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  renderOption?: (option: DropdownOption<T>) => React.ReactNode;
}

export function Dropdown<T = string>({
  label,
  placeholder = "Select an option",
  options,
  value,
  onSelect,
  error,
  disabled = false,
  containerStyle,
  renderOption,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (selectedValue: T) => {
    onSelect(selectedValue);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        accessible={true}
        accessibilityLabel={label || placeholder}
        accessibilityRole="button"
        accessibilityHint="Opens a list of options"
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.triggerTextPlaceholder,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || "Select"}</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                accessible={true}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  accessible={true}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                >
                  {renderOption ? (
                    renderOption(item)
                  ) : (
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerDisabled: {
    opacity: opacity.disabled,
  },
  triggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  triggerTextPlaceholder: {
    color: colors.textSecondary,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `rgba(0, 0, 0, ${opacity.overlay})`,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: "100%",
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary + "20", // 20% opacity
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
});
