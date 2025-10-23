# Mobile App - Shared Convex Backend

## Architecture

The mobile app **shares the same Convex backend** as the web app via a symlink:

```
apps/mobile/convex -> ../web/convex
```

This means:
- All backend functions are defined in `apps/web/convex/`
- Both web and mobile use the same schema, queries, mutations, and actions
- No separate mobile-specific Convex functions exist
- Changes to Convex functions affect both web and mobile apps

## Workspace Initialization

When a user authenticates, the mobile app automatically initializes workspaces:

1. Backend creates both "Personal" and "Work" workspaces for new users
2. Mobile app defaults to **Work workspace** via `OrganizationContext`
3. Users can switch between workspaces using the workspace switcher UI

This ensures:
- Users can start using the app immediately after authentication
- No "No active organization membership" errors occur
- Queries return data instead of null/empty results
- Work workspace is the default for professional time tracking

## Key Files

### `app/_layout.tsx`
Wraps the app with `OrganizationProvider` which handles workspace initialization automatically:
```typescript
<OrganizationProvider userId={user?._id ?? null}>
  <Slot />
</OrganizationProvider>
```

### `contexts/OrganizationContext.tsx`
Handles workspace initialization and defaults to Work workspace:
```typescript
// Prefer Work workspace over Personal when auto-selecting
const workMembership = memberships.find(
  m => m.organization?.workspaceType === "work" ||
      (m.organization?.workspaceType === undefined && !m.organization?.isPersonalWorkspace)
);

const defaultWorkspace = workMembership ? "work" : "personal";
```

## Development Notes

1. **Backend changes**: Edit files in `apps/web/convex/` (not `apps/mobile/convex/`)
2. **Testing**: Changes to Convex functions affect both apps - test both web and mobile
3. **Deployment**: The symlink is maintained in git, so deployments work correctly
4. **No re-exports**: Mobile imports directly from `@/convex/_generated/api` (generated from web convex)

## Differences from Web App

While the backend is shared, the mobile app has:
- Different UI components (React Native vs React Web)
- Expo push notifications instead of web-push
- Google OAuth via PKCE flow (expo-auth-session)
- Navigation via Expo Router instead of React Router
- Styling via react-native-unistyles instead of Tailwind CSS

See the main [CLAUDE.md](/CLAUDE.md) for complete project documentation.
