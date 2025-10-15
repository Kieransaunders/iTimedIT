// Workspace and Organization Components
export { WorkspaceSwitcher } from "./WorkspaceSwitcher";
export { OrganizationSelector } from "./OrganizationSelector";
export { WorkspaceIndicator } from "./common/WorkspaceIndicator";
export { WorkspaceBadge } from "./common/WorkspaceBadge";
export { WorkspaceTransitionOverlay } from "./common/WorkspaceTransitionOverlay";

// Companion App UI Components
export { EmptyStateCard } from "./EmptyStateCard";
export { WebAppPrompt, openWebApp, createWebAppLink } from "./WebAppPrompt";
export { CompanionAppGuidance } from "./common/CompanionAppGuidance";
// Note: WorkspaceEmptyState not exported to avoid require cycle
// Import directly from "./common/WorkspaceEmptyState" where needed

// Re-export existing UI components
export * from "./ui";