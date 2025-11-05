import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { storage, STORAGE_KEYS } from "../services/storage";

interface OrganizationContextType {
  currentOrganizationId: Id<"organizations"> | null;
  setCurrentOrganizationId: (id: Id<"organizations">) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  userId: Id<"users"> | null;
  children: React.ReactNode;
}

export function OrganizationProvider({
  userId,
  children,
}: OrganizationProviderProps) {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<Id<"organizations"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's organization memberships
  const memberships = useQuery(
    api.organizations.listMemberships,
    userId ? {} : "skip"
  );

  // Initialize organization on first load
  useEffect(() => {
    const initializeOrganization = async () => {
      if (!userId || !memberships) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to restore previously selected workspace
        const savedOrgId = await storage.getItem(STORAGE_KEYS.SELECTED_WORKSPACE);

        if (savedOrgId && memberships.some((m) => m.organizationId === savedOrgId)) {
          setCurrentOrganizationId(savedOrgId as Id<"organizations">);
        } else if (memberships.length > 0) {
          // Default to first organization (usually Personal Workspace)
          setCurrentOrganizationId(memberships[0].organizationId);
        }
      } catch (error) {
        console.error("Error initializing organization:", error);
        if (memberships.length > 0) {
          setCurrentOrganizationId(memberships[0].organizationId);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeOrganization();
  }, [userId, memberships]);

  // Save workspace selection
  const handleSetOrganization = async (id: Id<"organizations">) => {
    setCurrentOrganizationId(id);
    try {
      await storage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, id);
    } catch (error) {
      console.error("Error saving workspace selection:", error);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganizationId,
        setCurrentOrganizationId: handleSetOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
