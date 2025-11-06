/**
 * ModernDashboard - ACTIVE MAIN TIMER INTERFACE
 *
 * This is the primary timer interface that users interact with in the application.
 * Used in: App.tsx (line 198) as the main dashboard component
 *
 * Key Features:
 * - Modern purple gradient design with large timer display
 * - Project selection with client/project cards
 * - Timer start/stop functionality
 * - Push notifications for interrupts and alerts
 * - Budget tracking and warnings
 * - Recent entries and project KPIs
 *
 * DO NOT confuse with TimerCard.tsx - that component is unused legacy code.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { cn } from "../lib/utils";
import { ProjectSwitchModal } from "./ProjectSwitchModal";
import { ProjectKpis } from "./ProjectKpis";
import { ProjectSummaryGrid } from "./ProjectSummaryGrid";
import { WorkspaceSwitcher, WorkspaceType } from "./WorkspaceSwitcher";
import { ensurePushSubscription, isPushSupported, getNotificationPermission } from "../lib/push";
import { toast } from "sonner";
import { playBreakStartSound, playBreakEndSound, playCycleCompleteSound, enableSounds, disableSounds } from "../lib/sounds";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Play, Square } from "lucide-react";
import { PomodoroBreakTimer } from "./PomodoroBreakTimer";
import { PomodoroPhaseIndicator } from "./PomodoroPhaseIndicator";
import { useCurrency } from "../hooks/useCurrency";
import { updateTimerTitle, clearTimerTitle, setPageVisibility } from "../lib/attention";
import { updateTimerFavicon, clearTimerFavicon, type FaviconState } from "../lib/favicon";
import { updateBadgeForTimer, clearAppBadge } from "../lib/badgeApi";
import { SoundSelectionModal } from "./SoundSelectionModal";
import { PictureInPictureTimer } from "./PictureInPictureTimer";
import type { PiPTimerState } from "../lib/pip";
import { TodaySummaryCard } from "./TodaySummaryCard";
import type { TimeEntry } from "./TodaySummaryCard";

interface ModernDashboardProps {
  pushSwitchRequest?: any | null;
  onPushSwitchHandled?: () => void;
  workspaceType?: WorkspaceType;
  onWorkspaceChange?: (workspace: WorkspaceType) => void;
}

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
  } | null;
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


function formatBudgetTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function ModernDashboard({
  pushSwitchRequest,
  onPushSwitchHandled,
  workspaceType = "work",
  onWorkspaceChange,
}: ModernDashboardProps) {
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(null);
  const currentWorkspace = workspaceType;
  const { formatCurrency: formatCurrencyWithSymbol } = useCurrency();
  const [now, setNow] = useState(Date.now());
  const [showProjectSwitchModal, setShowProjectSwitchModal] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<Id<"projects"> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [timerMode, setTimerMode] = useState<"normal" | "pomodoro">("normal");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    clientId: "" as Id<"clients"> | "",
    hourlyRate: 100,
    budgetType: "hours" as "hours" | "amount",
    budgetHours: undefined as number | undefined,
    budgetAmount: undefined as number | undefined
  });
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    color: ""
  });
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use appropriate API based on workspace type
  const projects = useQuery(
    currentWorkspace === "personal"
      ? api.personalProjects.listPersonal
      : api.projects.listAll,
    currentWorkspace === "personal" ? {} : {}
  );
  const runningTimer = useQuery(api.timer.getRunningTimer, { workspaceType: currentWorkspace });
  const userSettings = useQuery(api.users.getUserSettings);
  const categories = useQuery(api.categories.getCategories);
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const resetTimer = useMutation(api.timer.reset);
  const heartbeat = useMutation(api.timer.heartbeat);
  const requestInterrupt = useMutation(api.timer.requestInterrupt);
  const projectStats = useQuery(
    currentWorkspace === "personal" 
      ? api.personalProjects.getStatsPersonal
      : api.projects.getStats,
    runningTimer?.projectId ? { projectId: runningTimer.projectId } : "skip"
  );
  const savePushSubscription = useMutation(api.pushNotifications.savePushSubscription);
  const createProject = useMutation(
    currentWorkspace === "personal" 
      ? api.personalProjects.createPersonal
      : api.projects.create
  );
  const createClient = useMutation(
    currentWorkspace === "personal" 
      ? api.personalClients.createPersonal
      : api.clients.create
  );
  const clients = useQuery(
    currentWorkspace === "personal"
      ? api.personalClients.listPersonal
      : api.clients.list,
    currentWorkspace === "personal" ? {} : {}
  );
  const updateUserSettings = useMutation(api.users.updateUserSettings);
  const notificationPrefs = useQuery(api.pushNotifications.getNotificationPrefs);
  const soundPreferenceEnabled = Boolean(notificationPrefs?.soundEnabled);

  // Fetch time entries for TodaySummaryCard
  const allEntriesResult = useQuery(
    currentWorkspace === "personal"
      ? api.personalEntries.listPersonal
      : api.entries.list,
    {
      paginationOpts: { numItems: 1000, cursor: null },
    }
  );

  useEffect(() => {
    if (!soundPreferenceEnabled) {
      disableSounds();
    }
  }, [soundPreferenceEnabled]);

  const projectsLoading = projects === undefined;
  const clientsLoading = clients === undefined;
  const isLoading = projectsLoading || clientsLoading;

  // Enhance projects with colors
  const projectsWithColors = useMemo(() => {
    if (!projects) return [];
    return projects.map(project => ({
      ...project,
      color: project.client?.color || (project.client?._id ? getClientColor(project.client._id) : FALLBACK_COLORS[0]),
    }));
  }, [projects]);

  // Filter projects based on search term and separate by workspace type
  const { personalProjects, workProjects, filteredProjects } = useMemo(() => {
    // Separate projects by workspace type
    const personal = projectsWithColors.filter(p => p.workspaceType === "personal");
    const work = projectsWithColors.filter(p => !p.workspaceType || p.workspaceType === "work");

    // Apply search filter
    let filtered = projectsWithColors;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = projectsWithColors.filter(project =>
        project.name.toLowerCase().includes(term) ||
        (project.client?.name && project.client.name.toLowerCase().includes(term))
      );
    }

    return {
      personalProjects: personal,
      workProjects: work,
      filteredProjects: filtered
    };
  }, [projectsWithColors, searchTerm]);

  const currentProject = useMemo(() => {
    return projectsWithColors.find(p => p._id === currentProjectId) || projectsWithColors[0];
  }, [projectsWithColors, currentProjectId]);

  const hasProjects = projectsWithColors.length > 0;
  const hasClients = (clients?.length ?? 0) > 0;

  // Format entries for TodaySummaryCard
  const formattedEntries = useMemo((): TimeEntry[] => {
    if (!allEntriesResult?.page) return [];

    return allEntriesResult.page
      .map((entry: any) => ({
        _id: entry._id || "",
        projectId: entry.projectId || "",
        startedAt: entry.startedAt || 0,
        stoppedAt: entry.stoppedAt,
        seconds: typeof entry.seconds === "number" ? entry.seconds : 0,
        project: entry.project,
      }))
      .filter((entry) => entry.project && entry.seconds > 0);
  }, [allEntriesResult]);

  // Calculate totals for today
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = Date.now();

    const todayEntries = formattedEntries.filter(
      (entry) => entry.startedAt >= todayStart && entry.startedAt <= todayEnd
    );

    const totalSeconds = todayEntries.reduce((sum, entry) => sum + entry.seconds, 0);

    return {
      totalSeconds,
      entriesCount: todayEntries.length,
    };
  }, [formattedEntries]);

  // Reset currentProjectId when workspace changes to avoid fetching wrong project type
  useEffect(() => {
    setCurrentProjectId(null);
  }, [currentWorkspace]);

  // Set current project from running timer or default to first
  useEffect(() => {
    if (runningTimer?.projectId) {
      // Always prioritize the running timer's project
      if (currentProjectId !== runningTimer.projectId) {
        setCurrentProjectId(runningTimer.projectId);
      }
    } else if (!currentProjectId && projectsWithColors.length > 0) {
      // Only default to first project if no timer is running and no project selected
      setCurrentProjectId(projectsWithColors[0]._id);
    }
  }, [runningTimer?.projectId, projectsWithColors.length]);

  // Update time display - runs whenever we have a running timer
  useEffect(() => {
    if (!runningTimer) {
      // Reset now to current time when timer stops
      setNow(Date.now());
      return;
    }

    // Update immediately
    setNow(Date.now());

    // Then update every second
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [runningTimer?._id]); // Re-run when timer ID changes (or when timer starts/stops)

  // Heartbeat when timer is running
  useEffect(() => {
    if (runningTimer && !runningTimer.awaitingInterruptAck) {
      const interval = setInterval(() => {
        heartbeat();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [runningTimer, heartbeat]);

  // Interrupt handling - Removed large modal, using toast notifications only
  // The InterruptWatcher component handles toast notifications and sounds globally

  // Update timer mode when timer is running
  useEffect(() => {
    if (runningTimer?.pomodoroEnabled !== undefined) {
      setTimerMode(runningTimer.pomodoroEnabled ? "pomodoro" : "normal");
    }
  }, [runningTimer?.pomodoroEnabled]);

  // Handle Pomodoro phase transitions and sound notifications
  const [previousPhase, setPreviousPhase] = useState<string | null>(null);
  const [previousBreakTimer, setPreviousBreakTimer] = useState<boolean>(false);
  const notifiedMobileTimerRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!runningTimer?.pomodoroEnabled) return;

    const currentPhase = runningTimer.pomodoroPhase;
    const currentIsBreakTimer = runningTimer.isBreakTimer;

    // Enable sounds on first Pomodoro interaction when allowed
    if (currentPhase && !previousPhase && soundPreferenceEnabled) {
      enableSounds();
    }

    // Detect phase transitions
    if (previousPhase && currentPhase !== previousPhase) {
      if (currentPhase === "break" && currentIsBreakTimer) {
        // Work session ended, break started
        if (soundPreferenceEnabled) {
          playBreakStartSound(userSettings?.notificationSound);
        }
        toast.success("Break time! Step away and recharge 🌱");
      }
    }

    // Track break timer deletion (break ended)
    if (previousBreakTimer && !currentIsBreakTimer && previousPhase === "break") {
      // Break timer was deleted (break ended)
      const completedCycles = (runningTimer?.pomodoroCompletedCycles ?? 0);
      const isFullCycleComplete = completedCycles > 0 && completedCycles % 4 === 0;
      
      if (isFullCycleComplete) {
        if (soundPreferenceEnabled) {
          playCycleCompleteSound(userSettings?.notificationSound);
        }
        toast.success(`🎉 Pomodoro cycle complete! Great work!`);
      } else {
        if (soundPreferenceEnabled) {
          playBreakEndSound(userSettings?.notificationSound);
        }
        toast.info("Break complete! Ready to focus? 🎯");
      }
    }

    setPreviousPhase(currentPhase || null);
    setPreviousBreakTimer(currentIsBreakTimer || false);
  }, [
    runningTimer?.pomodoroPhase,
    runningTimer?.isBreakTimer,
    runningTimer?.pomodoroCompletedCycles,
    soundPreferenceEnabled,
    userSettings?.notificationSound
  ]);

  // Page visibility tracking for title updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageVisibility(document.visibilityState === 'visible');
    };

    // Set initial state
    setPageVisibility(document.visibilityState === 'visible');

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimerTitle();
    };
  }, []);

  // Update title when timer is running or interrupt is active
  useEffect(() => {
    if (!runningTimer || !currentProject) {
      clearTimerTitle();
      return;
    }

    const updateTitle = () => {
      const elapsed = now - runningTimer.startedAt;

      // Check if interrupt is active
      if (runningTimer.awaitingInterruptAck && runningTimer.interruptShownAt && userSettings?.gracePeriod) {
        const gracePeriodMs = userSettings.gracePeriod * 1000;
        const timeSinceInterrupt = now - runningTimer.interruptShownAt;
        const remainingMs = gracePeriodMs - timeSinceInterrupt;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

        updateTimerTitle({
          elapsedMs: elapsed,
          projectName: currentProject.name,
          isInterrupt: true,
          interruptSecondsLeft: remainingSeconds,
        });
      } else {
        // Normal timer display
        updateTimerTitle({
          elapsedMs: elapsed,
          projectName: currentProject.name,
        });
      }
    };

    // Update immediately
    updateTitle();

    // Update every second
    const interval = setInterval(updateTitle, 1000);

    return () => clearInterval(interval);
  }, [runningTimer, currentProject, now, userSettings?.gracePeriod]);

  // Update badge when timer state changes
  useEffect(() => {
    const hasRunningTimer = !!runningTimer;
    updateBadgeForTimer(hasRunningTimer);

    // Clear badge when timer stops
    return () => {
      if (!hasRunningTimer) {
        clearAppBadge();
      }
    };
  }, [runningTimer?._id]);

  // Update favicon when timer is running
  useEffect(() => {
    if (!runningTimer || !currentProject) {
      clearTimerFavicon();
      return;
    }

    const updateFavicon = () => {
      const elapsed = now - runningTimer.startedAt;
      let state: FaviconState = 'normal';
      let showSeconds = false;
      let secondsLeft: number | undefined;

      // Check if interrupt is active
      if (runningTimer.awaitingInterruptAck && runningTimer.interruptShownAt && userSettings?.gracePeriod) {
        state = 'interrupt';
        showSeconds = true;
        const gracePeriodMs = userSettings.gracePeriod * 1000;
        const timeSinceInterrupt = now - runningTimer.interruptShownAt;
        const remainingMs = gracePeriodMs - timeSinceInterrupt;
        secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      } else if (projectStats) {
        // Check if approaching budget
        const budgetType = projectStats.budgetType;
        const budgetRemaining = projectStats.budgetRemaining;
        const budgetTotal = projectStats.budgetTotal;

        if (budgetRemaining !== undefined && budgetTotal !== undefined && budgetTotal > 0) {
          const percentRemaining = (budgetRemaining / budgetTotal) * 100;
          if (percentRemaining < 10) {
            state = 'warning';
          }
        }
      }

      // Calculate total time for progress (if we have budget info)
      let totalMs: number | undefined;
      if (projectStats?.budgetType === 'hours' && projectStats?.budgetTotal) {
        totalMs = projectStats.budgetTotal * 3600 * 1000; // hours to ms
      }

      updateTimerFavicon({
        elapsedMs: elapsed,
        totalMs,
        state,
        showSeconds,
        secondsLeft,
      });
    };

    // Update immediately
    updateFavicon();

    // Update every 5 seconds for performance
    const interval = setInterval(updateFavicon, 5000);

    return () => {
      clearInterval(interval);
      clearTimerFavicon();
    };
  }, [runningTimer, currentProject, projectStats, now, userSettings?.gracePeriod]);

  // Auto-select default category on mount (only once)
  const categoryInitializedRef = useRef(false);
  useEffect(() => {
    if (categories && categories.length > 0 && !categoryInitializedRef.current) {
      const defaultCategory = categories.find(c => c.isDefault);
      if (defaultCategory) {
        setSelectedCategory(defaultCategory.name);
      }
      categoryInitializedRef.current = true;
    }
  }, [categories]);

  // Timer state calculations
  const timerState = useMemo((): TimerState => {
    if (!runningTimer) {
      return { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() };
    }
    return {
      running: true,
      startMs: runningTimer.isBreakTimer ? runningTimer.breakStartedAt! : runningTimer.startedAt,
      elapsedMs: 0,
      lastActivityMs: runningTimer.lastHeartbeatAt,
    };
  }, [runningTimer]);

  const totalElapsedMs = useMemo(() => {
    if (!timerState.running || !timerState.startMs) return 0;
    return Math.max(0, now - timerState.startMs);
  }, [timerState, now]);

  // Break timer calculations
  const isBreakTimer = runningTimer?.isBreakTimer;
  const breakTimeRemaining = useMemo(() => {
    if (!isBreakTimer || !runningTimer?.breakEndsAt) return 0;
    return Math.max(0, runningTimer.breakEndsAt - now);
  }, [isBreakTimer, runningTimer?.breakEndsAt, now]);

  const totalSeconds = Math.floor(totalElapsedMs / 1000);
  const earnedAmount = currentProject && !isBreakTimer ? (totalSeconds / 3600) * currentProject.hourlyRate : 0;

  // PiP timer state
  const pipTimerState = useMemo((): PiPTimerState => {
    if (!currentProject) {
      return {
        elapsedMs: 0,
        projectName: "",
        isRunning: false,
      };
    }

    let isBudgetWarning = false;
    let isBudgetOverrun = false;

    if (projectStats && runningTimer && !isBreakTimer) {
      const budgetRemaining = projectStats.budgetRemaining;
      const budgetTotal = projectStats.budgetTotal;

      if (budgetRemaining !== undefined && budgetTotal !== undefined && budgetTotal > 0) {
        const percentRemaining = (budgetRemaining / budgetTotal) * 100;
        isBudgetOverrun = budgetRemaining <= 0;
        isBudgetWarning = !isBudgetOverrun && percentRemaining < 10;
      }
    }

    return {
      elapsedMs: totalElapsedMs,
      projectName: currentProject.name,
      clientName: currentProject.client?.name,
      isRunning: timerState.running,
      isInterrupt: runningTimer?.awaitingInterruptAck,
      interruptSecondsLeft: runningTimer?.awaitingInterruptAck && runningTimer.interruptShownAt && userSettings?.gracePeriod
        ? Math.max(0, Math.ceil((userSettings.gracePeriod * 1000 - (now - runningTimer.interruptShownAt)) / 1000))
        : undefined,
      isBudgetWarning,
      isBudgetOverrun,
      projectColor: currentProject.color,
    };
  }, [currentProject, totalElapsedMs, timerState.running, runningTimer, projectStats, isBreakTimer, now, userSettings?.gracePeriod]);

  // Calculate real-time budget remaining by subtracting current elapsed time
  const realTimeBudgetRemaining = useMemo(() => {
    if (!projectStats || !runningTimer || isBreakTimer) return null;

    if (runningTimer.project?.budgetType === "hours") {
      // Subtract current elapsed seconds from time remaining (in hours)
      const remainingSeconds = (projectStats.timeRemaining * 3600) - totalSeconds;
      return {
        type: "hours" as const,
        remaining: remainingSeconds,
        isNearLimit: projectStats.isNearBudgetLimit
      };
    } else if (runningTimer.project?.budgetType === "amount") {
      // Subtract earned amount from budget remaining
      const remaining = projectStats.budgetRemaining - earnedAmount;
      return {
        type: "amount" as const,
        remaining,
        isNearLimit: projectStats.isNearBudgetLimit
      };
    }
    return null;
  }, [projectStats, runningTimer, isBreakTimer, totalSeconds, earnedAmount]);

  const primeSoundIfEnabled = useCallback(() => {
    if (soundPreferenceEnabled) {
      enableSounds();
    }
  }, [soundPreferenceEnabled]);

  const ensurePushRegistered = useCallback(async (requestPermission: boolean) => {
    if (isPushSupported() && getNotificationPermission() === 'default' && requestPermission) {
      toast.info('Enable notifications to catch timer alerts', {
        description: 'We only prompt when you start your first timer.',
        duration: 4000,
      });
    }
    try {
      const subscription = await ensurePushSubscription({ requestPermission });
      if (!subscription) {
        return;
      }

      await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Failed to ensure push subscription", error);
    }
  }, [savePushSubscription]);

  const toggleTimer = useCallback(async () => {
    if (!currentProject) return;
    
    if (timerState.running) {
      await stopTimer();
    } else {
      primeSoundIfEnabled();
      await ensurePushRegistered(true);
      await startTimer({
        projectId: currentProject._id,
        category: selectedCategory,
        pomodoroEnabled: timerMode === "pomodoro",
        startedFrom: "web"
      });
    }
  }, [currentProject, timerState.running, startTimer, stopTimer, ensurePushRegistered, timerMode, primeSoundIfEnabled, selectedCategory]);

  const switchProject = useCallback(async (projectId: Id<"projects">) => {
    if (projectId === currentProjectId) return;
    
    if (timerState.running) {
      setPendingProjectId(projectId);
      setShowProjectSwitchModal(true);
    } else {
      // No timer running - switch project and auto-start timer
      setCurrentProjectId(projectId);
      primeSoundIfEnabled();
      await ensurePushRegistered(true);
      await startTimer({
        projectId,
        pomodoroEnabled: timerMode === "pomodoro",
        startedFrom: "web"
      });
    }
  }, [currentProjectId, timerState.running, ensurePushRegistered, startTimer, timerMode, primeSoundIfEnabled]);

  const handleStopAndSwitch = useCallback(async () => {
    if (!pendingProjectId) return;
    await stopTimer();
    setCurrentProjectId(pendingProjectId);
    primeSoundIfEnabled();
    await ensurePushRegistered(false);
    await startTimer({
      projectId: pendingProjectId,
      pomodoroEnabled: timerMode === "pomodoro",
      startedFrom: "web"
    });
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, stopTimer, ensurePushRegistered, startTimer, timerMode, primeSoundIfEnabled]);

  const transferTimerToProject = useCallback(async (projectId: Id<"projects">) => {
    await stopTimer();
    setCurrentProjectId(projectId);
    await ensurePushRegistered(false);
    await startTimer({
      projectId,
      pomodoroEnabled: timerMode === "pomodoro",
      startedFrom: "web"
    });
  }, [stopTimer, startTimer, ensurePushRegistered, timerMode]);

  const handleTransferTimer = useCallback(async () => {
    if (!pendingProjectId) return;
    await transferTimerToProject(pendingProjectId);
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, transferTimerToProject]);

  const handleCancelSwitch = useCallback(() => {
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, []);

  const handleProjectSelect = useCallback((projectId: Id<"projects">) => {
    switchProject(projectId);
    setShowDropdown(false);
    setSearchTerm("");
    setShowCreateProject(false);
    setShowCreateClient(false);
  }, [switchProject]);

  const handleCreateProjectClick = useCallback(() => {
    setShowCreateProject(true);
    setShowCreateClient(false);
    setSearchTerm("");
  }, []);

  const handleCreateClientClick = useCallback(() => {
    setShowCreateClient(true);
    setNewClientForm({ name: "", color: "" });
  }, []);

  const handleClientCreated = useCallback(async () => {
    if (!newClientForm.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    
    setIsCreatingClient(true);
    try {
      const clientId = await createClient({
        name: newClientForm.name.trim(),
        color: newClientForm.color || undefined,
        ...(currentWorkspace === "work" && { workspaceType: "work" })
      });
      
      setNewProjectForm(prev => ({ ...prev, clientId }));
      setShowCreateClient(false);
      setNewClientForm({ name: "", color: "" });
      toast.success(`Client "${newClientForm.name.trim()}" created`);
    } catch (error) {
      console.error("Failed to create client:", error);
      toast.error("Failed to create client");
    } finally {
      setIsCreatingClient(false);
    }
  }, [newClientForm, createClient, currentWorkspace]);

  const handleProjectCreated = useCallback(async () => {
    if (!newProjectForm.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreatingProject(true);
    try {
      const projectId = await createProject({
        name: newProjectForm.name.trim(),
        ...(newProjectForm.clientId && { clientId: newProjectForm.clientId }),
        hourlyRate: newProjectForm.hourlyRate,
        budgetType: newProjectForm.budgetType,
        budgetHours: newProjectForm.budgetType === "hours" ? newProjectForm.budgetHours : undefined,
        budgetAmount: newProjectForm.budgetType === "amount" ? newProjectForm.budgetAmount : undefined,
        ...(currentWorkspace === "work" && { workspaceType: "work" })
      });
      
      setCurrentProjectId(projectId);
      setShowDropdown(false);
      setShowCreateProject(false);
      setNewProjectForm({
        name: "",
        clientId: "",
        hourlyRate: 100,
        budgetType: "hours",
        budgetHours: undefined,
        budgetAmount: undefined
      });
      toast.success(`Project "${newProjectForm.name.trim()}" created`);
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  }, [newProjectForm, createProject, currentWorkspace]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateProject(false);
    setShowCreateClient(false);
    setNewProjectForm({
      name: "",
      clientId: "",
      hourlyRate: 100,
      budgetType: "hours",
      budgetHours: undefined,
      budgetAmount: undefined
    });
    setNewClientForm({ name: "", color: "" });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm("");
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (!pushSwitchRequest) {
      return;
    }

    if (!runningTimer || projectsWithColors.length === 0) {
      onPushSwitchHandled?.();
      return;
    }

    const currentIndex = projectsWithColors.findIndex((p) => p._id === runningTimer.projectId);
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % projectsWithColors.length
      : 0;
    const candidate = projectsWithColors[nextIndex];

    if (!candidate || candidate._id === runningTimer.projectId) {
      onPushSwitchHandled?.();
      return;
    }

    void (async () => {
      try {
        await transferTimerToProject(candidate._id);
        toast.success(`Switched timer to ${candidate.name}`);
      } catch (error) {
        console.error("Failed to switch project from push", error);
        toast.error("Couldn't switch projects automatically. Please pick a project manually.");
      } finally {
        onPushSwitchHandled?.();
      }
    })();
  }, [pushSwitchRequest, runningTimer, projectsWithColors, transferTimerToProject, onPushSwitchHandled]);

  // Detect when timer is started from mobile and show notification
  useEffect(() => {
    const currentTimerId = runningTimer?._id;
    const startedFrom = (runningTimer as any)?.startedFrom;

    // New timer detected that was started from mobile
    if (currentTimerId && currentTimerId !== notifiedMobileTimerRef.current && startedFrom === "mobile") {
      // Show toast notification (browser notifications would require permission)
      toast.info("Timer Started on Mobile", {
        description: `${runningTimer?.project?.name || "A project"} timer is now running`,
        duration: 4000,
      });

      // Mark as notified to avoid duplicate notifications
      notifiedMobileTimerRef.current = currentTimerId;
    }

    // Reset when timer stops
    if (!currentTimerId) {
      notifiedMobileTimerRef.current = null;
    }
  }, [runningTimer?._id, (runningTimer as any)?.startedFrom, runningTimer?.project?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasProjects) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl shadow-lg backdrop-blur-sm border border-gray-200/70 dark:border-gray-700/40 p-8 bg-white dark:bg-gray-800/60 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118 13.5c0 3.866-3.582 7-6 7s-6-3.134-6-7c0-1.61.512-3.117 1.84-4.922L12 14z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Let&rsquo;s get your workspace ready</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {hasClients
              ? "Add your first project from the Projects tab to start tracking time."
              : "Start by creating a client, then add your first project from the navigation bar above."}
          </p>
          <div className="mt-4 rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-700/40 text-sm text-gray-700 dark:text-gray-200">
            Use the Clients and Projects buttons in the header to add what you need. We&rsquo;ll show everything here as soon as it&rsquo;s ready.
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900">
      <style>{`
        .project-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .project-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex min-h-full flex-col items-center justify-center gap-6 sm:gap-8 py-6 sm:py-10">
        {/* Workspace Switcher - Only show if onWorkspaceChange prop is not provided (for backwards compatibility) */}
        {!onWorkspaceChange && (
          <div className="w-full flex justify-center mb-4">
            <WorkspaceSwitcher
              currentWorkspace={currentWorkspace}
              onWorkspaceChange={(workspace) => {
                // This shouldn't happen since we're hiding the switcher
                console.warn("Workspace change requested but no handler provided");
              }}
              className="max-w-xs"
            />
          </div>
        )}

        {/* Today's Summary */}
        <section className="w-full max-w-6xl px-4 sm:px-0">
          <TodaySummaryCard
            entries={formattedEntries}
            totalSeconds={todayStats.totalSeconds}
            entriesCount={todayStats.entriesCount}
          />
        </section>

        {/* Project Switcher */}
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg relative" ref={dropdownRef}>
            <div 
              className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-3 sm:p-4 shadow-lg cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentProject.color }}
                />
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white font-medium">{currentProject.name}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">– {currentProject.client?.name || 'No Client'}</div>
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl shadow-lg z-50 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
                {!showCreateProject && !showCreateClient && (
                  <>
                    {/* Create New Project Button - Top */}
                    <div className="border-b border-gray-200/50 dark:border-gray-700/50">
                      <button
                        onClick={handleCreateProjectClick}
                        className="w-full flex items-center gap-3 p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Project
                      </button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300/50 dark:border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    
                    {/* Project List */}
                    <div className="max-h-60 overflow-y-auto">
                      {searchTerm.trim() ? (
                        // Show filtered results when searching
                        filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => (
                            <div
                              key={project._id}
                              className={cn(
                                "flex items-center gap-3 p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors",
                                project._id === currentProjectId && "bg-blue-50/50 dark:bg-blue-900/20"
                              )}
                              onClick={() => handleProjectSelect(project._id)}
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <div className="flex-1">
                                <div className="text-gray-900 dark:text-white font-medium">{project.name}</div>
                                <div className="text-gray-600 dark:text-gray-300 text-sm">
                                  – {project.client?.name || 'No Client'}
                                  {project.workspaceType === "personal" && (
                                    <span className="ml-1 text-xs text-blue-500 dark:text-blue-400">(Personal)</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 text-xs">
                                {formatCurrencyWithSymbol(project.hourlyRate)}/hr
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No projects found
                          </div>
                        )
                      ) : (
                        // Show separated personal and work projects when not searching
                        <>
                          {/* Personal Projects Section */}
                          {personalProjects.length > 0 && (
                            <>
                              <div className="px-3 py-2 bg-gray-100/50 dark:bg-gray-700/30 border-b border-gray-200/50 dark:border-gray-700/50">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                  Personal Projects
                                </div>
                              </div>
                              {personalProjects.map((project) => (
                                <div
                                  key={project._id}
                                  className={cn(
                                    "flex items-center gap-3 p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors",
                                    project._id === currentProjectId && "bg-blue-50/50 dark:bg-blue-900/20"
                                  )}
                                  onClick={() => handleProjectSelect(project._id)}
                                >
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <div className="flex-1">
                                    <div className="text-gray-900 dark:text-white font-medium">{project.name}</div>
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">– {project.client?.name || 'No Client'}</div>
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                                    {formatCurrencyWithSymbol(project.hourlyRate)}/hr
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Work Projects Section */}
                          {workProjects.length > 0 && (
                            <>
                              <div className="px-3 py-2 bg-gray-100/50 dark:bg-gray-700/30 border-b border-gray-200/50 dark:border-gray-700/50">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                  Work Projects
                                </div>
                              </div>
                              {workProjects.map((project) => (
                                <div
                                  key={project._id}
                                  className={cn(
                                    "flex items-center gap-3 p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors",
                                    project._id === currentProjectId && "bg-blue-50/50 dark:bg-blue-900/20"
                                  )}
                                  onClick={() => handleProjectSelect(project._id)}
                                >
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <div className="flex-1">
                                    <div className="text-gray-900 dark:text-white font-medium">{project.name}</div>
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">– {project.client?.name || 'No Client'}</div>
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                                    {formatCurrencyWithSymbol(project.hourlyRate)}/hr
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* No Projects Message */}
                          {personalProjects.length === 0 && workProjects.length === 0 && (
                            <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                              No projects found
                            </div>
                          )}
                        </>
                      )}

                    </div>
                  </>
                )}
                
                {/* Create Client Form */}
                {showCreateClient && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Client</h3>
                      <button
                        onClick={handleCancelCreate}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Client Name *
                        </label>
                        <Input
                          value={newClientForm.name}
                          onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter client name"
                          className="text-gray-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Color (optional)
                        </label>
                        <input
                          type="color"
                          value={newClientForm.color || "#8b5cf6"}
                          onChange={(e) => setNewClientForm(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full h-10 border border-input bg-transparent rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleClientCreated}
                          disabled={isCreatingClient || !newClientForm.name.trim()}
                          className="flex-1"
                        >
                          {isCreatingClient ? "Creating..." : "Create Client"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateClient(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Create Project Form */}
                {showCreateProject && !showCreateClient && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Project</h3>
                      <button
                        onClick={handleCancelCreate}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Project Name *
                        </label>
                        <Input
                          value={newProjectForm.name}
                          onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter project name"
                          className="text-gray-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Client (optional)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={newProjectForm.clientId}
                            onChange={(e) => setNewProjectForm(prev => ({ ...prev, clientId: e.target.value as Id<"clients"> }))}
                            className="flex-1 h-9 px-3 py-1 border border-input bg-transparent text-gray-900 dark:text-white rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">Select a client...</option>
                            {clients?.map((client) => (
                              <option key={client._id} value={client._id}>
                                {client.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            onClick={handleCreateClientClick}
                            className="whitespace-nowrap"
                          >
                            + New
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hourly Rate *
                        </label>
                        <Input
                          type="number"
                          value={newProjectForm.hourlyRate}
                          onChange={(e) => setNewProjectForm(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                          placeholder="100"
                          className="text-gray-900 dark:text-white"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Budget Type
                        </label>
                        <select
                          value={newProjectForm.budgetType}
                          onChange={(e) => setNewProjectForm(prev => ({ ...prev, budgetType: e.target.value as "hours" | "amount" }))}
                          className="w-full h-9 px-3 py-1 border border-input bg-transparent text-gray-900 dark:text-white rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="hours">Hours</option>
                          <option value="amount">Amount</option>
                        </select>
                      </div>
                      
                      {newProjectForm.budgetType === "hours" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Budget Hours
                          </label>
                          <Input
                            type="number"
                            value={newProjectForm.budgetHours || ""}
                            onChange={(e) => setNewProjectForm(prev => ({ ...prev, budgetHours: e.target.value ? Number(e.target.value) : undefined }))}
                            placeholder="40"
                            className="text-gray-900 dark:text-white"
                            min="0"
                            step="0.5"
                          />
                        </div>
                      )}
                      
                      {newProjectForm.budgetType === "amount" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Budget Amount
                          </label>
                          <Input
                            type="number"
                            value={newProjectForm.budgetAmount || ""}
                            onChange={(e) => setNewProjectForm(prev => ({ ...prev, budgetAmount: e.target.value ? Number(e.target.value) : undefined }))}
                            placeholder="4000"
                            className="text-gray-900 dark:text-white"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleProjectCreated}
                          disabled={isCreatingProject || !newProjectForm.name.trim()}
                          className="flex-1"
                        >
                          {isCreatingProject ? "Creating..." : "Create Project"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelCreate}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timer Mode Toggle - Only show if Pomodoro is enabled in settings */}
        {userSettings?.pomodoroEnabled && (
          <div className="flex justify-center mb-4">
            <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-1 shadow-lg flex gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setTimerMode("normal")}
                  disabled={timerState.running}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    timerMode === "normal"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  } ${timerState.running ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setTimerMode("pomodoro")}
                  disabled={timerState.running}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    timerMode === "pomodoro"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  } ${timerState.running ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Pomodoro
                </button>
              </div>
              <div className="flex items-center gap-2">
                <SoundSelectionModal
                  onSelect={(sound) => {
                    updateUserSettings({ notificationSound: sound });
                  }}
                  currentSound={userSettings?.notificationSound || ""}
                />
                {!soundPreferenceEnabled && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    (Sounds disabled - enable in Settings)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center gap-4 mb-6 sm:mb-8">
          {/* Pomodoro Phase Indicator */}
          {runningTimer?.pomodoroEnabled && (
            <div className="mb-4">
              <PomodoroPhaseIndicator
                isBreakTimer={isBreakTimer}
                currentCycle={runningTimer.pomodoroCurrentCycle ?? 1}
                completedCycles={runningTimer.pomodoroCompletedCycles ?? 0}
                workMinutes={runningTimer.pomodoroWorkMinutes ?? 25}
                breakMinutes={runningTimer.pomodoroBreakMinutes ?? 5}
                sessionStartedAt={runningTimer.pomodoroSessionStartedAt}
              />
              
              {/* Break time remaining for break timer */}
              {isBreakTimer && (
                <div className="text-center mt-3">
                  <div className="text-sm text-gray-600">
                    Time remaining: {formatTime(breakTimeRemaining)}
                  </div>
                  <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${breakTimeRemaining > 0 ? (breakTimeRemaining / ((runningTimer?.pomodoroBreakMinutes ?? 5) * 60 * 1000)) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Timer Display */}
          <div className="text-center">
            <div
              className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-bold tracking-tight ${
                runningTimer && projectStats?.isNearBudgetLimit
                  ? "animate-pulse"
                  : ""
              }`}
              style={{
                color: isBreakTimer 
                  ? "#10b981" // green for break timer
                  : runningTimer && projectStats?.isNearBudgetLimit
                  ? "#f59e0b" // amber warning color
                  : currentProject.color
              }}
            >
              {isBreakTimer ? formatTime(totalElapsedMs) : formatTime(totalElapsedMs)}
            </div>
            {runningTimer && (
              <div className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
                {runningTimer.startedAt && (
                  <span>
                    Started: {new Date(runningTimer.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {runningTimer.endedAt && (
                  <span className="ml-4">
                    Ended: {new Date(runningTimer.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
            
            {/* Timer Controls */}
            {!isBreakTimer && (
              <div className="flex flex-col items-center gap-4 mt-6">
                {/* Category Selector */}
                {!timerState.running && categories && categories.length > 0 && (
                  <div className="w-full max-w-xs">
                    <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                      Category (optional)
                    </label>
                    <select
                      id="category-select"
                      value={selectedCategory || ""}
                      onChange={(e) => setSelectedCategory(e.target.value === "" ? undefined : e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name} {category.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4">
                  <button
                    className="inline-flex items-center justify-center px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-[#F85E00] dark:focus-visible:ring-offset-gray-900 text-white font-medium"
                    style={{
                      backgroundColor: timerState.running ? "#ef4444" : currentProject.color,
                    }}
                    onClick={toggleTimer}
                    aria-pressed={timerState.running}
                    aria-label={timerState.running ? "Stop timer" : "Start timer"}
                  >
                    {timerState.running ? (
                      <>
                        <Square className="w-5 h-5 mr-2" aria-hidden="true" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" aria-hidden="true" />
                        Start
                      </>
                    )}
                  </button>

                  <button
                    className="inline-flex items-center justify-center px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-slate-400 dark:focus-visible:ring-offset-gray-900 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-medium border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm"
                    onClick={async () => {
                      if (timerState.running) {
                        await resetTimer();
                        toast.success("Timer reset");
                      }
                    }}
                    aria-label="Reset timer"
                  >
                    Reset
                  </button>
                </div>

                {/* Picture-in-Picture Button - Hidden on mobile */}
                <div className="hidden md:block">
                  <PictureInPictureTimer
                    timerState={pipTimerState}
                    disabled={!timerState.running}
                  />
                </div>
              </div>
            )}
          </div>
          
          {isBreakTimer && (
            <div className="mt-6">
              <PomodoroBreakTimer
                breakTimeRemaining={breakTimeRemaining}
                totalBreakTimeMs={(runningTimer?.pomodoroBreakMinutes ?? 5) * 60 * 1000}
                onEndEarly={toggleTimer}
              />
            </div>
          )}
        </div>

        {/* Time/Allocation Remaining Display */}
        {runningTimer && projectStats && realTimeBudgetRemaining && (
          <div className="text-center mb-8">
            {realTimeBudgetRemaining.remaining > 0 ? (
              <div className="text-lg text-gray-700 dark:text-gray-300">
                {realTimeBudgetRemaining.type === "hours" ? (
                  <>Time remaining: <span className={`font-bold ${realTimeBudgetRemaining.isNearLimit ? "text-amber-400" : "text-green-400"}`}>{formatBudgetTime(realTimeBudgetRemaining.remaining)}</span></>
                ) : (
                  <>Amount remaining: <span className={`font-bold ${realTimeBudgetRemaining.isNearLimit ? "text-amber-400" : "text-green-400"}`}>{formatCurrencyWithSymbol(realTimeBudgetRemaining.remaining)}</span></>
                )}
                {realTimeBudgetRemaining.isNearLimit && (
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

        {/* Project Summary */}
        {currentProjectId && (
          <section className="w-full max-w-6xl px-4 sm:px-0">
            <ProjectSummaryGrid projectId={currentProjectId} workspaceType={currentWorkspace} />
          </section>
        )}
      </div>

      {/* Interrupt Modal - DISABLED: Using toast notifications only (see InterruptWatcher component) */}

      {/* Project Switch Modal */}
      {showProjectSwitchModal && pendingProjectId && (
        <ProjectSwitchModal
          currentProjectName={`${currentProject.name} – ${currentProject.client?.name || 'No Client'}`}
          newProjectName={(() => {
            const pendingProject = projectsWithColors.find(p => p._id === pendingProjectId);
            return pendingProject ? `${pendingProject.name} – ${pendingProject.client?.name || 'No Client'}` : '';
          })()}
          onStopAndSwitch={handleStopAndSwitch}
          onTransferTimer={handleTransferTimer}
          onCancel={handleCancelSwitch}
        />
      )}
    </div>
  );
}
