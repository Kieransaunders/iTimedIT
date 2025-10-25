import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useOrganization } from "../lib/organization-context";
import { RecentEntriesTable, type RecentEntriesFilters } from "./RecentEntriesTable";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";

type CategoryFilter = "all" | "none" | string;

type ProjectOption = {
  _id: Id<"projects">;
  name: string;
  client?: {
    _id: Id<"clients">;
    name: string;
  } | null;
};

type ClientOption = {
  _id: Id<"clients">;
  name: string;
};

export function EntriesPage() {
  const { isReady } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<"all" | Id<"clients">>("all");
  const [selectedProject, setSelectedProject] = useState<"all" | Id<"projects">>("all");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [isSubmittingManualEntry, setIsSubmittingManualEntry] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    note: "",
    category: "",
  });

  const projects = useQuery(api.projects.listAll, isReady ? { workspaceType: "work" } : "skip");
  const categories = useQuery(api.categories.getCategories, isReady ? {} : "skip");
  const entries = useQuery(api.entries.list, isReady ? { paginationOpts: { numItems: 100, cursor: null } } : "skip");
  const createManualEntry = useMutation(api.timer.createManualEntry);

  const clientOptions = useMemo<ClientOption[]>(() => {
    if (!projects) {
      return [];
    }

    const uniqueClients = new Map<string, ClientOption>();
    for (const project of projects as ProjectOption[]) {
      if (project.client?._id) {
        uniqueClients.set(project.client._id, {
          _id: project.client._id,
          name: project.client.name,
        });
      }
    }

    return Array.from(uniqueClients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const projectOptions = useMemo<ProjectOption[]>(() => {
    if (!projects) {
      return [];
    }

    return (projects as ProjectOption[])
      .filter((project) => {
        if (selectedClient !== "all" && project.client?._id !== selectedClient) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, selectedClient]);

  useEffect(() => {
    if (selectedProject !== "all") {
      const stillVisible = projectOptions.some((project) => project._id === selectedProject);
      if (!stillVisible) {
        setSelectedProject("all");
      }
    }
  }, [projectOptions, selectedProject]);

  const hasProjects = projectOptions.length > 0;

  // Get selected project data for budget calculation
  const selectedProjectData = useMemo(() => {
    if (selectedProject === "all" || !projects) return null;
    return (projects as ProjectOption[]).find((p) => p._id === selectedProject);
  }, [selectedProject, projects]);

  // Calculate filtered entries and stats
  const { filteredEntries, stats } = useMemo(() => {
    if (!entries?.page) {
      return {
        filteredEntries: [],
        stats: {
          count: 0,
          totalHours: 0,
          totalMinutes: 0,
          budgetHours: null,
          remainingHours: null,
          remainingMinutes: null,
        },
      };
    }

    // Apply filters
    const filtered = entries.page.filter((entry) => {
      // Client filter
      if (selectedClient !== "all" && entry.client?._id !== selectedClient) {
        return false;
      }

      // Project filter
      if (selectedProject !== "all" && entry.projectId !== selectedProject) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "none" && entry.category) {
          return false;
        } else if (selectedCategory !== "none" && entry.category !== selectedCategory) {
          return false;
        }
      }

      // Date range filter
      const entryDate = entry.startedAt ?? entry._creationTime;
      if (fromDate) {
        const fromMs = new Date(fromDate).setHours(0, 0, 0, 0);
        if (entryDate < fromMs) {
          return false;
        }
      }
      if (toDate) {
        const toMs = new Date(toDate).setHours(23, 59, 59, 999);
        if (entryDate > toMs) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fields = [
          entry.project?.name || "",
          entry.client?.name || "",
          entry.note || "",
          entry.category || "",
        ];
        const matches = fields.some((field) => field.toLowerCase().includes(term));
        if (!matches) {
          return false;
        }
      }

      return true;
    });

    // Calculate stats
    const totalSeconds = filtered.reduce((sum, entry) => {
      return sum + (entry.seconds || 0);
    }, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    // Calculate budget info if a single project with budget is selected
    let budgetHours: number | null = null;
    let remainingHours: number | null = null;
    let remainingMinutes: number | null = null;

    if (selectedProject !== "all" && selectedProjectData) {
      const projectData = selectedProjectData as any;
      if (projectData.budgetType === "hours" && projectData.budgetHours) {
        budgetHours = projectData.budgetHours;
        const totalHoursDecimal = totalSeconds / 3600;
        const remaining = Math.max(0, budgetHours - totalHoursDecimal);
        remainingHours = Math.floor(remaining);
        remainingMinutes = Math.floor((remaining % 1) * 60);
      }
    }

    return {
      filteredEntries: filtered,
      stats: {
        count: filtered.length,
        totalHours,
        totalMinutes,
        budgetHours,
        remainingHours,
        remainingMinutes,
      },
    };
  }, [entries, selectedClient, selectedProject, selectedCategory, fromDate, toDate, searchTerm, selectedProjectData]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedClient("all");
    setSelectedProject("all");
    setSelectedCategory("all");
    setFromDate("");
    setToDate("");
  };

  const filtersActive = Boolean(
    searchTerm ||
    selectedClient !== "all" ||
    selectedProject !== "all" ||
    selectedCategory !== "all" ||
    fromDate ||
    toDate
  );

  const prepareManualEntryDefaults = () => {
    setManualEntryForm((prev) => {
      const preferredProject =
        selectedProject !== "all"
          ? (selectedProject as string)
          : prev.projectId || (projectOptions[0]?._id ?? "");

      const categoryValue =
        selectedCategory === "all"
          ? prev.category
          : selectedCategory === "none"
            ? ""
            : selectedCategory;

      return {
        ...prev,
        projectId: preferredProject,
        category: categoryValue,
        date: new Date().toISOString().split("T")[0],
      };
    });
  };

  const handleManualEntrySubmit = async () => {
    if (!manualEntryForm.projectId) {
      toast.error("Please select a project for this entry");
      return;
    }

    const startDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.startTime}:00`);
    const endDateTime = new Date(`${manualEntryForm.date}T${manualEntryForm.endTime}:00`);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      toast.error("Please provide a valid start and end time");
      return;
    }

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmittingManualEntry(true);
    try {
      await createManualEntry({
        projectId: manualEntryForm.projectId as Id<"projects">,
        startedAt: startDateTime.getTime(),
        stoppedAt: endDateTime.getTime(),
        note: manualEntryForm.note || undefined,
        category: manualEntryForm.category || undefined,
      });

      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
      const matchingProject = projectOptions.find((project) => project._id === manualEntryForm.projectId);
      const projectName = matchingProject?.name ?? "project";

      toast.success(`Added ${durationMinutes} minute${durationMinutes === 1 ? "" : "s"} to ${projectName}`);

      setManualEntryForm((prev) => ({
        ...prev,
        startTime: "09:00",
        endTime: "10:00",
        note: "",
        category: "",
      }));
      setShowManualEntryDialog(false);
    } catch (error) {
      console.error("Failed to create manual entry", error);
      toast.error("Failed to create time entry");
    } finally {
      setIsSubmittingManualEntry(false);
    }
  };

  const entriesFilters: RecentEntriesFilters = {
    projectId: selectedProject,
    clientId: selectedClient,
    category: selectedCategory,
    searchTerm,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const selectedProjectId = selectedProject === "all" ? null : (selectedProject as Id<"projects">);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Entries</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review, search, and adjust recent time entries across your projects.
          </p>
        </div>
        <Dialog
          open={showManualEntryDialog}
          onOpenChange={(open) => {
            if (open) {
              prepareManualEntryDefaults();
            }
            setShowManualEntryDialog(open);
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                if (!hasProjects) {
                  return;
                }
              }}
              disabled={!hasProjects}
              className="bg-[#F85E00] text-white hover:bg-[#d14e00]"
            >
              + Add Time Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>Add Manual Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">Project</label>
                <select
                  value={manualEntryForm.projectId}
                  onChange={(event) =>
                    setManualEntryForm((prev) => ({ ...prev, projectId: event.target.value }))
                  }
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a project...</option>
                  {projectOptions.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                      {project.client ? ` · ${project.client.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Date</label>
                  <Input
                    type="date"
                    value={manualEntryForm.date}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, date: event.target.value }))
                    }
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Start Time</label>
                  <Input
                    type="time"
                    value={manualEntryForm.startTime}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, startTime: event.target.value }))
                    }
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">End Time</label>
                  <Input
                    type="time"
                    value={manualEntryForm.endTime}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, endTime: event.target.value }))
                    }
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {categories && categories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Category (optional)</label>
                  <select
                    value={manualEntryForm.category}
                    onChange={(event) =>
                      setManualEntryForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select category...</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">Note (optional)</label>
                <textarea
                  value={manualEntryForm.note}
                  onChange={(event) =>
                    setManualEntryForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder="What did you work on?"
                  className="w-full min-h-[96px] resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
      </div>

      {!hasProjects && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
          Create a project first to log manual time entries.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Popover open={showSearchPanel} onOpenChange={setShowSearchPanel}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Search & Filter
              </span>
              {filtersActive && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full">
                  !
                </span>
              )}
              <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[90vw] max-w-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            align="start"
            side="bottom"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search & Filter Entries
                </h3>
                <button
                  onClick={() => setShowSearchPanel(false)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by project, client, note, or category"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(event) =>
                        setSelectedClient(
                          event.target.value === "all"
                            ? "all"
                            : (event.target.value as Id<"clients">)
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">All clients</option>
                      {clientOptions.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(event) =>
                        setSelectedProject(
                          event.target.value === "all"
                            ? "all"
                            : (event.target.value as Id<"projects">)
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">All projects</option>
                      {projectOptions.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                          {project.client ? ` · ${project.client.name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value as CategoryFilter)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All categories</option>
                    <option value="none">No category</option>
                    {categories?.map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      From date
                    </label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      To date
                    </label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    disabled={!filtersActive}
                    size="sm"
                  >
                    Reset filters
                  </Button>
                  <Button
                    onClick={() => setShowSearchPanel(false)}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {filtersActive && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Filters active</span>
            <button
              onClick={resetFilters}
              className="text-primary hover:text-primary-hover underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Entry Count */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Entries
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.count}
            </p>
          </div>

          {/* Total Time */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Time
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalHours}h {stats.totalMinutes}m
            </p>
          </div>

          {/* Budget Remaining (conditional) */}
          {stats.budgetHours !== null && (
            <div className="flex flex-col items-center sm:items-start">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Budget Remaining
              </p>
              <p
                className={`text-2xl font-bold ${
                  (stats.remainingHours ?? 0) > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {stats.remainingHours}h {stats.remainingMinutes}m
              </p>
            </div>
          )}
        </div>
      </div>

      <RecentEntriesTable
        projectId={selectedProjectId}
        showHeader={false}
        pageSize={50}
        filters={entriesFilters}
        emptyStateMessage="No entries match the current filters."
      />
    </div>
  );
}
