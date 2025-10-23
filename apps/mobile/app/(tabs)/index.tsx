import { CategorySelector } from "@/components/timer/CategorySelector";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";
import { ProjectSelector } from "@/components/timer/ProjectSelector";
import { ProjectCarousel } from "@/components/timer/ProjectCarousel";
import { TodaySummaryCard } from "@/components/timer/TodaySummaryCard";
import { SegmentedModeToggle } from "@/components/timer/SegmentedModeToggle";
import { TimerControls } from "@/components/timer/TimerControls";
import { InterruptModal } from "@/components/timer/InterruptModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Toast } from "@/components/ui/Toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTimer } from "@/hooks/useTimer";
import { useProjects } from "@/hooks/useProjects";
import { useFavoriteProjects } from "@/hooks/useFavoriteProjects";
import { useTheme } from "@/utils/ThemeContext";
import { calculateBudgetStatus } from "@/utils/budget";
import { warningTap } from "@/utils/haptics";
import { EmptyStateCard, WebAppPrompt, openWebApp } from "@/components";
import { WorkspaceBadge } from "@/components/common/WorkspaceBadge";
import { TipsBottomSheet, useTipsBottomSheet } from "@/components/common/TipsBottomSheet";
import { FloatingActionButton } from "@/components/common/FloatingActionButton";
import { WebTimerBadge } from "@/components/timer/WebTimerBadge";
import { QuickActionMenu } from "@/components/common/QuickActionMenu";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const {
    registerForPushNotifications,
    setResponseHandler,
    notificationResponse
  } = useNotifications();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [showTipsSheet, setShowTipsSheet] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);

  // Celebration ref for confetti
  const celebrationRef = useRef<CelebrationHandle>(null);

  // Track budget status for haptic feedback
  const previousBudgetStatus = useRef<string>("safe");

  // Tips bottom sheet auto-show logic
  const { shouldAutoShow, markAsShown } = useTipsBottomSheet();

  // Show tips on first 3 app opens
  useEffect(() => {
    if (shouldAutoShow) {
      setShowTipsSheet(true);
      markAsShown();
    }
  }, [shouldAutoShow, markAsShown]);

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
    } else if (data?.type === "timer-interrupt" || data?.type === "interrupt") {
      if (actionIdentifier === "continue") {
        handleAcknowledgeInterrupt(true);
      } else if (actionIdentifier === "stop") {
        handleAcknowledgeInterrupt(false);
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
    } else if (data?.type === "pomodoro-break" || data?.type === "break_start" || data?.type === "break_reminder") {
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

  const handleAcknowledgeInterrupt = async (shouldContinue: boolean) => {
    try {
      setShowInterruptModal(false);
      await acknowledgeInterrupt(shouldContinue);
    } catch (err: any) {
      showErrorToast(err.message || "Failed to acknowledge interrupt");
    }
  };

  // Show interrupt modal when timer interrupt is triggered
  useEffect(() => {
    if (runningTimer?.awaitingInterruptAck) {
      setShowInterruptModal(true);
    } else {
      setShowInterruptModal(false);
    }
  }, [runningTimer?.awaitingInterruptAck]);

  const isTimerRunning = runningTimer !== null;
  const canStartTimer = !isTimerRunning && selectedProject !== null;

  const handleStartTimer = async () => {
    if (!selectedProject) {
      showErrorToast("Please select a project first");
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
            <WorkspaceBadge size="medium" />
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

        {/* Timer Controls - Start and Reset buttons */}
        <TimerControls
          isRunning={isTimerRunning}
          onStart={handleStartTimer}
          onStop={handleStopTimer}
          onReset={handleResetTimer}
          disabled={!canStartTimer && !isTimerRunning}
          loading={isStarting || isStopping}
          projectColor={
            (runningTimer?.project || selectedProject)?.client?.color ||
            (runningTimer?.project || selectedProject)?.color
          }
        />

        {/* Project Carousels - Sliding panels like web dashboard */}
        {projects.length > 0 ? (
          <>
            {/* Recent Projects Carousel */}
            {recentProjects.length > 0 && (
              <ProjectCarousel
                projects={recentProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onQuickStart={(project) => {
                  setSelectedProject(project);
                  // Don't auto-start - let user manually start via controls
                }}
                isFavorite={isFavorite}
                sectionTitle="⚡ Recent Projects"
              />
            )}

            {/* Personal Projects Carousel */}
            {personalProjects.length > 0 && (
              <ProjectCarousel
                projects={personalProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onQuickStart={(project) => {
                  setSelectedProject(project);
                  // Don't auto-start - let user manually start via controls
                }}
                isFavorite={isFavorite}
                sectionTitle="👤 Personal Projects"
              />
            )}

            {/* Work Projects Carousel */}
            {workProjects.length > 0 && (
              <ProjectCarousel
                projects={workProjects}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onToggleFavorite={toggleFavorite}
                onQuickStart={(project) => {
                  setSelectedProject(project);
                  // Don't auto-start - let user manually start via controls
                }}
                isFavorite={isFavorite}
                sectionTitle="💼 Work Projects"
              />
            )}
          </>
        ) : (
          /* Show empty state hint if no projects exist */
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyStateHint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="information-outline" size={24} color={colors.primary} />
              <Text style={[styles.emptyStateText, { color: colors.textPrimary }]}>
                No projects yet. Use the web app to create your first project.
              </Text>
            </View>
          </View>
        )}

        {/* Mode Toggle and Change Sound Button */}
        <View style={styles.modeContainer}>
          <SegmentedModeToggle
            mode={timerMode}
            onModeChange={setTimerMode}
            disabled={isTimerRunning}
          />
          {/* TODO: Add Change Sound button */}
        </View>

        {/* Category Selector - below mode toggle */}
        <View style={styles.selectorContainer}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>Category</Text>
            <TouchableOpacity onPress={() => {/* TODO: Navigate to category management */}}>
              <Text style={[styles.manageLink, { color: colors.error }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          <CategorySelector
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            disabled={isTimerRunning}
            containerStyle={styles.categoryDropdown}
          />
        </View>

        {/* Today's Summary Card - At bottom, dimmed */}
        <View style={styles.summaryContainer}>
          <TodaySummaryCard
            todaysTotalSeconds={elapsedTime}
            entriesCount={0}
            topProject={selectedProject}
            todaysEarnings={0}
          />
        </View>
      </ScrollView>

      {/* Tips Button - Replaces fixed footer */}
      <View style={[styles.tipsButtonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => setShowTipsSheet(true)}
          style={[styles.tipsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Show tips"
        >
          <Text style={[styles.tipsButtonText, { color: colors.textSecondary }]}>💡 Tips</Text>
        </TouchableOpacity>
      </View>

      {/* Tips Bottom Sheet */}
      <TipsBottomSheet visible={showTipsSheet} onClose={() => setShowTipsSheet(false)} />

      {/* Error Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="error"
          visible={showToast}
          onHide={() => setShowToast(false)}
        />
      )}

      {/* Interrupt Modal */}
      <InterruptModal
        visible={showInterruptModal}
        projectName={runningTimer?.project?.name || "this project"}
        onContinue={() => handleAcknowledgeInterrupt(true)}
        onStop={() => handleAcknowledgeInterrupt(false)}
        gracePeriodSeconds={userSettings?.gracePeriod ?? 60}
      />

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => setShowQuickMenu(true)} />

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
        workspaceType={currentWorkspace?.type as "personal" | "work"}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        visible={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSuccess={() => {
          // Clients will auto-refresh via Convex reactivity
          console.log("Client created successfully");
        }}
        workspaceType={currentWorkspace?.type as "personal" | "work"}
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
    paddingVertical: spacing.lg,
  },
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modeContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  manageLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  categoryDropdown: {
    marginBottom: 0,
  },
  timerDisplayContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  timerHeader: {
    alignItems: "center",
    marginBottom: spacing.md,
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
  emptyStateText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tipsButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  tipsButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  tipsButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  summaryContainer: {
    opacity: 0.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
