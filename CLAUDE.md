# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iTimedIT is a multi-tenant time tracking platform with both **web** and **mobile** applications in a monorepo structure. The web app is a React + Vite frontend with Convex backend, while the mobile app is built with Expo/React Native sharing the same Convex backend architecture.

## Monorepo Structure

```
apps/
├── web/                    # React + Vite web application
│   ├── convex/            # Convex backend (Node.js 20 runtime)
│   │   ├── schema.ts      # Database schema
│   │   ├── timer.ts       # Timer mutations/queries
│   │   ├── entries.ts     # Time entry management
│   │   ├── projects.ts    # Project management
│   │   ├── clients.ts     # Client management
│   │   ├── interrupts.ts  # Timer interruption system
│   │   ├── organizations.ts
│   │   └── auth.ts        # Convex Auth configuration
│   └── src/
│       ├── components/
│       │   ├── ModernDashboard.tsx  # ACTIVE: Main timer UI
│       │   ├── ClientsPage.tsx
│       │   ├── ProjectsPage.tsx
│       │   └── ui/         # shadcn/ui components
│       └── lib/            # Shared utilities
│
├── mobile/                 # Expo/React Native mobile app
│   ├── convex -> ../web/convex  # Symlink to shared Convex backend
│   ├── app/               # Expo Router file-based routing
│   │   ├── (tabs)/        # Tab navigation
│   │   ├── auth/          # Auth screens
│   │   └── _layout.tsx    # Auto-initializes "Personal Workspace"
│   ├── components/
│   ├── hooks/             # useAuth, useProjects, useClients
│   └── services/          # googleAuth, notifications
│
packages/
└── shared/                # Shared code (if any)
```

## Technology Stack

### Web App
- **Frontend**: React 18 + TypeScript 5.7.2 + Vite 6
- **Backend**: Convex (Node.js 20 runtime)
- **UI**: Tailwind CSS + shadcn/ui components
- **Auth**: @convex-dev/auth (password, Google OAuth)
- **State**: Convex real-time queries/mutations
- **Testing**: Jest + ts-jest

### Mobile App
- **Framework**: Expo ~54 + React Native 0.81
- **Backend**: Convex (shared with web via symlink at `apps/mobile/convex -> apps/web/convex`)
- **Routing**: Expo Router (file-based)
- **UI**: react-native-unistyles + custom components
- **Auth**: Convex Auth + Google OAuth (expo-auth-session)
- **Navigation**: @react-navigation/native
- **Testing**: Jest + jest-expo

## Common Commands

### Root-level commands (manages both apps)
```bash
npm run dev              # Start web app (alias for dev:web)
npm run dev:web          # Start web app with Convex backend
npm run dev:mobile       # Start mobile app with Expo
npm run build:web        # Build web app for production
npm run build:mobile     # Build mobile app for production
npm run lint             # Lint all workspaces
npm run test             # Run tests in all workspaces
npm run clean            # Clean all node_modules
```

### Web app commands (from root or apps/web/)
```bash
npm run dev --workspace=@itimedit/web    # Development with hot reload
npm run dev:frontend                      # Vite only (requires separate Convex)
npm run dev:backend                       # Convex dev server only
npm run build                             # Production build
npm run lint                              # TypeScript + Convex checks
npm run test                              # Run Jest tests
npm run test:watch                        # Jest in watch mode
npm run test:coverage                     # Jest with coverage report
npm run generate:vapid                    # Generate Web Push VAPID keys
```

### Mobile app commands (from root or apps/mobile/)
```bash
npm run start --workspace=@itimedit/mobile   # Start Expo dev server
npm run ios                                  # Run on iOS simulator
npm run android                              # Run on Android emulator
npm run build                                # Export for production
npm run lint                                 # ESLint checks
npm run test                                 # Run Jest tests (--runInBand)
```

### Convex commands (run from apps/web/)
```bash
npx convex dev           # Start Convex development backend
npx convex deploy        # Deploy to production Convex backend
npx convex dashboard     # Open Convex dashboard
npx convex logs          # View function logs
```

## Key Architecture Decisions

### Component Usage Verification (CRITICAL)
- **ALWAYS verify component imports** before implementing features
- **ModernDashboard.tsx is the ONLY active timer interface** - check `apps/web/src/App.tsx` to confirm which components are actually rendered
- Search for component imports before assuming usage to avoid modifying legacy/unused code

### Convex Backend Architecture (Shared)

**IMPORTANT**: Both web and mobile apps share the same Convex backend via symlink (`apps/mobile/convex -> apps/web/convex`). All backend functions are defined in `apps/web/convex/` and used by both applications.

#### Shared Backend Features
- Server-side timer interruptions using `scheduler.runAt`
- 60-second grace periods for timer interruptions
- Pomodoro timer with work/break phases
- Budget alerts and overrun tracking
- Organization-based multitenancy
- Push notification system:
  - Web: web-push + VAPID
  - Mobile: Expo push notifications
- **Auto-creates "Personal Workspace"** for new users (including anonymous)
  - Web: Uses `ensureMembership()` in Convex functions
  - Mobile: Calls `api.organizations.ensurePersonalWorkspace` in `app/_layout.tsx` on authentication

#### Organization Context Pattern (`apps/web/convex/orgContext.ts`)
```typescript
// Shared helpers used by both web and mobile
requireMembership(ctx)      // Throws if no membership
ensureMembership(ctx)       // Creates Personal Workspace if needed
maybeMembership(ctx)        // Returns null if no membership
```

### Authentication Flow

Both apps use `@convex-dev/auth`:
- Password authentication
- Google OAuth (PKCE flow in mobile)
- Anonymous/guest authentication (mobile only)
- Automatic "Personal Workspace" creation on first action

### Data Model

Key tables (defined in `apps/web/convex/schema.ts`):
- **organizations**: Multi-tenant workspaces (auto-created "Personal Workspace")
- **memberships**: User-org relationships with roles (owner/admin/member)
- **clients**: Optional client association for projects
- **projects**: Billable projects with hourly rates and budgets
- **timeEntries**: Completed time entries with category support
- **runningTimers**: Active timer state with Pomodoro/interrupt fields
- **categories**: User-defined time entry categories
- **userSettings**: Per-user timer/notification preferences
- **pushSubscriptions**: Web push notification endpoints (web only)

## Environment Configuration

### Web App
- **Development**: `VITE_CONVEX_URL=https://watchful-hedgehog-860.convex.cloud`
- **Production**: `VITE_CONVEX_URL=https://basic-greyhound-928.convex.cloud`
- **Production URL**: https://itimedit.netlify.app
- **Convex Dashboard**: https://dashboard.convex.dev/d/basic-greyhound-928

### Mobile App
- `EXPO_PUBLIC_CONVEX_URL`: Points to Convex backend (same as web)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID for mobile
- `EXPO_PUBLIC_EAS_PROJECT_ID`: Expo Application Services project ID (for push notifications)

## Code Style Guidelines

### TypeScript
- Strict mode enabled, no `any` types
- Use `Id<"tableName">` type from Convex for document IDs
- Prefer functional components with hooks
- Use `as const` for string literals in discriminated unions

### React
- Functional components only
- React hooks for state management
- Convex hooks (`useQuery`, `useMutation`, `useAction`) for data

### Convex Functions
- **Always use new function syntax** with `args` and `returns` validators
- Use `internalQuery`, `internalMutation`, `internalAction` for private functions
- Import from `"./_generated/server"` for function registration
- Use `v.null()` validator for functions that return nothing
- **File-based routing**: `convex/example.ts` → `api.example.functionName`
- Add `"use node";` to files using Node.js built-ins (e.g., web-push)

### UI (Web)
- Tailwind utility classes only (no inline styles)
- shadcn/ui components with `@/components/ui/*` imports
- Button, Card, Dialog, Select, etc. from Radix UI

### UI (Mobile)
- react-native-unistyles for styling
- Custom components in `apps/mobile/components/`
- Lucide icons via `lucide-react-native`

## Testing

### Web App
- Jest + ts-jest configuration
- Test files in `apps/web/tests/`:
  - `unit/` - Component tests
  - `contract/` - Convex function tests
  - `integration/` - User flow tests
- Run with `npm run test:coverage` before PRs

### Mobile App
- Jest + jest-expo configuration
- Test files in `apps/mobile/__tests__/`:
  - `hooks/` - Hook tests
  - `services/` - Service tests
  - `components/` - Component tests
- Run with `npm run test --runInBand` (prevents race conditions)

## Critical Notes

### For Web App Development
1. **ModernDashboard.tsx** is the active timer interface (verify in App.tsx)
2. Server-side interruptions use `scheduler.runAt` (not client-side timers)
3. Pomodoro timer has separate work/break phases with distinct tracking
4. Always use organization context helpers for data access
5. Push notifications require Node.js 20 runtime in Convex actions

### For Mobile App Development
1. **Mobile app shares Convex backend with web** via symlink at `apps/mobile/convex -> apps/web/convex`
2. **All Convex functions are in `apps/web/convex/`** - mobile uses the same functions as web
3. **Auto-creates Personal Workspace** via `app/_layout.tsx` when user authenticates
4. Google OAuth uses PKCE flow via `services/googleAuth.ts`
5. Push notifications use Expo's system (`expo-notifications`)
6. **Timer interrupts with auto-stop**: Same backend logic as web app - uses `awaitingInterruptAck` field

### Deployment
- Web: Netlify + Convex production backend
- Mobile: Expo Application Services (EAS Build)
- Always test locally with `npx convex dev` before deploying
- Run `npm run lint` to catch TypeScript/Convex errors

### Important: Server Management
- **NEVER start dev servers automatically** - always let the user handle server setup
- The user manages: Expo dev server, Convex backend, and any other services
- Only kill servers when explicitly requested by the user

## File References

When referencing code locations, use the format `file_path:line_number` for easy navigation.

Example: "Timer start logic is in `apps/web/convex/timer.ts:142`"

## Additional Documentation

- `README.md` - Project overview and quick start
- `Install_Guide.md` - Detailed local setup
- `apps/mobile/CLAUDE.md` - Mobile-specific context and fixes
- `.cursor/rules/convex_rules.mdc` - Convex development guidelines
- `.kiro/specs/` - Feature specifications and task tracking
