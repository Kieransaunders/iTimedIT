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
  currentWorkspace: "personal" | "work";
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
      ? { projectId } // Don't pass workspaceType - backend uses org context
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
      // Backend uses org context, no workspaceType needed
      await createManualEntryMutation(data);
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
      // Backend uses org context, no workspaceType needed
      await editEntryMutation({ id, ...updates });
    } catch (error) {
      console.error("Failed to edit entry:", error);
      throw error;
    }
  };

  const deleteEntry = async (id: Id<"timeEntries">) => {
    try {
      // Backend uses org context, no workspaceType needed
      await deleteEntryMutation({ id });
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
