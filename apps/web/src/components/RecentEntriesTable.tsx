import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useOrganization } from "../lib/organization-context";
import { formatDateTime, formatDate } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar } from "./ui/Avatar";

interface RecentEntriesTableProps {
  projectId: Id<"projects"> | null;
  title?: string;
  showHeader?: boolean;
  pageSize?: number;
  emptyStateMessage?: string;
  filters?: RecentEntriesFilters;
  workspaceType?: "personal" | "work";
  skipQuery?: boolean;
  viewMode?: "personal" | "team";
  filterUserId?: Id<"users">;
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
  workspaceType = "work",
  skipQuery = false,
  viewMode = "personal",
  filterUserId,
}: RecentEntriesTableProps) {
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    hours: 0,
    minutes: 0,
    category: "",
    note: "",
  });
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<Id<"timeEntries"> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { isReady } = useOrganization();

  const entries = useQuery(
    workspaceType === "personal" ? api.personalEntries.listPersonal : api.entries.list,
    (workspaceType === "personal" || isReady) && !skipQuery ? {
      projectId: projectId || undefined,
      paginationOpts: { numItems: pageSize, cursor: null },
      viewMode: viewMode,
      filterUserId: filterUserId,
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





  const handleRowClick = (entry: any, duration: number) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    setEditingEntry(entry);
    setEditForm({
      hours,
      minutes,
      category: entry.category || "",
      note: entry.note || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const totalSeconds = (editForm.hours * 3600) + (editForm.minutes * 60);

    await editEntry({
      id: editingEntry._id as Id<"timeEntries">,
      seconds: totalSeconds,
      category: editForm.category || undefined,
      note: editForm.note || undefined,
    });

    setShowEditDialog(false);
    setEditingEntry(null);
    setEditForm({ hours: 0, minutes: 0, category: "", note: "" });
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingEntry(null);
    setEditForm({ hours: 0, minutes: 0, category: "", note: "" });
  };

  const handleDeleteClick = (entryId: Id<"timeEntries">) => {
    setDeleteConfirmEntry(entryId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmEntry) {
      await deleteEntry({ id: deleteConfirmEntry });
      setShowDeleteDialog(false);
      setDeleteConfirmEntry(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmEntry(null);
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

  if ((workspaceType === "work" && !isReady) || !entries) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow-sm dark:shadow-dark-card border border-gray-200 dark:border-gray-700/50">
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
                    onClick={() => handleDeleteClick(entry._id as Id<"timeEntries">)}
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

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-700/50">
            <tr>
              {viewMode === "team" && (
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Team Member
                </th>
              )}
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {viewMode === "team" ? "Description" : "Project"}
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                Date & Time
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                Category
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                Note
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-600">
            {displayEntries.map((entry) => {
              const duration = entry.seconds || (entry.stoppedAt ? (entry.stoppedAt - entry.startedAt) / 1000 : 0);

              return (
                <tr
                  key={entry._id}
                  onClick={() => handleRowClick(entry, duration)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                >
                  {viewMode === "team" && (
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={entry.user?.name || "Unknown"} size="sm" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {entry.user?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {viewMode === "team" ? (entry.note || <span className="text-gray-500 italic">No description</span>) : entry.project?.name}
                    </div>
                    {viewMode !== "team" && (
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {entry.client?.name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">
                    {formatDateTime(entry.startedAt)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">
                    {formatTime(duration)}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell text-sm font-medium text-gray-800 dark:text-gray-100">
                    {entry.category || <span className="text-gray-500 dark:text-gray-400 italic">No category</span>}
                  </td>
                  <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-sm text-gray-800 dark:text-gray-100 truncate max-w-xs">
                    {viewMode === "team" ? (
                      <div>
                        <div className="font-medium">{entry.project?.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{entry.client?.name}</div>
                      </div>
                    ) : (
                      entry.note || <span className="text-gray-500 dark:text-gray-400 italic">No note</span>
                    )}
                  </td>
                  <td
                    className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleDeleteClick(entry._id as Id<"timeEntries">)}
                      className="font-medium text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors text-xs sm:text-sm"
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

      {/* Edit Entry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingEntry && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project
                  </label>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {editingEntry.project?.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {editingEntry.client?.name || 'No Client'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date & Time
                  </label>
                  <div className="text-sm text-gray-800 dark:text-gray-100">
                    {formatDateTime(editingEntry.startedAt)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Duration
                  </label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={editForm.hours}
                        onChange={(e) => setEditForm(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                        placeholder="Hours"
                        min="0"
                        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hours</div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={editForm.minutes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                        placeholder="Minutes"
                        min="0"
                        max="59"
                        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minutes</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full h-10 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No category</option>
                    {categories?.map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name} {category.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Note
                  </label>
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Add a note about this entry..."
                    className="w-full min-h-[80px] px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveEdit} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Delete Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this time entry? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
