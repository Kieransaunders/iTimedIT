import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export type MembershipWithOrganization = {
  membership: Doc<"memberships">;
  organization: Doc<"organizations"> | null;
};

export type OrganizationContextValue = {
  activeMembershipId: Id<"memberships"> | null;
  activeOrganization: Doc<"organizations"> | null;
  memberships: MembershipWithOrganization[];
  switchOrganization: (organizationId: Id<"organizations">) => Promise<void>;
  isReady: boolean;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

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
  const ensuringRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setEnsuredForUser(null);
      ensuringRef.current = false;
      return;
    }

    if (ensuredForUser === userId || ensuringRef.current) {
      return;
    }

    ensuringRef.current = true;
    void ensureWorkspace({}).finally(() => {
      ensuringRef.current = false;
      setEnsuredForUser(userId);
    });
  }, [userId, ensuredForUser, ensureWorkspace]);

  const currentMembership = useQuery(api.organizations.currentMembership);
  const memberships = useQuery(api.organizations.listMemberships);

  const isLoading =
    currentMembership === undefined || memberships === undefined || ensuringRef.current;

  const value = useMemo<OrganizationContextValue>(() => {
    return {
      activeMembershipId: currentMembership?.membershipId ?? null,
      activeOrganization: currentMembership?.organization ?? null,
      memberships: memberships ?? [],
      switchOrganization: async (organizationId: Id<"organizations">) => {
        await setActiveOrganization({ organizationId });
      },
      isReady: !isLoading,
    };
  }, [currentMembership, isLoading, memberships, setActiveOrganization]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
