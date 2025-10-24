/**
 * TodaySummaryCard - Collapsible summary of time tracking with project breakdown
 *
 * Features:
 * - Time period filter (Day/Week/Month/Year)
 * - Project time distribution chart with colored bars
 * - Today's total time and entries count
 * - Collapsible with smooth animation
 */
import { useState, useMemo, useCallback } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { cn } from "../lib/utils";
import { useCurrency } from "../hooks/useCurrency";

export type TimePeriod = "day" | "week" | "month" | "year";

export interface Project {
  _id: string;
  name: string;
  hourlyRate: number;
  color: string;
  client?: {
    _id: string;
    name: string;
    color?: string;
  } | null;
}

export interface TimeEntry {
  _id: string;
  projectId: string;
  startedAt: number;
  stoppedAt?: number;
  seconds: number;
  project?: Project;
}

export interface ProjectTimeData {
  project: Project;
  seconds: number;
  percentage: number;
}

export interface TodaySummaryCardProps {
  /** All time entries for filtering */
  entries: TimeEntry[];
  /** Total time tracked in current period */
  totalSeconds: number;
  /** Number of entries */
  entriesCount: number;
}

function formatDuration(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) {
    return "0m";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function TodaySummaryCard({
  entries,
  totalSeconds,
  entriesCount,
}: TodaySummaryCardProps) {
  const { formatCurrency } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");

  // Calculate date range based on selected period
  const getDateRange = useCallback((period: TimePeriod): { start: number; end: number } => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (period) {
      case "day":
        return {
          start: today.getTime(),
          end: now,
        };
      case "week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        return {
          start: startOfWeek.getTime(),
          end: now,
        };
      }
      case "month": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: startOfMonth.getTime(),
          end: now,
        };
      }
      case "year": {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return {
          start: startOfYear.getTime(),
          end: now,
        };
      }
    }
  }, []);

  // Filter entries by selected time period and calculate project data
  const projectTimeData = useMemo((): ProjectTimeData[] => {
    const { start, end } = getDateRange(timePeriod);

    // Filter entries within date range
    const filteredEntries = entries.filter(
      (entry) => entry.startedAt >= start && entry.startedAt <= end
    );

    // Group by project and sum seconds
    const projectMap = new Map<string, { project: Project; seconds: number }>();

    filteredEntries.forEach((entry) => {
      if (!entry.project) return;

      // Ensure seconds is a valid number
      const entrySeconds = typeof entry.seconds === "number" && !isNaN(entry.seconds)
        ? entry.seconds
        : 0;

      const existing = projectMap.get(entry.projectId);
      if (existing) {
        existing.seconds += entrySeconds;
      } else {
        projectMap.set(entry.projectId, {
          project: entry.project,
          seconds: entrySeconds,
        });
      }
    });

    // Calculate total seconds
    const totalSeconds = Array.from(projectMap.values()).reduce(
      (sum, item) => sum + (typeof item.seconds === "number" && !isNaN(item.seconds) ? item.seconds : 0),
      0
    );

    if (totalSeconds === 0) return [];

    // Create time data with percentages
    const timeData: ProjectTimeData[] = Array.from(projectMap.values()).map((item) => {
      const validSeconds = typeof item.seconds === "number" && !isNaN(item.seconds) ? item.seconds : 0;
      const percentage = totalSeconds > 0 ? (validSeconds / totalSeconds) * 100 : 0;

      return {
        project: item.project,
        seconds: validSeconds,
        percentage: !isNaN(percentage) ? percentage : 0,
      };
    });

    // Sort by time (most time first)
    return timeData.sort((a, b) => b.seconds - a.seconds);
  }, [entries, timePeriod, getDateRange]);

  // Calculate filtered total time
  const filteredTotalSeconds = useMemo(() => {
    return projectTimeData.reduce((sum, item) => sum + item.seconds, 0);
  }, [projectTimeData]);

  // Calculate top project (project with most time today)
  const topProject = useMemo((): Project | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = Date.now();

    // Filter today's entries
    const todayEntries = entries.filter(
      (entry) => entry.startedAt >= todayStart && entry.startedAt <= todayEnd
    );

    // Group by project
    const projectMap = new Map<string, { project: Project; seconds: number }>();
    todayEntries.forEach((entry) => {
      if (!entry.project) return;
      const entrySeconds = typeof entry.seconds === "number" && !isNaN(entry.seconds) ? entry.seconds : 0;
      const existing = projectMap.get(entry.projectId);
      if (existing) {
        existing.seconds += entrySeconds;
      } else {
        projectMap.set(entry.projectId, {
          project: entry.project,
          seconds: entrySeconds,
        });
      }
    });

    // Find project with most time
    let maxProject: { project: Project; seconds: number } | null = null;
    projectMap.forEach((data) => {
      if (!maxProject || data.seconds > maxProject.seconds) {
        maxProject = data;
      }
    });

    return maxProject?.project || null;
  }, [entries]);

  // Calculate today's earnings
  const todaysEarnings = useMemo((): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = Date.now();

    // Filter today's entries
    const todayEntries = entries.filter(
      (entry) => entry.startedAt >= todayStart && entry.startedAt <= todayEnd
    );

    // Calculate total earnings
    return todayEntries.reduce((total, entry) => {
      if (!entry.project) return total;
      const entrySeconds = typeof entry.seconds === "number" && !isNaN(entry.seconds) ? entry.seconds : 0;
      const hours = entrySeconds / 3600;
      const earnings = hours * entry.project.hourlyRate;
      return total + earnings;
    }, 0);
  }, [entries]);

  return (
    <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-gray-100/30 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Today's Summary
          </h3>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Main Stats - Always Visible */}
      <div className="px-4 sm:px-6 pb-4">
        {/* Total Time - Prominent Display with Clock Icon */}
        <div className="flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-primary mr-2" />
          <div className="text-5xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">
            {formatDuration(filteredTotalSeconds || totalSeconds)}
          </div>
        </div>

        {/* Stats Grid - 3 Columns: Entries | Top Project | Earnings */}
        <div className="grid grid-cols-3 gap-4">
          {/* Entries Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {entriesCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {entriesCount === 1 ? "Entry" : "Entries"}
            </div>
          </div>

          {/* Top Project */}
          {topProject ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: topProject.color || "#8b5cf6" }}
                />
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                  {topProject.name}
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Top Project
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm font-medium text-gray-400 dark:text-gray-500">
                —
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Top Project
              </div>
            </div>
          )}

          {/* Earnings */}
          <div className="text-center">
            <div className="text-base font-bold text-green-600 dark:text-green-500">
              {formatCurrency(todaysEarnings)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Earned Today
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4">
          {/* Divider */}
          <div className="h-px bg-gray-300/50 dark:bg-gray-700/50 mb-4" />

          {/* Time Period Filter */}
          <div className="flex gap-2 mb-4">
            {(["day", "week", "month", "year"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                  timePeriod === period
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Time by Project Breakdown */}
          {projectTimeData.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Time by Project
              </h4>
              {projectTimeData.map((item) => {
                const projectColor = item.project.client?.color || item.project.color || "#8b5cf6";
                return (
                  <div key={item.project._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: projectColor }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.project.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatDuration(item.seconds)}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                          {Math.round(item.percentage)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: projectColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-sm">No project data yet</div>
              <div className="text-xs mt-1">Start tracking time to see breakdown</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
