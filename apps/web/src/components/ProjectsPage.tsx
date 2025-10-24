import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceHeader, WorkspaceType } from "./WorkspaceSwitcher";
import { useCurrency } from "../hooks/useCurrency";
import { Briefcase, Trash2 } from "lucide-react";
import { ProjectFilters, defaultFilters } from "./ProjectFilters";

interface ProjectsPageProps {
  onProjectSelect?: (projectId: string) => void;
  onStartTimer?: (projectId: string) => void;
  workspaceType?: WorkspaceType;
  onWorkspaceChange?: (workspace: WorkspaceType) => void;
  clientFilter?: string | null;
  onClearClientFilter?: () => void;
}

export function ProjectsPage({
  onProjectSelect,
  onStartTimer,
  workspaceType = "work",
  onWorkspaceChange,
  clientFilter,
  onClearClientFilter,
}: ProjectsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [clientId, setClientId] = useState<Id<"clients"> | "">("");
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const { getCurrencySymbol, formatCurrency } = useCurrency();
  const [budgetHours, setBudgetHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const currentWorkspace = workspaceType; // Use prop instead of internal state
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { isReady } = useOrganization();

  const clients = useQuery(
    currentWorkspace === "personal"
      ? api.personalClients.listPersonal
      : api.clients.list,
    isReady
      ? (currentWorkspace === "personal" ? {} : { workspaceType: "work" })
      : "skip"
  );
  const projects = useQuery(
    currentWorkspace === "personal"
      ? api.personalProjects.listPersonal
      : api.projects.listAll,
    isReady
      ? (currentWorkspace === "personal" ? { includeArchived: filters.showArchived } : { workspaceType: "work", includeArchived: filters.showArchived })
      : "skip"
  );
  const createProject = useMutation(
    currentWorkspace === "personal" 
      ? api.personalProjects.createPersonal
      : api.projects.create
  );
  const updateProject = useMutation(
    currentWorkspace === "personal"
      ? api.personalProjects.updatePersonal
      : api.projects.update
  );
  const deleteProject = useMutation(
    currentWorkspace === "personal"
      ? api.personalProjects.deletePersonal
      : api.projects.deleteProject
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const projectData: any = {
        name,
        hourlyRate: parseFloat(hourlyRate),
        budgetType,
      };

      // Handle client assignment (can be changed or removed when editing)
      if (editingProject) {
        // When editing, always include clientId (undefined to remove, or the selected client)
        projectData.clientId = clientId ? (clientId as Id<"clients">) : undefined;
      } else {
        // When creating, only include if selected
        if (clientId) {
          projectData.clientId = clientId as Id<"clients">;
        }
      }

      // Only add budget fields if they have values
      if (budgetType === "hours" && budgetHours) {
        projectData.budgetHours = parseFloat(budgetHours);
      }

      if (budgetType === "amount" && budgetAmount) {
        projectData.budgetAmount = parseFloat(budgetAmount);
      }

      console.log("Submitting project data:", projectData);

      if (editingProject) {
        console.log("Updating project:", editingProject._id);
        await updateProject({
          id: editingProject._id,
          ...projectData,
        });
        console.log("Project updated successfully");
      } else {
        console.log("Creating new project");
        await createProject(projectData);
        console.log("Project created successfully");
      }
      
      resetForm();
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: editingProject
          ? "Unable to update project. Please try again."
          : "Unable to create project. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage projects.",
      });
    }
  };

  const resetForm = () => {
    setClientId("");
    setName("");
    setHourlyRate("");
    setBudgetType("hours");
    setBudgetHours("");
    setBudgetAmount("");
    setShowForm(false);
    setEditingProject(null);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setClientId(project.clientId);
    setName(project.name);
    setHourlyRate(project.hourlyRate.toString());
    setBudgetType(project.budgetType);
    setBudgetHours(project.budgetHours?.toString() || "");
    setBudgetAmount(project.budgetAmount?.toString() || "");
    setShowForm(true);
  };

  const handleArchive = async (projectId: Id<"projects">) => {
    try {
      await updateProject({ id: projectId, archived: true });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to archive project. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage projects.",
      });
    }
  };

  const handleUnarchive = async (projectId: Id<"projects">) => {
    try {
      await updateProject({ id: projectId, archived: false });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to unarchive project. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage projects.",
      });
    }
  };

  const handleDelete = async (projectId: Id<"projects">) => {
    const project = projects?.find(p => p._id === projectId);
    if (!project) return;

    // Check if project has time entries before showing confirmation
    if (project.totalHours && project.totalHours > 0) {
      alert(
        `Cannot delete "${project.name}" because it has time entries (${project.totalHoursFormatted}).\n\nPlease delete all time entries first or archive the project instead.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteProject({ id: projectId });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to delete project. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage projects.",
      });
    }
  };

  // Filter and process projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects;

    // Client filter (from props or from filters)
    if (clientFilter) {
      filtered = filtered.filter(project => project.clientId === clientFilter);
    } else if (filters.clientId !== "all") {
      filtered = filtered.filter(project => project.clientId === filters.clientId);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchLower) ||
        project.client?.name.toLowerCase().includes(searchLower)
      );
    }

    // Budget type filter
    if (filters.budgetType !== "all") {
      filtered = filtered.filter(project => project.budgetType === filters.budgetType);
    }

    // Budget status filter
    if (filters.budgetStatus !== "all") {
      filtered = filtered.filter(project => {
        // Projects must have budget set to be filtered by status
        const hasBudget = project.budgetType === "hours"
          ? (project.budgetHours && project.budgetHours > 0)
          : (project.budgetAmount && project.budgetAmount > 0);

        if (!hasBudget) return false;

        // Calculate remaining based on budget type
        let remaining = 0;
        let total = 0;

        if (project.budgetType === "hours") {
          total = project.budgetHours || 0;
          const used = project.totalHours || 0;
          remaining = total - used;
        } else {
          total = project.budgetAmount || 0;
          const used = (project.totalHours || 0) * project.hourlyRate;
          remaining = total - used;
        }

        const percentRemaining = total > 0 ? (remaining / total) * 100 : 0;

        switch (filters.budgetStatus) {
          case "overBudget":
            return remaining < 0;
          case "nearLimit":
            return remaining >= 0 && percentRemaining <= 20;
          case "onTrack":
            return percentRemaining > 20;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [projects, filters, clientFilter]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  if (!isReady || !clients || !projects) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  const filteredClient = clientFilter ? clients.find(c => c._id === clientFilter) : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Workspace Header - Only show if onWorkspaceChange prop is not provided (for backwards compatibility) */}
      {!onWorkspaceChange && (
        <WorkspaceHeader
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={(workspace) => {
            // This shouldn't happen since we're hiding the switcher
            console.warn("Workspace change requested but no handler provided");
          }}
        />
      )}

      {/* Client Filter Banner */}
      {clientFilter && filteredClient && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: filteredClient.color || "#8b5cf6" }}
            />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Showing projects for: {filteredClient.name}
            </span>
          </div>
          <button
            onClick={onClearClientFilter}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <ProjectFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={resetFilters}
              totalProjects={projects.length}
              filteredCount={filteredProjects.length}
              clients={clients}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors whitespace-nowrap"
            >
              Add Project
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingProject ? "Edit Project" : "Add New Project"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client (optional)
                </label>
                <select
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value as Id<"clients">)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  id="hourlyRate"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Allocation Type
                </label>
                <select
                  id="budgetType"
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value as "hours" | "amount")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <option value="hours">Hours</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
              <div>
                {budgetType === "hours" ? (
                  <>
                    <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Allocated Hours
                    </label>
                    <input
                      type="number"
                      id="budgetHours"
                      value={budgetHours}
                      onChange={(e) => setBudgetHours(e.target.value)}
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Allocated Amount ($)
                    </label>
                    <input
                      type="number"
                      id="budgetAmount"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors"
              >
                {editingProject ? "Update" : "Create"} Project
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client / Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-600">
              {filteredProjects.map((project) => (
                <tr key={project._id} className={project.archived ? "opacity-60 bg-gray-50 dark:bg-gray-700/30" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: project.client?.color || "#8b5cf6" }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {project.name}
                          {project.archived && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-full">
                              ARCHIVED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {project.client?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {getCurrencySymbol()}{project.hourlyRate}/hr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {project.totalHoursFormatted || "0h"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {project.budgetType === "hours" 
                      ? `${project.budgetHours || 0} hours`
                      : formatCurrency(project.budgetAmount || 0)
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {project.budgetRemainingFormatted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-3 items-center">
                      {!project.archived && (
                        <>
                          <button
                            onClick={() => onStartTimer?.(project._id)}
                            className="p-1.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                            title="Start Timer"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => onProjectSelect?.(project._id)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(project)}
                            className="p-1.5 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-all"
                            title="Edit Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleArchive(project._id)}
                            className="p-1.5 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-all"
                            title="Archive Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6-1v11a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {project.archived && (
                        <>
                          <button
                            onClick={() => onProjectSelect?.(project._id)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUnarchive(project._id)}
                            className="p-1.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                            title="Restore Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l4-4 4 4m6 1V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 mb-4">
                <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {clientFilter
                  ? "No projects for this client"
                  : filters.showArchived
                    ? "No archived projects"
                    : "No projects yet"
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {clientFilter
                  ? "This client doesn't have any projects yet."
                  : filters.showArchived
                    ? "You don't have any archived projects."
                    : "Start tracking your work by adding your first project"
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              className={`bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6 ${
                project.archived ? "opacity-60" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <span
                  className="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: project.client?.color || "#8b5cf6" }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {project.name}
                  </h3>
                  {project.client?.name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {project.client.name}
                    </p>
                  )}
                  {project.archived && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-full">
                      ARCHIVED
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Hourly Rate</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getCurrencySymbol()}{project.hourlyRate}/hr
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Time Used</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {project.totalHoursFormatted || "0h"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Allocated</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {project.budgetType === "hours"
                      ? `${project.budgetHours || 0} hours`
                      : formatCurrency(project.budgetAmount || 0)
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {project.budgetRemainingFormatted}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {!project.archived ? (
                  <>
                    <button
                      onClick={() => onStartTimer?.(project._id)}
                      className="flex-1 p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                      title="Start Timer"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onProjectSelect?.(project._id)}
                      className="flex-1 p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                      title="View Details"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(project)}
                      className="flex-1 p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-all"
                      title="Edit Project"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleArchive(project._id)}
                      className="flex-1 p-2 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-all"
                      title="Archive Project"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6-1v11a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="flex-1 p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onProjectSelect?.(project._id)}
                      className="flex-1 p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                      title="View Details"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleUnarchive(project._id)}
                      className="flex-1 p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                      title="Restore Project"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l4-4 4 4m6 1V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="flex-1 p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 mb-4">
                <Briefcase className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {clientFilter
                  ? "No projects for this client"
                  : filters.showArchived
                    ? "No archived projects"
                    : "No projects yet"
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {clientFilter
                  ? "This client doesn't have any projects yet."
                  : filters.showArchived
                    ? "You don't have any archived projects."
                    : "Start tracking your work by adding your first project"
                }
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
