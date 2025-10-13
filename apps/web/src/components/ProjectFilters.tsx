import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface ProjectFiltersProps {
  filters: ProjectFilterState;
  onFiltersChange: (filters: ProjectFilterState) => void;
  onReset: () => void;
  totalProjects: number;
  filteredCount: number;
  clients: Array<{ _id: string; name: string; color?: string }>;
}

export interface ProjectFilterState {
  search: string;
  clientId: string;
  status: "active" | "archived" | "all";
  budgetType: "all" | "hours" | "amount";
  hourlyRate: {
    min: number;
    max: number | null;
  };
}

export const defaultProjectFilters: ProjectFilterState = {
  search: "",
  clientId: "all",
  status: "active",
  budgetType: "all",
  hourlyRate: {
    min: 0,
    max: null,
  },
};

export function ProjectFilters({
  filters,
  onFiltersChange,
  onReset,
  totalProjects,
  filteredCount,
  clients,
}: ProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof ProjectFilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasAdvancedFilters =
    filters.clientId !== defaultProjectFilters.clientId ||
    filters.budgetType !== defaultProjectFilters.budgetType ||
    filters.hourlyRate.min !== defaultProjectFilters.hourlyRate.min ||
    filters.hourlyRate.max !== defaultProjectFilters.hourlyRate.max ||
    filters.status !== defaultProjectFilters.status;

  const hasActiveFilters = Boolean(filters.search) || hasAdvancedFilters;

  const statusOptions: Array<{ label: string; value: ProjectFilterState["status"] }> = [
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search projects or clients..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
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
            aria-label="Toggle advanced options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Status:
        </span>
        {statusOptions.map((option) => (
          <Badge
            key={option.value}
            variant={filters.status === option.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => updateFilter("status", option.value)}
          >
            {option.label}
          </Badge>
        ))}
      </div>

      {showAdvanced && (
        <div className="grid gap-4 sm:grid-cols-3 bg-white dark:bg-gray-800/60 dark:backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Client
            </span>
            <Select
              value={filters.clientId}
              onValueChange={(value) => updateFilter("clientId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-gray-300"
                        style={{ backgroundColor: client.color || "#8b5cf6" }}
                      />
                      {client.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Allocation Type
            </span>
            <div className="flex gap-2 flex-wrap">
              {["all", "hours", "amount"].map((option) => (
                <Badge
                  key={option}
                  variant={filters.budgetType === option ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => updateFilter("budgetType", option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Hourly Rate ({"$"})
            </span>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={filters.hourlyRate.min || ""}
                onChange={(e) =>
                  updateFilter("hourlyRate", {
                    ...filters.hourlyRate,
                    min: Number(e.target.value) || 0,
                  })
                }
                className="w-24"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={
                  filters.hourlyRate.max === null || filters.hourlyRate.max === undefined
                    ? ""
                    : filters.hourlyRate.max
                }
                onChange={(e) =>
                  updateFilter("hourlyRate", {
                    ...filters.hourlyRate,
                    max: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-24"
              />
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
          {filters.status !== defaultProjectFilters.status && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status}
            </Badge>
          )}
          {filters.clientId !== defaultProjectFilters.clientId && (
            <Badge variant="secondary" className="text-xs">
              Client: {clients.find((client) => client._id === filters.clientId)?.name || filters.clientId}
            </Badge>
          )}
          {filters.budgetType !== defaultProjectFilters.budgetType && (
            <Badge variant="secondary" className="text-xs capitalize">
              Allocation: {filters.budgetType}
            </Badge>
          )}
          {(filters.hourlyRate.min !== defaultProjectFilters.hourlyRate.min ||
            filters.hourlyRate.max !== defaultProjectFilters.hourlyRate.max) && (
            <Badge variant="secondary" className="text-xs">
              Rate: {filters.hourlyRate.min || 0} - {filters.hourlyRate.max ?? "∞"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
