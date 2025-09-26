import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface ClientData {
  _id: string;
  name: string;
  color?: string;
  note?: string;
  totalAmountSpent: number;
  totalTimeSpent: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
  lastActivityAt: number | null;
  daysSinceLastActivity: number | null;
  status: 'active' | 'inactive' | 'at-risk';
  healthScore: number;
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
  onCreateProject: (clientId: string) => void;
}

export function EnhancedClientTable({
  clients,
  sortConfig,
  onSort,
  onEditClient,
  onArchiveClient,
  onCreateProject
}: EnhancedClientTableProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
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

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
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
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Add your first client to get started!</p>
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
              <SortableHeader sortKey="totalTimeSpent">Time</SortableHeader>
              <SortableHeader sortKey="averageHourlyEarning">Avg Rate</SortableHeader>
              <SortableHeader sortKey="activeProjectsCount">Projects</SortableHeader>
              <SortableHeader sortKey="healthScore">Health</SortableHeader>
              <SortableHeader sortKey="daysSinceLastActivity">Last Activity</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-600">
            {clients.map((client) => (
              <tr key={client._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: client.color || "#8b5cf6" }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.name}
                      </div>
                      {client.note && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {client.note}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {client.activeProjectsCount}
                    </span>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {client.completedProjectsCount}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className={`text-sm font-semibold ${getHealthScoreColor(client.healthScore)}`}>
                    {client.healthScore}/100
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {formatLastActivity(client.daysSinceLastActivity)}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateProject(client._id)}
                      className="text-xs"
                    >
                      + Project
                    </Button>
                    <button
                      onClick={() => onEditClient(client)}
                      className="text-purple-timer hover:text-purple-timer-hover dark:text-purple-400 dark:hover:text-purple-300 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onArchiveClient(client._id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors text-sm"
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
    </div>
  );
}