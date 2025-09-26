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
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

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

export function ModernDashboard({
  pushSwitchRequest,
  onPushSwitchHandled,
}: ModernDashboardProps) {
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(null);
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
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType>("team");
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

  const teamProjects = useQuery(api.projects.listAll, { workspaceType: "team" });
  const personalProjects = useQuery(api.personalProjects.listPersonal);
  const projects = currentWorkspace === "personal" ? personalProjects : teamProjects;
  
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
    runningTimer?.projectId 
      ? (currentWorkspace === "personal" 
          ? api.personalProjects.getStatsPersonal
          : api.projects.getStats)
      : "skip", 
    runningTimer?.projectId ? { projectId: runningTimer.projectId } : "skip"
  );
  
  const savePushSubscription = useMutation(api.pushNotifications.savePushSubscription);
  const createProject = useMutation(currentWorkspace === "personal" ? api.personalProjects.createPersonal : api.projects.create);
  const createClient = useMutation(currentWorkspace === "personal" ? api.personalClients.createPersonal : api.clients.create);
  
  const teamClients = useQuery(api.clients.list, { workspaceType: "team" });
  const personalClients = useQuery(api.personalClients.listPersonal);
  const clients = currentWorkspace === "personal" ? personalClients : teamClients;
  
  const createManualEntry = useMutation(api.timer.createManualEntry);

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

  // Reset current project when switching workspaces
  useEffect(() => {
    if (projectsWithColors.length > 0 && (!currentProjectId || !projectsWithColors.find(p => p._id === currentProjectId))) {
      setCurrentProjectId(projectsWithColors[0]._id);
    }
  }, [currentWorkspace, projectsWithColors]);

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
      await startTimer({ projectId: currentProject._id, category: selectedCategory || undefined });
    }
  }, [currentProject, timerState.running, startTimer, stopTimer, ensurePushRegistered]);

  const switchProject = useCallback(async (projectId: Id<"projects">) => {
    if (projectId === currentProjectId) return;
    
    if (timerState.running) {
      setPendingProjectId(projectId);
      setShowProjectSwitchModal(true);
    } else {
      // No timer running - switch project and auto-start timer
      setCurrentProjectId(projectId);
      await ensurePushRegistered(true);
      await startTimer({ projectId, category: selectedCategory || undefined });
    }
  }, [currentProjectId, timerState.running, ensurePushRegistered, startTimer, selectedCategory]);

  const handleStopAndSwitch = useCallback(async () => {
    if (!pendingProjectId) return;
    await stopTimer();
    setCurrentProjectId(pendingProjectId);
    await ensurePushRegistered(false);
    await startTimer({ projectId: pendingProjectId, category: selectedCategory || undefined });
    setShowProjectSwitchModal(false);
    setPendingProjectId(null);
  }, [pendingProjectId, stopTimer, ensurePushRegistered, startTimer, selectedCategory]);

  const transferTimerToProject = useCallback(async (projectId: Id<"projects">) => {
    await stopTimer();
    setCurrentProjectId(projectId);
    await ensurePushRegistered(false);
    await startTimer({ projectId, category: selectedCategory || undefined });
  }, [stopTimer, startTimer, ensurePushRegistered]);

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
        color: newClientForm.color || undefined
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
  }, [newClientForm, createClient]);

  const handleProjectCreated = useCallback(async () => {
    if (!newProjectForm.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (currentWorkspace === "team" && !newProjectForm.clientId) {
      toast.error("Please select a client for team projects");
      return;
    }
    
    setIsCreatingProject(true);
    try {
      const projectId = await createProject({
        name: newProjectForm.name.trim(),
        clientId: newProjectForm.clientId || undefined,
        hourlyRate: newProjectForm.hourlyRate,
        budgetType: newProjectForm.budgetType,
        budgetHours: newProjectForm.budgetType === "hours" ? newProjectForm.budgetHours : undefined,
        budgetAmount: newProjectForm.budgetType === "amount" ? newProjectForm.budgetAmount : undefined
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
  }, [newProjectForm, createProject]);

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

  if (!currentProject) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex min-h-full flex-col items-center justify-center gap-6 sm:gap-8 py-6 sm:py-10">
        {/* Workspace Switcher */}
        <div className="w-full flex justify-center">
          <WorkspaceSwitcher 
            currentWorkspace={currentWorkspace}
            onWorkspaceChange={setCurrentWorkspace}
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
                              {formatCurrency(project.hourlyRate)}/hr
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

        {/* Timer Display */}
        <div className="text-center mb-6 sm:mb-8">
          <div 
            className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-bold mb-4 tracking-tight ${
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

        {/* Start/Stop Button */}
        <div className="mb-8 sm:mb-12">
          <button
            className="px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: timerState.running ? "#ef4444" : currentProject.color,
            }}
            onClick={toggleTimer}
            aria-pressed={timerState.running}
          >
            {timerState.running ? "Stop" : "Start"}
          </button>
        </div>

        {/* Project Summary */}
        {currentProjectId && (
          <section className="w-full max-w-6xl px-4 sm:px-0">
            <ProjectSummaryGrid projectId={currentProjectId} />
          </section>
        )}

        {/* Recent Projects */}
        <section className="w-full max-w-6xl px-4 sm:px-0">
          <h2 className="sr-only">Recent projects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{project.name}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-xs truncate font-medium">{project.client.name}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  {formatCurrency(project.hourlyRate)}/hr
                </div>
              </div>
            ))}
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
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date *
                        </label>
                        <Input
                          type="date"
                          value={manualEntryForm.date}
                          onChange={(e) => setManualEntryForm(prev => ({ ...prev, date: e.target.value }))}
                          className="text-gray-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Time *
                          </label>
                          <Input
                            type="time"
                            value={manualEntryForm.startTime}
                            onChange={(e) => setManualEntryForm(prev => ({ ...prev, startTime: e.target.value }))}
                            className="text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Time *
                          </label>
                          <Input
                            type="time"
                            value={manualEntryForm.endTime}
                            onChange={(e) => setManualEntryForm(prev => ({ ...prev, endTime: e.target.value }))}
                            className="text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      
                      {categories && categories.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category (optional)
                          </label>
                          <select
                            value={manualEntryForm.category}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManualEntryForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full h-9 px-3 py-1 border border-input bg-transparent text-gray-900 dark:text-white rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Note (optional)
                        </label>
                        <textarea
                          placeholder="What did you work on?"
                          value={manualEntryForm.note}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualEntryForm(prev => ({ ...prev, note: e.target.value }))}
                          className="w-full min-h-[80px] px-3 py-2 border border-input bg-transparent text-gray-900 dark:text-white rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
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
