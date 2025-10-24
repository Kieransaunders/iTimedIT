import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { EditEntryModal, EntryCard, ManualEntryModal } from "../../components/entries";
import { Button } from "../../components/ui";
import { useEntries } from "../../hooks/useEntries";
import { spacing, typography } from "../../utils/theme";
import { useTheme } from "../../utils/ThemeContext";
import { WebRedirectBanner } from "../../components/common/WebRedirectBanner";
import { CompanionAppGuidance } from "../../components/common/CompanionAppGuidance";
import { Search, SlidersHorizontal, X, Check } from "lucide-react-native";

export default function EntriesScreen() {
  const { colors } = useTheme();
  const { entries, isLoading, loadMore, status, deleteEntry } = useEntries();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<"all" | string>("all");
  const [selectedProject, setSelectedProject] = useState<"all" | string>("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "none" | string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedClient("all");
    setSelectedProject("all");
    setSelectedCategory("all");
    setFromDate("");
    setToDate("");
  };

  // Check if any filters are active
  const filtersActive = Boolean(
    searchTerm ||
    selectedClient !== "all" ||
    selectedProject !== "all" ||
    selectedCategory !== "all" ||
    fromDate ||
    toDate
  );

  // Get unique clients and projects from entries
  const { clientOptions, projectOptions } = useMemo(() => {
    const clients = new Map<string, { _id: string; name: string }>();
    const projects = new Map<string, { _id: string; name: string; clientName?: string }>();

    entries.forEach((entry) => {
      if (entry.client) {
        clients.set(entry.client._id, { _id: entry.client._id, name: entry.client.name });
      }
      if (entry.project) {
        projects.set(entry.project._id, {
          _id: entry.projectId,
          name: entry.project.name,
          clientName: entry.client?.name
        });
      }
    });

    return {
      clientOptions: Array.from(clients.values()).sort((a, b) => a.name.localeCompare(b.name)),
      projectOptions: Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [entries]);

  // Get unique categories
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    entries.forEach((entry) => {
      if (entry.category) {
        categories.add(entry.category);
      }
    });
    return Array.from(categories).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Client filter
      if (selectedClient !== "all" && entry.client?._id !== selectedClient) {
        return false;
      }

      // Project filter
      if (selectedProject !== "all" && entry.projectId !== selectedProject) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "none" && entry.category) {
          return false;
        } else if (selectedCategory !== "none" && entry.category !== selectedCategory) {
          return false;
        }
      }

      // Date range filter
      const entryDate = entry.startedAt || entry._creationTime;
      if (fromDate) {
        const fromMs = new Date(fromDate).setHours(0, 0, 0, 0);
        if (entryDate < fromMs) {
          return false;
        }
      }
      if (toDate) {
        const toMs = new Date(toDate).setHours(23, 59, 59, 999);
        if (entryDate > toMs) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fields = [
          entry.project?.name || "",
          entry.client?.name || "",
          entry.note || "",
          entry.category || "",
        ];
        const matches = fields.some((field) => field.toLowerCase().includes(term));
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedClient, selectedProject, selectedCategory, fromDate, toDate, searchTerm]);

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
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
          {filtersActive ? "No entries match the current filters." : "No time entries yet."}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {filtersActive ? "Try adjusting your filters." : "Start a timer to begin tracking!"}
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Time Entries</Text>
        <Button onPress={handleAddEntry} variant="primary">
          Add Entry
        </Button>
      </View>

      {/* Companion App Guidance */}
      <View style={styles.bannerContainer}>
        <CompanionAppGuidance
          context="entries"
          hasData={entries.length > 0}
        />
      </View>

      {/* Filter Button */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border
            }
          ]}
          onPress={() => setShowFilterPanel(!showFilterPanel)}
        >
          <Search size={18} color={colors.textSecondary} />
          <Text style={[styles.filterButtonText, { color: colors.textPrimary }]}>
            Search & Filter
          </Text>
          {filtersActive && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>!</Text>
            </View>
          )}
          <SlidersHorizontal size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {filtersActive && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={resetFilters}
          >
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
              Clear all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Panel */}
      {showFilterPanel && (
        <ScrollView
          style={[styles.filterPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: colors.textPrimary }]}>
              Search & Filter Entries
            </Text>
            <TouchableOpacity
              onPress={() => setShowFilterPanel(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Search</Text>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by project, client, note, or category"
                placeholderTextColor={colors.textSecondary}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm !== "" && (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Client Filter */}
          {clientOptions.length > 0 && (
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Client</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedClient === "all" && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedClient("all")}
                >
                  <Text style={[styles.chipText, selectedClient === "all" ? styles.chipTextActive : { color: colors.textPrimary }]}>
                    All Clients
                  </Text>
                </TouchableOpacity>
                {clientOptions.map((client) => (
                  <TouchableOpacity
                    key={client._id}
                    style={[
                      styles.chip,
                      selectedClient === client._id && { backgroundColor: colors.primary },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedClient(client._id)}
                  >
                    <Text style={[styles.chipText, selectedClient === client._id ? styles.chipTextActive : { color: colors.textPrimary }]}>
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Project Filter */}
          {projectOptions.length > 0 && (
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedProject === "all" && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedProject("all")}
                >
                  <Text style={[styles.chipText, selectedProject === "all" ? styles.chipTextActive : { color: colors.textPrimary }]}>
                    All Projects
                  </Text>
                </TouchableOpacity>
                {projectOptions.map((project) => (
                  <TouchableOpacity
                    key={project._id}
                    style={[
                      styles.chip,
                      selectedProject === project._id && { backgroundColor: colors.primary },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedProject(project._id)}
                  >
                    <Text style={[styles.chipText, selectedProject === project._id ? styles.chipTextActive : { color: colors.textPrimary }]}>
                      {project.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Category Filter */}
          {categoryOptions.length > 0 && (
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedCategory === "all" && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedCategory("all")}
                >
                  <Text style={[styles.chipText, selectedCategory === "all" ? styles.chipTextActive : { color: colors.textPrimary }]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedCategory === "none" && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedCategory("none")}
                >
                  <Text style={[styles.chipText, selectedCategory === "none" ? styles.chipTextActive : { color: colors.textPrimary }]}>
                    No Category
                  </Text>
                </TouchableOpacity>
                {categoryOptions.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.chip,
                      selectedCategory === category && { backgroundColor: colors.primary },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.chipText, selectedCategory === category ? styles.chipTextActive : { color: colors.textPrimary }]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Date Range Filter */}
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Date Range</Text>
            <View style={styles.dateInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateInputLabel, { color: colors.textSecondary }]}>From</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateInputLabel, { color: colors.textSecondary }]}>To</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={toDate}
                  onChangeText={setToDate}
                />
              </View>
            </View>
          </View>

          {/* Filter Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={resetFilters}
              disabled={!filtersActive}
            >
              <Text style={[styles.resetButtonText, { color: filtersActive ? colors.primary : colors.textTertiary }]}>
                Reset Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterPanel(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <FlatList
        data={filteredEntries}
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
  },
  bannerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    flex: 1,
  },
  filterButtonText: {
    ...typography.body,
    fontWeight: "500",
    fontSize: 14,
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  clearFiltersButton: {
    paddingHorizontal: spacing.sm,
  },
  clearFiltersText: {
    ...typography.caption,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  filterPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 400,
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  filterPanelTitle: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 16,
  },
  filterField: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.sm,
    fontSize: 13,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  chipContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  dateInputsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateInputLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  dateInput: {
    ...typography.body,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  resetButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
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
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
});
