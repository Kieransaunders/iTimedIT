import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useTimer() {
  // Get current running timer
  const runningTimer = useQuery(api.timer.getRunningTimer);

  // Timer mutations
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const resetTimer = useMutation(api.timer.reset);

  // Start timer for a project
  const handleStart = async (projectId: Id<"projects">) => {
    try {
      await startTimer({ projectId });
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    }
  };

  // Stop current timer
  const handleStop = async () => {
    try {
      if (!runningTimer) return;
      await stopTimer();
    } catch (error) {
      console.error("Error stopping timer:", error);
      throw error;
    }
  };

  // Reset current timer
  const handleReset = async () => {
    try {
      if (!runningTimer) return;
      await resetTimer();
    } catch (error) {
      console.error("Error resetting timer:", error);
      throw error;
    }
  };

  // Calculate elapsed time in seconds
  const getElapsedSeconds = (): number => {
    if (!runningTimer?.startTime) return 0;
    return Math.floor((Date.now() - runningTimer.startTime) / 1000);
  };

  return {
    runningTimer,
    isRunning: !!runningTimer,
    isLoading: runningTimer === undefined,
    start: handleStart,
    stop: handleStop,
    reset: handleReset,
    getElapsedSeconds,
  };
}
