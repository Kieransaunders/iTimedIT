# Mobile App - Shared Convex Backend

## ⚠️ Critical: Hermes/JSC Engine - TestFlight Crash Fix

### Problem
The app can crash immediately on TestFlight/production due to a Hermes + New Architecture + iOS configuration edge case. This is particularly common with React Native 0.81.x and certain iOS build configurations.

### Solution
**Use JSC instead of Hermes to avoid the edge case issues.**

#### Configuration (Already Applied):
```typescript
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  jsEngine: "jsc",  // Explicitly use JSC to avoid Hermes/iOS edge cases
  newArchEnabled: true,  // Can keep New Architecture with JSC
  // ...
  plugins: [
    [
      "expo-build-properties",
      {
        ios: {
          jsEngine: "jsc",  // Ensure JSC is used for iOS builds
          deploymentTarget: "15.1",
          useFrameworks: "static"  // Avoid framework conflicts
        },
        android: {
          jsEngine: "jsc"  // Use JSC for Android for consistency
        }
      }
    ],
    // ...
  ]
})
```

#### Diagnosis Steps:
1. If TestFlight crashes immediately, check JS engine configuration
2. Run `npx expo prebuild --clean` after changing JS engine
3. Build for TestFlight: `eas build --platform ios --profile production`
4. Test locally first: `npx expo start --no-dev --minify`

#### Alternative Solutions:
- **If JSC doesn't fix it**: Try disabling New Architecture (`newArchEnabled: false`)
- **If you need Hermes**: Remove `useFrameworks: "static"` but test thoroughly
- **For debugging**: Check device logs in Xcode Organizer for crash details

## ⚠️ Critical Sentry Setup - TestFlight Crash Fix

### Problem
The app crashes immediately on TestFlight/production due to conflicting Sentry SDKs.

### Solution
**ONLY use `sentry-expo`, NEVER install `@sentry/react-native` directly.**

#### Correct Setup:
```json
// package.json - CORRECT
"dependencies": {
  "sentry-expo": "~7.0.0",  // ✅ Use this
  "expo-application": "~7.0.0",  // ✅ Required peer dependency
  // "@sentry/react-native": "^7.4.0",  // ❌ NEVER add this
}
```

```typescript
// app/_layout.tsx - CORRECT
import * as Sentry from "sentry-expo";  // ✅ Use this
// import * as Sentry from "@sentry/react-native";  // ❌ NEVER use this

Sentry.init({
  dsn: "...",
  enableInExpoDevelopment: false,
  debug: __DEV__,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1.0,
  // Don't add reactNativeTracingIntegration() - not compatible with sentry-expo
});
```

#### If TestFlight Crashes:
1. Check for `@sentry/react-native` in package.json - remove it
2. Search all files for `import.*@sentry/react-native` - replace with `sentry-expo`
3. Run `npx expo install --fix` to align versions
4. Run `npx expo-doctor` to check for issues
5. Test locally with `npx expo start --no-dev --minify`

#### Known Issues from expo-doctor:
- **Metro config warning**: Expected for monorepo - ignore
- **React version conflicts**: May occur with React 19.x - consider downgrading to React 18.x if crashes persist

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

## Timer Lock Screen Display

The mobile app provides real-time timer updates on the lock screen with platform-specific implementations:

### iOS 16.2+ (Live Activities)
- Real-time timer updates on lock screen
- Dynamic Island integration (iPhone 14 Pro+)
- Tap to open app functionality
- Better battery efficiency
- **Requires**: Expo DevClient (rebuild with `npx expo prebuild --clean`)

### iOS < 16.2 (Notifications)
- Time-sensitive notifications with 5-second updates
- Static display (no real-time updates)
- Action buttons (Stop, View)

### Android (Foreground Service)
- Persistent foreground notification with 3-second updates
- Cannot be dismissed (ongoing notification)
- Action buttons (Stop, View)

### Implementation
- `services/liveActivityService.ts` - iOS Live Activities manager
- `services/timerNotification.ts` - Platform-agnostic orchestrator
- Automatic fallback for unsupported devices

See [docs/LIVE_ACTIVITIES.md](docs/LIVE_ACTIVITIES.md) for detailed setup and troubleshooting.

## Differences from Web App

While the backend is shared, the mobile app has:
- Different UI components (React Native vs React Web)
- Expo push notifications instead of web-push
- iOS Live Activities for lock screen timer display
- Google OAuth via PKCE flow (expo-auth-session)
- Navigation via Expo Router instead of React Router
- Styling via react-native-unistyles instead of Tailwind CSS

See the main [CLAUDE.md](/CLAUDE.md) for complete project documentation.
