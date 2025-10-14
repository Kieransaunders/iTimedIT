import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useOrganization } from "../lib/organization-context";
import { formatDateTime, formatDate } from "../lib/utils";

interface RecentEntriesTableProps {
  projectId: Id<"projects"> | null;
  title?: string;
  showHeader?: boolean;
  pageSize?: number;
  emptyStateMessage?: string;
  filters?: RecentEntriesFilters;
  workspaceType?: "personal" | "team";
}

export interface RecentEntriesFilters {
  projectId?: Id<"projects"> | "all";
  clientId?: Id<"clients"> | "all";
  category?: string | "all" | "none";
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
}

export function RecentEntriesTable({
  projectId,
  title = "Recent Entries",
  showHeader = true,
  pageSize = 20,
  emptyStateMessage = "No time entries yet. Start a timer to begin tracking!",
  filters,
  workspaceType = "team",
}: RecentEntriesTableProps) {
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [editDurationHours, setEditDurationHours] = useState(0);
  const [editDurationMinutes, setEditDurationMinutes] = useState(0);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const { isReady } = useOrganization();

  const entries = useQuery(
    workspaceType === "personal" ? api.personalEntries.listPersonal : api.entries.list,
    (workspaceType === "personal" || isReady) ? {
      projectId: projectId || undefined,
      paginationOpts: { numItems: pageSize, cursor: null },
    } : "skip"
  );

  const editEntry = useMutation(
    workspaceType === "personal" ? api.personalEntries.editPersonal : api.entries.edit
  );
  const deleteEntry = useMutation(
    workspaceType === "personal" ? api.personalEntries.deletePersonalEntry : api.entries.deleteEntry
  );
  const categories = useQuery(api.categories.getCategories, (workspaceType === "personal" || isReady) ? {} : "skip");

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };





  const handleEditNote = async (entryId: string, note: string) => {
    await editEntry({ id: entryId as Id<"timeEntries">, note });
    setEditingEntry(null);
    setEditNote("");
  };

  const handleEditCategory = async (entryId: string, category: string) => {
    await editEntry({ id: entryId as Id<"timeEntries">, category: category || undefined });
    setEditingCategory(null);
    setEditCategoryValue("");
  };

  const handleEditDuration = async (entryId: string, hours: number, minutes: number) => {
    const totalSeconds = (hours * 3600) + (minutes * 60);
    await editEntry({ id: entryId as Id<"timeEntries">, seconds: totalSeconds });
    setEditingDuration(null);
    setEditDurationHours(0);
    setEditDurationMinutes(0);
  };

  const startEditingDuration = (entryId: string, currentSeconds: number) => {
    setEditingDuration(entryId);
    const hours = Math.floor(currentSeconds / 3600);
    const minutes = Math.floor((currentSeconds % 3600) / 60);
    setEditDurationHours(hours);
    setEditDurationMinutes(minutes);
  };

  // COMMENTED OUT: Overrun merge functionality
  // const handleMergeOverrun = async (overrunId: string, targetId: string) => {
  //   await mergeOverrun({
  //     overrunId: overrunId as Id<"timeEntries">,
  //     intoEntryId: targetId as Id<"timeEntries">,
  //   });
  // };

  const displayEntries = useMemo(() => {
    if (!entries) return [];

    const projectFilter = filters?.projectId && filters.projectId !== "all" ? filters.projectId : null;
    const clientFilter = filters?.clientId && filters.clientId !== "all" ? filters.clientId : null;
    const categoryFilter = filters?.category && filters.category !== "all" ? filters.category : null;
    const searchTerm = filters?.searchTerm?.trim().toLowerCase() ?? "";
    const hasSearch = searchTerm.length > 0;
    const fromMs = filters?.fromDate ? new Date(filters.fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = filters?.toDate ? new Date(filters.toDate).setHours(23, 59, 59, 999) : null;

    return entries.page.filter((entry) => {
      if (projectFilter && entry.projectId !== projectFilter) {
        return false;
      }

      if (clientFilter && entry.client?._id !== clientFilter) {
        return false;
      }

      if (categoryFilter) {
        if (categoryFilter === "none") {
          if (entry.category) {
            return false;
          }
        } else if (entry.category !== categoryFilter) {
          return false;
        }
      }

      const startedAt = entry.startedAt ?? entry._creationTime;
      if (fromMs && startedAt < fromMs) {
        return false;
      }
      if (toMs && startedAt > toMs) {
        return false;
      }

      if (hasSearch) {
        const fields = [
          entry.project?.name ?? "",
          entry.client?.name ?? "",
          entry.note ?? "",
          entry.category ?? "",
        ];

        const matchesSearch = fields.some((field) => field.toLowerCase().includes(searchTerm));
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filters]);

  if ((workspaceType === "team" && !isReady) || !entries) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50">
      {showHeader && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
      )}

      {/* COMMENTED OUT: Overrun placeholders section */}
      {/* {overrunEntries.length > 0 && (
        <div className="p-4 bg-yellow-50 border-b">
          <h4 className="font-medium text-yellow-800 mb-2">Overrun Placeholders</h4>
          <div className="space-y-2">
            {overrunEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between bg-yellow-100 p-3 rounded">
                <div>
                  <div className="font-medium text-yellow-900">
                    {entry.client?.name} → {entry.project?.name}
                  </div>
                  <div className="text-sm text-yellow-700">
                    Started: {formatDateTime(entry.startedAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMergeOverrun(entry._id, e.target.value);
                      }
                    }}
                    className="px-2 py-1 text-sm border rounded"
                    defaultValue=""
                  >
                    <option value="">Merge into...</option>
                    {displayEntries
                      .filter(e => e.projectId === entry.projectId)
                      .slice(0, 5)
                      .map(e => (
                        <option key={e._id} value={e._id}>
                          {formatDate(e.startedAt)} - {e.note || "No note"}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => deleteEntry({ id: entry._id as Id<"timeEntries"> })}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Note
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-600">
            {displayEntries.map((entry) => {
              const duration = entry.seconds || (entry.stoppedAt ? (entry.stoppedAt - entry.startedAt) / 1000 : 0);
              
              return (
                <tr key={entry._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {entry.project?.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.client?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(entry.startedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {editingDuration === entry._id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={editDurationHours}
                          onChange={(e) => setEditDurationHours(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                          min="0"
                          placeholder="Hours"
                        />
                        <span className="text-xs">h</span>
                        <input
                          type="number"
                          value={editDurationMinutes}
                          onChange={(e) => setEditDurationMinutes(parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                          min="0"
                          max="59"
                          placeholder="Min"
                        />
                        <span className="text-xs">m</span>
                        <button
                          onClick={() => handleEditDuration(entry._id, editDurationHours, editDurationMinutes)}
                          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingDuration(null);
                            setEditDurationHours(0);
                            setEditDurationMinutes(0);
                          }}
                          className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditingDuration(entry._id, duration)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-1 rounded"
                        title="Click to edit duration"
                      >
                        {formatTime(duration)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCategory === entry._id ? (
                      <div className="flex gap-2">
                        <select
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                          autoFocus
                        >
                          <option value="">No category</option>
                          {categories?.map((category) => (
                            <option key={category._id} value={category.name}>
                              {category.name} {category.isDefault ? '(Default)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleEditCategory(entry._id, editCategoryValue)}
                          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryValue("");
                          }}
                          className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingCategory(entry._id);
                          setEditCategoryValue(entry.category || "");
                        }}
                        className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-1 rounded"
                      >
                        {entry.category || "No category"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingEntry === entry._id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditNote(entry._id, editNote)}
                          className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingEntry(null);
                            setEditNote("");
                          }}
                          className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingEntry(entry._id);
                          setEditNote(entry.note || "");
                        }}
                        className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-1 rounded"
                      >
                        {entry.note || "Click to add note..."}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => deleteEntry({ id: entry._id as Id<"timeEntries"> })}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {displayEntries.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {emptyStateMessage}
        </div>
      )}
    </div>
  );
}
