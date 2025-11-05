import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useProjects() {
  // Fetch all projects for the current organization (using listAll instead of list)
  const projects = useQuery(api.projects.listAll, {});

  return {
    projects: projects ?? [],
    isLoading: projects === undefined,
  };
}
