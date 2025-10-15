import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useOrganization } from "../contexts/OrganizationContext";

export interface ManualEntryData {
  projectId: Id<"projects">;
  startedAt: number;
  stoppedAt: number;
  note?: string;
  category?: string;
}

export interface UseEntriesReturn {
  entries: any[];
  isLoading: boolean;
  error: Error | null;
  currentWorkspace: "personal" | "team";
  loadMore: (numItems: number) => void;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  createManualEntry: (data: ManualEntryData) => Promise<void>;
  editEntry: (id: Id<"timeEntries">, updates: Partial<{
    startedAt: number;
    stoppedAt: number;
    seconds: number;
    note: string;
    category: string;
  }>) => Promise<void>;
  deleteEntry: (id: Id<"timeEntries">) => Promise<void>;
}

export function useEntries(projectId?: Id<"projects">): UseEntriesReturn {
  const { currentWorkspace, isReady } = useOrganization();

  // Use paginated query for entries based on workspace context
  const { results, status, loadMore } = usePaginatedQuery(
    currentWorkspace === "personal" ? api.personalEntries.listPersonal : api.entries.list,
    isReady
      ? currentWorkspace === "personal"
        ? { projectId }
        : { projectId, workspaceType: "team" }
      : "skip",
    { initialNumItems: 20 }
  );

  // Mutations based on workspace context
  const createManualEntryMutation = useMutation(
    currentWorkspace === "personal" ? api.personalEntries.createManualPersonal : api.entries.createManualEntry
  );
  const editEntryMutation = useMutation(
    currentWorkspace === "personal" ? api.personalEntries.editPersonal : api.entries.edit
  );
  const deleteEntryMutation = useMutation(
    currentWorkspace === "personal" ? api.personalEntries.deletePersonal : api.entries.deleteEntry
  );

  const createManualEntry = async (data: ManualEntryData) => {
    try {
      if (currentWorkspace === "personal") {
        await createManualEntryMutation(data);
      } else {
        await createManualEntryMutation({
          ...data,
          workspaceType: "team",
        });
      }
    } catch (error) {
      console.error("Failed to create manual entry:", error);
      throw error;
    }
  };

  const editEntry = async (
    id: Id<"timeEntries">,
    updates: Partial<{
      startedAt: number;
      stoppedAt: number;
      seconds: number;
      note: string;
      category: string;
    }>
  ) => {
    try {
      if (currentWorkspace === "personal") {
        await editEntryMutation({ id, ...updates });
      } else {
        await editEntryMutation({ 
          id, 
          ...updates,
          workspaceType: "team",
        });
      }
    } catch (error) {
      console.error("Failed to edit entry:", error);
      throw error;
    }
  };

  const deleteEntry = async (id: Id<"timeEntries">) => {
    try {
      if (currentWorkspace === "personal") {
        await deleteEntryMutation({ id });
      } else {
        await deleteEntryMutation({ 
          id,
          workspaceType: "team",
        });
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      throw error;
    }
  };

  return {
    entries: results ?? [],
    isLoading: !isReady || status === "LoadingFirstPage",
    error: null, // Convex handles errors internally
    currentWorkspace,
    loadMore,
    status,
    createManualEntry,
    editEntry,
    deleteEntry,
  };
}
