import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { EditEntryModal, EntryCard, ManualEntryModal } from "../../components/entries";
import { Button } from "../../components/ui";
import { useEntries } from "../../hooks/useEntries";
import { colors, spacing, typography } from "../../utils/theme";

export default function EntriesScreen() {
  const { entries, isLoading, loadMore, status, deleteEntry } = useEntries();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex automatically refetches on refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  };

  const handleEntryPress = (entry: any) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleAddEntry = () => {
    setShowManualEntryModal(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(entryId as any);
      // Convex will automatically refetch the entries
    } catch (error) {
      Alert.alert("Error", "Failed to delete entry. Please try again.");
    }
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No time entries yet.</Text>
        <Text style={styles.emptySubtext}>
          Start a timer to begin tracking!
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (status === "LoadingMore") {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Entries</Text>
        <Button onPress={handleAddEntry} variant="primary">
          Add Entry
        </Button>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EntryCard 
            entry={item} 
            onPress={() => handleEntryPress(item)}
            onDelete={() => handleDeleteEntry(item._id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <ManualEntryModal
        visible={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        onSuccess={() => {
          // Convex will automatically refetch the entries
          setShowManualEntryModal(false);
        }}
      />

      <EditEntryModal
        visible={showEditModal}
        entry={selectedEntry}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        onSuccess={() => {
          // Convex will automatically refetch the entries
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        onDelete={() => {
          // Convex will automatically refetch the entries
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
      />
    </SafeAreaView>
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
    ...typography.title,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
