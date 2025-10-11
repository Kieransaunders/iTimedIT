# Mobile App Organization Context Fix

## Problem
The mobile app was experiencing errors when guest/anonymous users tried to use the app:
- `Error: No active organization membership`
- Missing `orgContext.ts` file references from the web app

## Root Cause
The mobile app's Convex functions were initially re-exporting from the web app's Convex backend (`WebCompanianApp/iTimedIT/apps/web/convex/`), which caused path resolution issues. Additionally, the mobile app wasn't automatically creating "Personal Workspace" organizations for new users (including guests).

## Solution

### 1. Created Local `convex/orgContext.ts`
This file provides organization membership helpers that automatically create a "Personal Workspace" for new users:

- **`ensureMembership(ctx)`** - For mutations. Creates a Personal Workspace if the user doesn't have one.
- **`requireMembership(ctx)`** - For queries. Throws an error if no membership exists.

Key behavior:
```typescript
// If no membership exists, automatically create one
const organizationId = await ctx.db.insert("organizations", {
  name: "Personal Workspace",
  createdBy: userId,
  createdAt: now,
});
```

### 2. Updated Convex Functions
Replaced re-exports with local implementations that use the new `orgContext.ts`:

#### `convex/timer.ts`
- Changed from `export * from "../WebCompanianApp/..."` to local implementation
- Uses `ensureMembership()` for mutations (start, stop, heartbeat)
- Uses `requireMembership().catch(() => null)` for queries (getRunningTimer)
- This allows guest users to start timers without errors

#### `convex/entries.ts`
- Updated to import from local `./orgContext`
- Uses `ensureMembership()` for mutations (create, edit, delete)
- Uses `requireMembership()` for queries (list)

#### `convex/categories.ts`
- Changed from re-export to local implementation
- Uses `requireMembership().catch(() => null)` for queries (returns empty array if no membership)
- Uses `ensureMembership()` for mutations

### 3. Fixed Push Notifications
Updated `app.config.ts` and `services/notifications.ts` to handle missing EAS project ID:

```typescript
// app.config.ts - Added EAS config
extra: {
  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  eas: {
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "your-project-id",
  },
}

// services/notifications.ts - Made projectId optional for development
const tokenData = projectId 
  ? await Notifications.getExpoPushTokenAsync({ projectId })
  : await Notifications.getExpoPushTokenAsync();
```

## How It Works Now

### Guest/Anonymous User Flow
1. User signs in anonymously (via `auth.ts` Anonymous provider)
2. User tries to start a timer
3. `timer.start` mutation calls `ensureMembership(ctx)`
4. `ensureMembership` checks for existing membership
5. If none exists, creates "Personal Workspace" organization + membership
6. Timer starts successfully with the new organizationId

### Authenticated User Flow
1. User signs in with password/Google
2. Same flow as above - Personal Workspace created on first action
3. Later can be invited to team workspaces

## Key Differences from Web App

The web app has a more complex setup with:
- Separate `orgContext.ts` with additional helpers (`maybeMembership`, role-based access)
- Interrupt scheduling and pomodoro features
- Budget alert logic
- More comprehensive timer features

The mobile app uses a simplified version focused on core functionality:
- Basic timer start/stop
- Entry management
- Project/category support
- Automatic Personal Workspace creation

## Files Modified
- `convex/orgContext.ts` (created)
- `convex/timer.ts` (replaced re-export with local implementation)
- `convex/entries.ts` (updated imports and helpers)
- `convex/categories.ts` (replaced re-export with local implementation)
- `app.config.ts` (added EAS config)
- `services/notifications.ts` (made projectId optional)

## Testing Recommendations
1. Test guest user flow: Sign in anonymously → Start timer → Verify Personal Workspace created
2. Test authenticated user: Sign in with password → Start timer → Verify works
3. Test push notifications on physical device
4. Verify entries, projects, and categories work for both user types
