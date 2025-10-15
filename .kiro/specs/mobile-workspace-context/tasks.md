# Implementation Plan

- [x] 1. Create organization context infrastructure
  - Create OrganizationContext provider with workspace management
  - Integrate context provider into app layout
  - Implement workspace initialization and switching logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Create OrganizationContext provider
  - Write OrganizationContext.tsx with state management for memberships and workspace switching
  - Implement hooks for organization queries and mutations
  - Add workspace type state management (personal vs team)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Integrate context provider into app layout
  - Modify app/_layout.tsx to wrap app with OrganizationProvider
  - Ensure proper initialization order with authentication
  - Handle loading states during organization context setup
  - _Requirements: 1.1, 1.4_

- [x] 1.3 Implement workspace switching logic
  - Add switchWorkspace function to context
  - Implement organization switching with setActiveOrganization mutation
  - Handle workspace state persistence in secure storage
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

- [x] 2. Update hooks to use dynamic workspace context
  - Modify useProjects hook to respect current workspace context
  - Update useTimer hook to handle both personal and team workspaces
  - Update useClients and useEntries hooks for workspace awareness
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 2.1 Update useProjects hook for workspace context
  - Modify useProjects to get workspace context from OrganizationContext
  - Implement dynamic API endpoint selection based on workspace type
  - Add workspace type to return interface
  - Handle workspace switching with data refresh
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2.2 Update useTimer hook for workspace context
  - Modify useTimer to use current workspace context for all timer operations
  - Update timer start/stop/heartbeat to use correct workspace context
  - Handle workspace switching during active timer sessions
  - Add workspace type to timer return interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.3 Update useClients hook for workspace context
  - Modify useClients to respect current workspace context
  - Implement dynamic client fetching based on workspace type
  - Handle client creation in correct workspace context
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2.4 Update useEntries hook for workspace context
  - Modify useEntries to fetch entries from correct workspace context
  - Handle entry creation and updates in proper workspace
  - Add workspace filtering for time entries
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Create workspace switcher and companion app UI components
  - Create WorkspaceSwitcher component for personal/team toggle
  - Create OrganizationSelector component for organization switching
  - Create companion app UI components for web app integration
  - Implement mobile-friendly interface with proper touch targets
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.1 Create WorkspaceSwitcher component
  - Write WorkspaceSwitcher.tsx with toggle interface for personal/team
  - Implement mobile-friendly styling with react-native-unistyles
  - Add proper accessibility labels and touch targets
  - Handle workspace switching with loading states
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.2 Create OrganizationSelector component
  - Write OrganizationSelector.tsx with organization list and selection
  - Implement modal or dropdown interface for organization switching
  - Show current active organization with visual indicator
  - Handle organization switching with proper error handling
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 3.3 Create companion app UI components
  - Write EmptyStateCard component for when no projects/clients exist
  - Write WebAppPrompt component for directing users to web app
  - Implement web app deep linking functionality
  - Add contextual messaging for management tasks
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.4 Integrate workspace and companion components into navigation
  - Add WorkspaceSwitcher to main tab navigation or header
  - Add OrganizationSelector to settings or profile screen
  - Integrate EmptyStateCard into project and client screens
  - Add WebAppPrompt to relevant management screens
  - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.2, 7.3_

- [x] 4. Implement comprehensive error handling
  - Add error handling for workspace context failures
  - Implement retry logic for network errors
  - Add user-friendly error messages and recovery options
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [x] 4.1 Add workspace context error handling
  - Implement error boundaries for organization context failures
  - Add fallback to personal workspace when organization context fails
  - Show clear error messages for workspace permission issues
  - _Requirements: 7.1, 7.2_

- [x] 4.2 Implement network error handling
  - Add retry logic with exponential backoff for failed API calls
  - Show network error states with retry buttons
  - Handle offline scenarios gracefully
  - _Requirements: 7.3, 7.4_

- [x] 4.3 Add user feedback for workspace operations
  - Show loading states during workspace switching
  - Display success/error toasts for workspace changes
  - Add confirmation dialogs for destructive workspace operations
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Add workspace indicators and companion app polish
  - Add workspace type indicators to relevant screens
  - Implement smooth transitions for workspace switching
  - Add companion app messaging and web app integration
  - Add workspace context to screen headers and navigation
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5.1 Add workspace indicators to screens
  - Show current workspace type in project lists
  - Add workspace badges to timer screen
  - Display organization name in relevant contexts
  - _Requirements: 5.1, 5.2_

- [x] 5.2 Implement smooth workspace transitions
  - Add loading states during workspace data refresh
  - Implement optimistic updates for workspace switching
  - Add smooth animations for workspace UI changes
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.3 Implement companion app messaging and web app integration
  - Add contextual messages directing users to web app for management tasks
  - Implement web app deep linking with proper URL construction
  - Add empty state messaging for projects and clients
  - Create user-friendly guidance for timer-focused mobile experience
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 5.4 Write integration tests for workspace functionality
  - Create tests for workspace switching flows
  - Test timer operations across different workspace contexts
  - Verify project and client data isolation between workspaces
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 6. Final integration and testing
  - Test complete workspace switching flows
  - Verify timer functionality in both workspace contexts
  - Ensure data isolation between personal and team workspaces
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 6.1 Test workspace switching flows
  - Verify switching between personal and team workspaces works correctly
  - Test organization switching with multiple memberships
  - Ensure workspace state persists across app restarts
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

- [x] 6.2 Verify timer functionality across workspaces
  - Test timer start/stop in personal workspace
  - Test timer start/stop in team workspace
  - Verify timer data is created in correct workspace context
  - Test workspace switching during active timer sessions
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.3 Ensure data isolation between workspaces
  - Verify personal projects don't appear in team workspace
  - Verify team projects don't appear in personal workspace
  - Test client and entry data isolation
  - Confirm workspace switching refreshes data correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
