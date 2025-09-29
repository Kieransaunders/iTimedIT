import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceHeader, WorkspaceType } from "./WorkspaceSwitcher";

interface ProjectsPageProps {
  onProjectSelect?: (projectId: string) => void;
  onStartTimer?: (projectId: string) => void;
}

export function ProjectsPage({ onProjectSelect, onStartTimer }: ProjectsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [clientId, setClientId] = useState<Id<"clients"> | "">("");
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const [budgetHours, setBudgetHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType>("team");
  const [showArchived, setShowArchived] = useState(false);
  const { isReady } = useOrganization();

  const clients = useQuery(
    currentWorkspace === "personal" 
      ? api.personalClients.listPersonal
      : api.clients.list,
    isReady 
      ? (currentWorkspace === "personal" ? {} : { workspaceType: "team" })
      : "skip"
  );
  const projects = useQuery(
    currentWorkspace === "personal" 
      ? api.personalProjects.listPersonal
      : api.projects.listAll,
    isReady 
      ? (currentWorkspace === "personal" ? { includeArchived: showArchived } : { workspaceType: "team", includeArchived: showArchived })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectData = {
        name,
        hourlyRate: parseFloat(hourlyRate),
        budgetType,
        ...(budgetType === "hours" && budgetHours && { budgetHours: parseFloat(budgetHours) }),
        ...(budgetType === "amount" && budgetAmount && { budgetAmount: parseFloat(budgetAmount) }),
      };

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
        const createData: any = {
          ...projectData,
        };
        
        // For team projects, clientId is required; for personal projects, it's optional
        if (currentWorkspace === "team") {
          createData.clientId = clientId as Id<"clients">;
        } else if (clientId) {
          createData.clientId = clientId as Id<"clients">;
        }
        
        await createProject(createData);
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

  if (!isReady || !clients || !projects) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <WorkspaceHeader 
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={setCurrentWorkspace}
      />
      <div className="flex justify-end mb-6">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors"
          >
            Add Project
          </button>
        )}
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
                  Client {currentWorkspace === "team" && <span className="text-red-500">*</span>}
                </label>
                <select
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value as Id<"clients">)}
                  required={currentWorkspace === "team"}
                  disabled={!!editingProject}
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
              {projects.map((project) => (
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
                    ${project.hourlyRate}/hr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {project.totalHoursFormatted || "0h"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {project.budgetType === "hours" 
                      ? `${project.budgetHours || 0} hours`
                      : `$${project.budgetAmount || 0}`
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
                            className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                            title="Archive Project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6-1v11a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2z" />
                            </svg>
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {showArchived 
              ? "No archived projects found." 
              : "No projects yet. Add your first project to get started!"
            }
          </div>
        )}
      </div>

      {/* Floating Archive Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`group relative p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 ${
            showArchived 
              ? "bg-gray-600 text-white hover:bg-gray-700" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
          }`}
          title={showArchived ? "Show Active Projects" : "Show Archived Projects"}
        >
          {showArchived ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l4-4 4 4m6 1V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6-1v11a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {showArchived ? "Show Active Projects" : "Show Archived Projects"}
            <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </button>
      </div>
    </div>
  );
}
