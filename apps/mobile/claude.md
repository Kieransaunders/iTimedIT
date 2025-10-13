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

## Personal Workspace Initialization

When a user authenticates, the mobile app automatically creates a "Personal Workspace" organization by calling `api.organizations.ensurePersonalWorkspace` in `app/_layout.tsx`.

This ensures:
- Users can start using the app immediately after authentication
- No "No active organization membership" errors occur
- Queries return data instead of null/empty results

## Key Files

### `app/_layout.tsx`
Handles automatic workspace initialization when user is authenticated:
```typescript
const ensureWorkspace = useMutation(api.organizations.ensurePersonalWorkspace);

useEffect(() => {
  if (isAuthenticated && !workspaceInitializedRef.current) {
    workspaceInitializedRef.current = true;
    ensureWorkspace().catch((error) => {
      console.error("Failed to initialize workspace:", error);
      workspaceInitializedRef.current = false;
    });
  }
}, [isAuthenticated, ensureWorkspace]);
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
