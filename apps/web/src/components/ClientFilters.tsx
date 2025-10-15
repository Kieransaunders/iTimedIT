import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";

interface FilterState {
  search: string;
  revenueRange: {
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

  const hasAdvancedFilters = filters.revenueRange.min > 0 ||
                             filters.revenueRange.max < 100000 ||
                             filters.activityDays !== null;

  const hasActiveFilters = Boolean(filters.search) || hasAdvancedFilters;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search clients by name or notes..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Showing {filteredCount} / {totalClients}
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs text-gray-600 dark:text-gray-300"
            >
              Reset
            </Button>
          )}
          <Button
            type="button"
            variant={showAdvanced ? "default" : "outline"}
            size="icon"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-9 w-9"
            aria-label="Toggle advanced options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid gap-4 sm:grid-cols-2 bg-white dark:bg-gray-800/60 dark:backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Revenue ($)
            </span>
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

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Recent Activity
            </span>
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
                  className="cursor-pointer"
                  onClick={() => updateFilter('activityDays', option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Active criteria:</span>
          {filters.search && (
            <Badge variant="secondary" className="text-xs">
              Search: "{filters.search}"
            </Badge>
          )}
          {(filters.revenueRange.min > 0 || filters.revenueRange.max < 100000) && (
            <Badge variant="secondary" className="text-xs">
              Revenue: ${filters.revenueRange.min} - ${filters.revenueRange.max}
            </Badge>
          )}
          {filters.activityDays !== null && (
            <Badge variant="secondary" className="text-xs">
              Activity: Last {filters.activityDays} days
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Default filter state
export const defaultFilters: FilterState = {
  search: '',
  revenueRange: {
    min: 0,
    max: 100000
  },
  activityDays: null
};