import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [clientId, setClientId] = useState<Id<"clients"> | "">("");
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const [budgetHours, setBudgetHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  const clients = useQuery(api.clients.list);
  const projects = useQuery(api.projects.listAll);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      name,
      hourlyRate: parseFloat(hourlyRate),
      budgetType,
      ...(budgetType === "hours" && budgetHours && { budgetHours: parseFloat(budgetHours) }),
      ...(budgetType === "amount" && budgetAmount && { budgetAmount: parseFloat(budgetAmount) }),
    };

    if (editingProject) {
      await updateProject({
        id: editingProject._id,
        ...projectData,
      });
    } else {
      await createProject({
        clientId: clientId as Id<"clients">,
        ...projectData,
      });
    }
    
    resetForm();
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
    await updateProject({ id: projectId, archived: true });
  };

  if (!clients || !projects) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Projects</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Project
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProject ? "Edit Project" : "Add New Project"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value as Id<"clients">)}
                  required
                  disabled={!!editingProject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Type
                </label>
                <select
                  id="budgetType"
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value as "hours" | "amount")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hours">Hours</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
              <div>
                {budgetType === "hours" ? (
                  <>
                    <label htmlFor="budgetHours" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Hours
                    </label>
                    <input
                      type="number"
                      id="budgetHours"
                      value={budgetHours}
                      onChange={(e) => setBudgetHours(e.target.value)}
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Amount ($)
                    </label>
                    <input
                      type="number"
                      id="budgetAmount"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client / Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {project.client?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {project.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${project.hourlyRate}/hr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.budgetType === "hours" 
                      ? `${project.budgetHours || 0} hours`
                      : `$${project.budgetAmount || 0}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(project._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No projects yet. Add your first project to get started!
          </div>
        )}
      </div>
    </div>
  );
}
