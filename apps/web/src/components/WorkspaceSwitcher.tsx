import React from "react";
import { cn } from "../lib/utils";

export type WorkspaceType = "personal" | "team";

interface WorkspaceSwitcherProps {
  currentWorkspace: WorkspaceType;
  onWorkspaceChange: (workspace: WorkspaceType) => void;
  className?: string;
}

export function WorkspaceSwitcher({ 
  currentWorkspace, 
  onWorkspaceChange, 
  className 
}: WorkspaceSwitcherProps) {
  return (
    <div className={cn("flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg", className)}>
      <button
        onClick={() => onWorkspaceChange("personal")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          currentWorkspace === "personal"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )}
      >
        Personal
      </button>
      <button
        onClick={() => onWorkspaceChange("team")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          currentWorkspace === "team"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        )}
      >
        Team
      </button>
    </div>
  );
}

export function WorkspaceHeader({ 
  currentWorkspace, 
  onWorkspaceChange 
}: Pick<WorkspaceSwitcherProps, "currentWorkspace" | "onWorkspaceChange">) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {currentWorkspace === "personal" ? "Personal Projects" : "Team Projects"}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className={cn(
            "w-2 h-2 rounded-full",
            currentWorkspace === "personal" ? "bg-blue-500" : "bg-purple-500"
          )} />
          {currentWorkspace === "personal" ? "Personal" : "Team"}
        </div>
      </div>
      
      <WorkspaceSwitcher 
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={onWorkspaceChange}
      />
    </div>
  );
}