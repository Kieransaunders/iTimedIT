import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { useProjects } from "../../hooks/useProjects";
import { useTimer } from "../../hooks/useTimer";
import { Project } from "../../types/models";
import {
    borderRadius,
    colors,
    sizing,
    spacing,
    typography,
} from "../../utils/theme";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { WebRedirectBanner } from "../../components/common/WebRedirectBanner";
import { EmptyStateCard, WebAppPrompt, openWebApp } from "../../components";
import { WorkspaceIndicator } from "../../components/common/WorkspaceIndicator";
import { WorkspaceEmptyState } from "../../components/common/WorkspaceEmptyState";
import { CompanionAppGuidance } from "../../components/common/CompanionAppGuidance";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ProjectsScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<"personal" | "team">("personal");
  const { projects, isLoading } = useProjects({ searchTerm, workspaceType });
  const { startTimer, runningTimer } = useTimer();
  const router = useRouter();
  const [startingProjectId, setStartingProjectId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    // The useProjects hook will automatically refetch when the component re-renders
    // Wait a bit to show the refresh animation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleProjectPress = (project: Project) => {
    // TODO: Navigate to project details or perform action
    console.log("Project pressed:", project.name);
  };

  const handleStartTimer = async (project: Project) => {
    // Check if there's already a running timer
    if (runningTimer) {
      Toast.show({
        type: "error",
        text1: "Timer Already Running",
        text2: "Please stop the current timer before starting a new one.",
      });
      return;
    }

    try {
      setStartingProjectId(project._id);

      // Start the timer for the selected project
      await startTimer(
        project._id as any, // Type assertion needed for Convex ID
        undefined, // No category selected
        false // Normal mode, not pomodoro
      );

      // Show success message
      Toast.show({
        type: "success",
        text1: "Timer Started",
        text2: `Tracking time for ${project.name}`,
      });

      // Navigate to the timer screen
      router.push("/(tabs)");
    } catch (error: any) {
      console.error("Failed to start timer:", error);
      Toast.show({
        type: "error",
        text1: "Failed to Start Timer",
        text2: error.message || "Please try again.",
      });
    } finally {
      setStartingProjectId(null);
    }
  };

  const renderProjectItem = ({ item }: { item: Project }) => (
    <View style={styles.projectItem}>
      <ProjectCard
        project={item}
        onPress={() => handleProjectPress(item)}
        onStartTimer={() => handleStartTimer(item)}
      />
      {/* Show project stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Time Used</Text>
          <Text style={styles.statValue}>
            {item.totalHoursFormatted || "0.0h"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Budget Remaining</Text>
          <Text
            style={[
              styles.statValue,
              item.budgetRemaining !== undefined &&
              item.budgetRemaining > 0
                ? styles.statValueSuccess
                : styles.statValueWarning,
            ]}
          >
            {item.budgetRemainingFormatted || "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Projects</Text>
            <WorkspaceIndicator variant="compact" />
          </View>
        </View>

      {/* Companion App Guidance */}
      <View style={styles.bannerContainer}>
        <CompanionAppGuidance
          context="projects"
          hasData={projects.length > 0}
        />
      </View>

      {/* Workspace Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            workspaceType === "personal" && styles.toggleButtonActive,
          ]}
          onPress={() => setWorkspaceType("personal")}
          accessible={true}
          accessibilityLabel="Personal workspace"
          accessibilityRole="button"
          accessibilityState={{ selected: workspaceType === "personal" }}
        >
          <Text
            style={[
              styles.toggleText,
              workspaceType === "personal" && styles.toggleTextActive,
            ]}
          >
            Personal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            workspaceType === "team" && styles.toggleButtonActive,
          ]}
          onPress={() => setWorkspaceType("team")}
          accessible={true}
          accessibilityLabel="Team workspace"
          accessibilityRole="button"
          accessibilityState={{ selected: workspaceType === "team" }}
        >
          <Text
            style={[
              styles.toggleText,
              workspaceType === "team" && styles.toggleTextActive,
            ]}
          >
            Team
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
          accessible={true}
          accessibilityLabel="Search projects"
          accessibilityHint="Type to filter projects by name or client"
        />
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <WorkspaceEmptyState
            type="projects"
            searchTerm={searchTerm}
          />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item._id}
          renderItem={renderProjectItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
      </SafeAreaView>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  bannerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  toggleContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  projectItem: {
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  statValueSuccess: {
    color: colors.success,
  },
  statValueWarning: {
    color: colors.warning,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
