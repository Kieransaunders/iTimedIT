import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { InterruptModal } from "./InterruptModal";

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

const CLIENT_COLORS = [
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
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
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

export function ModernDashboard() {
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showInterruptModal, setShowInterruptModal] = useState(false);

  const projects = useQuery(api.projects.listAll);
  const runningTimer = useQuery(api.timer.getRunningTimer);
  const userSettings = useQuery(api.users.getUserSettings);
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const heartbeat = useMutation(api.timer.heartbeat);
  const requestInterrupt = useMutation(api.timer.requestInterrupt);

  // Enhance projects with colors
  const projectsWithColors = useMemo(() => {
    if (!projects) return [];
    return projects.map(project => ({
      ...project,
      color: getClientColor(project.client._id),
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
    return now - timerState.startMs;
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
      await stopTimer();
      setCurrentProjectId(projectId);
      await startTimer({ projectId });
    } else {
      setCurrentProjectId(projectId);
    }
  }, [currentProjectId, timerState.running, stopTimer, startTimer]);

  if (!currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-8rem)]",
        "bg-[radial-gradient(1000px_600px_at_10%_-20%,_rgba(139,92,246,0.25),_transparent),radial-gradient(800px_500px_at_100%_20%,_rgba(6,182,212,0.18),_transparent)]",
      )}
      style={{
        background: `radial-gradient(1000px 600px at 10% -20%, ${currentProject.color}25, transparent), radial-gradient(800px 500px at 100% 20%, ${currentProject.color}18, transparent)`,
      }}
    >
      <div className="container mx-auto flex min-h-full flex-col items-center justify-center gap-6 py-10">
        {/* Project Switcher */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full max-w-sm">
            <select
              value={currentProject._id}
              onChange={(e) => switchProject(e.target.value as Id<"projects">)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
            >
              {projectsWithColors.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.client.name} – {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-muted-foreground">Select a project to track time</div>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div className="text-8xl font-mono font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatTime(totalElapsedMs)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: currentProject.color }}
            />
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {currentProject.client.name}
            </span>
          </div>
        </div>

        {/* Cost Ticker */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(earnedAmount)}
          </div>
          <div className="text-sm text-muted-foreground">
            @ {formatCurrency(currentProject.hourlyRate)}/hour for {currentProject.client.name}
          </div>
        </div>

        {/* Start/Stop Button */}
        <div className="mt-6 flex items-center gap-3">
          <Button
            size="lg"
            className={cn(
              "h-14 px-10 text-lg font-semibold shadow-lg transition-all duration-200",
              timerState.running 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30" 
                : "shadow-primary/30",
            )}
            style={{
              backgroundColor: timerState.running ? "#ef4444" : currentProject.color,
              color: "white",
            }}
            onClick={toggleTimer}
            aria-pressed={timerState.running}
          >
            {timerState.running ? "Stop" : "Start"}
          </Button>
        </div>

        {/* Recent Projects Carousel */}
        <section className="w-full max-w-4xl">
          <h2 className="sr-only">Recent projects</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {projectsWithColors.slice(0, 4).map((project) => (
              <Card
                key={project._id}
                className={cn(
                  "p-4 cursor-pointer transition-all duration-200 hover:scale-105",
                  project._id === currentProjectId && "ring-2 ring-primary"
                )}
                onClick={() => switchProject(project._id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium text-sm truncate">{project.client.name}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{project.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(project.hourlyRate)}/hour
                </div>
              </Card>
            ))}
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
    </div>
  );
}