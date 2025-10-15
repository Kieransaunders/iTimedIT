# Design Document

## Overview

This design implements proper workspace context management for the mobile app to match the web app's functionality. The mobile app currently shares the same Convex backend via a symlink but lacks the organization context handling that allows users to switch between personal and team workspaces seamlessly.

The solution involves creating a mobile-specific organization context provider, updating all hooks to use dynamic workspace context, and implementing a workspace switcher UI component.

## Architecture

### Current State
- Mobile app shares Convex backend with web app via symlink (`apps/mobile/convex -> ../web/convex`)
- Mobile hooks are hardcoded to use "personal" workspace type
- No organization context management exists in mobile app
- Timer and project operations fail due to workspace context mismatches

### Target State
- Mobile app will have an `OrganizationProvider` similar to web app
- All hooks will dynamically determine workspace context
- Users can switch between organizations and workspace types
- Timer operations will work correctly in both personal and team contexts

## Components and Interfaces

### 1. Organization Context Provider

**File:** `apps/mobile/contexts/OrganizationContext.tsx`

```typescript
export type OrganizationContextValue = {
  activeMembershipId: Id<"memberships"> | null;
  activeOrganization: Doc<"organizations"> | null;
  activeRole: Doc<"memberships">["role"] | null;
  memberships: MembershipWithOrganization[];
  currentWorkspace: "personal" | "team";
  switchOrganization: (organizationId: Id<"organizations">) => Promise<void>;
  switchWorkspace: (workspace: "personal" | "team") => void;
  isReady: boolean;
};
```

**Key Features:**
- Manages current organization membership
- Handles workspace type switching (personal vs team)
- Provides organization switching functionality
- Ensures workspace initialization on authentication

### 2. Updated Hook Interfaces

**useProjects Hook:**
```typescript
export interface UseProjectsReturn {
  projects: Project[];
  recentProjects: Project[];
  isLoading: boolean;
  error: Error | null;
  currentWorkspace: "personal" | "team";
  createProject: (params: CreateProjectParams) => Promise<Id<"projects">>;
}
```

**useTimer Hook:**
```typescript
export interface UseTimerReturn {
  runningTimer: RunningTimer | null;
  elapsedTime: number;
  currentWorkspace: "personal" | "team";
  // ... existing properties
}
```

### 3. Workspace Switcher Component

**File:** `apps/mobile/components/WorkspaceSwitcher.tsx`

```typescript
export interface WorkspaceSwitcherProps {
  currentWorkspace: "personal" | "team";
  onWorkspaceChange: (workspace: "personal" | "team") => void;
  style?: StyleProp<ViewStyle>;
}
```

**Features:**
- Toggle between Personal and Team workspaces
- Visual indicator for current workspace
- Consistent styling with mobile app theme

### 4. Organization Selector Component

**File:** `apps/mobile/components/OrganizationSelector.tsx`

```typescript
export interface OrganizationSelectorProps {
  memberships: MembershipWithOrganization[];
  activeOrganization: Doc<"organizations"> | null;
  onOrganizationChange: (organizationId: Id<"organizations">) => Promise<void>;
}
```

**Features:**
- Lists all user's organization memberships
- Shows current active organization
- Allows switching between organizations
- Modal or dropdown interface for selection

### 5. Companion App UI Components

**File:** `apps/mobile/components/EmptyStateCard.tsx`

```typescript
export interface EmptyStateCardProps {
  title: string;
  description: string;
  actionText: string;
  onActionPress: () => void;
  icon?: React.ReactNode;
}
```

**Features:**
- Displays helpful empty states when no projects/clients exist
- Provides clear call-to-action buttons to open web app
- Consistent styling with mobile app theme
- Contextual messaging for different empty states

**File:** `apps/mobile/components/WebAppPrompt.tsx`

```typescript
export interface WebAppPromptProps {
  message: string;
  actionText: string;
  onOpenWebApp: () => void;
  variant?: "info" | "warning" | "success";
}
```

**Features:**
- Shows contextual prompts to use web app for management tasks
- Opens web app in device browser with proper deep linking
- Different visual styles for different message types
- Dismissible prompts with user preference storage

## Data Models

### Workspace Context State
```typescript
type WorkspaceContextState = {
  organizationId: Id<"organizations"> | undefined;
  workspaceType: "personal" | "team";
  isPersonalWorkspace: boolean;
};
```

### Hook Context Parameters
```typescript
type HookContextParams = {
  workspaceType?: "personal" | "team";
  organizationId?: Id<"organizations">;
};
```

## Error Handling

### 1. Workspace Context Errors
- **Missing Organization:** Auto-create Personal Workspace using `ensurePersonalWorkspace`
- **Invalid Organization:** Fall back to Personal Workspace
- **Permission Errors:** Show clear error messages with suggested actions

### 2. API Call Errors
- **Workspace Mismatch:** Retry with correct workspace context
- **Network Errors:** Show retry options with exponential backoff
- **Authentication Errors:** Redirect to sign-in flow

### 3. State Synchronization Errors
- **Stale Data:** Automatically refresh workspace-dependent data on context changes
- **Concurrent Updates:** Use optimistic updates with rollback on failure

## Testing Strategy

### 1. Unit Tests
- Organization context provider state management
- Hook workspace context switching
- Error handling scenarios
- Component rendering with different workspace states

### 2. Integration Tests
- End-to-end workspace switching flows
- Timer operations across workspace contexts
- Project creation and management in different workspaces
- Organization membership changes

### 3. User Acceptance Tests
- User can switch between personal and team workspaces
- Projects show correctly based on workspace context
- Timer works in both workspace types
- Organization switching preserves user session

## Implementation Flow

### Phase 1: Context Infrastructure
1. Create `OrganizationContext` provider
2. Integrate provider into app layout
3. Ensure workspace initialization on authentication

### Phase 2: Hook Updates
1. Update `useProjects` to use dynamic workspace context
2. Update `useTimer` to handle both personal and team contexts
3. Update `useClients` and `useEntries` hooks
4. Add workspace context to all relevant hooks

### Phase 3: UI Components
1. Create `WorkspaceSwitcher` component
2. Create `OrganizationSelector` component
3. Integrate components into main navigation
4. Add workspace indicators to relevant screens

### Phase 4: Error Handling & Polish
1. Implement comprehensive error handling
2. Add loading states for workspace operations
3. Optimize performance for workspace switching
4. Add user feedback for workspace changes

## Technical Considerations

### 1. Performance
- Cache organization memberships to avoid repeated queries
- Use React.memo for workspace-dependent components
- Implement optimistic updates for workspace switching

### 2. State Management
- Use React Context for organization state
- Persist workspace preferences in secure storage
- Handle state cleanup on logout

### 3. Backward Compatibility
- Maintain existing API interfaces where possible
- Graceful fallback to personal workspace for legacy data
- Support migration of existing user data

### 4. Mobile-Specific Considerations
- Touch-friendly workspace switcher interface
- Proper keyboard navigation support
- Responsive design for different screen sizes
- Native-feeling animations for workspace transitions