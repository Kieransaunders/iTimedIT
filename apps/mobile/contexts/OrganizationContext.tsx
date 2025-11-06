import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { storage } from "@/services/storage";
import { Alert } from "react-native";
import { ToastManager } from "@/utils/toast";

export type MembershipWithOrganization = {
  membership: Doc<"memberships">;
  organization: Doc<"organizations"> | null;
};

export type OrganizationContextValue = {
  activeMembershipId: Id<"memberships"> | null;
  activeOrganization: Doc<"organizations"> | null;
  activeRole: Doc<"memberships">["role"] | null;
  memberships: MembershipWithOrganization[];
  currentWorkspace: "personal" | "work";
  switchOrganization: (organizationId: Id<"organizations">) => Promise<void>;
  switchWorkspace: (workspace: "personal" | "work") => void;
  isReady: boolean;
  error: string | null;
  hasPermissionError: boolean;
  isLoading: boolean;
  isSwitchingOrganization: boolean;
  isSwitchingWorkspace: boolean;
  retryInitialization: () => void;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const WORKSPACE_TYPE_KEY = "workspace_type";

export function OrganizationProvider({
  userId,
  children,
}: {
  userId: Id<"users"> | null;
  children: ReactNode;
}) {
  const ensureWorkspace = useMutation(api.organizations.ensurePersonalWorkspace);
  const setActiveOrganization = useMutation(api.organizations.setActiveOrganization);

  const [ensuredForUser, setEnsuredForUser] = useState<Id<"users"> | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<"personal" | "work" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [optimisticWorkspace, setOptimisticWorkspace] = useState<"personal" | "work" | null>(null);
  const [optimisticOrganization, setOptimisticOrganization] = useState<Doc<"organizations"> | null>(null);
  const ensuringRef = useRef(false);
  const hasSetDefaultRef = useRef(false);

  const currentMembership = useQuery(api.organizations.currentMembership);
  const memberships = useQuery(api.organizations.listMemberships);

  // Load workspace preference from storage on mount (with migration from "team" to "work")
  useEffect(() => {
    const loadWorkspacePreference = async () => {
      try {
        const savedWorkspace = await storage.getItem(WORKSPACE_TYPE_KEY);
        if (savedWorkspace === "personal" || savedWorkspace === "work") {
          setCurrentWorkspace(savedWorkspace);
        } else if (savedWorkspace === "team") {
          // Migrate legacy "team" to "work"
          setCurrentWorkspace("work");
          await storage.setItem(WORKSPACE_TYPE_KEY, "work");
        }
      } catch (error) {
        console.error("Failed to load workspace preference:", error);
        setError("Failed to load workspace preferences");
      }
    };

    loadWorkspacePreference();
  }, []);

  // Auto-select workspace if no preference is set - prefer Work over Personal
  useEffect(() => {
    if (currentWorkspace === null && memberships && memberships.length > 0 && !hasSetDefaultRef.current) {
      hasSetDefaultRef.current = true;

      // Prefer Work workspace over Personal
      const workMembership = memberships.find(
        m => m.organization?.workspaceType === "work" ||
            (m.organization?.workspaceType === undefined && !m.organization?.isPersonalWorkspace)
      );

      const defaultWorkspace = workMembership ? "work" : "personal";

      setCurrentWorkspace(defaultWorkspace);
      storage.setItem(WORKSPACE_TYPE_KEY, defaultWorkspace).catch(console.error);
    }
  }, [currentWorkspace, memberships]);

  // Ensure workspace exists when user changes
  useEffect(() => {
    if (!userId) {
      setEnsuredForUser(null);
      setError(null);
      setHasPermissionError(false);
      ensuringRef.current = false;
      return;
    }

    if (ensuredForUser === userId || ensuringRef.current) {
      return;
    }

    ensuringRef.current = true;
    setError(null);
    setHasPermissionError(false);

    ensureWorkspace({})
      .then(() => {
        setEnsuredForUser(userId);
        setError(null);
        setRetryCount(0);
      })
      .catch((error) => {
        console.error("Failed to ensure workspace:", error);
        const errorMessage = error?.message || "Failed to initialize workspace";
        
        // Check for permission-related errors
        if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
          setHasPermissionError(true);
          setError("You don't have permission to access this workspace");
          // Fall back to personal workspace
          setCurrentWorkspace("personal");
        } else {
          setError(errorMessage);
        }
      })
      .finally(() => {
        ensuringRef.current = false;
      });
  }, [userId, ensuredForUser, ensureWorkspace, retryCount]);

  const isLoading =
    currentMembership === undefined || memberships === undefined || ensuringRef.current || currentWorkspace === null;

  // Switch workspace function with optimistic updates
  const switchWorkspace = async (workspace: "personal" | "work") => {
    setIsSwitchingWorkspace(true);
    setOptimisticWorkspace(workspace); // Optimistic update

    try {
      setCurrentWorkspace(workspace);
      await storage.setItem(WORKSPACE_TYPE_KEY, workspace);
      setError(null);
      setHasPermissionError(false);

      // Show success toast
      ToastManager.workspaceSuccess(workspace, "Data will refresh automatically.");
    } catch (error) {
      console.error("Failed to save workspace preference:", error);
      setError("Failed to save workspace preference");
      ToastManager.workspaceError(workspace, "Failed to save preference");

      // Revert optimistic update on error
      setOptimisticWorkspace(null);
    } finally {
      setIsSwitchingWorkspace(false);
      // Clear optimistic state after transition
      setTimeout(() => setOptimisticWorkspace(null), 500);
    }
  };

  // Retry initialization function
  const retryInitialization = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setHasPermissionError(false);
  };

  const value = useMemo<OrganizationContextValue>(() => {
    // Use optimistic values during transitions for smoother UX
    const displayWorkspace = optimisticWorkspace || currentWorkspace || "work"; // Fallback to "work"
    const displayOrganization = optimisticOrganization || currentMembership?.organization || null;

    return {
      activeMembershipId: currentMembership?.membershipId ?? null,
      activeOrganization: displayOrganization,
      activeRole: currentMembership?.role ?? null,
      memberships: memberships ?? [],
      currentWorkspace: displayWorkspace as "personal" | "work",
      switchOrganization: async (organizationId: Id<"organizations">) => {
        setIsSwitchingOrganization(true);
        
        // Find the target organization for optimistic update
        const targetOrganization = memberships?.find(
          m => m.organization?._id === organizationId
        )?.organization;
        
        if (targetOrganization) {
          setOptimisticOrganization(targetOrganization); // Optimistic update
        }
        
        try {
          const orgName = targetOrganization?.name || "organization";

          await setActiveOrganization({ organizationId });
          setError(null);
          setHasPermissionError(false);
          
          // Show success toast
          ToastManager.organizationSuccess(orgName);
        } catch (error: any) {
          console.error("Failed to switch organization:", error);
          const errorMessage = error?.message || "Failed to switch organization";
          
          const orgName = targetOrganization?.name || "organization";
          
          if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
            setHasPermissionError(true);
            setError("You don't have permission to access this organization");
            ToastManager.organizationError(orgName, "Permission denied");
          } else {
            setError(errorMessage);
            ToastManager.organizationError(orgName, errorMessage);
          }
          
          // Revert optimistic update on error
          setOptimisticOrganization(null);
          throw error;
        } finally {
          setIsSwitchingOrganization(false);
          // Clear optimistic state after transition
          setTimeout(() => setOptimisticOrganization(null), 500);
        }
      },
      switchWorkspace,
      isReady: !isLoading,
      error,
      hasPermissionError,
      isLoading,
      isSwitchingOrganization,
      isSwitchingWorkspace,
      retryInitialization,
    };
  }, [
    currentMembership,
    isLoading,
    memberships,
    setActiveOrganization,
    currentWorkspace,
    optimisticWorkspace,
    optimisticOrganization,
    switchWorkspace,
    error,
    hasPermissionError,
    isLoading,
    isSwitchingOrganization,
    isSwitchingWorkspace,
    retryInitialization,
  ]);

  return (
    <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    // Provide more helpful error message to debug startup crashes
    throw new Error(
      "useOrganization must be used within an OrganizationProvider. " +
      "This error typically occurs when:\n" +
      "1. A component using useOrganization is rendered outside the provider\n" +
      "2. The provider hasn't finished initialization\n" +
      "3. There's a circular dependency in component imports"
    );
  }
  return context;
}