import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../convex/_generated/api";
import { Project } from "../types/models";

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

  return {
    projects,
    recentProjects,
    isLoading,
    error,
  };
}
