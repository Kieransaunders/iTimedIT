import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceHeader, WorkspaceType } from "./WorkspaceSwitcher";
import { Button } from "./ui/button";
import { EnhancedClientTable } from "./EnhancedClientTable";
import { ClientMetricsCards } from "./ClientMetricsCards";
import { ClientFilters, defaultFilters } from "./ClientFilters";
import { ClientAnalytics } from "./ClientAnalytics";
import { ClientExportTools } from "./ClientExportTools";
import { ClientReportingTable } from "./ClientReportingTable";

// Default color palette for clients
const DEFAULT_COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan  
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#f97316", // orange
  "#ec4899", // pink
];

type ViewMode = 'table' | 'cards';

interface SortConfig {
  key: keyof any | null;
  direction: 'asc' | 'desc';
}

export function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType>("team");
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState(defaultFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  
  const { isReady } = useOrganization();

  const clients = useQuery(
    currentWorkspace === "personal" 
      ? api.personalClients.listPersonal
      : api.clients.list,
    isReady 
      ? (currentWorkspace === "personal" ? {} : { workspaceType: "team" })
      : "skip"
  );
  const createClient = useMutation(
    currentWorkspace === "personal" 
      ? api.personalClients.createPersonal
      : api.clients.create
  );
  const updateClient = useMutation(
    currentWorkspace === "personal" 
      ? api.personalClients.updatePersonal
      : api.clients.update
  );

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    if (!clients) return [];

    let filtered = clients.filter(client => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(searchLower);
        const matchesNote = client.note?.toLowerCase().includes(searchLower) || false;
        if (!matchesName && !matchesNote) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(client.status)) {
        return false;
      }

      // Revenue range filter
      if (client.totalAmountSpent < filters.revenueRange.min || 
          client.totalAmountSpent > filters.revenueRange.max) {
        return false;
      }

      // Health score filter
      if (client.healthScore < filters.healthScore.min || 
          client.healthScore > filters.healthScore.max) {
        return false;
      }

      // Activity filter
      if (filters.activityDays !== null) {
        if (client.daysSinceLastActivity === null || 
            client.daysSinceLastActivity > filters.activityDays) {
          return false;
        }
      }

      return true;
    });

    // Sort clients
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [clients, filters, sortConfig]);

  const handleSort = (key: keyof any) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateProject = (clientId: string) => {
    // TODO: Navigate to project creation with client pre-selected
    console.log('Create project for client:', clientId);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId as Id<"clients">);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExportData = (format: 'csv' | 'pdf', scope: 'all' | 'filtered') => {
    // TODO: Track export analytics if needed
    console.log(`Exported ${scope} clients as ${format}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingClient) {
        await updateClient({
          id: editingClient._id,
          name,
          note,
          color,
        });
      } else {
        await createClient({ name, note, color });
      }

      setName("");
      setNote("");
      setColor("#8b5cf6");
      setShowForm(false);
      setEditingClient(null);
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: editingClient
          ? "Unable to update client. Please try again."
          : "Unable to create client. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage clients.",
      });
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name);
    setNote(client.note || "");
    setColor(client.color || "#8b5cf6");
    setShowForm(true);
  };

  const handleArchive = async (clientId: Id<"clients">) => {
    try {
      await updateClient({ id: clientId, archived: true });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to archive client. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage clients.",
      });
    }
  };

  if (!isReady || !clients) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  // Show individual client analytics if selected
  if (selectedClientId) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => setSelectedClientId(null)}
            variant="outline"
          >
            ← Back to Clients
          </Button>
        </div>
        <ClientAnalytics clientId={selectedClientId} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <WorkspaceHeader 
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={setCurrentWorkspace}
      />
      
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Clients
          </h2>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            <Button
              size="sm"
              variant={viewMode === 'table' ? "default" : "ghost"}
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              📊 Table
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'cards' ? "default" : "ghost"}
              onClick={() => setViewMode('cards')}
              className="h-8"
            >
              🃏 Cards
            </Button>
          </div>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary-hover"
          >
            Add Client
          </Button>
        )}
      </div>

      {/* Client Creation/Edit Form */}
      {showForm && (
        <div className="bg-primary/10 dark:bg-primary/20 backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border dark:border-primary/30 p-6 mb-6">
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
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Brand Color
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#8b5cf6"
                    className="px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 w-24"
                  />
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {DEFAULT_COLORS.map((defaultColor) => (
                    <button
                      key={defaultColor}
                      type="button"
                      onClick={() => setColor(defaultColor)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        color === defaultColor ? 'border-white' : 'border-gray-400'
                      }`}
                      style={{ backgroundColor: defaultColor }}
                      title={defaultColor}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingClient ? "Update" : "Create"} Client
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingClient(null);
                  setName("");
                  setNote("");
                  setColor("#8b5cf6");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <ClientFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        totalClients={clients.length}
        filteredCount={filteredAndSortedClients.length}
      />

      {/* Client Display */}
      {viewMode === 'table' ? (
        <EnhancedClientTable
          clients={filteredAndSortedClients}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEditClient={handleEdit}
          onArchiveClient={handleArchive}
          onCreateProject={handleCreateProject}
        />
      ) : (
        <ClientMetricsCards
          clients={filteredAndSortedClients}
          onClientSelect={handleClientSelect}
          onEditClient={handleEdit}
          onArchiveClient={handleArchive}
        />
      )}

      {/* Reporting Overview */}
      {filteredAndSortedClients.length > 0 && (
        <div className="mt-8 space-y-8">
          <ClientReportingTable clients={filteredAndSortedClients} />
          <ClientExportTools
            clients={clients || []}
            filteredClients={filteredAndSortedClients}
            onExportData={handleExportData}
          />
        </div>
      )}
    </div>
  );
}
