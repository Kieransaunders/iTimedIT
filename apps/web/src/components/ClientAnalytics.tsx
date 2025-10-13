import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useCurrency } from "../hooks/useCurrency";

interface ClientAnalyticsProps {
  clientId: Id<"clients">;
}

export function ClientAnalytics({ clientId }: ClientAnalyticsProps) {
  const analytics = useQuery(api.clients.getClientAnalytics, { clientId });
  const { formatCurrency } = useCurrency();

  if (!analytics) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

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

  const formatGrowth = (growth: number) => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatHours(analytics.overview.totalHours * 3600)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Revenue</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.recentRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={analytics.overview.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                {formatGrowth(analytics.overview.revenueGrowth)}
              </span> vs previous 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Hourly Rate</CardTitle>
            <span className="text-2xl">⏰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.averageHourlyRate)}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(analytics.overview.status)}>
              {analytics.overview.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.overview.daysSinceLastActivity !== null
                ? `${Math.floor(analytics.overview.daysSinceLastActivity)} days ago`
                : 'No activity'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Project Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.breakdowns.projects.slice(0, 5).map((project, index) => (
              <div key={project.projectId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{project.name}</div>
                  <Badge variant="outline">{project.percentage.toFixed(1)}%</Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(project.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{project.hours.toFixed(1)}h</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Work Category Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.breakdowns.categories.slice(0, 5).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{category.category}</div>
                  <Badge variant="outline">{category.percentage.toFixed(1)}%</Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(category.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{category.hours.toFixed(1)}h</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.overview.activeProjectsCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {analytics.overview.completedProjectsCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {analytics.overview.recentHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}