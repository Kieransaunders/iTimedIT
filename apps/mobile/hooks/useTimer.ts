import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState, useCallback } from "react";

export function useTimer() {
  // Default to work workspace (the mobile app's default workspace)
  // Note: In the full implementation, this would come from OrganizationContext
  const workspaceType = "work";

  // Get current running timer with workspace context
  const runningTimer = useQuery(
    api.timer.getRunningTimer,
    { workspaceType }
  );

  // Timer mutations
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const resetTimer = useMutation(api.timer.reset);

  // Local elapsed time state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate elapsed time from running timer
  // Updates every second when timer is running
  useEffect(() => {
    if (!runningTimer) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - runningTimer.startedAt) / 1000);
      setElapsedSeconds(elapsed);
    };

    // Calculate immediately
    calculateElapsed();

    // Update every second
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [runningTimer]);

  // Start timer for a project
  const handleStart = async (projectId: Id<"projects">) => {
    try {
      await startTimer({
        projectId,
        startedFrom: "mobile"
      });
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    }
  };

  // Stop current timer
  const handleStop = async () => {
    try {
      if (!runningTimer) return;
      await stopTimer({});
    } catch (error) {
      console.error("Error stopping timer:", error);
      throw error;
    }
  };

  // Reset current timer
  const handleReset = async () => {
    try {
      if (!runningTimer) return;
      await resetTimer({});
    } catch (error) {
      console.error("Error resetting timer:", error);
      throw error;
    }
  };

  // Calculate elapsed time in seconds (for compatibility)
  const getElapsedSeconds = useCallback((): number => {
    if (!runningTimer?.startedAt) return 0;
    return Math.floor((Date.now() - runningTimer.startedAt) / 1000);
  }, [runningTimer?.startedAt]);

  return {
    runningTimer,
    isRunning: !!runningTimer,
    isLoading: runningTimer === undefined,
    elapsedSeconds,
    start: handleStart,
    stop: handleStop,
    reset: handleReset,
    getElapsedSeconds,
  };
}
