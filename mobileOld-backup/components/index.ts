// Workspace and Organization Components
export { WorkspaceSwitcher } from "./WorkspaceSwitcher";
export { OrganizationSelector } from "./OrganizationSelector";
export { WorkspaceIndicator } from "./common/WorkspaceIndicator";
export { WorkspaceBadge } from "./common/WorkspaceBadge";
export { WorkspaceTransitionOverlay } from "./common/WorkspaceTransitionOverlay";

// Companion App UI Components
export { EmptyStateCard } from "./EmptyStateCard";
export { WebAppPrompt, openWebApp, createWebAppLink } from "./WebAppPrompt";
export { CompanionAppGuidance, CompanionAppFooter } from "./common/CompanionAppGuidance";
// Note: WorkspaceEmptyState not exported to avoid require cycle
// Import directly from "./common/WorkspaceEmptyState" where needed

// Quick Actions & Creation
export { FloatingActionButton } from "./common/FloatingActionButton";
export { QuickActionMenu } from "./common/QuickActionMenu";
export { CreateProjectModal } from "./projects/CreateProjectModal";
export { CreateClientModal } from "./clients/CreateClientModal";

// Re-export existing UI components
export * from "./ui";