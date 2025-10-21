import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, FileBarChart, Archive, LayoutGrid, Table2 } from "lucide-react";

interface FilterState {
  search: string;
  clientId: string | "all";
  budgetType: "all" | "hours" | "amount";
  showArchived: boolean;
  budgetStatus: "all" | "onTrack" | "nearLimit" | "overBudget";
}

type ViewMode = 'table' | 'cards';

interface ProjectFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  totalProjects: number;
  filteredCount: number;
  clients: Array<{ _id: string; name: string }>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ProjectFilters({
  filters,
  onFiltersChange,
  onReset,
  totalProjects,
  filteredCount,
  clients,
  viewMode,
  onViewModeChange
}: ProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasAdvancedFilters = filters.clientId !== "all" ||
                             filters.budgetType !== "all" ||
                             filters.budgetStatus !== "all" ||
                             filters.showArchived;

  const hasActiveFilters = Boolean(filters.search) || hasAdvancedFilters;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search projects by name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onViewModeChange('table')}
              className={`h-9 w-9 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              aria-label="Show table view"
              title="Table view"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onViewModeChange('cards')}
              className={`h-9 w-9 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              aria-label="Show card view"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Showing {filteredCount} / {totalProjects}
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
            aria-label="Toggle report filters"
            title="Report filters"
          >
            <FileBarChart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 bg-white dark:bg-gray-800/60 dark:backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Client
            </span>
            <select
              value={filters.clientId}
              onChange={(e) => updateFilter('clientId', e.target.value)}
              className="w-full h-9 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Budget Type
            </span>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'All', value: 'all' },
                { label: 'Hours', value: 'hours' },
                { label: 'Amount', value: 'amount' }
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.budgetType === option.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => updateFilter('budgetType', option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Budget Status
            </span>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'All', value: 'all' },
                { label: 'On Track', value: 'onTrack' },
                { label: 'Near Limit', value: 'nearLimit' },
                { label: 'Over Budget', value: 'overBudget' }
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.budgetStatus === option.value ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => updateFilter('budgetStatus', option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Archive Status
            </span>
            <Button
              type="button"
              variant={filters.showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilter('showArchived', !filters.showArchived)}
              className="w-full justify-start"
            >
              <Archive className="h-4 w-4 mr-2" />
              {filters.showArchived ? "Showing Archived" : "Show Archived"}
            </Button>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Active filters:
            </span>
            {filters.search && (
              <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                Search: "{filters.search}"
              </Badge>
            )}
            {filters.clientId !== "all" && (
              <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                Client: {clients.find(c => c._id === filters.clientId)?.name || "Unknown"}
              </Badge>
            )}
            {filters.budgetType !== "all" && (
              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700 text-white">
                Budget: {filters.budgetType === "hours" ? "Hours" : "Amount"}
              </Badge>
            )}
            {filters.budgetStatus !== "all" && (
              <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                Status: {filters.budgetStatus === "onTrack" ? "On Track" : filters.budgetStatus === "nearLimit" ? "Near Limit" : "Over Budget"}
              </Badge>
            )}
            {filters.showArchived && (
              <Badge variant="default" className="text-xs bg-gray-600 hover:bg-gray-700 text-white">
                <Archive className="h-3 w-3 mr-1 inline" />
                Archived
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
  clientId: 'all',
  budgetType: 'all',
  showArchived: false,
  budgetStatus: 'all'
};
