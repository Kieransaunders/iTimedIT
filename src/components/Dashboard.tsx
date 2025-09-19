import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ProjectPicker } from "./ProjectPicker";
import { TimerCard } from "./TimerCard";
import { ProjectKpis } from "./ProjectKpis";
import { RecentEntriesTable } from "./RecentEntriesTable";
import { InterruptModal } from "./InterruptModal";
import { Id } from "../../convex/_generated/dataModel";

export function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptCheckInterval, setInterruptCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const runningTimer = useQuery(api.timer.getRunningTimer);
  const userSettings = useQuery(api.users.getUserSettings);
  const heartbeat = useMutation(api.timer.heartbeat);
  const requestInterrupt = useMutation(api.timer.requestInterrupt);

  // Set selected project from running timer
  useEffect(() => {
    if (runningTimer?.projectId && !selectedProjectId) {
      setSelectedProjectId(runningTimer.projectId);
    }
  }, [runningTimer, selectedProjectId]);

  // Heartbeat every 30 seconds when timer is running
  useEffect(() => {
    if (runningTimer && !runningTimer.awaitingInterruptAck) {
      const interval = setInterval(() => {
        heartbeat();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [runningTimer, heartbeat]);

  // Interrupt check timer
  useEffect(() => {
    if (runningTimer && userSettings?.interruptEnabled && !runningTimer.awaitingInterruptAck) {
      const intervalMs = userSettings.interruptInterval * 60 * 1000;
      const timeSinceStart = Date.now() - runningTimer.startedAt;
      const timeUntilNextCheck = intervalMs - (timeSinceStart % intervalMs);

      const timeout = setTimeout(async () => {
        const result = await requestInterrupt();
        if (result.shouldShowInterrupt) {
          setShowInterruptModal(true);
        }
      }, timeUntilNextCheck);

      setInterruptCheckInterval(timeout);
      return () => clearTimeout(timeout);
    } else {
      if (interruptCheckInterval) {
        clearTimeout(interruptCheckInterval);
        setInterruptCheckInterval(null);
      }
    }
  }, [runningTimer, userSettings, requestInterrupt, interruptCheckInterval]);

  // Show interrupt modal if awaiting acknowledgment
  useEffect(() => {
    if (runningTimer?.awaitingInterruptAck) {
      setShowInterruptModal(true);
    }
  }, [runningTimer?.awaitingInterruptAck]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <ProjectPicker
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
        />
        <TimerCard
          selectedProjectId={selectedProjectId}
          runningTimer={runningTimer}
        />
        <RecentEntriesTable projectId={selectedProjectId} />
      </div>
      <div className="space-y-6">
        {selectedProjectId && (
          <ProjectKpis projectId={selectedProjectId} />
        )}
      </div>
      {showInterruptModal && runningTimer && (
        <InterruptModal
          projectName={runningTimer.project?.name || "Unknown Project"}
          onClose={() => setShowInterruptModal(false)}
        />
      )}
    </div>
  );
}
