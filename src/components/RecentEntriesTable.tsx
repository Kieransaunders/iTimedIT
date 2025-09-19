import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface RecentEntriesTableProps {
  projectId: Id<"projects"> | null;
}

export function RecentEntriesTable({ projectId }: RecentEntriesTableProps) {
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const entries = useQuery(api.entries.list, {
    projectId: projectId || undefined,
    paginationOpts: { numItems: 20, cursor: null },
  });

  const editEntry = useMutation(api.entries.edit);
  const deleteEntry = useMutation(api.entries.deleteEntry);
  const mergeOverrun = useMutation(api.entries.mergeOverrun);

  if (!entries) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleEditNote = async (entryId: string, note: string) => {
    await editEntry({ id: entryId as Id<"timeEntries">, note });
    setEditingEntry(null);
    setEditNote("");
  };

  const handleMergeOverrun = async (overrunId: string, targetId: string) => {
    await mergeOverrun({
      overrunId: overrunId as Id<"timeEntries">,
      intoEntryId: targetId as Id<"timeEntries">,
    });
  };

  const overrunEntries = entries.page.filter(entry => entry.isOverrun);
  const regularEntries = entries.page.filter(entry => !entry.isOverrun);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Recent Entries</h3>
      </div>

      {overrunEntries.length > 0 && (
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
                    {regularEntries
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
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Note
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {regularEntries.map((entry) => {
              const duration = entry.seconds || (entry.stoppedAt ? (entry.stoppedAt - entry.startedAt) / 1000 : 0);
              
              return (
                <tr key={entry._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {entry.client?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.project?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(entry.startedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(duration)}
                  </td>
                  <td className="px-6 py-4">
                    {editingEntry === entry._id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
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
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        {entry.note || "Click to add note..."}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => deleteEntry({ id: entry._id as Id<"timeEntries"> })}
                      className="text-red-600 hover:text-red-900"
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

      {regularEntries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No time entries yet. Start a timer to begin tracking!
        </div>
      )}
    </div>
  );
}
