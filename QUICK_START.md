# Quick Start Guide - iTimedIT Monorepo

## 🚨 Current Issue: Convex Not Initialized

You're seeing this error:
```
Could not find public function for 'auth:signIn'
```

This happens because Convex needs to connect to your existing deployment.

## ✅ Quick Fix (Choose One)

### Option A: Automatic Fix (Recommended)
```bash
./fix-convex.sh
```

When prompted:
1. Choose: **"choose an existing project"**
2. Select: **"watchful-hedgehog-860"** (your iTrackIT project)
3. Wait for sync to complete
4. Press **Ctrl+C** when you see "Convex functions ready"
5. Run: `npm run dev:web`

### Option B: Manual Fix
```bash
cd apps/web
npx convex dev
```

Follow the same prompts as Option A, then:
```bash
# After Convex syncs, press Ctrl+C
cd ../..
npm run dev:web
```

### Option C: Use Helper Script
```bash
./start-web.sh
```

This will start everything and prompt you to select your project.

## 📋 What's Happening?

When we moved your project to a monorepo structure, the Convex deployment info (`.convex/` directory) wasn't copied. Convex needs to:

1. **Connect** to your deployment: `watchful-hedgehog-860`
2. **Sync** your backend functions (auth, entries, projects, etc.)
3. **Generate** TypeScript types

This is a **one-time setup**. After this, everything will work normally.

## 🎯 After Setup

Once Convex is initialized, you can use these commands:

```bash
# Start web app (from root)
npm run dev:web

# Start mobile app (from root)
npm run dev:mobile

# Or use the helper scripts
./start-web.sh
```

## 🔍 Verify Setup

After running the fix, check that these exist:
```bash
ls apps/web/.convex/          # Should show deployment info
ls apps/web/convex/_generated/ # Should show generated types
```

## 📚 More Info

- Full setup guide: `MONOREPO_SETUP.md`
- Convex details: `CONVEX_SETUP.md`
- Applied fixes: `FIXES_APPLIED.md`

## 💡 Pro Tip

After the initial setup, you can always run:
```bash
npm run dev:web    # From root directory
```

The Convex backend will automatically sync on each start.
