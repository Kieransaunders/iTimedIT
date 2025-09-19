import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const clients = useQuery(api.clients.list);
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      await updateClient({
        id: editingClient._id,
        name,
        note,
      });
    } else {
      await createClient({ name, note });
    }
    
    setName("");
    setNote("");
    setShowForm(false);
    setEditingClient(null);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name);
    setNote(client.note || "");
    setShowForm(true);
  };

  const handleArchive = async (clientId: Id<"clients">) => {
    await updateClient({ id: clientId, archived: true });
  };

  if (!clients) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Clients</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-timer text-white rounded-md hover:bg-purple-timer-hover shadow-lg transition-colors"
        >
          Add Client
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-900/30 dark:bg-purple-900/50 backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border dark:border-purple-700/50 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">
            {editingClient ? "Edit Client" : "Add New Client"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
                Client Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-white mb-1">
                Notes (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-timer text-white rounded-md hover:bg-purple-timer-hover shadow-lg transition-colors"
              >
                {editingClient ? "Update" : "Create"} Client
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingClient(null);
                  setName("");
                  setNote("");
                }}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-600">
              {clients.map((client) => (
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {client.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-300">
                      {client.note || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-purple-timer hover:text-purple-timer-hover dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(client._id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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

        {clients.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No clients yet. Add your first client to get started!
          </div>
        )}
      </div>
    </div>
  );
}
