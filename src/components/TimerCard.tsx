import { useMutation } from "convex/react";
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center">
        <div className="text-6xl font-mono font-bold text-gray-800 mb-6">
          {formatTime(elapsedSeconds)}
        </div>

        {runningTimer && (
          <div className="mb-4 p-3 bg-green-50 rounded-md">
            <div className="font-medium text-green-900">
              {runningTimer.client?.name} → {runningTimer.project?.name}
            </div>
            <div className="text-sm text-green-700">
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
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Start Timer
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-8 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Stop Timer
            </button>
          )}
        </div>

        <div className="max-w-md mx-auto">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for this time entry..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>

        {!selectedProjectId && (
          <div className="mt-4 text-sm text-gray-500">
            Select a project to start tracking time
          </div>
        )}
      </div>
    </div>
  );
}
