import { Button } from "./ui/button";

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
  categoryBreakdown?: Array<{
    category: string;
    amount: number;
    hours: number;
    percentage: number;
  }>;
}

interface ClientExportToolsProps {
  clients: ClientData[];
  filteredClients: ClientData[];
  onExportData: (format: 'csv' | 'pdf', data: 'all' | 'filtered') => void;
}

export function ClientExportTools({ clients, filteredClients, onExportData }: ClientExportToolsProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;

  const generateCSV = (data: ClientData[]) => {
    const headers = [
      'Client Name',
      'Status',
      'Total Revenue',
      'Total Hours',
      'Average Hourly Rate',
      'Active Projects',
      'Completed Projects',
      'Health Score',
      'Days Since Last Activity',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(client => [
        `"${client.name}"`,
        client.status,
        client.totalAmountSpent.toFixed(2),
        (client.totalTimeSpent / 3600).toFixed(2),
        client.averageHourlyEarning.toFixed(2),
        client.activeProjectsCount,
        client.completedProjectsCount,
        client.healthScore,
        client.daysSinceLastActivity?.toFixed(0) || 'Never',
        `"${client.note || ''}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (data: ClientData[], filename: string) => {
    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = (data: ClientData[]) => {
    const totalRevenue = data.reduce((sum, client) => sum + client.totalAmountSpent, 0);
    const totalHours = data.reduce((sum, client) => sum + client.totalTimeSpent, 0) / 3600;
    const activeClients = data.filter(c => c.status === 'active').length;
    const atRiskClients = data.filter(c => c.status === 'at-risk').length;
    const inactiveClients = data.filter(c => c.status === 'inactive').length;
    const averageHealthScore = data.reduce((sum, client) => sum + client.healthScore, 0) / data.length;

    // Top 5 clients by revenue
    const topClientsByRevenue = [...data]
      .sort((a, b) => b.totalAmountSpent - a.totalAmountSpent)
      .slice(0, 5);

    return {
      summary: {
        totalClients: data.length,
        totalRevenue,
        totalHours,
        activeClients,
        atRiskClients,
        inactiveClients,
        averageHealthScore
      },
      topClients: topClientsByRevenue
    };
  };

  const downloadReport = (data: ClientData[], filename: string) => {
    const report = generateReport(data);
    const reportContent = `
CLIENT ANALYTICS REPORT
Generated on: ${new Date().toLocaleString()}

SUMMARY
=======
Total Clients: ${report.summary.totalClients}
Total Revenue: ${formatCurrency(report.summary.totalRevenue)}
Total Hours: ${report.summary.totalHours.toFixed(1)}h
Average Health Score: ${report.summary.averageHealthScore.toFixed(1)}/100

CLIENT STATUS BREAKDOWN
======================
Active: ${report.summary.activeClients} clients
At Risk: ${report.summary.atRiskClients} clients
Inactive: ${report.summary.inactiveClients} clients

TOP CLIENTS BY REVENUE
=====================
${report.topClients.map((client, index) => 
  `${index + 1}. ${client.name} - ${formatCurrency(client.totalAmountSpent)} (${formatHours(client.totalTimeSpent)})`
).join('\n')}

DETAILED CLIENT DATA
===================
${data.map(client => `
${client.name}
- Status: ${client.status}
- Revenue: ${formatCurrency(client.totalAmountSpent)}
- Time: ${formatHours(client.totalTimeSpent)}
- Health Score: ${client.healthScore}/100
- Projects: ${client.activeProjectsCount} active, ${client.completedProjectsCount} completed
- Last Activity: ${client.daysSinceLastActivity ? `${Math.floor(client.daysSinceLastActivity)} days ago` : 'Never'}
${client.note ? `- Notes: ${client.note}` : ''}
`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = (format: 'csv' | 'report', scope: 'all' | 'filtered') => {
    const data = scope === 'all' ? clients : filteredClients;
    const timestamp = new Date().toISOString().split('T')[0];
    const scopeLabel = scope === 'all' ? 'all' : 'filtered';
    
    if (format === 'csv') {
      downloadCSV(data, `clients-${scopeLabel}-${timestamp}.csv`);
    } else {
      downloadReport(data, `client-report-${scopeLabel}-${timestamp}.txt`);
    }

    // Call the parent callback for tracking/analytics
    onExportData(format as 'csv', scope);
  };

  const report = generateReport(filteredClients);

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Export & Reporting
        </h3>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(report.summary.totalRevenue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {report.summary.totalHours.toFixed(0)}h
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Hours</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {report.summary.activeClients}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Clients</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {report.summary.averageHealthScore.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Health Score</div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Export Data
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Export */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">CSV Export</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Export client data for analysis in spreadsheet applications.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('csv', 'filtered')}
                  disabled={filteredClients.length === 0}
                >
                  Export Filtered ({filteredClients.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('csv', 'all')}
                  disabled={clients.length === 0}
                >
                  Export All ({clients.length})
                </Button>
              </div>
            </div>

            {/* Report Export */}
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Summary Report</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Generate a comprehensive business intelligence report.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('report', 'filtered')}
                  disabled={filteredClients.length === 0}
                >
                  Report Filtered ({filteredClients.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('report', 'all')}
                  disabled={clients.length === 0}
                >
                  Report All ({clients.length})
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Clients Preview */}
        {report.topClients.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Top Clients by Revenue
            </h4>
            <div className="space-y-2">
              {report.topClients.slice(0, 3).map((client, index) => (
                <div key={client._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {client.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(client.totalAmountSpent)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatHours(client.totalTimeSpent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}