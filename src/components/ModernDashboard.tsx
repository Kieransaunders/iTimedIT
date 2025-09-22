import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { InterruptModal } from "./InterruptModal";
import { ProjectSwitchModal } from "./ProjectSwitchModal";
import { ProjectKpis } from "./ProjectKpis";
import { RecentEntriesTable } from "./RecentEntriesTable";

interface TimerState {
  running: boolean;
  startMs: number | null;
  elapsedMs: number;
  lastActivityMs: number;
}

interface ProjectWithClient {
  _id: Id<"projects">;
  name: string;
  hourlyRate: number;
  client: {
    _id: Id<"clients">;
    name: string;
  };
  color: string;
}

const FALLBACK_COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan  
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#f97316", // orange
  "#ec4899", // pink
];

function getClientColor(clientId: string): string {
  const hash = clientId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatBudgetTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function ModernDashboard() {
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [showProjectSwitchModal, setShowProjectSwitchModal] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<Id<"projects"> | null>(null);

  const projects = useQuery(api.projects.listAll);
  const runningTimer = useQuery(api.timer.getRunningTimer);
  const userSettings = useQuery(api.users.getUserSettings);
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const heartbeat = useMutation(api.timer.heartbeat);
  const requestInterrupt = useMutation(api.timer.requestInterrupt);
  const projectStats = useQuery(api.projects.getStats, runningTimer?.projectId ? { projectId: runningTimer.projectId } : "skip");

  // Enhance projects with colors
  const projectsWithColors = useMemo(() => {
    if (!projects) return [];
    return projects.map(project => ({
      ...project,
      color: project.client.color || getClientColor(project.client._id),
    }));
  }, [projects]);

  const currentProject = useMemo(() => {
    return projectsWithColors.find(p => p._id === currentProjectId) || projectsWithColors[0];
  }, [projectsWithColors, currentProjectId]);

  // Set current project from running timer or default to first
  useEffect(() => {
    if (runningTimer?.projectId && !currentProjectId) {
      setCurrentProjectId(runningTimer.projectId);
    } else if (!currentProjectId && projectsWithColors.length > 0) {
      setCurrentProjectId(projectsWithColors[0]._id);
    }
  }, [runningTimer, currentProjectId, projectsWithColors]);

  // Update time display
  useEffect(() => {
    if (!runningTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  // Heartbeat when timer is running
  useEffect(() => {
    if (runningTimer && !runningTimer.awaitingInterruptAck) {
      const interval = setInterval(() => {
        heartbeat();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [runningTimer, heartbeat]);

  // Interrupt handling
  useEffect(() => {
    if (runningTimer?.awaitingInterruptAck) {
      setShowInterruptModal(true);
    }
  }, [runningTimer?.awaitingInterruptAck]);

  // Timer state calculations
  const timerState = useMemo((): TimerState => {
    if (!runningTimer) {
      return { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() };
    }
    return {
      running: true,
      startMs: runningTimer.startedAt,
      elapsedMs: 0,
      lastActivityMs: runningTimer.lastHeartbeatAt,
    };
  }, [runningTimer]);

  const totalElapsedMs = useMemo(() => {
    if (!timerState.running || !timerState.startMs) return 0;
    return Math.max(0, now - timerState.startMs);
  }, [timerState, now]);

  const totalSeconds = Math.floor(totalElapsedMs / 1000);
  const earnedAmount = currentProject ? (totalSeconds / 3600) * currentProject.hourlyRate : 0;

  const toggleTimer = useCallback(async () => {
    if (!currentProject) return;
    
    if (timerState.running) {
      await stopTimer();
    } else {
      await startTimer({ projectId: currentProject._id });
    }
  }, [currentProject, timerState.running, startTimer, stopTimer]);

  const switchProject = useCallback(async (projectId: Id<"projects">) => {
    if (projectId === currentProjectId) return;
    
    if (timerState.running) {
      setPendingProjectId(projectId);
      setShowProjectSwitchModal(true);
    } else {
      setCurrentProjectId(projectId);
    }
  }, [currentProjectId, timerState.running]);

  const handleStopAndSwitch = useCallback(async () => {
    if (!pendingProjectId) return;
    await stopTimer();
    setCurrentProjectId(pendingProjectId);
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, stopTimer]);

  const handleTransferTimer = useCallback(async () => {
    if (!pendingProjectId) return;
    await stopTimer();
    setCurrentProjectId(pendingProjectId);
    await startTimer({ projectId: pendingProjectId });
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, stopTimer, startTimer]);

  const handleCancelSwitch = useCallback(() => {
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, []);

  if (!currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900">
      <div className="container mx-auto flex min-h-full flex-col items-center justify-center gap-6 py-10">
        {/* Project Switcher */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full max-w-md relative">
            <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentProject.color }}
                />
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white font-medium">{currentProject.client.name}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">– {currentProject.name}</div>
                </div>
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <select
              value={currentProject._id}
              onChange={(e) => switchProject(e.target.value as Id<"projects">)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {projectsWithColors.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.client.name} – {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Swipe left/right to switch projects</div>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-8">
          <div 
            className={`text-9xl font-mono font-bold mb-4 tracking-tight ${
              runningTimer && projectStats?.isNearBudgetLimit 
                ? "animate-pulse" 
                : ""
            }`}
            style={{ 
              color: runningTimer && projectStats?.isNearBudgetLimit 
                ? "#f59e0b" // amber warning color
                : currentProject.color 
            }}
          >
            {formatTime(totalElapsedMs)}
          </div>
        </div>

        {/* Time/Allocation Remaining Display */}
        {runningTimer && projectStats && (
          <div className="text-center mb-8">
            {projectStats.timeRemaining > 0 || projectStats.budgetRemaining > 0 ? (
              <div className="text-lg text-gray-700 dark:text-gray-300">
                {runningTimer.project?.budgetType === "hours" && projectStats.timeRemaining > 0 ? (
                  <>Time remaining: <span className={`font-bold ${projectStats.isNearBudgetLimit ? "text-amber-400" : "text-green-400"}`}>{formatBudgetTime(projectStats.timeRemaining * 3600)}</span></>
                ) : runningTimer.project?.budgetType === "amount" && projectStats.budgetRemaining > 0 ? (
                  <>Amount remaining: <span className={`font-bold ${projectStats.isNearBudgetLimit ? "text-amber-400" : "text-green-400"}`}>{formatCurrency(projectStats.budgetRemaining)}</span></>
                ) : (
                  <span className="font-bold text-red-400">⚠️ Budget exceeded</span>
                )}
                {projectStats.isNearBudgetLimit && (
                  <div className="text-sm text-amber-600 dark:text-amber-400 mt-1 animate-pulse">
                    ⚠️ Approaching budget limit
                  </div>
                )}
              </div>
            ) : (
              <div className="text-lg text-red-600 dark:text-red-400">
                <span className="font-bold">⚠️ Budget exceeded</span>
              </div>
            )}
          </div>
        )}

        {/* Start/Stop Button */}
        <div className="mb-12">
          <button
            className="px-12 py-4 text-lg font-semibold text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: timerState.running ? "#ef4444" : currentProject.color,
            }}
            onClick={toggleTimer}
            aria-pressed={timerState.running}
          >
            {timerState.running ? "Stop" : "Start"}
          </button>
        </div>

        {/* Recent Projects */}
        <section className="w-full max-w-5xl">
          <h2 className="sr-only">Recent projects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectsWithColors.slice(0, 4).map((project) => (
              <div
                key={project._id}
                className={cn(
                  "bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 hover:scale-105",
                  project._id === currentProjectId && "ring-2 ring-gray-400/50 dark:ring-white/20"
                )}
                onClick={() => switchProject(project._id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{project.client.name}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-xs truncate font-medium">{project.name}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  {formatCurrency(project.hourlyRate)}/hr
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Project Summary */}
        <section className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project KPIs */}
          {currentProjectId && (
            <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-6">
              <ProjectKpis projectId={currentProjectId} />
            </div>
          )}
          
          {/* Recent Entries */}
          <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-6">
            <RecentEntriesTable projectId={currentProjectId} />
          </div>
        </section>
      </div>

      {/* Interrupt Modal */}
      {showInterruptModal && runningTimer && (
        <InterruptModal
          projectName={currentProject.name}
          onClose={() => setShowInterruptModal(false)}
        />
      )}

      {/* Project Switch Modal */}
      {showProjectSwitchModal && pendingProjectId && (
        <ProjectSwitchModal
          currentProjectName={`${currentProject.client.name} – ${currentProject.name}`}
          newProjectName={(() => {
            const pendingProject = projectsWithColors.find(p => p._id === pendingProjectId);
            return pendingProject ? `${pendingProject.client.name} – ${pendingProject.name}` : '';
          })()}
          onStopAndSwitch={handleStopAndSwitch}
          onTransferTimer={handleTransferTimer}
          onCancel={handleCancelSwitch}
        />
      )}
    </div>
  );
}
