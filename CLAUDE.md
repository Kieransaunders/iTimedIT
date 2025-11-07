# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iTimedIT is a multi-tenant time tracking platform with both **web** and **mobile** applications in a monorepo structure. The web app is a React + Vite frontend with Convex backend, while the mobile app is built with Expo/React Native sharing the same Convex backend architecture.

## Monorepo Structure

```
apps/
├── web/                    # React + Vite web application
│   ├── convex -> ../../packages/backend  # Symlink to shared backend
│   └── src/
│       ├── components/
│       │   ├── ModernDashboard.tsx  # ACTIVE: Main timer UI
│       │   ├── ClientsPage.tsx
│       │   ├── ProjectsPage.tsx
│       │   └── ui/         # shadcn/ui components
│       └── lib/            # Shared utilities
│
├── mobile/                 # Expo/React Native mobile app (@itimedit/mobile)
│   ├── convex -> ../../packages/backend  # Symlink to shared backend
│   ├── app/               # Ignite boilerplate structure
│   │   ├── screens/       # SignInScreen, SignUpScreen, WelcomeScreen
│   │   ├── navigators/    # AppNavigator with auth flow
│   │   ├── components/    # Button, TextField, Screen, etc.
│   │   ├── theme/         # Light/dark mode theming
│   │   ├── services/      # Convex client, storage
│   │   └── utils/         # useAuth hook, validators
│   ├── assets/            # Images, fonts
│   ├── ios/               # iOS native code
│   ├── android/           # Android native code
│   ├── metro.config.js    # Ignite-configured Metro bundler
│   └── eas.json          # EAS Build configuration
│
packages/
├── backend/               # 🎯 SHARED Convex backend (@itimedit/backend)
│   ├── schema.ts          # Database schema
│   ├── timer.ts           # Timer mutations/queries
│   ├── entries.ts         # Time entry management (work workspace)
│   ├── personalEntries.ts # Personal workspace entries
│   ├── projects.ts        # Project management (work)
│   ├── personalProjects.ts # Personal workspace projects
│   ├── clients.ts         # Client management
│   ├── interrupts.ts      # Timer interruption system
│   ├── organizations.ts   # Workspace management
│   ├── users.ts           # User settings, Expo push tokens
│   ├── expoPushActions.ts # Mobile push notifications
│   ├── auth.ts            # Convex Auth configuration
│   ├── http.ts            # HTTP routes
│   └── convex.config.ts   # Convex app config
│
└── shared/                # Shared utilities (@itimedit/shared)
    └── src/
        ├── types/         # Shared TypeScript types
        ├── utils/         # formatTime, validators
        └── constants/     # Shared constants
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
- **Boilerplate**: Ignite v11.3.2 (Infinite Red)
- **Backend**: Convex (shared with web via symlink at `apps/mobile/convex -> ../../packages/backend`)
- **Navigation**: React Navigation v7 (native stack)
- **UI**: Ignite components (Button, TextField, Screen, etc.) + custom theming
- **Theming**: Light/dark mode with ThemeProvider + useAppTheme hook
- **Auth**: Convex Auth + Google OAuth (@react-native-google-signin/google-signin)
- **Storage**: MMKV (react-native-mmkv) for fast, encrypted storage
- **Testing**: Jest + jest-expo + Maestro (E2E)

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

### Convex commands (run from packages/backend/ or via symlink)
```bash
npx convex dev           # Start Convex development backend
npx convex deploy        # Deploy to production Convex backend
npx convex dashboard     # Open Convex dashboard
npx convex logs          # View function logs
```

## 🎯 Shared Backend Architecture

### Critical Information

The Convex backend is located at `packages/backend/` and is **shared by both web and mobile apps** via symlinks:
- `apps/web/convex` → `../../packages/backend`
- `apps/mobile/convex` → `../../packages/backend`

**⚠️ IMPORTANT RULES:**

1. **Schema Changes**: All schema modifications must be made in `packages/backend/schema.ts`
2. **Function Development**: Add new queries/mutations/actions in `packages/backend/`
3. **Testing**: Schema changes affect BOTH apps simultaneously
4. **Deployment**: Single deployment serves both platforms
5. **Generated Types**: Both apps import from their symlinked `convex/_generated/`

### Production Deployment

Both apps connect to the same Convex deployment:
- **Production URL**: `https://basic-greyhound-928.convex.cloud`
- **Set in**:
  - Web: `apps/web/.env.production` → `VITE_CONVEX_URL`
  - Mobile: `apps/mobile/.env.local` → `EXPO_PUBLIC_CONVEX_URL`

### Benefits

✅ **Single Source of Truth**: One schema, one set of functions
✅ **Instant Sync**: Changes propagate immediately between apps
✅ **Type Safety**: Shared TypeScript types from generated code
✅ **Easier Maintenance**: Fix bugs once, both apps benefit
✅ **Consistent Data**: No schema drift between platforms

## Mobile-Web Feature Division Strategy

### Philosophy: Minimal Mobile, Full-Featured Web

The mobile and web apps share the same Convex backend but serve **different purposes**:

**Mobile App = Field Worker** (Quick time tracking on-the-go)
- ✅ Start/stop/reset timers
- ✅ View projects, clients, and time entries
- ✅ Create basic projects and clients (quick forms)
- ✅ Manual time entry (add/edit/delete)
- ✅ Timer interrupts and Pomodoro mode
- ✅ Push notifications and lock screen timer
- ✅ Basic settings (sounds, intervals, Pomodoro)
- ❌ Complex editing → Redirect to web
- ❌ Advanced filtering/reporting → Redirect to web
- ❌ Team management → Redirect to web

**Web App = Office Manager** (Detailed management and analytics)
- ✅ All mobile features PLUS:
- ✅ Edit project details (name, rate, budget, client assignment)
- ✅ Edit client details (name, color, notes)
- ✅ Advanced entry filtering (project/client/category/date range)
- ✅ Category management (create/delete)
- ✅ Team collaboration (invites, member management, roles)
- ✅ Advanced settings (quiet hours, DND, email/SMS fallbacks)
- ✅ Reporting and analytics dashboards
- ✅ Data export (CSV)

### Mobile → Web Redirect Pattern

**Long-Press Context Menus** (implemented):
```typescript
// apps/mobile/components/projects/ProjectCard.tsx
onLongPress={() => {
  Alert.alert(project.name, "What would you like to do?", [
    { text: "Edit in Web App", onPress: () => openWebApp(`/projects/${project._id}`) },
    { text: "Start Timer", onPress: onStartTimer },
    { text: "Cancel", style: "cancel" },
  ]);
}}
```

**Advanced Settings Button** (implemented):
```typescript
// apps/mobile/app/(tabs)/settings.tsx
<TouchableOpacity onPress={() => openWebApp('/settings')}>
  <Text>Advanced Settings</Text>
  <Text>Quiet hours, email/SMS alerts, team management, and more</Text>
</TouchableOpacity>
```

**CompanionAppGuidance Component** (implemented):
```typescript
// Used on Projects, Clients, Entries screens
<CompanionAppGuidance
  context="projects"
  hasData={projects.length > 0}
/>
// Automatically shows contextual banners guiding users to web for advanced features
```

### Benefits of This Approach

1. **Faster Mobile Development** - Focus on core timer functionality, no need to rebuild complex forms
2. **Better UX** - Mobile optimized for quick actions, web optimized for detailed management
3. **Easier Maintenance** - Less code duplication, single source of truth in web app
4. **Clear User Expectations** - Users understand what each platform is for
5. **Instant Sync** - Changes on web immediately visible in mobile (shared Convex backend)

### Implementation Locations

- **Long-press menus**: `apps/mobile/components/projects/ProjectCard.tsx`, `apps/mobile/components/clients/ClientPickerModal.tsx`
- **Advanced Settings link**: `apps/mobile/app/(tabs)/settings.tsx`
- **Guidance banners**: `apps/mobile/components/common/CompanionAppGuidance.tsx`
- **Web app opener utility**: `apps/mobile/components/WebAppPrompt.tsx` (`openWebApp()` function)

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
