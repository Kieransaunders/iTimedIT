import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ProjectSummaryGridProps {
  projectId: Id<"projects">;
}

export function ProjectSummaryGrid({ projectId }: ProjectSummaryGridProps) {
  const project = useQuery(api.projects.get, { id: projectId });
  const stats = useQuery(api.projects.getStats, { projectId });

  if (!project || !stats) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>;
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getAllocated = () => {
    if (project.budgetType === "hours" && project.budgetHours) {
      return `${project.budgetHours}h`;
    } else if (project.budgetType === "amount" && project.budgetAmount) {
      return formatCurrency(project.budgetAmount);
    }
    return "N/A";
  };

  const getRemaining = () => {
    if (project.budgetType === "hours" && stats.timeRemaining > 0) {
      return formatTime(stats.timeRemaining * 3600);
    } else if (project.budgetType === "amount" && stats.budgetRemaining > 0) {
      return formatCurrency(stats.budgetRemaining);
    } else if (stats.timeRemaining <= 0 || stats.budgetRemaining <= 0) {
      return "Exceeded";
    }
    return "N/A";
  };

  return (
    <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {project.client.name} – {project.name}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hourly Rate</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(project.hourlyRate)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Used</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatTime(stats.totalSeconds)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Allocated</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {getAllocated()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
          <div className={`text-lg font-semibold ${
            getRemaining() === "Exceeded" 
              ? "text-red-600 dark:text-red-400" 
              : "text-green-600 dark:text-green-400"
          }`}>
            {getRemaining()}
          </div>
        </div>
      </div>

      {stats.lastTimerSession && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Timer Session</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {new Date(stats.lastTimerSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(stats.lastTimerSession.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      )}

      {(stats.timeRemaining <= 0 || stats.budgetRemaining <= 0) && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-md p-3">
          <div className="text-sm font-medium text-red-800 dark:text-red-300">
            ⚠️ Allocation Exceeded
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            This project has exceeded its allocation.
          </div>
        </div>
      )}
    </div>
  );
}