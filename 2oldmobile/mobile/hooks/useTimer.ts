import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Project, RunningTimer, UserSettings } from "@/types/models";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  playInterruptSound,
  playOverrunSound,
  playBreakStartSound,
  playBreakEndSound
} from "@/services/soundManager";
import { useOrganization } from "@/contexts/OrganizationContext";
import { NetworkErrorHandler, NetworkErrorState } from "@/utils/networkErrorHandler";
import { timerNotificationService } from "@/services/timerNotification";
import { shouldRequestBatteryOptimization, requestBatteryOptimizationExemption } from "@/services/batteryOptimization";
import { scheduleLocalNotification } from "@/services/notifications";

export interface UseTimerReturn {
  runningTimer: RunningTimer | null;
  elapsedTime: number;
  selectedProject: Project | null;
  selectedCategory: string | null;
  timerMode: "normal" | "pomodoro";
  currentWorkspace: "personal" | "work";
  isLoading: boolean;
  error: string | null;
  networkError: NetworkErrorState;
  retryConnection: () => void;
  userSettings: UserSettings | null | undefined;
  startTimer: (
    projectId: Id<"projects">,
    category?: string,
    pomodoroEnabled?: boolean
  ) => Promise<void>;
  stopTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
  acknowledgeInterrupt: (shouldContinue: boolean) => Promise<void>;
  setSelectedProject: (project: Project | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setTimerMode: (mode: "normal" | "pomodoro") => void;
}

/**
 * Timer management hook
 * Manages timer state and operations using Convex queries and mutations
 */
export function useTimer(): UseTimerReturn {
  // Organization context
  const { currentWorkspace, isReady } = useOrganization();

  // Local state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<"normal" | "pomodoro">("normal");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<NetworkErrorState>(
    NetworkErrorHandler.createErrorState(null)
  );
  const [retryCount, setRetryCount] = useState(0);

  // Refs to track previous state for sound triggers
  const prevInterruptRef = useRef<boolean>(false);
  const prevPomodoroPhaseRef = useRef<"work" | "break" | undefined>(undefined);
  const prevWorkspaceRef = useRef<"personal" | "work">(currentWorkspace);
  const timerIdRef = useRef<string | null>(null);
  const notifiedWebTimerRef = useRef<string | null>(null);

  // Refs for functions to avoid circular dependencies
  const stopTimerRef = useRef<(() => Promise<void>) | null>(null);
  const sendHeartbeatRef = useRef<(() => Promise<void>) | null>(null);

  // Convex queries and mutations
  // Note: getRunningTimer accepts workspaceType to filter results by workspace
  // Other mutations auto-detect workspace from project context
  const runningTimer = useQuery(
    api.timer.getRunningTimer,
    isReady ? { workspaceType: currentWorkspace } : "skip"
  ) as RunningTimer | null | undefined;
  
  const startMutation = useMutation(api.timer.start);
  const stopMutation = useMutation(api.timer.stop);
  const resetMutation = useMutation(api.timer.reset);
  const heartbeatMutation = useMutation(api.timer.heartbeat);
  const ackInterruptMutation = useMutation(api.timer.ackInterrupt);
  const userSettingsQuery = useQuery(api.users.getUserSettings);
  const userSettings = userSettingsQuery as UserSettings | null | undefined;

  const isLoading = !isReady || runningTimer === undefined || userSettings === undefined;

  // Handle network errors for timer queries
  useEffect(() => {
    if ((runningTimer === undefined || userSettings === undefined) && isReady) {
      // Query failed, likely due to network error
      const error = new Error("Failed to fetch timer data");
      setNetworkError(NetworkErrorHandler.createErrorState(error, retryCount));
    } else if (runningTimer !== undefined && userSettings !== undefined) {
      // Query succeeded, clear any network errors
      setNetworkError(NetworkErrorHandler.createErrorState(null));
    }
  }, [runningTimer, userSettings, isReady, retryCount]);

  /**
   * Handle workspace switching during active timer sessions
   * Stop timer if workspace changes while timer is running
   */
  useEffect(() => {
    const previousWorkspace = prevWorkspaceRef.current;

    if (previousWorkspace !== currentWorkspace && runningTimer && stopTimerRef.current) {
      // Workspace changed while timer is running - stop the timer
      console.warn("Workspace changed during active timer session, stopping timer");
      stopTimerRef.current().catch(console.error);
    }

    prevWorkspaceRef.current = currentWorkspace;
  }, [currentWorkspace, runningTimer]);

  /**
   * Calculate elapsed time from running timer
   * Updates every second when timer is running
   */
  useEffect(() => {
    if (!runningTimer) {
      setElapsedTime(0);
      return;
    }

    // Calculate initial elapsed time with null safety guards
    const calculateElapsed = () => {
      // Defensive check to prevent Hermes crash in release builds
      if (!runningTimer || typeof runningTimer !== 'object' || !('startedAt' in runningTimer)) {
        return;
      }

      const startedAt = runningTimer.startedAt;
      if (typeof startedAt !== 'number' || !isFinite(startedAt)) {
        return;
      }

      const now = Date.now();
      const elapsed = Math.floor((now - startedAt) / 1000);
      setElapsedTime(elapsed);
    };

    // Calculate immediately
    calculateElapsed();

    // Update every second
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [runningTimer]);

  /**
   * Send heartbeat every 30 seconds when timer is running
   */
  useEffect(() => {
    if (!runningTimer || !isReady || !sendHeartbeatRef.current) {
      return;
    }

    // Send heartbeat immediately
    sendHeartbeatRef.current();

    // Send heartbeat every 30 seconds
    const interval = setInterval(() => {
      if (sendHeartbeatRef.current) {
        sendHeartbeatRef.current();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [runningTimer, isReady]);

  /**
   * Play sound alerts for timer interruptions
   */
  useEffect(() => {
    if (!runningTimer) {
      prevInterruptRef.current = false;
      return;
    }

    // Check if interrupt state changed from false to true
    if (runningTimer.awaitingInterruptAck && !prevInterruptRef.current) {
      playInterruptSound();
    }

    // Update previous state
    prevInterruptRef.current = runningTimer.awaitingInterruptAck ?? false;
  }, [runningTimer?.awaitingInterruptAck]);

  /**
   * Play sound alerts for Pomodoro phase transitions
   */
  useEffect(() => {
    if (!runningTimer || !runningTimer.pomodoroEnabled) {
      prevPomodoroPhaseRef.current = undefined;
      return;
    }

    const currentPhase = runningTimer.pomodoroPhase;
    const previousPhase = prevPomodoroPhaseRef.current;

    // Detect phase change
    if (currentPhase && currentPhase !== previousPhase && previousPhase !== undefined) {
      if (currentPhase === "break") {
        // Transitioning from work to break
        playBreakStartSound();
      } else if (currentPhase === "work") {
        // Transitioning from break to work
        playBreakEndSound();
      }
    }

    // Update previous state
    prevPomodoroPhaseRef.current = currentPhase;
  }, [runningTimer?.pomodoroPhase]);

  /**
   * Play overrun alert when timer runs too long without heartbeat
   * This would typically be triggered by backend, but we can also
   * detect locally if nextInterruptAt is passed and no acknowledgment
   */
  useEffect(() => {
    if (!runningTimer || typeof runningTimer !== 'object') {
      return;
    }

    // Defensive property access to prevent Hermes crash
    const nextInterruptAt = 'nextInterruptAt' in runningTimer ? runningTimer.nextInterruptAt : null;
    if (!nextInterruptAt || typeof nextInterruptAt !== 'number') {
      return;
    }

    // Check if we've passed the interrupt time significantly (grace period)
    const now = Date.now();
    const overrunThreshold = nextInterruptAt + 60000; // 60 second grace period

    const awaitingInterruptAck = 'awaitingInterruptAck' in runningTimer ? runningTimer.awaitingInterruptAck : false;
    if (now > overrunThreshold && awaitingInterruptAck) {
      playOverrunSound();
    }
  }, [runningTimer?.nextInterruptAt, runningTimer?.awaitingInterruptAck, elapsedTime]);

  /**
   * Start timer notification when timer is running
   * Stop notification when timer stops
   * Only triggers when the timer ID changes to avoid infinite loops
   */
  useEffect(() => {
    const currentTimerId = runningTimer?._id;
    const previousTimerId = timerIdRef.current;

    // Timer started or changed (new timer ID)
    if (currentTimerId && currentTimerId !== previousTimerId) {
      if (runningTimer?.project) {
        timerNotificationService.startTimerNotification(
          runningTimer.project,
          runningTimer.startedAt
        ).catch((error) => {
          console.error("Failed to start timer notification:", error);
        });
      }
      timerIdRef.current = currentTimerId;
    }
    // Timer stopped (no timer ID but had one before)
    else if (!currentTimerId && previousTimerId) {
      timerNotificationService.stopTimerNotification().catch((error) => {
        console.error("Failed to stop timer notification:", error);
      });
      timerIdRef.current = null;
    }
  }, [runningTimer?._id]);

  /**
   * Detect when timer is started from web and show notification
   */
  useEffect(() => {
    const currentTimerId = runningTimer?._id;
    const startedFrom = (runningTimer as any)?.startedFrom;

    // New timer detected that was started from web
    if (currentTimerId && currentTimerId !== notifiedWebTimerRef.current && startedFrom === "web") {
      // Show banner notification
      scheduleLocalNotification(
        "Timer Started on Web",
        `${runningTimer?.project?.name || "A project"} timer is now running`,
        { type: "web-timer-started", projectId: runningTimer?.projectId }
      ).catch((error) => {
        console.error("Failed to show web timer notification:", error);
      });

      // Mark as notified to avoid duplicate notifications
      notifiedWebTimerRef.current = currentTimerId;
    }

    // Reset when timer stops
    if (!currentTimerId) {
      notifiedWebTimerRef.current = null;
    }
  }, [runningTimer?._id, (runningTimer as any)?.startedFrom, runningTimer?.project?.name]);

  /**
   * Start a timer for the selected project
   */
  const startTimer = useCallback(
    async (
      projectId: Id<"projects">,
      category?: string,
      pomodoroEnabled?: boolean
    ) => {
      return await NetworkErrorHandler.withRetry(async () => {
        try {
          setError(null);

          // Validate projectId is provided
          if (!projectId) {
            throw new Error("Please select a project before starting the timer");
          }

          await startMutation({
            projectId,
            category,
            pomodoroEnabled: pomodoroEnabled ?? timerMode === "pomodoro",
            startedFrom: "mobile",
          });

          // Check if we should request battery optimization exemption (Android only)
          const shouldRequest = await shouldRequestBatteryOptimization();
          if (shouldRequest) {
            // Show the prompt after a short delay to avoid interrupting the timer start
            setTimeout(() => {
              requestBatteryOptimizationExemption();
            }, 2000);
          }
        } catch (err: any) {
          console.error("Failed to start timer:", err);

          // Extract user-friendly error message from Convex error
          let errorMessage = "Failed to start timer";

          if (err?.message) {
            // Check for specific error patterns from backend
            const msg = err.message;

            if (msg.includes("Project not found")) {
              errorMessage = "This project no longer exists. Please select a different project.";
            } else if (msg.includes("archived project")) {
              errorMessage = "Cannot start timer for archived projects. Please select an active project.";
            } else if (msg.includes("don't have permission")) {
              errorMessage = "You don't have permission to use this project.";
            } else if (msg.includes("not found in your current workspace")) {
              errorMessage = "Project not found. Try switching workspaces or select a different project.";
            } else if (msg.includes("sign in")) {
              errorMessage = "Please sign in to start a timer.";
            } else if (msg.includes("select a project")) {
              errorMessage = msg; // Use the message as-is
            } else {
              // Use the backend error message if it's descriptive
              errorMessage = msg;
            }
          }

          setError(errorMessage);

          // Show network error if it's a retryable error
          if (NetworkErrorHandler.isRetryableError(err)) {
            NetworkErrorHandler.showNetworkError(err);
          }

          throw new Error(errorMessage);
        }
      });
    },
    [startMutation, timerMode, currentWorkspace]
  );

  /**
   * Stop the running timer
   */
  const stopTimer = useCallback(async () => {
    return await NetworkErrorHandler.withRetry(async () => {
      try {
        setError(null);

        await stopMutation({});
      } catch (err: any) {
        console.error("Failed to stop timer:", err);
        const errorMessage = err?.message || "Failed to stop timer";
        setError(errorMessage);
        
        // Show network error if it's a retryable error
        if (NetworkErrorHandler.isRetryableError(err)) {
          NetworkErrorHandler.showNetworkError(err);
        }
        
        throw new Error(errorMessage);
      }
    });
  }, [stopMutation, currentWorkspace]);

  /**
   * Reset the running timer
   */
  const resetTimer = useCallback(async () => {
    try {
      setError(null);

      await resetMutation({});
    } catch (err: any) {
      console.error("Failed to reset timer:", err);
      const errorMessage = err?.message || "Failed to reset timer";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [resetMutation, currentWorkspace]);

  /**
   * Send heartbeat to keep timer alive
   */
  const sendHeartbeat = useCallback(async () => {
    try {
      await NetworkErrorHandler.withRetry(
        async () => {
          await heartbeatMutation({});
        },
        { maxRetries: 2 } // Fewer retries for heartbeats
      );
    } catch (err: any) {
      console.error("Failed to send heartbeat:", err);
      // Don't set error state for heartbeat failures
      // They should fail silently but we can track network issues
      if (NetworkErrorHandler.isRetryableError(err)) {
        setNetworkError(NetworkErrorHandler.createErrorState(err));
      }
    }
  }, [heartbeatMutation, currentWorkspace]);

  /**
   * Acknowledge a timer interrupt
   */
  const acknowledgeInterrupt = useCallback(
    async (shouldContinue: boolean) => {
      try {
        setError(null);

        await ackInterruptMutation({
          continue: shouldContinue,
        });
      } catch (err: any) {
        console.error("Failed to acknowledge interrupt:", err);
        const errorMessage = err?.message || "Failed to acknowledge interrupt";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [ackInterruptMutation, currentWorkspace]
  );

  const retryConnection = () => {
    setRetryCount(prev => prev + 1);
    setNetworkError(NetworkErrorHandler.createErrorState(null));
  };

  // Update refs after defining functions
  stopTimerRef.current = stopTimer;
  sendHeartbeatRef.current = sendHeartbeat;

  return {
    runningTimer: runningTimer ?? null,
    elapsedTime,
    selectedProject,
    selectedCategory,
    timerMode,
    currentWorkspace,
    isLoading,
    error,
    networkError,
    retryConnection,
    userSettings,
    startTimer,
    stopTimer,
    resetTimer,
    sendHeartbeat,
    acknowledgeInterrupt,
    setSelectedProject,
    setSelectedCategory,
    setTimerMode,
  };
}
