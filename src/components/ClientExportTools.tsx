import { generateClientReport, type ClientReportClient } from "../lib/client-report";
import { Button } from "./ui/button";

interface ClientExportToolsProps {
  clients: ClientReportClient[];
  filteredClients: ClientReportClient[];
  onExportData: (format: 'csv' | 'pdf', data: 'all' | 'filtered') => void;
}

export function ClientExportTools({ clients, filteredClients, onExportData }: ClientExportToolsProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;

  const generateCSV = (data: ClientReportClient[]) => {
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

  const downloadCSV = (data: ClientReportClient[], filename: string) => {
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

  const downloadReport = (data: ClientReportClient[], filename: string) => {
    const report = generateClientReport(data);
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

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Export Data
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Choose the dataset you want to export.
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

      </div>
    </div>
  );
}