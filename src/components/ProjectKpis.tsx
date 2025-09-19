import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ProjectKpisProps {
  projectId: Id<"projects">;
}

export function ProjectKpis({ projectId }: ProjectKpisProps) {
  const stats = useQuery(api.projects.getStats, { projectId });

  if (!stats) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
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
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Project Summary</h3>
      
      <div className="space-y-4">
        <div className="border-b pb-3">
          <div className="text-sm text-gray-600">Total Time Logged</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatTime(stats.totalSeconds)}
          </div>
        </div>

        <div className="border-b pb-3">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>

        {stats.timeRemaining > 0 && (
          <div className="border-b pb-3">
            <div className="text-sm text-gray-600">Time Remaining</div>
            <div className="text-2xl font-bold text-green-600">
              {formatTime(stats.timeRemaining * 3600)}
            </div>
          </div>
        )}

        {stats.budgetRemaining > 0 && (
          <div className="border-b pb-3">
            <div className="text-sm text-gray-600">Budget Remaining</div>
            <div className="text-2xl font-bold text-green-600">
              {typeof stats.budgetRemaining === 'number' && stats.budgetRemaining < 100 
                ? formatCurrency(stats.budgetRemaining)
                : formatTime(stats.budgetRemaining)}
            </div>
          </div>
        )}

        {(stats.timeRemaining <= 0 || stats.budgetRemaining <= 0) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm font-medium text-red-800">
              ⚠️ Budget Exceeded
            </div>
            <div className="text-sm text-red-600">
              This project has exceeded its allocated budget.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
