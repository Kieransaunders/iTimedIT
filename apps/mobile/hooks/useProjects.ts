import { useQuery, useMutation } from "convex/react";
import { useMemo, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { Project } from "../types/models";
import { Id } from "../convex/_generated/dataModel";
import { useOrganization } from "../contexts/OrganizationContext";
import { NetworkErrorHandler, NetworkErrorState } from "../utils/networkErrorHandler";

export interface UseProjectsOptions {
  searchTerm?: string;
  includeArchived?: boolean;
}

export interface UseProjectsReturn {
  projects: Project[];
  recentProjects: Project[];
  isLoading: boolean;
  error: Error | null;
  currentWorkspace: "personal" | "team";
  networkError: NetworkErrorState;
  retryFetch: () => void;
  createProject: (params: {
    clientId?: Id<"clients">;
    name: string;
    hourlyRate: number;
    budgetType: "hours" | "amount";
    budgetHours?: number;
    budgetAmount?: number;
  }) => Promise<Id<"projects">>;
}

/**
 * Hook to fetch and manage projects
 * Fetches projects for the current organization, filters archived projects,
 * and sorts by recent activity
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { searchTerm, includeArchived = false } = options;
  const { currentWorkspace, isReady } = useOrganization();
  const [networkError, setNetworkError] = useState<NetworkErrorState>(
    NetworkErrorHandler.createErrorState(null)
  );
  const [retryCount, setRetryCount] = useState(0);

  // Fetch projects based on current workspace context
  const projectsData = useQuery(
    currentWorkspace === "personal" ? api.personalProjects.listPersonal : api.projects.listAll,
    isReady
      ? currentWorkspace === "personal"
        ? { searchTerm, includeArchived }
        : { searchTerm, workspaceType: "team", includeArchived }
      : "skip"
  );

  // Handle network errors for project fetching
  useEffect(() => {
    if (projectsData === undefined && isReady) {
      // Query failed, likely due to network error
      const error = new Error("Failed to fetch projects");
      setNetworkError(NetworkErrorHandler.createErrorState(error, retryCount));
    } else if (projectsData !== undefined) {
      // Query succeeded, clear any network errors
      setNetworkError(NetworkErrorHandler.createErrorState(null));
    }
  }, [projectsData, isReady, retryCount]);

  const createProjectMutation = useMutation(
    currentWorkspace === "personal" ? api.personalProjects.createPersonal : api.projects.create
  );

  // Determine loading state - wait for organization context to be ready
  const isLoading = !isReady || projectsData === undefined;

  // Handle error state (Convex queries don't throw, they return undefined on error)
  const error = null;

  // Get all projects (already filtered and sorted by Convex query)
  const projects = useMemo(() => {
    if (!projectsData) return [];
    return projectsData as Project[];
  }, [projectsData]);

  // Get recent projects (top 2-3 most recent)
  const recentProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return projects.slice(0, 3);
  }, [projects]);

  const createProject = async (params: {
    clientId?: Id<"clients">;
    name: string;
    hourlyRate: number;
    budgetType: "hours" | "amount";
    budgetHours?: number;
    budgetAmount?: number;
  }) => {
    return await NetworkErrorHandler.withRetry(async () => {
      if (currentWorkspace === "personal") {
        // Personal projects don't need workspaceType parameter
        return await createProjectMutation({
          clientId: params.clientId,
          name: params.name,
          hourlyRate: params.hourlyRate,
          budgetType: params.budgetType,
          budgetHours: params.budgetHours,
          budgetAmount: params.budgetAmount,
        });
      } else {
        // Team projects need workspaceType parameter
        return await createProjectMutation({
          clientId: params.clientId,
          name: params.name,
          hourlyRate: params.hourlyRate,
          budgetType: params.budgetType,
          budgetHours: params.budgetHours,
          budgetAmount: params.budgetAmount,
          workspaceType: "team",
        });
      }
    });
  };

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setNetworkError(NetworkErrorHandler.createErrorState(null));
  };

  return {
    projects,
    recentProjects,
    isLoading,
    error,
    currentWorkspace,
    networkError,
    retryFetch,
    createProject,
  };
}
