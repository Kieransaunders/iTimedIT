import { Badge } from "./ui/badge";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit2, Archive, Plus, RotateCcw, Building2 } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";

interface ClientData {
  _id: string;
  name: string;
  color?: string;
  note?: string;
  totalAmountSpent: number;
  totalTimeSpent: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
  totalProjectsCount: number;
  lastActivityAt: number | null;
  daysSinceLastActivity: number | null;
  status: 'active' | 'inactive' | 'at-risk';
  averageHourlyEarning: number;
}

interface SortConfig {
  key: keyof ClientData | null;
  direction: 'asc' | 'desc';
}

interface EnhancedClientTableProps {
  clients: ClientData[];
  sortConfig: SortConfig;
  onSort: (key: keyof ClientData) => void;
  onEditClient: (client: ClientData) => void;
  onArchiveClient: (clientId: string) => void;
  onUnarchiveClient?: (clientId: string) => void;
  onCreateProject: (clientId: string) => void;
  onClientSelect?: (clientId: string) => void;
  onViewProjects?: (clientId: string) => void;
}

export function EnhancedClientTable({
  clients,
  sortConfig,
  onSort,
  onEditClient,
  onArchiveClient,
  onUnarchiveClient,
  onCreateProject,
  onClientSelect,
  onViewProjects
}: EnhancedClientTableProps) {
  const { formatCurrency } = useCurrency();
  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    return `${hours.toFixed(1)}h`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatLastActivity = (daysSince: number | null) => {
    if (daysSince === null) return 'Never';
    if (daysSince < 1) return 'Today';
    if (daysSince < 7) return `${Math.floor(daysSince)}d`;
    if (daysSince < 30) return `${Math.floor(daysSince / 7)}w`;
    return `${Math.floor(daysSince / 30)}m`;
  };

  const getSortIcon = (key: keyof ClientData) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />;
    }

    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" aria-hidden />
      : <ArrowDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" aria-hidden />;
  };

  const SortableHeader = ({ 
    children, 
    sortKey 
  }: { 
    children: React.ReactNode; 
    sortKey: keyof ClientData;
  }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {getSortIcon(sortKey)}
      </div>
    </th>
  );

  if (clients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 mb-4">
            <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Start building your client portfolio by adding your first client
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <SortableHeader sortKey="name">Client</SortableHeader>
              <SortableHeader sortKey="status">Status</SortableHeader>
              <SortableHeader sortKey="totalAmountSpent">Revenue</SortableHeader>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onClick={() => onSort("totalTimeSpent")}>
                <div className="flex items-center gap-1.5">
                  Time
                  {getSortIcon("totalTimeSpent")}
                </div>
              </th>
              <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onClick={() => onSort("averageHourlyEarning")}>
                <div className="flex items-center gap-1.5">
                  Avg Rate
                  {getSortIcon("averageHourlyEarning")}
                </div>
              </th>
              <SortableHeader sortKey="activeProjectsCount">Projects</SortableHeader>
              <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onClick={() => onSort("daysSinceLastActivity")}>
                <div className="flex items-center gap-1.5">
                  Last Activity
                  {getSortIcon("daysSinceLastActivity")}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-600">
            {clients.map((client) => (
              <tr key={client._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => onClientSelect?.(client._id)}
                    className="flex w-full items-center gap-3 rounded-md bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    title="View client details"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: client.color || "#8b5cf6" }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.name}
                      </div>
                      {client.note && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {client.note}
                        </div>
                      )}
                    </div>
                  </button>
                </td>
                
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      if (client.status === 'active' && onArchiveClient) {
                        onArchiveClient(client._id);
                      } else if (client.status === 'inactive' && onUnarchiveClient) {
                        onUnarchiveClient(client._id);
                      }
                    }}
                    className="group relative"
                    disabled={client.status === 'at-risk'}
                  >
                    <Badge className={`${getStatusColor(client.status)} transition-all duration-200 ${
                      client.status !== 'at-risk' ? 'group-hover:scale-105 cursor-pointer' : ''
                    }`}>
                      {client.status}
                    </Badge>
                    {client.status !== 'at-risk' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        {client.status === 'active' ? 'Click to archive' : 'Click to reactivate'}
                      </div>
                    )}
                  </button>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(client.totalAmountSpent)}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {formatHours(client.totalTimeSpent)}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(client.averageHourlyEarning)}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <button
                    onClick={() => onViewProjects?.(client._id)}
                    className={`flex items-center gap-2 ${onViewProjects ? 'hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer' : ''}`}
                    disabled={!onViewProjects}
                    title={onViewProjects ? "View projects for this client" : undefined}
                  >
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {client.activeProjectsCount}
                    </span>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {client.totalProjectsCount}
                    </span>
                  </button>
                </td>

                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {formatLastActivity(client.daysSinceLastActivity)}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onCreateProject(client._id)}
                      className="group relative p-1.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                      title="Create Project"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditClient(client)}
                      className="group relative p-1.5 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-all"
                      title="Edit Client"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {client.status === 'active' ? (
                      <button
                        onClick={() => onArchiveClient(client._id)}
                        className="group relative p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                        title="Archive Client"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    ) : (
                      onUnarchiveClient && (
                        <button
                          onClick={() => onUnarchiveClient(client._id)}
                          className="group relative p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                          title="Restore Client"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}