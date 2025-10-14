import { CategorySelector } from "@/components/timer/CategorySelector";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";
import { ProjectSelector } from "@/components/timer/ProjectSelector";
import { SegmentedModeToggle } from "@/components/timer/SegmentedModeToggle";
import { TimerControls } from "@/components/timer/TimerControls";
import { InterruptModal } from "@/components/timer/InterruptModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Toast } from "@/components/ui/Toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTimer } from "@/hooks/useTimer";
import { useTheme } from "@/utils/ThemeContext";
import { spacing } from "@/utils/theme";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
        {/* TODO: Add Personal/Team workspace tabs at the top */}

        {/* Project Selector - at the top, below workspace tabs */}
        <View style={styles.selectorContainer}>
          <ProjectSelector
            selectedProject={selectedProject}
            onSelect={setSelectedProject}
            disabled={isTimerRunning}
          />
        </View>

        {/* Mode Toggle and Change Sound Button */}
        <View style={styles.modeContainer}>
          <SegmentedModeToggle
            mode={timerMode}
            onModeChange={setTimerMode}
            disabled={isTimerRunning}
          />
          {/* TODO: Add Change Sound button */}
        </View>

        {/* Large Timer Display - matching web dashboard */}
        <LargeTimerDisplay
          elapsedTime={elapsedTime}
          project={runningTimer?.project || selectedProject}
          isRunning={isTimerRunning}
          isNearBudget={false}
          isOverBudget={false}
        />

        {/* Timer Controls - Start and Reset buttons */}
        <TimerControls
          isRunning={isTimerRunning}
          onStart={handleStartTimer}
          onStop={handleStopTimer}
          onReset={handleResetTimer}
          disabled={!canStartTimer && !isTimerRunning}
          loading={isStarting || isStopping}
          projectColor={(runningTimer?.project || selectedProject)?.color}
        />

        {/* Category Selector - below timer controls */}
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

      {/* Interrupt Modal */}
      <InterruptModal
        visible={showInterruptModal}
        projectName={runningTimer?.project?.name || "this project"}
        onContinue={() => handleAcknowledgeInterrupt(true)}
        onStop={() => handleAcknowledgeInterrupt(false)}
        gracePeriodSeconds={userSettings?.gracePeriod ?? 60}
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
});
