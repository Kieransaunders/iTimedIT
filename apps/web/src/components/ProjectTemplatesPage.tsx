import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceType } from "./WorkspaceSwitcher";
import { useCurrency } from "../hooks/useCurrency";
import { Calendar, Copy, Edit2, FileText, Repeat, Trash2 } from "lucide-react";

interface ProjectTemplatesPageProps {
  workspaceType?: WorkspaceType;
}

export function ProjectTemplatesPage({ workspaceType = "work" }: ProjectTemplatesPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [clientId, setClientId] = useState<Id<"clients"> | "">("");
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const { getCurrencySymbol, formatCurrency } = useCurrency();
  const [budgetHours, setBudgetHours] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [namePattern, setNamePattern] = useState("");
  const [autoCreate, setAutoCreate] = useState(true);
  const [preserveClient, setPreserveClient] = useState(true);
  const [notifyOnCreation, setNotifyOnCreation] = useState(true);
  const { isReady } = useOrganization();

  const clients = useQuery(
    workspaceType === "personal"
      ? api.personalClients.listPersonal
      : api.clients.list,
    isReady
      ? (workspaceType === "personal" ? {} : { workspaceType: "work" })
      : "skip"
  );

  const templates = useQuery(
    api.projects.listTemplates,
    isReady ? { workspaceType } : "skip"
  );

  const createTemplate = useMutation(api.projects.createTemplate);
  const updateTemplate = useMutation(api.projects.updateTemplate);
  const duplicateFromTemplate = useMutation(api.projects.duplicateFromTemplate);
  const deleteProject = useMutation(
    workspaceType === "personal"
      ? api.personalProjects.deletePersonal
      : api.projects.deleteProject
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const templateData: any = {
        name,
        hourlyRate: parseFloat(hourlyRate),
        budgetType,
        recurringConfig: {
          enabled: autoCreate,
          namePattern: namePattern || `${name} - {month} {year}`,
          preserveClientId: preserveClient,
          notifyOnCreation,
        },
      };

      if (clientId) {
        templateData.clientId = clientId as Id<"clients">;
      }

      if (budgetType === "hours" && budgetHours) {
        templateData.budgetHours = parseFloat(budgetHours);
      }

      if (budgetType === "amount" && budgetAmount) {
        templateData.budgetAmount = parseFloat(budgetAmount);
      }

      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate._id,
          ...templateData,
        });
      } else {
        await createTemplate(templateData);
      }

      resetForm();
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: editingTemplate
          ? "Unable to update template. Please try again."
          : "Unable to create template. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage templates.",
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
    setNamePattern("");
    setAutoCreate(true);
    setPreserveClient(true);
    setNotifyOnCreation(true);
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setClientId(template.clientId || "");
    setName(template.name);
    setHourlyRate(template.hourlyRate.toString());
    setBudgetType(template.budgetType);
    setBudgetHours(template.budgetHours?.toString() || "");
    setBudgetAmount(template.budgetAmount?.toString() || "");
    setNamePattern(template.recurringConfig?.namePattern || "");
    setAutoCreate(template.recurringConfig?.enabled ?? true);
    setPreserveClient(template.recurringConfig?.preserveClientId ?? true);
    setNotifyOnCreation(template.recurringConfig?.notifyOnCreation ?? true);
    setShowForm(true);
  };

  const handleDuplicate = async (templateId: Id<"projects">) => {
    try {
      await duplicateFromTemplate({ templateId });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to create project from template. Please try again.",
      });
    }
  };

  const handleDelete = async (templateId: Id<"projects">) => {
    const template = templates?.find(t => t._id === templateId);
    if (!template) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"? This will not affect projects already created from this template.`
    );

    if (!confirmed) return;

    try {
      await deleteProject({ id: templateId });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to delete template. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage templates.",
      });
    }
  };

  const formatNextCreation = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (!isReady || !clients || !templates) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Repeat className="h-6 w-6" />
              Project Templates
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create recurring monthly projects automatically
            </p>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors whitespace-nowrap"
            >
              Create Template
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingTemplate ? "Edit Template" : "Create Project Template"}
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
                  Template Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Acme Retainer"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="namePattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name Pattern
              </label>
              <input
                type="text"
                id="namePattern"
                value={namePattern}
                onChange={(e) => setNamePattern(e.target.value)}
                placeholder={`${name || "Project Name"} - {month} {year}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use {`{month}`} and {`{year}`} placeholders for automatic naming (e.g., "Acme Retainer - January 2025")
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hourly Rate ({getCurrencySymbol()})
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
                  Budget Type
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
                      Monthly Hours
                    </label>
                    <input
                      type="number"
                      id="budgetHours"
                      value={budgetHours}
                      onChange={(e) => setBudgetHours(e.target.value)}
                      min="0"
                      step="0.5"
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Amount ({getCurrencySymbol()})
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

            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recurring Settings</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoCreate}
                    onChange={(e) => setAutoCreate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 dark:text-purple-timer border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-purple-timer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Auto-create projects monthly (on the 1st of each month)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preserveClient}
                    onChange={(e) => setPreserveClient(e.target.checked)}
                    className="w-4 h-4 text-blue-600 dark:text-purple-timer border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-purple-timer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Copy client to new projects
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifyOnCreation}
                    onChange={(e) => setNotifyOnCreation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 dark:text-purple-timer border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-purple-timer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Notify me when projects are created
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
              >
                {editingTemplate ? "Update Template" : "Create Template"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50">
        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create a template to automatically generate recurring monthly projects
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates.map((template) => (
              <div key={template._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      {template.recurringConfig?.enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          <Repeat className="h-3 w-3" />
                          Auto-create enabled
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Budget:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {template.budgetType === "hours"
                            ? `${template.budgetHours || 0}h`
                            : formatCurrency(template.budgetAmount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Rate:</span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(template.hourlyRate)}/hr
                        </span>
                      </div>
                      {template.recurringConfig?.enabled && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Next creation:</span>{" "}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatNextCreation(template.recurringConfig.nextCreationDate)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Pattern: {template.recurringConfig?.namePattern || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDuplicate(template._id)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                      title="Create project for this month"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
