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