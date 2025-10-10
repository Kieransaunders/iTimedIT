# Multitenancy & Invitations Implementation

## Task Overview
- [ ] Introduce multi-organization data model and migrate existing data
- [ ] Enforce organization scoping and role-based access in Convex functions
- [x] Build invitation lifecycle (issue, resend, revoke, accept) with secure tokens
- [x] Extend frontend to manage organizations, members, and invitations
- [ ] Add tests and deployment steps for multitenant rollout

## Subtasks
### Data Model & Migration
- [x] Add `organizations`, `memberships`, `invitations` tables in `convex/schema.ts`
- [ ] Replace `ownerId` references with `organizationId` across domain tables
  - [x] Update `convex/schema.ts` definitions
  - [x] Update Convex modules (`clients.ts`, `projects.ts`, `timer.ts`, `interrupts.ts`, `entries.ts`)
  - [x] Update frontend data access to include organization context
    - [x] Trigger `organizations.ensurePersonalWorkspace` after authentication
    - [x] Provide active organization selector/state in React app
    - [x] Update queries/components to consume organization-scoped records
      - [x] TimerCard.tsx - Added organization context for project stats query
      - [x] ProjectPicker.tsx - Added organization readiness check for projects list
      - [x] ProjectsPage.tsx - Added context for both clients and projects queries
      - [x] ClientsPage.tsx - Added organization context for clients list
      - [x] RecentEntriesTable.tsx - Added context for entries query
- [ ] Write backfill script/mutations to create default org per user and migrate existing records
  - [x] Add `ensurePersonalWorkspace` mutation with legacy data patching

### Access Control & Services
- [x] Create helper to load caller membership and active org context
- [x] Enforce role permissions (owner/admin/member) in Convex queries/mutations
- [ ] Persist active organization selection per user

### Invitations & Membership
- [x] Implement invitation mutations (create/resend/revoke)
- [x] Generate secure acceptance tokens and optional HTTP route for deep links
- [x] Add mutation for accepting invites and creating membership

### Frontend Experience
- [x] Add organization selector and membership management UI
- [x] Build invitation form and pending invites list
- [x] Update data-fetching hooks/components to include org context

### Quality & Rollout
- [x] Cover new logic with unit/contract/integration tests
- [x] Document migration + ops steps for release
  - [x] MIGRATION_GUIDE.md - Comprehensive migration procedures and validation steps
  - [x] DEPLOYMENT_RUNBOOK.md - Operational deployment procedures and rollback plans
  - [x] TROUBLESHOOTING_GUIDE.md - Common issues and resolution procedures
  - [x] MONITORING_SETUP.md - Monitoring, alerting, and performance tracking setup
- [x] Validate with `npm run lint` and `npm run test`


# Multitenancy & Invitations Implementation

## Task Overview
- [ ] Introduce multi-organization data model and migrate existing data
- [ ] Enforce organization scoping and role-based access in Convex functions
- [x] Build invitation lifecycle (issue, resend, revoke, accept) with secure tokens
- [x] Extend frontend to manage organizations, members, and invitations
- [ ] Add tests and deployment steps for multitenant rollout

## Subtasks
### Data Model & Migration
- [x] Add `organizations`, `memberships`, `invitations` tables in `convex/schema.ts`
- [ ] Replace `ownerId` references with `organizationId` across domain tables
  - [x] Update `convex/schema.ts` definitions
  - [x] Update Convex modules (`clients.ts`, `projects.ts`, `timer.ts`, `interrupts.ts`, `entries.ts`)
  - [x] Update frontend data access to include organization context
    - [x] Trigger `organizations.ensurePersonalWorkspace` after authentication
    - [x] Provide active organization selector/state in React app
    - [x] Update queries/components to consume organization-scoped records
- [ ] Write backfill script/mutations to create default org per user and migrate existing records
  - [x] Add `ensurePersonalWorkspace` mutation with legacy data patching

### Access Control & Services
- [x] Create helper to load caller membership and active org context
- [x] Enforce role permissions (owner/admin/member) in Convex queries/mutations
- [ ] Persist active organization selection per user

### Invitations & Membership
- [x] Implement invitation mutations (create/resend/revoke)
- [x] Generate secure acceptance tokens and optional HTTP route for deep links
- [x] Add mutation for accepting invites and creating membership

### Frontend Experience
- [x] Add organization selector and membership management UI
- [x] Build invitation form and pending invites list
- [ ] Update data-fetching hooks/components to include org context

### Quality & Rollout
- [x] Cover new logic with unit/contract/integration tests
- [ ] Document migration + ops steps for release
- [ ] Validate with `npm run lint` and `npm run test`

## User Attention & Notifications (Out-of-focus and background) ✅
### Overview
- Deliver highly reliable attention capture when users are not looking at the screen or the browser/tab isn't in focus, using Web Push notifications with actionable buttons, app badging, subtle sounds/vibration, optional wake lock, and opt-in escalation to email/SMS/Slack.

### Subtasks
#### Web Push Notifications (Service Worker + VAPID) ✅
- [x] Generate VAPID keys and configure env
  - [x] Create and store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in environment (server and build).
  - [x] Document key generation and `.env` changes in `Install_Guide.md`.
- [x] Service worker
  - [x] Add `public/sw.js` to handle `push` and `notificationclick` with `requireInteraction: true`.
  - [x] Implement actions: `stop`, `snooze`, `switch` that focus/open the app and post a message to clients.
- [x] Client subscription
  - [x] Create `src/lib/push.ts` helper to register service worker and subscribe to push (using `VITE_VAPID_PUBLIC_KEY`).
  - [x] Initialize subscription on sign-in/first timer start (e.g., bootstrap component in `src/main.tsx` or `src/App.tsx`).
  - [x] Request permissions contextually with clear copy.
- [x] Convex data model and APIs
  - [x] Add `pushSubscriptions` table in `convex/schema.ts` with index `by_user`.
  - [x] Add mutation `users.savePushSubscription` to persist subscription.
  - [x] Add action `actions.sendTimerAlert` to send web push via `web-push`.
  - [x] Handle expired/invalid subscriptions cleanup.
- [x] Wire-up triggers
  - [x] Call `actions.sendTimerAlert` from `convex/timer.ts` on key events:
    - [x] Idle/interrupt detected.
    - [x] Timer exceeds planned/budgeted duration.
    - [x] Pomodoro work/break transitions.
  - [x] Optional: scheduled nudges via `convex/crons.ts`.

#### In-app Attention (when app is open but not focused) ✅
- [x] Badging
  - [x] Implement `src/lib/attention.ts` with `navigator.setAppBadge` and fallback to title blinking.
  - [x] Update components to set badge counts on pending actions/interrupts.
- [x] Sound & Vibration (opt-in)
  - [x] Add short, unobtrusive sound for critical alerts when page is visible.
  - [x] Use `navigator.vibrate` (mobile) for short pattern when permitted.
- [x] Wake Lock (opt-in)
  - [x] Add helpers to request/release screen wake lock during active timing sessions.
  - [x] Add UI toggle and default off.

#### Settings & Preferences ✅
- [x] UI
  - [x] Add "Notifications & Escalation" section in `src/components/Settings.tsx`.
  - [x] Toggles: Web push, sound, vibration, wake lock, email, SMS, Slack.
  - [x] Inputs: Quiet hours, escalation delay (e.g., 2 minutes), preferred channels.
- [x] Backend
  - [x] Add `notificationPrefs` table in Convex to store per-user settings.
  - [x] Enforce preferences in server actions (respect quiet hours and DND).
  - [x] Escalation: if notification unacknowledged after delay, trigger fallback channel(s).

#### Fallback Channels (opt-in) ✅
- [x] Email
  - [x] Integrate provider (e.g., SendGrid) action for alerts; include deep links back to app.
- [x] SMS
  - [x] Integrate provider (e.g., Twilio) action; rate-limit and include stop words help.
- [x] Slack/Discord
  - [x] Allow connecting a webhook; send concise alerts with action links.
- [x] Escalation Logic
  - [x] Implement per-user escalation rules and retry/backoff.

#### UX & Copy ✅
- [x] Contextual permission prompts: request notifications the first time a timer starts.
- [x] Notification content: include project/client name, clear primary verb (Stop/Switch).
- [x] Deep links/URLs for notification actions to open correct route.
- [x] Respect OS DND; surface quiet hours in UI.

#### Testing & QA ✅
- [x] Unit tests for Convex actions/mutations related to push and preferences.
- [x] Contract/integration tests for timer-triggered alerts (see `docs/notification-qa-matrix.md`).
- [x] Manual QA matrix:
  - [x] Chrome/Edge/Safari on macOS, Windows.
  - [x] Android Chrome.
  - [x] iOS/iPadOS as PWA (document limitations).
- [x] E2E test: receiving push, handling `notificationclick`, action routing (`docs/e2e-notification-scenario.md`).

#### Deployment ✅
- [x] Add VAPID keys to deployment environment (server functions).
- [x] Ensure service worker cache-busting on release (versioned `sw.js` or update flow).
- [x] Update `Install_Guide.md` with notification setup and platform limitations.

## Node.js Runtime Migration ⚠️
### Overview
- Migrate Convex Node.js actions from Node.js 18 to Node.js 20 before October 22, 2025 deadline.
- Ensure compatibility of `web-push` package and push notification functionality.

### Subtasks
#### Runtime Configuration ✅
- [x] Add explicit Node.js 20 configuration to Convex project
  - [x] Create or update `convex.json` with Node.js 20 runtime specification
  - [x] Test push notification functionality with Node.js 20
  - [x] Verify `web-push` package compatibility
  - [x] Test `convex/pushActions.ts` with Node.js 20 environment
  - [x] Validate all push notification features work correctly
- [x] Update documentation
  - [x] Document Node.js version requirement in project README
  - [x] Update deployment notes for Node.js 20 requirement

### Implementation Summary
Core notification system is complete with:
- VAPID key generation and configuration ✅
- Service worker with push notification handling ✅
- Client-side push subscription management ✅
- Convex data models for subscriptions and preferences ✅
- Timer interruption notifications ✅
- In-app attention features (badges, sound, vibration, wake lock) ✅
- Comprehensive settings UI ✅
- Quiet hours and DND support ✅

**Note**: Fallback channels (email/SMS/Slack), advanced UX improvements, comprehensive testing, and deployment optimizations remain as future enhancements.

## Development Environment Setup

- [x] Configure Vite proxy and Convex client for local authentication
  - [x] Add `server.proxy` configuration to `vite.config.ts` to redirect `/api` requests to `VITE_CONVEX_URL`.
  - [x] Modify `src/main.tsx` to conditionally use `/api` as the Convex client URL in development mode.
  - [x] Ensure `CONVEX_SITE_URL` in `.env` points to the Convex deployment URL (e.g., `https://your-deployment.convex.cloud`) for correct auth provider domain configuration.

## Personal vs Team Workspace Implementation

### Task Overview
- [ ] Implement personal vs team workspace functionality for projects and clients
- [ ] Add workspace type distinction while maintaining backward compatibility
- [ ] Create separate UI flows for personal and team project management

### Subtasks
#### Data Model Updates
- [ ] Update schema to add workspaceType field to projects and clients tables
  - [x] Add `workspaceType` field as optional union type ("personal" | "team")
  - [x] Add index for personal projects: `byOwnerPersonal` on `[ownerId, workspaceType]`
  - [x] Make `clientId` optional for personal projects
  - [ ] Test schema changes in development environment

#### Backend API Development
- [ ] Create personal projects API functions in new file
- [ ] Create personal clients API functions  
- [ ] Update existing projects API to handle workspace types
- [ ] Update existing clients API to handle workspace types

#### Frontend UI/UX Updates
- [ ] Add UI workspace switcher component
- [ ] Update ModernDashboard to support workspace filtering
- [ ] Update ProjectsPage to support workspace management
- [ ] Update ClientsPage to support workspace management

#### Testing & Validation
- [ ] Test implementation and verify backward compatibility
- [ ] Run lint and typecheck commands
- [ ] Validate existing functionality still works

## Client Area Enhancement Implementation

### Task Overview
- [ ] Transform basic client list into comprehensive client management and analytics hub
- [ ] Add detailed client analytics, performance metrics, and business intelligence features
- [ ] Enhance UX with filtering, search, sorting, and multiple view options

### Subtasks
#### Backend Analytics Enhancement
- [ ] Extend Convex clients query with detailed analytics data
  - [ ] Add comprehensive client metrics (project counts, time trends, revenue patterns)
  - [ ] Calculate client health scores and performance indicators
  - [ ] Include monthly/category breakdowns for trend analysis
- [ ] Create client analytics functions for detailed insights

#### Frontend Component Development  
- [ ] Create client analytics components and metrics cards
  - [ ] Client overview dashboard with KPI cards
  - [ ] Revenue and time trend charts
  - [ ] Client health indicators and status badges
- [ ] Implement enhanced client table with new columns and actions
  - [ ] Add status indicators, last activity, project counts
  - [ ] Quick action buttons for project creation
  - [ ] Bulk operations support

#### User Experience Improvements
- [ ] Add filtering, search and sorting capabilities
  - [ ] Filter by client status, revenue range, activity level
  - [ ] Search across client names and notes
  - [ ] Sort by revenue, activity, health score
- [ ] Create card view layout option for clients
  - [ ] Visual client cards with key metrics
  - [ ] Toggle between table and card views
- [ ] Add export and reporting functionality
  - [ ] Export client data to CSV/PDF
  - [ ] Generate client performance reports
  - [ ] Revenue and time summary exports

#### Testing & Validation
- [ ] Test all new features and analytics accuracy
- [ ] Verify existing functionality remains intact
- [ ] Run lint and typecheck commands

## Pomodoro Timer Improvements

### Current Issues

#### Problem 1: Timer Never Stops During Breaks
- **Current Behavior**: Pomodoro timer switches between "work" and "break" phases but never actually stops
- **Expected Behavior**: Timer should stop during breaks and require manual restart for next work session
- **Impact**: Causes confusing "long-running timer" notifications during breaks

#### Problem 2: Continuous Time Tracking During Breaks
- **Current Behavior**: Time entries continue accumulating during break periods
- **Expected Behavior**: Break time should not be tracked as billable work time
- **Impact**: Inflated time entries that include non-work periods

#### Problem 3: No Clear Break State in UI
- **Current Behavior**: Timer appears running during breaks with no visual distinction
- **Expected Behavior**: Clear indication when in break mode vs work mode
- **Impact**: User confusion about current timer state

### Proposed Improvements

#### 1. Auto-Stop Timer During Breaks
**Location**: `convex/timer.ts:456-490` (processPomodoroTransition)

**Changes Needed**:
- When work session ends: Stop the current timer and time entry
- Create a "break timer" state that doesn't track billable time
- When break ends: Prompt user to manually restart work timer

#### 2. Separate Break Timer System
**New Components Needed**:
- Break timer state in `runningTimers` schema
- Break-specific UI component showing countdown
- Break completion notifications

#### 3. Enhanced UI for Pomodoro States
**Location**: `src/components/ModernDashboard.tsx`

**Changes Needed**:
- Visual indicators for work vs break phases
- Break countdown timer display
- "Start next session" button after breaks
- Pomodoro cycle progress indicator

#### 4. Improved Time Entry Handling
**Changes Needed**:
- Stop billable time tracking during breaks
- Optional: Track break durations separately for analytics
- Ensure clean separation between work and break periods

### Implementation Plan

#### Phase 1: Backend Timer Logic
- [ ] Modify `processPomodoroTransition` to stop timers during breaks
- [ ] Create break timer state management
- [ ] Update time entry creation logic
- [ ] Add break completion handling

#### Phase 2: Frontend Updates
- [ ] Update ModernDashboard to show Pomodoro states
- [ ] Add break timer UI component
- [ ] Implement "start next session" workflow
- [ ] Add visual indicators for current phase

#### Phase 3: Notifications & Polish
- [ ] Improve break start/end notifications
- [ ] Add break completion sounds/alerts
- [ ] Update long-running timer logic to respect Pomodoro breaks
- [ ] Add Pomodoro cycle statistics

### Files to Modify

#### Backend
- `convex/timer.ts` - Core Pomodoro transition logic
- `convex/schema.ts` - Add break timer state fields
- `convex/crons.ts` - Update long-running timer detection

#### Frontend
- `src/components/ModernDashboard.tsx` - Main timer interface
- New: `src/components/PomodoroBreakTimer.tsx` - Break countdown component
- New: `src/components/PomodoroPhaseIndicator.tsx` - Phase visual indicator

### Success Criteria

1. ✅ Work timers automatically stop when break starts
2. ✅ Break periods are not tracked as billable time
3. ✅ Clear visual distinction between work/break phases
4. ✅ No false "long-running timer" notifications during breaks
5. ✅ User must manually start next work session after break
6. ✅ Proper time entry separation between work sessions

## Workspace Name Editing Feature

### Task Overview
- [ ] Enable organization owners to edit workspace names
- [ ] Replace hardcoded "Personal Workspace" with user-customizable names
- [ ] Add appropriate UI and backend functionality for workspace management

### Current State
- Personal workspaces are hardcoded as "Personal Workspace" in `convex/orgContext.ts:143`
- No existing `updateOrganization` mutation in `convex/organizations.ts`
- Settings UI only handles team member management, not organization details
- Users cannot currently change workspace names through any interface

### Subtasks

#### Backend API Development
- [ ] Create `updateOrganization` mutation in `convex/organizations.ts`
  - [ ] Add validation for organization name (min/max length, allowed characters)
  - [ ] Ensure only owners can update organization details
  - [ ] Handle organization name uniqueness if required
  - [ ] Add proper error handling and validation
- [ ] Update organization context helpers if needed
- [ ] Consider adding audit logging for organization name changes

#### Frontend UI Development
- [ ] Add organization name editing to Settings component
  - [ ] Create organization details section in `src/components/Settings.tsx`
  - [ ] Add input field for organization name with validation
  - [ ] Include save/cancel functionality
  - [ ] Show current organization name as default value
- [ ] Alternative: Extend `OrganizationManagementCard.tsx` 
  - [ ] Add organization name editing section above team members
  - [ ] Include inline editing or modal-based editing
- [ ] Add form validation and error handling on frontend
- [ ] Update organization name display throughout app

#### User Experience Enhancements
- [ ] Show organization name in page headers/navigation
- [ ] Update workspace switcher to show custom names
- [ ] Add confirmation dialog for organization name changes
- [ ] Show success/error toasts after name updates
- [ ] Consider character limits and validation feedback

#### Data Migration & Compatibility
- [ ] Handle existing "Personal Workspace" names gracefully
- [ ] Allow users to update from default name to custom name
- [ ] Ensure backward compatibility with existing organization structure
- [ ] Test with both personal and team workspaces

#### Validation & Testing
- [ ] Add input validation (length, special characters, etc.)
- [ ] Test organization name updates across all components
- [ ] Verify permission checking (only owners can edit)
- [ ] Test with various organization sizes and types
- [ ] Run `npm run lint` and `npm run typecheck`

### Implementation Plan

#### Phase 1: Backend Foundation
- [ ] Create `updateOrganization` mutation with proper validation
- [ ] Add role-based permission checking
- [ ] Test mutation with various input scenarios

#### Phase 2: Frontend Integration
- [ ] Add organization name editing UI to Settings
- [ ] Connect frontend to backend mutation
- [ ] Implement form validation and error handling

#### Phase 3: UX Polish
- [ ] Add success/error notifications
- [ ] Update organization name display throughout app
- [ ] Add confirmation dialogs where appropriate

### Files to Modify

#### Backend
- `convex/organizations.ts` - Add `updateOrganization` mutation
- `convex/orgContext.ts` - Potentially update organization creation logic

#### Frontend
- `src/components/Settings.tsx` - Add organization name editing section
- `src/components/OrganizationManagementCard.tsx` - Alternative location for editing UI
- `src/lib/organization-context.tsx` - Update context if needed for name changes

### Success Criteria

1. ✅ Organization owners can edit workspace names
2. ✅ Personal workspaces can be renamed from "Personal Workspace"
3. ✅ Team workspace names can be updated by owners
4. ✅ Proper validation prevents invalid organization names
5. ✅ Non-owners cannot edit organization names
6. ✅ Organization name changes are reflected throughout the app
7. ✅ Form validation provides clear feedback to users
8. ✅ Success/error notifications guide user experience

## Client Address Fields Implementation

### Task Overview
- [x] Add comprehensive address fields (street, city, country, post code) to Client management system
- [x] Update database schema, backend APIs, and frontend UI to support address information
- [x] Maintain backward compatibility with existing clients

### Subtasks

#### Database Schema Updates
- [x] Update `convex/schema.ts` to add address object to clients table
  - [x] Add `address` field as optional object with:
    - [x] `street: v.optional(v.string())`
    - [x] `city: v.optional(v.string())`
    - [x] `country: v.optional(v.string())`
    - [x] `postCode: v.optional(v.string())`
  - [x] Ensure all address fields are optional for backward compatibility

#### Backend API Updates
- [x] Update `convex/clients.ts` to handle address fields
  - [x] Modify `create` mutation to accept address fields
  - [x] Modify `update` mutation to handle address updates
  - [x] Ensure address fields are included in client queries and analytics
- [x] Update `convex/personalClients.ts` for personal workspace support
  - [x] Modify `createPersonal` mutation to accept address fields
  - [x] Modify `updatePersonal` mutation to handle address updates
  - [x] Ensure address fields are included in personal client queries

#### Frontend UI Development
- [x] Update `src/components/ClientsPage.tsx` client form
  - [x] Add address state variables (street, city, country, postCode)
  - [x] Add address input fields to creation/edit form after notes section
  - [x] Update form submission handlers to include address data
  - [x] Update form reset functions to clear address fields
  - [x] Populate address fields when editing existing clients
- [x] Ensure consistent styling with existing form fields
- [x] Add proper form validation for address fields
- [x] Update form styling to match clean white background design
- [x] Update address field placeholders to use UK examples

#### User Experience Enhancements
- [x] Group address fields in a logical section within the form
- [x] Use appropriate input types and validation patterns
- [x] Provide clear labels and helpful placeholder text
- [x] Support international address formats
- [x] Update placeholder text to use UK address format examples
- [ ] Consider auto-complete functionality for country selection

#### Country Dropdown Enhancement
- [x] Install shadcn/ui components for searchable select
  - [x] Run `npx shadcn@latest add command` for Command component
  - [x] Run `npx shadcn@latest add popover` for Popover component
  - [x] Verify component installation and imports
- [x] Create comprehensive country list data
  - [x] Add ISO 3166-1 standard country names list (195 countries)
  - [x] Store as constant in ClientsPage
  - [x] Sort alphabetically for easy navigation
- [x] Replace country text input with searchable Combobox
  - [x] Update `ClientsPage.tsx` lines 435-455
  - [x] Implement shadcn/ui Combobox with Command + Popover components
  - [x] Add search/filter functionality for typing country names
  - [x] Maintain existing `country` state variable
  - [x] Match styling with other form fields (dark mode, focus states)
  - [x] Ensure backward compatibility with existing client data
- [x] Test country dropdown functionality
  - [x] Verify dropdown opens and displays all countries
  - [x] Test search/filter functionality within dropdown (type to search)
  - [x] Test form submission with selected country
  - [x] Test both create and edit client workflows
  - [x] Verify dark mode styling
  - [x] Fix positioning issue with dropdown rendering

#### Data Migration & Compatibility
- [x] Ensure existing clients without address data continue to work
- [x] All address fields are optional to prevent breaking changes
- [x] Test with both team and personal workspace clients
- [x] Verify address data displays properly when present

#### Testing & Validation
- [x] Test client creation with complete address information
- [x] Test client creation with partial address information
- [x] Test client updates that modify address fields
- [x] Verify address fields display in client tables/cards
- [x] Test with both team and personal workspace contexts
- [x] Run `npm run lint` and `npm run typecheck`

### Implementation Plan

#### Phase 1: Schema & Backend Foundation
- [x] Update Convex schema with address object structure
- [x] Modify team client mutations (`convex/clients.ts`)
- [x] Modify personal client mutations (`convex/personalClients.ts`)
- [x] Test backend changes with sample data

#### Phase 2: Frontend Integration
- [x] Add address state management to ClientsPage
- [x] Create address input form section
- [x] Connect form to backend mutations
- [x] Implement form validation

#### Phase 3: UX Polish & Testing
- [x] Style address fields consistently with existing UI
- [x] Add helpful labels and placeholders
- [x] Update form background from pink to clean white design
- [x] Convert all label text colors to proper gray shades
- [x] Update address placeholders to UK format examples
- [x] Test across different scenarios and workspace types
- [x] Verify all functionality works as expected

### Files to Modify

#### Backend
- `convex/schema.ts` - Add address object to clients table definition
- `convex/clients.ts` - Update create/update mutations for team clients
- `convex/personalClients.ts` - Update create/update mutations for personal clients

#### Frontend
- `src/components/ClientsPage.tsx` - Add address form fields and state management

### Success Criteria

1. ✅ Clients can have complete address information (street, city, country, post code)
2. ✅ All address fields are optional and backward compatible
3. ✅ Both team and personal workspace clients support addresses
4. ✅ Address fields are properly validated and styled
5. ✅ Existing clients without addresses continue to function normally
6. ✅ Client creation and editing workflows include address management
7. ✅ Address information displays appropriately in client interfaces
8. ✅ Form validation provides clear feedback for address fields

## Settings Page Enhancements - Custom Intervals

### Task Overview
- [ ] Add custom interval/grace period options to interruption settings
- [ ] Change default interruption interval from 5 seconds to 45 minutes
- [ ] Enable users to define custom check intervals and auto-stop countdowns
- [ ] Maintain backward compatibility with existing preset options

### Current Issues
- Default interruption interval is set to 5 seconds (debugging value)
- Users cannot specify custom intervals outside preset options
- Grace period (auto-stop countdown) limited to preset values only
- Production deployment showing debug option "5 seconds" in dropdown

### Proposed Improvements

#### 1. Fix Default Interruption Interval
**Current**: Default is `0.0833` minutes (5 seconds) - debug value
**Target**: Change to `45` minutes (45 minutes) - production-appropriate default

**Changes Needed**:
- Update `convex/users.ts:32` and `:62` in `getUserSettings` query
- Update `convex/users.ts:116` in `ensureUserSettings` mutation
- Update `src/components/Settings.tsx:28` local state default

#### 2. Add Custom Interval Option
**Location**: `src/components/Settings.tsx:233-241` (intervalOptions)

**Changes Needed**:
- Remove "5 seconds" debug option from production
- Add "Custom" option to dropdown
- Options: 5min, 15min, 30min, 45min, 1hr, 2hr, Custom
- Show number input field when "Custom" selected
- Accept custom values: 1-480 minutes (1 min - 8 hours)

#### 3. Add Custom Grace Period Option
**Location**: `src/components/Settings.tsx:243-249` (gracePeriodOptions)

**Changes Needed**:
- Add "Custom" option to grace period dropdown
- Options: 5s, 10s, 30s, 60s, 120s, Custom
- Show number input field when "Custom" selected
- Accept custom values: 5-300 seconds (5 sec - 5 min)

#### 4. Update Database Schema
**Location**: `convex/schema.ts:166-182`

**Changes Needed**:
- Change `interruptInterval` from union of literals to `v.number()`
- Change `gracePeriod` from union of literals to `v.number()`
- Maintain backward compatibility with existing numeric values
- Add validation in mutations for min/max ranges

### Implementation Plan

#### Phase 1: Schema & Backend Updates
- [ ] Update `convex/schema.ts` to use `v.number()` for intervals
  - [ ] Change `interruptInterval` type to `v.number()`
  - [ ] Change `gracePeriod` type to `v.number()`
- [ ] Update `convex/users.ts` mutations and queries
  - [ ] Change default `interruptInterval` from `0.0833` to `45`
  - [ ] Update `updateSettings` mutation validation
  - [ ] Add min/max validation for custom values
  - [ ] Ensure backward compatibility

#### Phase 2: Frontend UI Development
- [ ] Update `src/components/Settings.tsx` dropdown options
  - [ ] Remove "5 seconds" debug option from interval dropdown
  - [ ] Add "Custom" option to both dropdowns
- [ ] Add custom input fields
  - [ ] Add state for custom interval value (minutes)
  - [ ] Add state for custom grace period value (seconds)
  - [ ] Add state to track dropdown selection vs custom
- [ ] Implement conditional rendering
  - [ ] Show custom interval input when "Custom" selected
  - [ ] Show custom grace period input when "Custom" selected
  - [ ] Hide custom inputs when preset values selected

#### Phase 3: Validation & UX Polish
- [ ] Add input validation
  - [ ] Check interval: 1-480 minutes range
  - [ ] Grace period: 5-300 seconds range
  - [ ] Show validation errors inline
  - [ ] Prevent invalid values from saving
- [ ] Update auto-save logic
  - [ ] Include custom value states in dependency array
  - [ ] Debounce custom input changes (1 second)
  - [ ] Show save status indicator
- [ ] Add helpful UI elements
  - [ ] Placeholder text with valid ranges
  - [ ] Helper text explaining custom options
  - [ ] Visual consistency with existing inputs

#### Phase 4: Testing & Validation
- [ ] Test with preset values to ensure backward compatibility
- [ ] Test custom interval values (edge cases, min/max)
- [ ] Test custom grace period values (edge cases, min/max)
- [ ] Test auto-save functionality with custom values
- [ ] Test dropdown switching between preset and custom
- [ ] Run `npm run lint` and type checking
- [ ] Test in development environment before deployment

### Files to Modify

#### Backend
- `convex/schema.ts` - Update interruptInterval and gracePeriod types
- `convex/users.ts` - Update defaults, validation, and mutation logic

#### Frontend
- `src/components/Settings.tsx` - Add custom input fields, dropdowns, validation

### Success Criteria

1. [ ] Default interruption interval is 45 minutes (not 5 seconds)
2. [ ] "5 seconds" debug option removed from production dropdown
3. [ ] Users can select "Custom" from both dropdowns
4. [ ] Custom interval input accepts 1-480 minutes
5. [ ] Custom grace period input accepts 5-300 seconds
6. [ ] Custom values are properly saved and persisted
7. [ ] Validation prevents out-of-range values
8. [ ] Auto-save works correctly with custom values
9. [ ] Existing users with preset values see no disruption
10. [ ] UI clearly indicates when custom values are in use
11. [ ] Form validation provides clear, helpful feedback
12. [ ] All changes are backward compatible with existing data

## Timer Visibility Enhancement - Browser Tab Indicators

### Task Overview
- [ ] Add visual indicators when users navigate away from the timer app
- [ ] Display running timer in browser tab title
- [ ] Show timer progress/countdown in favicon
- [ ] Enhance interrupt countdown visibility
- [ ] Ensure users can monitor timer without having app tab active

### Current Problem
When users navigate to a different browser tab or window, they have no way to see:
- That a timer is currently running
- How much time has elapsed
- Interrupt countdown warnings
- Whether they need to respond to an interruption prompt

This leads to:
- Missed interrupt prompts
- Uncertainty about timer status
- Need to constantly switch back to check timer
- Reduced productivity when multitasking

### Proposed Solutions

#### 1. Dynamic Browser Title Updates
**Description**: Update the browser tab title to show the running timer in real-time

**Current State**:
- `attention.ts` already has title blinking for alerts
- Title shows static "iTimedIT" when app is running
- No timer information displayed in tab title

**Proposed Changes**:
- Show format: `"⏱️ 1:23:45 - Project Name | iTimedIT"` when timer running
- Show format: `"⚠️ 0:58 Respond! - Project Name | iTimedIT"` during interrupt countdown
- Update every second while timer is active
- Reset to "iTimedIT" when tab is focused or timer stops
- Respect user visibility - only show timer when tab is not active

**Implementation Details**:
- Add `useEffect` in `ModernDashboard.tsx` to monitor timer state
- Update `document.title` based on timer/interrupt state
- Track page visibility with `document.visibilityState`
- Format time clearly for quick scanning in tab bar
- Include project name for context when multiple timers exist

#### 2. Dynamic Favicon with Timer Visualization
**Description**: Generate and update favicon dynamically to show timer progress or countdown

**Approaches**:
- **Option A: Numeric Display** - Show elapsed time digits (e.g., "12" for 12 minutes)
- **Option B: Progress Circle** - Draw circular progress indicator
- **Option C: Color Coding** - Change favicon color based on state (green=running, orange=warning, red=interrupt)
- **Recommended: Combination** - Use progress circle with color coding

**Implementation Details**:
- Create `src/lib/favicon.ts` utility module
- Use HTML5 Canvas to draw favicon dynamically
- Generate data URL and update `<link rel="icon">` element
- Update every 5-10 seconds to balance visibility and performance
- Show different visuals based on state:
  - **Normal Timer**: Green circular progress showing elapsed percentage
  - **Budget Warning**: Orange color when approaching budget limit
  - **Interrupt Countdown**: Red with countdown seconds displayed
  - **Paused/Stopped**: Gray or default favicon

**Canvas Drawing Logic**:
```typescript
function generateTimerFavicon(elapsed: number, total: number, state: 'normal' | 'warning' | 'interrupt') {
  // Create 32x32 canvas
  // Draw circular progress arc
  // Fill with appropriate color
  // Optionally overlay time digits
  // Convert to data URL
  // Update favicon link element
}
```

#### 3. Extended Web Notifications (Already Partially Implemented)
**Current State**:
- Push notifications work for interrupts
- Notification system in `src/lib/push.ts`
- Users already grant notification permission

**Possible Enhancements**:
- Optional periodic "timer running" reminders (every 15/30 minutes)
- Show current elapsed time in notification
- Configurable in Settings as opt-in feature

**Note**: May be too intrusive for most users - make this optional

#### 4. Browser Badge API Enhancement (Already Implemented)
**Current State**:
- `attention.ts` uses `setAppBadge()` for alert counts
- Badge API only works in installed PWAs
- Currently shows notification counts

**Proposed Enhancement**:
- Show elapsed minutes in badge when timer running: `setAppBadge(elapsedMinutes)`
- Show countdown seconds during interrupt: `setAppBadge(remainingSeconds)`
- Clear badge when timer stops
- Only active when app installed as PWA

**Limitation**: Badge API support is limited to PWA/installed apps on some platforms

### Recommended Implementation Approach

**Phase 1: Dynamic Title Updates** (Quick Win - High Value)
- Add title update logic to `ModernDashboard.tsx`
- Implement visibility detection to only show timer in inactive tabs
- Format title with emoji indicators for quick recognition
- Test across different browsers and tab states

**Phase 2: Dynamic Favicon** (Medium Effort - High Impact)
- Create favicon generation utility with Canvas
- Implement circular progress indicator
- Add color coding for different timer states
- Optimize update frequency for performance
- Test rendering across different browsers and OS themes

**Phase 3: Badge Enhancement** (Low Effort - Limited Reach)
- Extend existing badge API usage
- Show elapsed time for PWA users
- Document PWA installation benefits

**Phase 4: Optional Periodic Notifications** (Optional)
- Add settings toggle for periodic timer reminders
- Implement configurable reminder intervals
- Ensure notifications don't become annoying

### Implementation Plan

#### Phase 1: Browser Title Updates
- [ ] Add visibility change detection in `ModernDashboard.tsx`
  - [ ] Use `document.visibilityState` API
  - [ ] Track when tab becomes hidden/visible
- [ ] Implement title update logic
  - [ ] Create function to format timer title
  - [ ] Update title every second when timer running and tab hidden
  - [ ] Include project name in title
  - [ ] Add emoji indicators (⏱️ for timer, ⚠️ for interrupt)
- [ ] Handle interrupt countdown state
  - [ ] Show countdown seconds in title
  - [ ] Use urgent formatting for interrupt warnings
- [ ] Reset title on visibility change
  - [ ] Restore original title when tab becomes visible
  - [ ] Clear title updates when timer stops

#### Phase 2: Dynamic Favicon
- [ ] Create `src/lib/favicon.ts` utility module
  - [ ] Implement Canvas-based favicon generation
  - [ ] Create circular progress drawing function
  - [ ] Add color palette for different states
  - [ ] Generate data URL from canvas
- [ ] Implement favicon update system
  - [ ] Create function to update favicon link element
  - [ ] Cache previous favicon for restoration
  - [ ] Handle different favicon sizes (16x16, 32x32)
- [ ] Integrate with timer state
  - [ ] Update favicon based on elapsed time
  - [ ] Change colors for warning/interrupt states
  - [ ] Update every 5-10 seconds (balance visibility/performance)
- [ ] Test cross-browser compatibility
  - [ ] Chrome/Edge (Chromium)
  - [ ] Firefox
  - [ ] Safari
  - [ ] Test with light/dark OS themes

#### Phase 3: Badge API Enhancement
- [ ] Extend `src/lib/attention.ts` badge functions
  - [ ] Add `updateTimerBadge(elapsedMinutes)` function
  - [ ] Add interrupt countdown badge logic
- [ ] Integrate with `ModernDashboard.tsx`
  - [ ] Update badge every minute during timer
  - [ ] Clear badge when timer stops
  - [ ] Handle PWA detection

#### Phase 4: Settings & Configuration (Optional)
- [ ] Add settings for timer visibility features
  - [ ] Toggle for title updates
  - [ ] Toggle for favicon updates
  - [ ] Toggle for periodic notifications (if implemented)
  - [ ] Configure notification intervals
- [ ] Add performance optimizations
  - [ ] Throttle updates when system is under load
  - [ ] Pause updates when battery is low (Battery API)

### Files to Modify

#### Phase 1 (Title Updates)
- `src/components/ModernDashboard.tsx` - Add title update logic and visibility detection
- `src/lib/attention.ts` - Enhance title management functions

#### Phase 2 (Favicon)
- `src/lib/favicon.ts` - **NEW**: Canvas-based favicon generator utility
- `src/components/ModernDashboard.tsx` - Integrate favicon updates with timer state
- `public/favicon.ico` or `public/icon.png` - May need base favicon assets

#### Phase 3 (Badge)
- `src/lib/attention.ts` - Extend existing badge functions for timer display
- `src/components/ModernDashboard.tsx` - Add badge update calls

#### Phase 4 (Settings)
- `src/components/Settings.tsx` - Add toggles for visibility features
- `convex/schema.ts` - Add settings fields for new features
- `convex/users.ts` - Add settings mutations for new preferences

### Technical Considerations

#### Performance
- Title updates: Minimal overhead (~1ms per update)
- Favicon updates: More expensive due to Canvas operations
  - Limit updates to every 5-10 seconds
  - Use `requestAnimationFrame` for smooth updates
  - Consider pausing updates when system is throttled
- Badge updates: Minimal overhead, already implemented

#### Browser Compatibility
- **Title Updates**: Universal support across all browsers
- **Favicon Updates**:
  - Chrome/Edge: Full support
  - Firefox: Full support
  - Safari: Partial support (may not update reliably)
- **Badge API**: Limited to PWA/installed apps
- **Visibility API**: Universal support (use `document.visibilityState`)

#### Accessibility
- Ensure title updates don't interfere with screen readers
- Provide option to disable animations for reduced motion preferences
- Test with assistive technologies

#### Privacy & UX
- Only show timer in title when tab is NOT visible (respect privacy)
- Don't update favicon too frequently (avoid distraction)
- Provide settings to disable features if users find them distracting

### Success Criteria

1. [ ] Browser tab title shows running timer when tab is inactive
2. [ ] Tab title shows format: "⏱️ 1:23:45 - Project Name"
3. [ ] Tab title shows interrupt countdown: "⚠️ 0:58 Respond!"
4. [ ] Title resets to "iTimedIT" when tab becomes active
5. [ ] Title resets when timer stops
6. [ ] Favicon displays visual progress indicator
7. [ ] Favicon changes color during warning states (orange/red)
8. [ ] Favicon updates every 5-10 seconds without performance issues
9. [ ] Favicon resets to default when timer stops
10. [ ] Badge shows elapsed minutes for PWA users
11. [ ] All features work across Chrome, Firefox, Edge
12. [ ] Safari support documented (with known limitations)
13. [ ] Performance impact is minimal (<1% CPU usage)
14. [ ] Features can be toggled in Settings (optional)
15. [ ] No interference with existing notification system
16. [ ] Accessibility considerations addressed

### Future Enhancements

- [ ] Show multiple timers in title if multiple projects running
- [ ] Add favicon animation for timer transitions
- [ ] Integrate with OS notification center for persistent timer display
- [ ] Add browser extension for enhanced timer visibility
- [ ] Support for multiple monitors/displays
- [ ] Picture-in-Picture mode for timer display (if supported)

## UI/UX Improvements

### Dialog Transparency Fix ✅
**Issue**: Sound selection modal and other dialogs had transparent backgrounds, making text difficult to read against the dashboard background.

**Solution**: Updated `src/components/ui/dialog.tsx` to use solid background colors:
- Light mode: `bg-white` (solid white background)
- Dark mode: `dark:bg-gray-900` (solid dark gray background)

**Files Modified**:
- [x] `apps/web/src/components/ui/dialog.tsx` - Changed `bg-background` to explicit solid colors

**Status**: ✅ Completed
**Date**: 2025-10-10

### Sound Selection Modal Scrollability Fix ✅
**Issue**: Sound selection modal had a static height without scrolling, making some sound options inaccessible when the list exceeded the viewport height.

**Solution**: Made the sound list scrollable with the following improvements:
- Added `max-h-[80vh]` to limit modal height to 80% of viewport
- Added `overflow-y-auto` to enable vertical scrolling
- Added `flex flex-col` layout structure for proper scrolling behavior
- Improved text sizing and layout for better readability

**Files Modified**:
- [x] `apps/web/src/components/SoundSelectionModal.tsx` - Added scrolling support to sound list

**Status**: ✅ Completed
**Date**: 2025-10-10

### Sound Display Names Improvement ✅
**Issue**: Sound filenames were extremely long and technical (e.g., "a-soft-mechanical-click-followed-by-a-gentle-ding-reminiscent-of-an-old-typewriter-bell..."), making the sound selection modal difficult to read and navigate.

**Solution**: Created a mapping system with user-friendly display names:
- Restructured sounds array to include both `filename` and `displayName` properties
- Added short, descriptive names for each sound (e.g., "Soft Click", "You Nailed It!", "Great Scott!")
- Updated component to display friendly names while still using correct filenames for playback

**Examples**:
- "a-soft-mechanical-click-followed-by-a-gentle-ding..." → "Soft Click"
- "a-woman-shouting-you-nailed-it_v4.mp3" → "You Nailed It!"
- "a-loud-and-surprised-exclamation-of-great-scott_v4.mp3" → "Great Scott!"

**Files Modified**:
- [x] `apps/web/src/components/SoundSelectionModal.tsx` - Added display name mapping system

**Status**: ✅ Completed
**Date**: 2025-10-10

### Sound Display Names - Version Number Simplification ✅
**Issue**: Sounds with multiple versions showed technical version numbers (e.g., "Gentle Whoosh (v4)", "Wooden Tok (v2)") which were confusing and unnecessary for users.

**Solution**: Simplified version numbering to use simple sequential numbers:
- Changed versioned display names to use "1" and "2" for variants
- Makes it clearer which sounds are variations of each other
- More intuitive for users to understand sound options

**Examples**:
- "Gentle Whoosh (v4)" → "Gentle Whoosh 2"
- "Gentle Whoosh (v3)" → "Gentle Whoosh 1"
- "Wooden Tok (v4)" → "Wooden Tok 2"
- "Wooden Tok (v2)" → "Wooden Tok 1"

**Files Modified**:
- [x] `apps/web/src/components/SoundSelectionModal.tsx` - Simplified version numbering in display names

**Status**: ✅ Completed
**Date**: 2025-10-10