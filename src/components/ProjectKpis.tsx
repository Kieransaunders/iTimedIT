import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ProjectKpisProps {
  projectId: Id<"projects">;
}

export function ProjectKpis({ projectId }: ProjectKpisProps) {
  const stats = useQuery(api.projects.getStats, { projectId });

  if (!stats) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Project Summary</h3>
      
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Time Logged</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatTime(stats.totalSeconds)}
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>

        {stats.timeRemaining > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatTime(stats.timeRemaining * 3600)}
            </div>
          </div>
        )}

        {stats.budgetRemaining > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">Budget Remaining</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {typeof stats.budgetRemaining === 'number' && stats.budgetRemaining < 100 
                ? formatCurrency(stats.budgetRemaining)
                : formatTime(stats.budgetRemaining)}
            </div>
          </div>
        )}

        {(stats.timeRemaining <= 0 || stats.budgetRemaining <= 0) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-md p-3">
            <div className="text-sm font-medium text-red-800 dark:text-red-300">
              ⚠️ Budget Exceeded
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              This project has exceeded its allocated budget.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
