import { CategorySelector } from "@/components/timer/CategorySelector";
import { InlineProjectStats, ProjectStats } from "@/components/timer/InlineProjectStats";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";
import { ProjectSelector } from "@/components/timer/ProjectSelector";
import { RecentEntries } from "@/components/timer/RecentEntries";
import { RecentProjects } from "@/components/timer/RecentProjects";
import { SegmentedModeToggle } from "@/components/timer/SegmentedModeToggle";
import { TimerControls } from "@/components/timer/TimerControls";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Toast } from "@/components/ui/Toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTimer } from "@/hooks/useTimer";
import { useTheme } from "@/utils/ThemeContext";
import { spacing } from "@/utils/theme";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export default function Index() {
  const {
    runningTimer,
    elapsedTime,
    selectedProject,
    selectedCategory,
    timerMode,
    isLoading,
    error,
    startTimer,
    stopTimer,
    resetTimer,
    acknowledgeInterrupt,
    setSelectedProject,
    setSelectedCategory,
    setTimerMode,
  } = useTimer();

  const { colors } = useTheme();
  const { 
    registerForPushNotifications, 
    setResponseHandler,
    notificationResponse 
  } = useNotifications();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotifications().catch((err) => {
      console.error("Failed to register for push notifications:", err);
      // Don't show error to user - notifications are optional
    });
  }, []);

  // Handle notification actions (Continue/Stop for interrupts, Pomodoro actions)
  useEffect(() => {
    if (!notificationResponse) return;

    const actionIdentifier = notificationResponse.actionIdentifier;
    const data = notificationResponse.notification.request.content.data;

    if (data?.type === "timer-interrupt") {
      if (actionIdentifier === "continue") {
        handleAcknowledgeInterrupt(true);
      } else if (actionIdentifier === "stop") {
        handleAcknowledgeInterrupt(false);
      }
    } else if (data?.type === "pomodoro-break") {
      if (actionIdentifier === "start-break") {
        // User acknowledged the break - no action needed, backend handles it
        console.log("User started break");
      }
    } else if (data?.type === "pomodoro-complete") {
      if (actionIdentifier === "continue-work") {
        // User wants to continue working - navigate to timer screen
        console.log("User wants to continue working");
      }
    }
  }, [notificationResponse]);

  const handleAcknowledgeInterrupt = async (shouldContinue: boolean) => {
    try {
      await acknowledgeInterrupt(shouldContinue);
    } catch (err: any) {
      showErrorToast(err.message || "Failed to acknowledge interrupt");
    }
  };

  const isTimerRunning = runningTimer !== null;
  const canStartTimer = !isTimerRunning && selectedProject !== null;

  // Calculate project stats if we have a running timer with project data
  const projectStats: ProjectStats | null = runningTimer?.project
    ? calculateProjectStats(runningTimer.project, elapsedTime)
    : selectedProject
    ? calculateProjectStats(selectedProject, 0)
    : null;

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
      await stopTimer();
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
        {/* HERO: Large Timer Display - matching web dashboard */}
        <LargeTimerDisplay
          elapsedTime={elapsedTime}
          project={runningTimer?.project || selectedProject}
          isRunning={isTimerRunning}
          isNearBudget={false} // TODO: Calculate from budget
          isOverBudget={false} // TODO: Calculate from budget
        />

        {/* Timer Controls */}
        <TimerControls
          isRunning={isTimerRunning}
          onStart={handleStartTimer}
          onStop={handleStopTimer}
          onReset={handleResetTimer}
          disabled={!canStartTimer && !isTimerRunning}
          loading={isStarting || isStopping}
        />

        {/* Inline Project Stats - compact horizontal layout */}
        {(runningTimer?.project || selectedProject) && projectStats && (
          <InlineProjectStats
            project={runningTimer?.project || selectedProject!}
            stats={projectStats}
          />
        )}

        {/* Segmented Mode Toggle - matching web design */}
        <View style={styles.selectorContainer}>
          <SegmentedModeToggle
            mode={timerMode}
            onModeChange={setTimerMode}
            disabled={isTimerRunning}
          />
        </View>

        {/* Project Selector - disabled when timer is running */}
        <View style={styles.selectorContainer}>
          <ProjectSelector
            selectedProject={selectedProject}
            onSelect={setSelectedProject}
            disabled={isTimerRunning}
          />
        </View>

        {/* Category Selector - disabled when timer is running */}
        <View style={styles.selectorContainer}>
          <CategorySelector
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            disabled={isTimerRunning}
          />
        </View>

        {/* Recent Projects */}
        <RecentProjects onProjectSelect={setSelectedProject} />

        {/* Recent Entries */}
        <RecentEntries />
      </ScrollView>

      {/* Error Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="error"
          visible={showToast}
          onHide={() => setShowToast(false)}
        />
      )}
    </View>
  );
}

/**
 * Calculate project statistics for display
 */
function calculateProjectStats(
  project: any,
  additionalSeconds: number = 0
): ProjectStats {
  const totalSeconds = (project.totalSeconds || 0) + additionalSeconds;
  const totalHours = totalSeconds / 3600;
  const totalAmount = totalHours * project.hourlyRate;

  let budgetRemaining = 0;
  let budgetPercentUsed = 0;

  if (project.budgetType === "hours" && project.budgetHours) {
    const budgetSeconds = project.budgetHours * 3600;
    budgetRemaining = (budgetSeconds - totalSeconds) / 3600;
    budgetPercentUsed = (totalSeconds / budgetSeconds) * 100;
  } else if (project.budgetType === "amount" && project.budgetAmount) {
    budgetRemaining = project.budgetAmount - totalAmount;
    budgetPercentUsed = (totalAmount / project.budgetAmount) * 100;
  }

  return {
    totalSeconds,
    totalHours,
    totalAmount,
    budgetRemaining,
    budgetRemainingFormatted:
      project.budgetType === "hours"
        ? `${budgetRemaining.toFixed(1)}h`
        : `$${budgetRemaining.toFixed(2)}`,
    totalHoursFormatted: `${totalHours.toFixed(2)}h`,
    budgetPercentUsed,
  };
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
    marginBottom: spacing.sm,
  },
});
