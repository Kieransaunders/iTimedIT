import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
  lastActivityAt: number | null;
  daysSinceLastActivity: number | null;
  status: 'active' | 'inactive' | 'at-risk';
  healthScore: number;
  averageHourlyEarning: number;
}

interface ClientMetricsCardsProps {
  clients: ClientData[];
  onClientSelect?: (clientId: string) => void;
  onEditClient?: (client: ClientData) => void;
  onArchiveClient?: (clientId: string) => void;
}

export function ClientMetricsCards({
  clients,
  onClientSelect,
  onEditClient,
  onArchiveClient
}: ClientMetricsCardsProps) {
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

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatLastActivity = (daysSince: number | null) => {
    if (daysSince === null) return 'No activity';
    if (daysSince < 1) return 'Today';
    if (daysSince < 7) return `${Math.floor(daysSince)} days ago`;
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`;
    return `${Math.floor(daysSince / 30)} months ago`;
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No clients yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Add your first client to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {clients.map((client) => (
        <Card 
          key={client._id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onClientSelect?.(client._id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: client.color || "#8b5cf6" }}
                />
                <CardTitle className="text-base truncate">{client.name}</CardTitle>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClient?.(client);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveClient?.(client._id);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                >
                  Archive
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Status and Health Score */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(client.status)}>
                {client.status}
              </Badge>
              <div className="text-right">
                <div className={`text-sm font-semibold ${getHealthScoreColor(client.healthScore)}`}>
                  {client.healthScore}/100
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">health</div>
              </div>
            </div>

            {/* Revenue */}
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(client.totalAmountSpent)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total revenue
              </div>
            </div>

            {/* Time and Rate */}
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium">{formatHours(client.totalTimeSpent)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total time</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(client.averageHourlyEarning)}/h</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg rate</div>
              </div>
            </div>

            {/* Projects */}
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium text-blue-600 dark:text-blue-400">
                  {client.activeProjectsCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-600 dark:text-gray-300">
                  {client.completedProjectsCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
              </div>
            </div>

            {/* Last Activity */}
            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
              Last activity: {formatLastActivity(client.daysSinceLastActivity)}
            </div>

            {/* Notes */}
            {client.note && (
              <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                "{client.note}"
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}