import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Project, RunningTimer } from "@/types/models";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  playInterruptSound,
  playOverrunSound,
  playBreakStartSound,
  playBreakEndSound
} from "@/services/soundManager";

export interface UseTimerReturn {
  runningTimer: RunningTimer | null;
  elapsedTime: number;
  selectedProject: Project | null;
  selectedCategory: string | null;
  timerMode: "normal" | "pomodoro";
  isLoading: boolean;
  error: string | null;
  userSettings: { gracePeriod: number } | undefined;
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
  // Local state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<"normal" | "pomodoro">("normal");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs to track previous state for sound triggers
  const prevInterruptRef = useRef<boolean>(false);
  const prevPomodoroPhaseRef = useRef<"work" | "break" | undefined>();

  // Convex queries and mutations
  const runningTimer = useQuery(api.timer.getRunningTimer) as RunningTimer | null | undefined;
  const startMutation = useMutation(api.timer.start);
  const stopMutation = useMutation(api.timer.stop);
  const resetMutation = useMutation(api.timer.reset);
  const heartbeatMutation = useMutation(api.timer.heartbeat);
  const ackInterruptMutation = useMutation(api.timer.ackInterrupt);
  const userSettings = useQuery(api.users.getUserSettings);

  const isLoading = runningTimer === undefined || userSettings === undefined;

  /**
   * Calculate elapsed time from running timer
   * Updates every second when timer is running
   */
  useEffect(() => {
    if (!runningTimer) {
      setElapsedTime(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - runningTimer.startedAt) / 1000);
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
    if (!runningTimer) {
      return;
    }

    // Send heartbeat immediately
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [runningTimer]);

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
    prevInterruptRef.current = runningTimer.awaitingInterruptAck;
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
    if (!runningTimer || !runningTimer.nextInterruptAt) {
      return;
    }

    // Check if we've passed the interrupt time significantly (grace period)
    const now = Date.now();
    const overrunThreshold = runningTimer.nextInterruptAt + 60000; // 60 second grace period

    if (now > overrunThreshold && runningTimer.awaitingInterruptAck) {
      playOverrunSound();
    }
  }, [runningTimer?.nextInterruptAt, runningTimer?.awaitingInterruptAck, elapsedTime]);

  /**
   * Start a timer for the selected project
   */
  const startTimer = useCallback(
    async (
      projectId: Id<"projects">,
      category?: string,
      pomodoroEnabled?: boolean
    ) => {
      try {
        setError(null);

        await startMutation({
          projectId,
          category,
          pomodoroEnabled: pomodoroEnabled ?? timerMode === "pomodoro",
        });
      } catch (err: any) {
        console.error("Failed to start timer:", err);
        const errorMessage = err?.message || "Failed to start timer";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [startMutation, timerMode]
  );

  /**
   * Stop the running timer
   */
  const stopTimer = useCallback(async () => {
    try {
      setError(null);

      await stopMutation({});
    } catch (err: any) {
      console.error("Failed to stop timer:", err);
      const errorMessage = err?.message || "Failed to stop timer";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [stopMutation]);

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
  }, [resetMutation]);

  /**
   * Send heartbeat to keep timer alive
   */
  const sendHeartbeat = useCallback(async () => {
    try {
      await heartbeatMutation();
    } catch (err: any) {
      console.error("Failed to send heartbeat:", err);
      // Don't set error state for heartbeat failures
      // They should fail silently
    }
  }, [heartbeatMutation]);

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
    [ackInterruptMutation]
  );

  return {
    runningTimer: runningTimer ?? null,
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
    sendHeartbeat,
    acknowledgeInterrupt,
    setSelectedProject,
    setSelectedCategory,
    setTimerMode,
  };
}
