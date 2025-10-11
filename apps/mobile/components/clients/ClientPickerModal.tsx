import React from "react";
import {
  Modal,
  SafeAreaView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useClients } from "@/hooks/useClients";
import { useTheme } from "@/utils/ThemeContext";
import { borderRadius, colors, sizing, spacing, typography } from "@/utils/theme";
import { Client } from "@/types/models";
import { Id } from "@/convex/_generated/dataModel";

export interface ClientPickerModalProps {
  visible: boolean;
  selectedClientId: Id<"clients"> | null;
  onSelect: (client: Client) => void;
  onClose: () => void;
  workspaceType?: "personal" | "team";
}

export function ClientPickerModal({
  visible,
  selectedClientId,
  onSelect,
  onClose,
  workspaceType,
}: ClientPickerModalProps) {
  const { colors: themeColors } = useTheme();
  const { clients, isLoading } = useClients({ workspaceType });

  const handleSelectClient = (client: Client) => {
    onSelect(client);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Select Client</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={24} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              Loading clients...
            </Text>
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No clients available
            </Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clientItem,
                  {
                    backgroundColor:
                      selectedClientId === item._id ? themeColors.primary + "20" : "transparent",
                  },
                ]}
                onPress={() => handleSelectClient(item)}
              >
                <View style={styles.clientInfo}>
                  {item.color && (
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  )}
                  <Text style={[styles.clientName, { color: themeColors.textPrimary }]}>
                    {item.name}
                  </Text>
                </View>
                {selectedClientId === item._id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={themeColors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  clientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clientName: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "500",
  },
});
