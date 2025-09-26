import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface FilterState {
  search: string;
  status: string[];
  revenueRange: {
    min: number;
    max: number;
  };
  healthScore: {
    min: number;
    max: number;
  };
  activityDays: number | null; // null = all, number = days since last activity
}

interface ClientFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  totalClients: number;
  filteredCount: number;
}

export function ClientFilters({
  filters,
  onFiltersChange,
  onReset,
  totalClients,
  filteredCount
}: ClientFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = filters.status;
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilter('status', newStatuses);
  };

  const hasActiveFilters = filters.search || 
                          filters.status.length > 0 || 
                          filters.revenueRange.min > 0 || 
                          filters.revenueRange.max < 100000 ||
                          filters.healthScore.min > 0 ||
                          filters.healthScore.max < 100 ||
                          filters.activityDays !== null;

  return (
    <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-lg shadow dark:shadow-dark-card border-0 dark:border dark:border-gray-700/50 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredCount} of {totalClients} clients
          </span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search clients by name or notes..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Status
        </label>
        <div className="flex gap-2 flex-wrap">
          {['active', 'at-risk', 'inactive'].map((status) => (
            <Badge
              key={status}
              variant={filters.status.includes(status) ? "default" : "outline"}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => toggleStatus(status)}
            >
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-600 dark:text-gray-400 p-0"
        >
          {showAdvanced ? '↑' : '↓'} Advanced Filters
        </Button>
      </div>

      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          {/* Revenue Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Revenue Range ($)
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={filters.revenueRange.min || ''}
                onChange={(e) => updateFilter('revenueRange', {
                  ...filters.revenueRange,
                  min: parseFloat(e.target.value) || 0
                })}
                className="w-24"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.revenueRange.max === 100000 ? '' : filters.revenueRange.max}
                onChange={(e) => updateFilter('revenueRange', {
                  ...filters.revenueRange,
                  max: parseFloat(e.target.value) || 100000
                })}
                className="w-24"
              />
            </div>
          </div>

          {/* Health Score Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Health Score
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                min="0"
                max="100"
                value={filters.healthScore.min || ''}
                onChange={(e) => updateFilter('healthScore', {
                  ...filters.healthScore,
                  min: parseInt(e.target.value) || 0
                })}
                className="w-20"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="number"
                placeholder="Max"
                min="0"
                max="100"
                value={filters.healthScore.max === 100 ? '' : filters.healthScore.max}
                onChange={(e) => updateFilter('healthScore', {
                  ...filters.healthScore,
                  max: parseInt(e.target.value) || 100
                })}
                className="w-20"
              />
            </div>
          </div>

          {/* Activity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Activity
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'All', value: null },
                { label: 'Last 7 days', value: 7 },
                { label: 'Last 30 days', value: 30 },
                { label: 'Last 90 days', value: 90 }
              ].map((option) => (
                <Badge
                  key={option.label}
                  variant={filters.activityDays === option.value ? "default" : "outline"}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => updateFilter('activityDays', option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Active filters:</div>
          <div className="flex gap-1 flex-wrap">
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                Search: "{filters.search}"
              </Badge>
            )}
            {filters.status.map(status => (
              <Badge key={status} variant="secondary" className="text-xs">
                Status: {status}
              </Badge>
            ))}
            {(filters.revenueRange.min > 0 || filters.revenueRange.max < 100000) && (
              <Badge variant="secondary" className="text-xs">
                Revenue: ${filters.revenueRange.min} - ${filters.revenueRange.max}
              </Badge>
            )}
            {(filters.healthScore.min > 0 || filters.healthScore.max < 100) && (
              <Badge variant="secondary" className="text-xs">
                Health: {filters.healthScore.min} - {filters.healthScore.max}
              </Badge>
            )}
            {filters.activityDays !== null && (
              <Badge variant="secondary" className="text-xs">
                Activity: Last {filters.activityDays} days
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Default filter state
export const defaultFilters: FilterState = {
  search: '',
  status: [],
  revenueRange: {
    min: 0,
    max: 100000
  },
  healthScore: {
    min: 0,
    max: 100
  },
  activityDays: null
};