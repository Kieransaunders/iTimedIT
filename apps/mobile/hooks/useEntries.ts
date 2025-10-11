import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

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
  // Use paginated query for entries
  const { results, status, loadMore } = usePaginatedQuery(
    api.entries.list,
    { projectId },
    { initialNumItems: 20 }
  );

  // Mutations
  const createManualEntryMutation = useMutation(api.entries.createManualEntry);
  const editEntryMutation = useMutation(api.entries.edit);
  const deleteEntryMutation = useMutation(api.entries.deleteEntry);

  const createManualEntry = async (data: ManualEntryData) => {
    try {
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
      await editEntryMutation({ id, ...updates });
    } catch (error) {
      console.error("Failed to edit entry:", error);
      throw error;
    }
  };

  const deleteEntry = async (id: Id<"timeEntries">) => {
    try {
      await deleteEntryMutation({ id });
    } catch (error) {
      console.error("Failed to delete entry:", error);
      throw error;
    }
  };

  return {
    entries: results ?? [],
    isLoading: status === "LoadingFirstPage",
    error: null, // Convex handles errors internally
    loadMore,
    status,
    createManualEntry,
    editEntry,
    deleteEntry,
  };
}
