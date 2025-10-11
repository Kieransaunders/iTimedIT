import { useQuery, useMutation } from "convex/react";
import { useMemo } from "react";
import { api } from "../convex/_generated/api";
import { Project } from "../types/models";
import { Id } from "../convex/_generated/dataModel";

export interface UseProjectsOptions {
  searchTerm?: string;
  workspaceType?: "personal" | "team";
  includeArchived?: boolean;
}

export interface UseProjectsReturn {
  projects: Project[];
  recentProjects: Project[];
  isLoading: boolean;
  error: Error | null;
  createProject: (params: {
    clientId: Id<"clients">;
    name: string;
    hourlyRate: number;
    budgetType: "hours" | "amount";
    budgetHours?: number;
    budgetAmount?: number;
    workspaceType?: "personal" | "team";
  }) => Promise<Id<"projects">>;
}

/**
 * Hook to fetch and manage projects
 * Fetches projects for the current organization, filters archived projects,
 * and sorts by recent activity
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { searchTerm, workspaceType, includeArchived = false } = options;

  // Fetch projects from Convex
  const projectsData = useQuery(api.projects.listAll, {
    searchTerm,
    workspaceType,
    includeArchived,
  });

  const createProjectMutation = useMutation(api.projects.create);

  // Determine loading state
  const isLoading = projectsData === undefined;

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
    clientId: Id<"clients">;
    name: string;
    hourlyRate: number;
    budgetType: "hours" | "amount";
    budgetHours?: number;
    budgetAmount?: number;
    workspaceType?: "personal" | "team";
  }) => {
    return await createProjectMutation({
      clientId: params.clientId,
      name: params.name,
      hourlyRate: params.hourlyRate,
      budgetType: params.budgetType,
      budgetHours: params.budgetHours,
      budgetAmount: params.budgetAmount,
      workspaceType: params.workspaceType || "team",
    });
  };

  return {
    projects,
    recentProjects,
    isLoading,
    error,
    createProject,
  };
}
