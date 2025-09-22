import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface TimerCardProps {
  selectedProjectId: Id<"projects"> | null;
  runningTimer: any;
}

export function TimerCard({ selectedProjectId, runningTimer }: TimerCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [note, setNote] = useState("");

  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const projectStats = useQuery(api.projects.getStats, runningTimer?.projectId ? { projectId: runningTimer.projectId } : "skip");

  // Update elapsed time every second
  useEffect(() => {
    if (runningTimer) {
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - runningTimer.startedAt) / 1000);
        setElapsedSeconds(elapsed);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [runningTimer]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBudgetTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleStart = async () => {
    if (!selectedProjectId) return;
    await startTimer({ projectId: selectedProjectId });
  };

  const handleStop = async () => {
    await stopTimer({});
    setNote("");
  };

  const isRunning = !!runningTimer;
  const canStart = selectedProjectId && !isRunning;

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <div className="text-center">
        <div className="text-6xl font-mono font-bold text-gray-800 dark:text-purple-timer mb-6">
          {formatTime(elapsedSeconds)}
        </div>

        {runningTimer && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-md border dark:border-green-700/50">
            <div className="font-medium text-green-900 dark:text-green-200">
              {runningTimer.client?.name} → {runningTimer.project?.name}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Started at {new Date(runningTimer.startedAt).toLocaleTimeString()}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center mb-6">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                canStart
                  ? "bg-purple-timer hover:bg-purple-timer-hover shadow-lg"
                  : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
              }`}
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-8 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg"
            >
              Stop
            </button>
          )}
        </div>

        {runningTimer && projectStats && (
          <div className="mb-4 text-center">
            {projectStats.timeRemaining > 0 || projectStats.budgetRemaining > 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {runningTimer.project?.budgetType === "hours" && projectStats.timeRemaining > 0 ? (
                  <>Time remaining: <span className="font-semibold text-green-600 dark:text-green-400">{formatBudgetTime(projectStats.timeRemaining * 3600)}</span></>
                ) : runningTimer.project?.budgetType === "amount" && projectStats.budgetRemaining > 0 ? (
                  <>Amount remaining: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(projectStats.budgetRemaining)}</span></>
                ) : (
                  <span className="font-semibold text-red-600 dark:text-red-400">⚠️ Budget exceeded</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-red-600 dark:text-red-400">
                <span className="font-semibold">⚠️ Budget exceeded</span>
              </div>
            )}
          </div>
        )}

        <div className="max-w-md mx-auto">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for this time entry..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            rows={3}
          />
        </div>

        {!selectedProjectId && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Select a project to start tracking time
          </div>
        )}
      </div>
    </div>
  );
}
