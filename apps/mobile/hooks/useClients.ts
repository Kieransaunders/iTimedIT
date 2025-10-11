import { useQuery, useMutation } from "convex/react";
import { useMemo } from "react";
import { api } from "../convex/_generated/api";
import { Client } from "../types/models";
import { Id } from "../convex/_generated/dataModel";

export interface UseClientsOptions {
  workspaceType?: "personal" | "team";
}

export interface UseClientsReturn {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  createClient: (params: {
    name: string;
    color?: string;
    note?: string;
    workspaceType?: "personal" | "team";
  }) => Promise<Id<"clients">>;
}

/**
 * Hook to fetch and manage clients
 */
export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { workspaceType } = options;

  // Fetch clients from Convex
  const clientsData = useQuery(api.clients.list, {
    workspaceType,
  });

  const createClientMutation = useMutation(api.clients.create);

  // Determine loading state
  const isLoading = clientsData === undefined;

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
    workspaceType?: "personal" | "team";
  }) => {
    return await createClientMutation({
      name: params.name,
      color: params.color,
      note: params.note,
      workspaceType: params.workspaceType || "team",
    });
  };

  return {
    clients,
    isLoading,
    error,
    createClient,
  };
}
