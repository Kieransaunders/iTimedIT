import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Id } from "../../convex/_generated/dataModel";

interface ProjectMetricsCardsProps {
  projects: Array<any>;
  onProjectSelect?: (projectId: string) => void;
  onStartTimer?: (projectId: string) => void;
  onEditProject?: (project: any) => void;
  onArchiveProject?: (projectId: Id<"projects">) => void;
  onRestoreProject?: (projectId: Id<"projects">) => void;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: () => string;
}

const formatDuration = (seconds: number) => {
  if (!seconds) return "0h";
  const hours = seconds / 3600;
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
};

const formatLastActivity = (timestamp?: number) => {
  if (!timestamp) return "No activity";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export function ProjectMetricsCards({
  projects,
  onProjectSelect,
  onStartTimer,
  onEditProject,
  onArchiveProject,
  onRestoreProject,
  formatCurrency,
  getCurrencySymbol,
}: ProjectMetricsCardsProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
        <p className="text-gray-500 dark:text-gray-400">Adjust your filters or add a new project to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => {
        const totalSeconds: number = project.totalSeconds || 0;
        const totalHours = project.totalHours || totalSeconds / 3600;
        const trackedAmount = totalHours * project.hourlyRate;
        const allocationLabel =
          project.budgetType === "hours"
            ? project.budgetHours
              ? `${project.budgetHours}h`
              : "No limit"
            : project.budgetAmount
            ? formatCurrency(project.budgetAmount)
            : "No limit";

        const remainingLabel = project.budgetRemainingFormatted || "N/A";
        const statusLabel = project.archived ? "Archived" : "Active";
        const statusVariant = project.archived ? "secondary" : "outline";

        let progress = 0;
        if (project.budgetType === "hours" && project.budgetHours) {
          progress = Math.min(100, (totalHours / project.budgetHours) * 100);
        } else if (project.budgetType === "amount" && project.budgetAmount) {
          progress = Math.min(100, (trackedAmount / project.budgetAmount) * 100);
        }

        const hasAllocation = Boolean(project.budgetHours || project.budgetAmount);

        return (
          <Card key={project._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-col gap-2 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: project.client?.color || "#8b5cf6" }}
                  />
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{project.client?.name || "No client"}</p>
                  </div>
                </div>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {!project.archived && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStartTimer?.(project._id)}
                    >
                      Start timer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onProjectSelect?.(project._id)}
                    >
                      View details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditProject?.(project)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => onArchiveProject?.(project._id)}
                    >
                      Archive
                    </Button>
                  </>
                )}
                {project.archived && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onProjectSelect?.(project._id)}
                    >
                      View details
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      onClick={() => onRestoreProject?.(project._id)}
                    >
                      Restore
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Hourly rate</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {getCurrencySymbol()}
                    {project.hourlyRate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Time tracked</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDuration(totalSeconds)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Allocated</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{allocationLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Remaining</p>
                  <p className={`text-lg font-semibold ${project.budgetRemaining <= 0 && hasAllocation ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                    {remainingLabel}
                  </p>
                </div>
              </div>

              {hasAllocation && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Budget usage</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full ${progress >= 100 ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Billable amount</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(trackedAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Last activity</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatLastActivity(project.lastActivityAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
