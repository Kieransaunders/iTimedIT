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
import { EditEntryModal, EntryCard, ManualEntryModal } from "@/components/entries";
import { Button } from "@/components/ui";
import { useEntries } from "@/hooks/useEntries";
import { spacing, typography } from "@/utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import { WebRedirectBanner } from "@/components/common/WebRedirectBanner";
import { CompanionAppGuidance } from "@/components/common/CompanionAppGuidance";
import { Search, SlidersHorizontal, X, Check } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

  // Get unique clients and projects from entries, plus recent projects
  const { clientOptions, projectOptions, recentProjects, validProjectIds } = useMemo(() => {
    const clients = new Map<string, { _id: string; name: string }>();
    const projects = new Map<string, { _id: string; name: string; clientName?: string }>();
    const projectLastUsed = new Map<string, number>();
    const projectIds = new Set<string>();

    entries.forEach((entry) => {
      if (entry.client) {
        clients.set(entry.client._id, { _id: entry.client._id, name: entry.client.name });
      }
      if (entry.project && entry.projectId) {
        const projectId = entry.projectId;
        projectIds.add(projectId);
        projects.set(projectId, {
          _id: projectId,
          name: entry.project.name,
          clientName: entry.client?.name
        });

        // Track most recent usage
        const entryTime = entry.startedAt || entry._creationTime;
        if (!projectLastUsed.has(projectId) || entryTime > projectLastUsed.get(projectId)!) {
          projectLastUsed.set(projectId, entryTime);
        }
      }
    });

    // Get top 5 most recently used projects
    const sortedByRecent = Array.from(projects.values())
      .sort((a, b) => {
        const timeA = projectLastUsed.get(a._id) || 0;
        const timeB = projectLastUsed.get(b._id) || 0;
        return timeB - timeA;
      })
      .slice(0, 5);

    return {
      clientOptions: Array.from(clients.values()).sort((a, b) => a.name.localeCompare(b.name)),
      projectOptions: Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name)),
      recentProjects: sortedByRecent,
      validProjectIds: projectIds,
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

  // Fetch selected project details for budget info (only if valid project ID)
  const selectedProjectData = useQuery(
    api.projects.get,
    selectedProject !== "all" && validProjectIds.has(selectedProject)
      ? { id: selectedProject as Id<"projects"> }
      : "skip"
  );

  // Filter entries and calculate stats
  const { filteredEntries, stats } = useMemo(() => {
    const filtered = entries.filter((entry) => {
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

    // Calculate stats
    const totalSeconds = filtered.reduce((sum, entry) => sum + (entry.seconds || 0), 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    // Calculate budget info if a project is selected
    let budgetHours: number | null = null;
    let remainingHours: number | null = null;
    let remainingMinutes: number | null = null;

    if (selectedProject !== "all" && selectedProjectData) {
      if (selectedProjectData.budgetType === "hours" && selectedProjectData.budgetHours) {
        budgetHours = selectedProjectData.budgetHours;
        const totalHoursDecimal = totalSeconds / 3600;
        const remaining = Math.max(0, budgetHours - totalHoursDecimal);
        remainingHours = Math.floor(remaining);
        remainingMinutes = Math.floor((remaining % 1) * 60);
      }
    }

    return {
      filteredEntries: filtered,
      stats: {
        count: filtered.length,
        totalHours,
        totalMinutes,
        totalSeconds,
        budgetHours,
        remainingHours,
        remainingMinutes,
      },
    };
  }, [entries, selectedClient, selectedProject, selectedCategory, fromDate, toDate, searchTerm, selectedProjectData]);

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
      {!filtersActive && entries.length > 0 && (
        <View style={styles.bannerContainer}>
          <CompanionAppGuidance
            context="entries"
            hasData={entries.length > 0}
          />
        </View>
      )}

      {/* Stats & Filter Combined */}
      {entries.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.count}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stats.count === 1 ? "ENTRY" : "ENTRIES"}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.totalHours}h {stats.totalMinutes}m
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>TOTAL TIME</Text>
              </View>
              {stats.remainingHours !== null && stats.remainingMinutes !== null && (
                <>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: stats.remainingHours > 0 ? colors.success : colors.error }]}>
                      {stats.remainingHours}h {stats.remainingMinutes}m
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>REMAINING</Text>
                  </View>
                </>
              )}
            </View>

            {/* Filter Button Row */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButtonIntegrated, { backgroundColor: colors.background }]}
                onPress={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Search size={16} color={colors.textSecondary} />
                <Text style={[styles.filterButtonText, { color: colors.textPrimary }]}>
                  Search & Filter
                </Text>
                {filtersActive && (
                  <View style={[styles.filterBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.filterBadgeText}>!</Text>
                  </View>
                )}
                <SlidersHorizontal size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {filtersActive && (
                <TouchableOpacity
                  style={styles.clearFiltersIcon}
                  onPress={resetFilters}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Sticky Header */}
          <View style={[styles.filterPanelHeader, { borderBottomColor: colors.border }]}>
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

          {/* Scrollable Content */}
          <ScrollView
            style={styles.filterPanelContent}
            contentContainerStyle={styles.filterPanelScrollContent}
            showsVerticalScrollIndicator={false}
          >

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Recent Projects</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                {recentProjects.map((project) => (
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
                    {project.clientName && (
                      <Text style={[styles.chipSubtext, selectedProject === project._id ? styles.chipTextActive : { color: colors.textSecondary }]}>
                        {project.clientName}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
        </View>
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
  statsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterButtonIntegrated: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  filterButtonText: {
    ...typography.body,
    fontWeight: "500",
    fontSize: 14,
    flex: 1,
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  clearFiltersIcon: {
    padding: spacing.xs,
  },
  bannerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    height: 400,
    maxHeight: 500,
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  filterPanelContent: {
  },
  filterPanelScrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
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
    alignItems: "center",
  },
  chipText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "500",
  },
  chipSubtext: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
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
