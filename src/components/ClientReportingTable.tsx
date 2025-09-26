import { generateClientReport, type ClientReportClient } from "../lib/client-report";

interface ClientReportingTableProps {
  clients: ClientReportClient[];
}

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;

export function ClientReportingTable({ clients }: ClientReportingTableProps) {
  const report = generateClientReport(clients);

  if (report.summary.totalClients === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reporting Overview</h3>
      </div>

      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th scope="col" className="py-2 pr-4 font-medium">Metric</th>
                <th scope="col" className="py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Total Revenue</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{formatCurrency(report.summary.totalRevenue)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Total Hours</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{`${report.summary.totalHours.toFixed(1)}h`}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Active Clients</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{report.summary.activeClients}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">At Risk Clients</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{report.summary.atRiskClients}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Inactive Clients</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{report.summary.inactiveClients}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Average Health Score</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{report.summary.averageHealthScore.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {report.topClients.length > 0 && (
          <div className="overflow-x-auto">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Top Clients by Revenue</h4>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th scope="col" className="py-2 pr-4 font-medium">#</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Client</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Revenue</th>
                  <th scope="col" className="py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.topClients.map((client, index) => (
                  <tr key={client._id}>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{index + 1}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{formatCurrency(client.totalAmountSpent)}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{formatHours(client.totalTimeSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
