import { useQuery, useMutation } from "convex/react";
import { useMemo } from "react";
import { api } from "../convex/_generated/api";
import { Client } from "../types/models";
import { Id } from "../convex/_generated/dataModel";
import { useOrganization } from "../contexts/OrganizationContext";

export interface UseClientsOptions {
  // No longer need workspaceType option as it comes from context
}

export interface UseClientsReturn {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  currentWorkspace: "personal" | "work";
  createClient: (params: {
    name: string;
    color?: string;
    note?: string;
  }) => Promise<Id<"clients">>;
}

/**
 * Hook to fetch and manage clients
 */
export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { currentWorkspace, isReady } = useOrganization();

  // Fetch clients based on current workspace context
  const clientsData = useQuery(
    currentWorkspace === "personal" ? api.personalClients.listPersonal : api.clients.list,
    isReady
      ? currentWorkspace === "personal"
        ? {}
        : { workspaceType: "work" }
      : "skip"
  );

  const createClientMutation = useMutation(
    currentWorkspace === "personal" ? api.personalClients.createPersonal : api.clients.create
  );

  // Determine loading state - wait for organization context to be ready
  const isLoading = !isReady || clientsData === undefined;

  // Handle error state
  const error = null;

  // Get all clients
  const clients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData as Client[];
  }, [clientsData]);

  const createClient = async (params: {
    name: string;
    color?: string;
    note?: string;
  }) => {
    if (currentWorkspace === "personal") {
      // Personal clients don't need workspaceType parameter
      return await createClientMutation({
        name: params.name,
        color: params.color,
        note: params.note,
      });
    } else {
      // Team clients need workspaceType parameter
      return await createClientMutation({
        name: params.name,
        color: params.color,
        note: params.note,
        workspaceType: "work",
      });
    }
  };

  return {
    clients,
    isLoading,
    error,
    currentWorkspace,
    createClient,
  };
}
