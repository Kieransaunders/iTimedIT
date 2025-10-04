/**
 * ModernDashboard - ACTIVE MAIN TIMER INTERFACE
 * 
 * This is the primary timer interface that users interact with in the application.
 * Used in: App.tsx (line 198) as the main dashboard component
 * 
 * Key Features:
 * - Modern purple gradient design with large timer display
 * - Project selection with client/project cards
 * - Timer start/stop functionality with category selection
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
import { InterruptModal } from "./InterruptModal";
import { ProjectSwitchModal } from "./ProjectSwitchModal";
import { ProjectKpis } from "./ProjectKpis";
import { ProjectSummaryGrid } from "./ProjectSummaryGrid";
import { RecentEntriesTable } from "./RecentEntriesTable";
import { WorkspaceSwitcher, WorkspaceType } from "./WorkspaceSwitcher";
import { ensurePushSubscription, isPushSupported, getNotificationPermission } from "../lib/push";
import { toast } from "sonner";
import { playBreakStartSound, playBreakEndSound, playCycleCompleteSound, enableSounds } from "../lib/sounds";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Play, Square } from "lucide-react";
import { PomodoroBreakTimer } from "./PomodoroBreakTimer";
import { PomodoroPhaseIndicator } from "./PomodoroPhaseIndicator";
import { useCurrency } from "../hooks/useCurrency";
import { updateTimerTitle, clearTimerTitle, setPageVisibility } from "../lib/attention";
import { updateTimerFavicon, clearTimerFavicon, type FaviconState } from "../lib/favicon";

interface ModernDashboardProps {
  pushSwitchRequest?: any | null;
  onPushSwitchHandled?: () => void;
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


function formatBudgetTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function ModernDashboard({
  pushSwitchRequest,
  onPushSwitchHandled,
}: ModernDashboardProps) {
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType>("team");
  const { formatCurrency: formatCurrencyWithSymbol } = useCurrency();
  const [now, setNow] = useState(Date.now());
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [showProjectSwitchModal, setShowProjectSwitchModal] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<Id<"projects"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [timerMode, setTimerMode] = useState<"normal" | "pomodoro">("normal");
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
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    note: '',
    category: ''
  });
  const [isSubmittingManualEntry, setIsSubmittingManualEntry] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const projectScrollRef = useRef<HTMLDivElement>(null);

  // Use appropriate API based on workspace type
  const projects = useQuery(
    currentWorkspace === "personal" 
      ? api.personalProjects.listPersonal
      : api.projects.listAll,
    currentWorkspace === "personal" ? {} : { workspaceType: "team" }
  );
  const runningTimer = useQuery(api.timer.getRunningTimer);
  const userSettings = useQuery(api.users.getUserSettings);
  const startTimer = useMutation(api.timer.start);
  const stopTimer = useMutation(api.timer.stop);
  const heartbeat = useMutation(api.timer.heartbeat);
  const requestInterrupt = useMutation(api.timer.requestInterrupt);
  const categories = useQuery(api.categories.getCategories);
  const initializeCategories = useMutation(api.categories.initializeDefaultCategories);
  const createCategory = useMutation(api.categories.createCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
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
    currentWorkspace === "personal" ? {} : { workspaceType: "team" }
  );
  const createManualEntry = useMutation(api.timer.createManualEntry);

  const projectsLoading = projects === undefined;
  const clientsLoading = clients === undefined;
  const isLoading = projectsLoading || clientsLoading;

  // Enhance projects with colors
  const projectsWithColors = useMemo(() => {
    if (!projects) return [];
    return projects.map(project => ({
      ...project,
      color: project.client.color || getClientColor(project.client._id),
    }));
  }, [projects]);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithColors;
    const term = searchTerm.toLowerCase();
    return projectsWithColors.filter(project => 
      project.name.toLowerCase().includes(term) || 
      project.client.name.toLowerCase().includes(term)
    );
  }, [projectsWithColors, searchTerm]);

  const currentProject = useMemo(() => {
    return projectsWithColors.find(p => p._id === currentProjectId) || projectsWithColors[0];
  }, [projectsWithColors, currentProjectId]);

  const hasProjects = projectsWithColors.length > 0;
  const hasClients = (clients?.length ?? 0) > 0;

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
      console.log("🚨 Interrupt detected! Showing modal...", runningTimer);
      setShowInterruptModal(true);
    }
  }, [runningTimer?.awaitingInterruptAck]);

  // Initialize categories on first load
  useEffect(() => {
    if (categories?.length === 0) {
      initializeCategories();
    }
  }, [categories, initializeCategories]);

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategory) {
      const defaultCategory = categories.find(cat => cat.isDefault);
      if (defaultCategory) {
        setSelectedCategory(defaultCategory.name);
      }
    }
  }, [categories, selectedCategory]);

  // Update selected category when timer is running
  useEffect(() => {
    if (runningTimer?.category) {
      setSelectedCategory(runningTimer.category);
    }
  }, [runningTimer?.category]);

  // Update timer mode when timer is running
  useEffect(() => {
    if (runningTimer?.pomodoroEnabled !== undefined) {
      setTimerMode(runningTimer.pomodoroEnabled ? "pomodoro" : "normal");
    }
  }, [runningTimer?.pomodoroEnabled]);

  // Handle Pomodoro phase transitions and sound notifications
  const [previousPhase, setPreviousPhase] = useState<string | null>(null);
  const [previousBreakTimer, setPreviousBreakTimer] = useState<boolean>(false);
  
  useEffect(() => {
    if (!runningTimer?.pomodoroEnabled) return;

    const currentPhase = runningTimer.pomodoroPhase;
    const currentIsBreakTimer = runningTimer.isBreakTimer;

    // Enable sounds on first Pomodoro interaction
    if (currentPhase && !previousPhase) {
      enableSounds();
    }

    // Detect phase transitions
    if (previousPhase && currentPhase !== previousPhase) {
      if (currentPhase === "break" && currentIsBreakTimer) {
        // Work session ended, break started
        playBreakStartSound();
        toast.success("Break time! Step away and recharge 🌱");
      }
    }

    // Track break timer deletion (break ended)
    if (previousBreakTimer && !currentIsBreakTimer && previousPhase === "break") {
      // Break timer was deleted (break ended)
      const completedCycles = (runningTimer?.pomodoroCompletedCycles ?? 0);
      const isFullCycleComplete = completedCycles > 0 && completedCycles % 4 === 0;
      
      if (isFullCycleComplete) {
        playCycleCompleteSound();
        toast.success(`🎉 Pomodoro cycle complete! Great work!`);
      } else {
        playBreakEndSound();
        toast.info("Break complete! Ready to focus? 🎯");
      }
    }

    setPreviousPhase(currentPhase || null);
    setPreviousBreakTimer(currentIsBreakTimer || false);
  }, [runningTimer?.pomodoroPhase, runningTimer?.isBreakTimer, runningTimer?.pomodoroCompletedCycles, previousPhase, previousBreakTimer]);

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
      await ensurePushRegistered(true);
      await startTimer({ 
        projectId: currentProject._id, 
        category: selectedCategory || undefined,
        pomodoroEnabled: timerMode === "pomodoro"
      });
    }
  }, [currentProject, timerState.running, startTimer, stopTimer, ensurePushRegistered, selectedCategory, timerMode]);

  const switchProject = useCallback(async (projectId: Id<"projects">) => {
    if (projectId === currentProjectId) return;
    
    if (timerState.running) {
      setPendingProjectId(projectId);
      setShowProjectSwitchModal(true);
    } else {
      // No timer running - switch project and auto-start timer
      setCurrentProjectId(projectId);
      await ensurePushRegistered(true);
      await startTimer({ 
        projectId, 
        category: selectedCategory || undefined,
        pomodoroEnabled: timerMode === "pomodoro"
      });
    }
  }, [currentProjectId, timerState.running, ensurePushRegistered, startTimer, selectedCategory, timerMode]);

  const handleStopAndSwitch = useCallback(async () => {
    if (!pendingProjectId) return;
    await stopTimer();
    setCurrentProjectId(pendingProjectId);
    await ensurePushRegistered(false);
    await startTimer({ 
      projectId: pendingProjectId, 
      category: selectedCategory || undefined,
      pomodoroEnabled: timerMode === "pomodoro"
    });
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, stopTimer, ensurePushRegistered, startTimer, selectedCategory, timerMode]);

  const transferTimerToProject = useCallback(async (projectId: Id<"projects">) => {
    await stopTimer();
    setCurrentProjectId(projectId);
    await ensurePushRegistered(false);
    await startTimer({ 
      projectId, 
      category: selectedCategory || undefined,
      pomodoroEnabled: timerMode === "pomodoro"
    });
  }, [stopTimer, startTimer, ensurePushRegistered, selectedCategory, timerMode]);

  const handleTransferTimer = useCallback(async () => {
    if (!pendingProjectId) return;
    await transferTimerToProject(pendingProjectId);
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, transferTimerToProject]);

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({ name: newCategoryName.trim() });
      setNewCategoryName("");
      toast.success(`Category "${newCategoryName.trim()}" added`);
    } catch (error) {
      toast.error("Failed to add category");
    }
  }, [newCategoryName, createCategory]);

  const handleDeleteCategory = useCallback(async (categoryId: string, categoryName: string) => {
    if (categoryName === "General") {
      toast.error("Cannot delete the General category");
      return;
    }
    try {
      await deleteCategory({ categoryId });
      toast.success(`Category "${categoryName}" deleted`);
      // Reset selected category if it was deleted
      if (selectedCategory === categoryName) {
        const generalCategory = categories?.find(cat => cat.name === "General");
        setSelectedCategory(generalCategory?.name || "");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    }
  }, [deleteCategory, selectedCategory, categories]);

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
        ...(currentWorkspace === "team" && { workspaceType: "team" })
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
    if (!newProjectForm.clientId) {
      toast.error("Please select a client");
      return;
    }
    
    setIsCreatingProject(true);
    try {
      const projectId = await createProject({
        name: newProjectForm.name.trim(),
        clientId: newProjectForm.clientId,
        hourlyRate: newProjectForm.hourlyRate,
        budgetType: newProjectForm.budgetType,
        budgetHours: newProjectForm.budgetType === "hours" ? newProjectForm.budgetHours : undefined,
        budgetAmount: newProjectForm.budgetType === "amount" ? newProjectForm.budgetAmount : undefined,
        ...(currentWorkspace === "team" && { workspaceType: "team" })
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

  const handleManualEntrySubmit = useCallback(async () => {
    if (!currentProject) return;
    
    const startDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.startTime}:00`);
    const endDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.endTime}:00`);
    
    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }
    
    setIsSubmittingManualEntry(true);
    try {
      await createManualEntry({
        projectId: currentProject._id,
        startedAt: startDateTime.getTime(),
        stoppedAt: endDateTime.getTime(),
        note: manualEntryForm.note || undefined,
        category: manualEntryForm.category || undefined
      });
      
      setShowManualEntryDialog(false);
      setManualEntryForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        note: '',
        category: ''
      });
      
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
      toast.success(`Added ${duration} minute${duration !== 1 ? 's' : ''} to ${currentProject.name}`);
    } catch (error) {
      console.error('Failed to create manual entry:', error);
      toast.error('Failed to create time entry');
    } finally {
      setIsSubmittingManualEntry(false);
    }
  }, [currentProject, manualEntryForm, createManualEntry]);

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

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

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

  // Horizontal scrolling with mouse wheel for project panel
  useEffect(() => {
    const handleWheelScroll = (e: WheelEvent) => {
      if (!projectScrollRef.current) return;
      
      // Check if the target is within our scroll container
      const scrollContainer = projectScrollRef.current;
      const isTargetInside = scrollContainer.contains(e.target as Node);
      
      if (isTargetInside) {
        e.preventDefault();
        const scrollAmount = e.deltaY;
        scrollContainer.scrollLeft += scrollAmount;
      }
    };

    const scrollElement = projectScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('wheel', handleWheelScroll, { passive: false });
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('wheel', handleWheelScroll);
      }
    };
  }, []);

  // Update scroll fade indicators
  useEffect(() => {
    const updateScrollIndicators = () => {
      if (!projectScrollRef.current) return;

      const container = projectScrollRef.current;
      const leftFade = document.getElementById('scroll-fade-left');
      const rightFade = document.getElementById('scroll-fade-right');

      if (!leftFade || !rightFade) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      // Show left fade if scrolled right
      leftFade.style.opacity = scrollLeft > 10 ? '1' : '0';
      
      // Show right fade if there's more content to the right
      rightFade.style.opacity = scrollLeft < scrollWidth - clientWidth - 10 ? '1' : '0';
    };

    const scrollElement = projectScrollRef.current;
    if (scrollElement) {
      // Initial check
      updateScrollIndicators();
      
      // Update on scroll
      scrollElement.addEventListener('scroll', updateScrollIndicators);
      
      // Update on resize
      window.addEventListener('resize', updateScrollIndicators);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', updateScrollIndicators);
      }
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [projectsWithColors]);

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
        {/* Workspace Switcher */}
        <div className="w-full flex justify-center mb-4">
          <WorkspaceSwitcher 
            currentWorkspace={currentWorkspace}
            onWorkspaceChange={(workspace) => {
              setCurrentWorkspace(workspace);
              // Reset current project when switching workspaces
              setCurrentProjectId(null);
            }}
            className="max-w-xs"
          />
        </div>

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
                  <div className="text-gray-600 dark:text-gray-300 text-sm">– {currentProject.client.name}</div>
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
                      {filteredProjects.length > 0 ? (
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
                              <div className="text-gray-600 dark:text-gray-300 text-sm">– {project.client?.name || 'No Client'}</div>
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
                          Client *
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
                          disabled={isCreatingProject || !newProjectForm.name.trim() || !newProjectForm.clientId}
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

        {/* Timer Mode Toggle */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-1 shadow-lg">
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
          </div>
        </div>

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
          
          <div className="flex items-center justify-center gap-4">
            <div
              className={`text-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-bold tracking-tight ${
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
            
            {!isBreakTimer && (
              <button
                className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-[#F85E00] dark:focus-visible:ring-offset-gray-900"
                style={{
                  backgroundColor: timerState.running ? "#ef4444" : currentProject.color,
                }}
                onClick={toggleTimer}
                aria-pressed={timerState.running}
                aria-label={timerState.running ? "Stop timer" : "Start timer"}
              >
                {timerState.running ? (
                  <Square className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
                ) : (
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
                )}
              </button>
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
        {runningTimer && projectStats && (
          <div className="text-center mb-8">
            {projectStats.timeRemaining > 0 || projectStats.budgetRemaining > 0 ? (
              <div className="text-lg text-gray-700 dark:text-gray-300">
                {runningTimer.project?.budgetType === "hours" && projectStats.timeRemaining > 0 ? (
                  <>Time remaining: <span className={`font-bold ${projectStats.isNearBudgetLimit ? "text-amber-400" : "text-green-400"}`}>{formatBudgetTime(projectStats.timeRemaining * 3600)}</span></>
                ) : runningTimer.project?.budgetType === "amount" && projectStats.budgetRemaining > 0 ? (
                  <>Amount remaining: <span className={`font-bold ${projectStats.isNearBudgetLimit ? "text-amber-400" : "text-green-400"}`}>{formatCurrencyWithSymbol(projectStats.budgetRemaining)}</span></>
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

        {/* Category Selection */}
        {!timerState.running && (
          <div className="mb-6 sm:mb-8 w-full max-w-sm sm:max-w-md lg:max-w-lg">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <button
                onClick={() => setShowCategoryManager(!showCategoryManager)}
                className="text-xs text-[#F85E00] hover:text-[#d14e00] underline"
              >
                {showCategoryManager ? 'Hide' : 'Manage'}
              </button>
            </div>
            <div className="w-full relative" ref={categoryDropdownRef}>
              <div 
                className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4 shadow-lg cursor-pointer"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {selectedCategory || "Select a category..."}
                    </div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Category Dropdown */}
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="py-2">
                    <div
                      className="flex items-center gap-3 p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors text-gray-500 dark:text-gray-400"
                      onClick={() => {
                        setSelectedCategory("");
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <div className="text-sm">Select a category...</div>
                    </div>
                    {categories?.map((category) => (
                      <div
                        key={category._id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                          selectedCategory === category.name ? "bg-[#F85E00]/10 text-[#F85E00]" : "text-gray-900 dark:text-white"
                        }`}
                        onClick={() => {
                          setSelectedCategory(category.name);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          {category.isDefault && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">(Default)</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Category Management */}
            {showCategoryManager && (
              <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Manage Categories</h4>
                
                {/* Add new category */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 px-3 py-2 bg-white/70 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600 rounded text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F85E00] backdrop-blur-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-3 py-2 bg-[#F85E00] text-white text-sm rounded hover:bg-[#d14e00] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                
                {/* Existing categories */}
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <div key={category._id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">
                        {category.name} {category.isDefault ? '(Default)' : ''}
                      </span>
                      {category.name !== "General" && (
                        <button
                          onClick={() => handleDeleteCategory(category._id, category.name)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Project Summary */}
        {currentProjectId && (
          <section className="w-full max-w-6xl px-4 sm:px-0">
            <ProjectSummaryGrid projectId={currentProjectId} />
          </section>
        )}

        {/* Recent Projects */}
        <section className="w-full max-w-6xl px-4 sm:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Projects
            </h2>
            {projectsWithColors.length > 4 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {projectsWithColors.length} projects • Scroll to see more →
              </span>
            )}
          </div>
          <div className="relative">
            {/* Scroll fade indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-200" id="scroll-fade-left"></div>
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-200" id="scroll-fade-right"></div>
            
            <div 
              ref={projectScrollRef} 
              className="project-scroll-container flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2" 
              style={{ 
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {projectsWithColors.map((project) => (
                <div
                  key={project._id}
                  className={cn(
                    "bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 hover:scale-105 flex-shrink-0 w-64 sm:w-72",
                    project._id === currentProjectId && "ring-2 ring-gray-400/50 dark:ring-white/20"
                  )}
                  onClick={() => switchProject(project._id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{project.name}</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 text-xs truncate font-medium">{project.client.name}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {formatCurrencyWithSymbol(project.hourlyRate)}/hr
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Entries */}
        <section className="w-full max-w-6xl px-4 sm:px-0">
          <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Entries</h3>
              {currentProject && (
                <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#F85E00] hover:bg-[#d14e00] text-white">
                      + Add Time Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Manual Time Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input
                            type="date"
                            value={manualEntryForm.date}
                            onChange={(e) => setManualEntryForm(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Start Time</label>
                          <Input
                            type="time"
                            value={manualEntryForm.startTime}
                            onChange={(e) => setManualEntryForm(prev => ({ ...prev, startTime: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">End Time</label>
                          <Input
                            type="time"
                            value={manualEntryForm.endTime}
                            onChange={(e) => setManualEntryForm(prev => ({ ...prev, endTime: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      {categories && categories.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Category (optional)</label>
                          <select
                            value={manualEntryForm.category}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManualEntryForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full h-10 px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">Select category...</option>
                            {categories.map(category => (
                              <option key={category._id} value={category.name}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Note (optional)</label>
                        <textarea
                          placeholder="What did you work on?"
                          value={manualEntryForm.note}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualEntryForm(prev => ({ ...prev, note: e.target.value }))}
                          className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={handleManualEntrySubmit}
                          disabled={isSubmittingManualEntry}
                          className="flex-1"
                        >
                          {isSubmittingManualEntry ? "Adding..." : "Add Entry"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowManualEntryDialog(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
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
          currentProjectName={`${currentProject.name} – ${currentProject.client.name}`}
          newProjectName={(() => {
            const pendingProject = projectsWithColors.find(p => p._id === pendingProjectId);
            return pendingProject ? `${pendingProject.name} – ${pendingProject.client.name}` : '';
          })()}
          onStopAndSwitch={handleStopAndSwitch}
          onTransferTimer={handleTransferTimer}
          onCancel={handleCancelSwitch}
        />
      )}
    </div>
  );
}
