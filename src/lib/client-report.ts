export interface ClientReportClient {
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
  categoryBreakdown?: Array<{
    category: string;
    amount: number;
    hours: number;
    percentage: number;
  }>;
}

export interface ClientReportSummary {
  totalClients: number;
  totalRevenue: number;
  totalHours: number;
  activeClients: number;
  atRiskClients: number;
  inactiveClients: number;
  averageHealthScore: number;
}

export interface ClientReport {
  summary: ClientReportSummary;
  topClients: ClientReportClient[];
}

export function generateClientReport(clients: ClientReportClient[]): ClientReport {
  const totalRevenue = clients.reduce((sum, client) => sum + client.totalAmountSpent, 0);
  const totalHours = clients.reduce((sum, client) => sum + client.totalTimeSpent, 0) / 3600;
  const activeClients = clients.filter(client => client.status === 'active').length;
  const atRiskClients = clients.filter(client => client.status === 'at-risk').length;
  const inactiveClients = clients.filter(client => client.status === 'inactive').length;
  const averageHealthScore =
    clients.length === 0
      ? 0
      : clients.reduce((sum, client) => sum + client.healthScore, 0) / clients.length;

  const topClientsByRevenue = [...clients]
    .sort((a, b) => b.totalAmountSpent - a.totalAmountSpent)
    .slice(0, 5);

  return {
    summary: {
      totalClients: clients.length,
      totalRevenue,
      totalHours,
      activeClients,
      atRiskClients,
      inactiveClients,
      averageHealthScore
    },
    topClients: topClientsByRevenue
  };
}
