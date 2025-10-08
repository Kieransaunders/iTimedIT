# Convex Setup for Monorepo

## Issue: Auth Functions Not Found

The error `Could not find public function for 'auth:signIn'` means Convex hasn't synced your backend functions yet.

## Solution

### Option 1: Use the Helper Script (Recommended)
```bash
./start-web.sh
```

When Convex asks "What would you like to configure?":
1. Choose: **"choose an existing project"**
2. Select: **"watchful-hedgehog-860"** (iTrackIT)

### Option 2: Manual Setup
```bash
cd apps/web
npm run dev
```

When prompted by Convex:
1. Choose: **"choose an existing project"**
2. Select your existing project: **"watchful-hedgehog-860"**

### Option 3: Initialize Convex Manually First
```bash
cd apps/web
npx convex dev
```

This will:
1. Prompt you to select your existing project
2. Sync all your backend functions
3. Create the `.convex/` directory with deployment info

After Convex is initialized, you can use:
```bash
npm run dev:web
```
from the root directory.

## What's Happening?

When you moved the project to a monorepo structure, the Convex deployment information (stored in `.convex/` directory) wasn't copied. Convex needs to:

1. **Connect** to your existing deployment (`watchful-hedgehog-860`)
2. **Sync** all your backend functions (auth, entries, projects, etc.)
3. **Generate** TypeScript types in `convex/_generated/`

## Environment Variables

Your `.env.local` already has the correct configuration:
```
CONVEX_DEPLOYMENT=dev:watchful-hedgehog-860
VITE_CONVEX_URL=https://watchful-hedgehog-860.convex.cloud
```

## After Setup

Once Convex is connected and synced:
- ✅ Auth functions will work (`auth:signIn`, `auth:signOut`)
- ✅ All queries and mutations will be available
- ✅ The web app will connect to your backend
- ✅ You can develop normally

## Troubleshooting

### "No project found"
If Convex can't find your project, you may need to:
1. Log in to Convex: `npx convex login`
2. Then run: `npx convex dev`

### "Functions not syncing"
1. Stop the dev server (Ctrl+C)
2. Delete `.convex/` directory: `rm -rf apps/web/.convex`
3. Restart: `cd apps/web && npm run dev`

### "Still getting errors"
Make sure you're running the commands from the correct directory:
- For `npm run dev:web`: Run from **root** directory
- For `npm run dev`: Run from **apps/web** directory
