import { CategorySelector } from "@/components/timer/CategorySelector";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";
import { ProjectSelector } from "@/components/timer/ProjectSelector";
import { ProjectCarousel } from "@/components/timer/ProjectCarousel";
import { TodaySummaryCard, type TimeEntry } from "@/components/timer/TodaySummaryCard";
import { SegmentedModeToggle } from "@/components/timer/SegmentedModeToggle";
import { TimerControls } from "@/components/timer/TimerControls";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Toast } from "@/components/ui/Toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTimer } from "@/hooks/useTimer";
import { useProjects } from "@/hooks/useProjects";
import { useFavoriteProjects } from "@/hooks/useFavoriteProjects";
import { useEntries } from "@/hooks/useEntries";
import { useTheme } from "@/utils/ThemeContext";
import { calculateBudgetStatus } from "@/utils/budget";
import { warningTap } from "@/utils/haptics";
import { EmptyStateCard, WebAppPrompt, openWebApp } from "@/components";
import { WebTimerBadge } from "@/components/timer/WebTimerBadge";
import { QuickActionMenu } from "@/components/common/QuickActionMenu";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Clock, User, Briefcase } from "lucide-react-native";
import { spacing, borderRadius } from "@/utils/theme";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CelebrationComponent, type CelebrationHandle } from "@/utils/celebration";

export default function Index() {
  const {
    runningTimer,
    elapsedTime,
    selectedProject,
    selectedCategory,
    timerMode,
    isLoading,
    error,
    userSettings,
    startTimer,
    stopTimer,
    resetTimer,
    acknowledgeInterrupt,
    setSelectedProject,
    setSelectedCategory,
    setTimerMode,
  } = useTimer();

  const { colors } = useTheme();
  const { projects, currentWorkspace } = useProjects();
  const { favoriteIds, isFavorite, toggleFavorite } = useFavoriteProjects();
  const { entries } = useEntries();
  const {
    registerForPushNotifications,
    setResponseHandler,
    notificationResponse
  } = useNotifications();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastAction, setToastAction] = useState<{ label: string; onPress: () => void } | undefined>();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);

  // Celebration ref for confetti
  const celebrationRef = useRef<CelebrationHandle>(null);

  // Track budget status for haptic feedback
  const previousBudgetStatus = useRef<string>("safe");

  // Monitor budget status and trigger haptic feedback when crossing thresholds
  useEffect(() => {
    if (!runningTimer || !selectedProject) return;

    const budgetInfo = calculateBudgetStatus(selectedProject);
    const currentStatus = budgetInfo.status;

    // Only trigger haptics when status changes to warning or critical
    if (currentStatus !== previousBudgetStatus.current) {
      if (currentStatus === "warning") {
        // Gentle warning haptic when approaching budget limit (80%)
        warningTap();
      } else if (currentStatus === "critical") {
        // Stronger haptic when exceeding budget (100%)
        warningTap();
        // Trigger again after a short delay for emphasis
        setTimeout(() => warningTap(), 200);
      }
      previousBudgetStatus.current = currentStatus;
    }
  }, [runningTimer, selectedProject, elapsedTime]); // Track elapsedTime to update as timer runs

  // Separate projects by workspace type for carousels
  const { personalProjects, workProjects, recentProjects } = useMemo(() => {
    const personal = projects.filter(p => p.workspaceType === "personal");
    const work = projects.filter(p => !p.workspaceType || p.workspaceType === "work");

    // Get recent projects (last 5 used) - for now just take first 5
    // TODO: Track actual usage and sort by last used
    const recent = projects.slice(0, Math.min(5, projects.length));

    return { personalProjects: personal, workProjects: work, recentProjects: recent };
  }, [projects]);

  // Format entries for TodaySummaryCard
  const formattedEntries = useMemo((): TimeEntry[] => {
    return entries.map((entry: any) => ({
      _id: entry._id || "",
      projectId: entry.projectId || "",
      startedAt: entry.startedAt || 0,
      stoppedAt: entry.stoppedAt,
      seconds: typeof entry.seconds === "number" ? entry.seconds : 0,
      project: entry.project,
    })).filter((entry) => entry.project && entry.seconds > 0); // Filter out invalid entries
  }, [entries]);

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotifications().catch((err) => {
      console.error("Failed to register for push notifications:", err);
      // Don't show error to user - notifications are optional
    });
  }, []);

  // Handle notification actions (Continue/Stop for interrupts, Pomodoro actions, Timer controls)
  useEffect(() => {
    if (!notificationResponse) return;

    const actionIdentifier = notificationResponse.actionIdentifier;
    const data = notificationResponse.notification.request.content.data;

    console.log("Notification action received:", { type: data?.type, actionIdentifier });

    if (data?.type === "timer-running") {
      if (actionIdentifier === "stop-timer") {
        // Stop the timer from lock screen notification
        handleStopTimer();
      }
    } else if (data?.type === "budget-warning" || data?.type === "budget_warning") {
      // Budget warning alert
      if (actionIdentifier === "stop") {
        handleStopTimer();
      } else {
        // Default tap - show toast with budget info
        showInfoToast(`Budget warning: ${data?.projectName || 'Project'} is approaching its limit`);
      }
    } else if (data?.type === "overrun") {
      // Budget overrun alert
      if (actionIdentifier === "stop") {
        handleStopTimer();
      } else {
        // Default tap - show toast with overrun info
        showInfoToast(`Budget exceeded: ${data?.projectName || 'Project'} has exceeded its limit`);
      }
    } else if (data?.type === "pomodoro-break" || data?.type === "break_start") {
      if (actionIdentifier === "start-break") {
        // User acknowledged the break - no action needed, backend handles it
        console.log("User started break");
        showInfoToast("Break time! Take a moment to rest.");
      }
    } else if (data?.type === "pomodoro-complete" || data?.type === "break_complete") {
      if (actionIdentifier === "continue-work") {
        // User wants to continue working - navigate to timer screen
        console.log("User wants to continue working");
        showInfoToast("Break complete! Ready to work?");
      }
    }
  }, [notificationResponse]);


  const isTimerRunning = runningTimer !== null;

  const handleStartTimer = async () => {
    // Validate we have projects in the database
    if (projects.length === 0) {
      showErrorToast("No projects available. Create a project first to start tracking time.");
      // Optionally open create project modal
      setTimeout(() => setShowCreateProject(true), 500);
      return;
    }

    // Validate a project is selected
    if (!selectedProject) {
      showErrorToast("Please select a project before starting the timer");
      return;
    }

    // Validate the selected project still exists in the current projects list
    const projectExists = projects.some(p => p._id === selectedProject._id);
    if (!projectExists) {
      showErrorToast("Selected project no longer exists. Please select a different project.");
      setSelectedProject(null);
      return;
    }

    try {
      setIsStarting(true);
      await startTimer(
        selectedProject._id as any, // Type assertion needed for Convex ID
        selectedCategory || undefined,
        timerMode === "pomodoro"
      );
    } catch (err: any) {
      showErrorToast(err.message || "Failed to start timer");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTimer = async () => {
    try {
      setIsStopping(true);
      const wasRunning = isTimerRunning;
      const timeLogged = elapsedTime;

      await stopTimer();

      // Celebrate if timer was running for at least 1 minute
      if (wasRunning && timeLogged >= 60) {
        setTimeout(() => {
          celebrationRef.current?.celebrate();
        }, 300); // Small delay after stop completes
      }
    } catch (err: any) {
      showErrorToast(err.message || "Failed to stop timer");
    } finally {
      setIsStopping(false);
    }
  };

  const handleResetTimer = async () => {
    try {
      await resetTimer();
    } catch (err: any) {
      showErrorToast(err.message || "Failed to reset timer");
    }
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastAction(undefined);
    setShowToast(true);
  };

  const showInfoToast = (message: string) => {
    setToastMessage(message);
    setToastAction(undefined);
    setShowToast(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Timer Display - at top for visibility */}
        <View style={styles.timerDisplayContainer}>
          <View style={styles.timerHeader}>
            <WebTimerBadge visible={(runningTimer as any)?.startedFrom === "web"} />
          </View>
          <LargeTimerDisplay
            elapsedTime={elapsedTime}
            project={runningTimer?.project || selectedProject}
            isRunning={isTimerRunning}
            isNearBudget={false}
            isOverBudget={false}
            startedAt={runningTimer?.startedAt}
          />
        </View>

        {/* Mode Toggle - Compact under timer (only show if Pomodoro is enabled in settings) */}
        {userSettings?.pomodoroEnabled && (
          <View style={styles.modeContainerCompact}>
            <SegmentedModeToggle
              mode={timerMode}
              onModeChange={setTimerMode}
              disabled={isTimerRunning}
            />
          </View>
        )}

        {/* Timer Controls - Stop and Reset buttons (only visible when timer is running) */}
        <TimerControls
          isRunning={isTimerRunning}
          onStop={handleStopTimer}
          onReset={handleResetTimer}
          loading={isStarting || isStopping}
        />

        {/* Project Carousels - Only show when timer is NOT running */}
        {!isTimerRunning && projects.length > 0 ? (
          <>
            {/* Recent Projects Carousel */}
            {recentProjects.length > 0 && (
              <ProjectCarousel
                projects={recentProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onAddPress={() => setShowQuickMenu(true)}
                isTimerRunning={isTimerRunning}
                onQuickStart={async (project) => {
                  setSelectedProject(project);
                  // Auto-start timer immediately when project card is pressed
                  try {
                    setIsStarting(true);
                    await startTimer(
                      project._id as any,
                      selectedCategory || undefined,
                      timerMode === "pomodoro"
                    );
                  } catch (err: any) {
                    showErrorToast(err.message || "Failed to start timer");
                  } finally {
                    setIsStarting(false);
                  }
                }}
                isFavorite={isFavorite}
                sectionTitle="Recent Projects"
                sectionIcon={Clock}
              />
            )}

            {/* Personal Projects Carousel */}
            {personalProjects.length > 0 && (
              <ProjectCarousel
                projects={personalProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onAddPress={() => setShowQuickMenu(true)}
                isTimerRunning={isTimerRunning}
                onQuickStart={async (project) => {
                  setSelectedProject(project);
                  // Auto-start timer immediately when project card is pressed
                  try {
                    setIsStarting(true);
                    await startTimer(
                      project._id as any,
                      selectedCategory || undefined,
                      timerMode === "pomodoro"
                    );
                  } catch (err: any) {
                    showErrorToast(err.message || "Failed to start timer");
                  } finally {
                    setIsStarting(false);
                  }
                }}
                isFavorite={isFavorite}
                sectionTitle="Personal Projects"
                sectionIcon={User}
              />
            )}

            {/* All Projects Carousel */}
            {workProjects.length > 0 && (
              <ProjectCarousel
                projects={workProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onAddPress={() => setShowQuickMenu(true)}
                isTimerRunning={isTimerRunning}
                onQuickStart={async (project) => {
                  setSelectedProject(project);
                  // Auto-start timer immediately when project card is pressed
                  try {
                    setIsStarting(true);
                    await startTimer(
                      project._id as any,
                      selectedCategory || undefined,
                      timerMode === "pomodoro"
                    );
                  } catch (err: any) {
                    showErrorToast(err.message || "Failed to start timer");
                  } finally {
                    setIsStarting(false);
                  }
                }}
                isFavorite={isFavorite}
                sectionTitle="All Projects"
                sectionIcon={Briefcase}
              />
            )}
          </>
        ) : null}

        {/* Today's Summary Card - Below project carousels */}
        <TodaySummaryCard
          todaysTotalSeconds={elapsedTime}
          entriesCount={formattedEntries.length}
          topProject={selectedProject}
          todaysEarnings={0}
          entries={formattedEntries}
        />

        {/* Show empty state hint if no projects exist and timer is not running */}
        {!isTimerRunning && projects.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyStateHint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="folder-plus-outline" size={32} color={colors.primary} />
              <View style={styles.emptyStateTextContainer}>
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No projects yet
                </Text>
                <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
                  Create your first project to start tracking time. Use the + button in section headers to get started!
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Toast Notifications */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="info"
          visible={showToast}
          onHide={() => {
            setShowToast(false);
            setToastAction(undefined);
          }}
          action={toastAction}
          duration={3000}
        />
      )}

      {/* Interrupt Modal - DISABLED: Using global InterruptBanner component */}

      {/* Quick Action Menu */}
      <QuickActionMenu
        visible={showQuickMenu}
        onClose={() => setShowQuickMenu(false)}
        onCreateProject={() => setShowCreateProject(true)}
        onCreateClient={() => setShowCreateClient(true)}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        visible={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => {
          // Projects will auto-refresh via Convex reactivity
          console.log("Project created successfully");
        }}
        workspaceType={currentWorkspace as "personal" | "work"}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        visible={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSuccess={() => {
          // Clients will auto-refresh via Convex reactivity
          console.log("Client created successfully");
        }}
        workspaceType={currentWorkspace as "personal" | "work"}
      />

      {/* Celebration Confetti */}
      <CelebrationComponent
        ref={celebrationRef}
        colors={[
          (runningTimer?.project || selectedProject)?.client?.color ||
          (runningTimer?.project || selectedProject)?.color ||
          "#a855f7",
          "#ec4899",
          "#f59e0b",
          "#22c55e",
          "#3b82f6"
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  timerDisplayContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  modeContainerCompact: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    transform: [{ scale: 0.85 }], // Make it smaller
  },
  timerHeader: {
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  emptyStateContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyStateHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  emptyStateTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  emptyStateDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
