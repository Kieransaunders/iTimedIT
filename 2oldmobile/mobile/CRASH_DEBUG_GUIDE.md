# Hermes Crash Debugging Guide - Incremental Code Removal

This guide helps you isolate the exact component causing the Hermes `DictPropertyMap::findOrAdd()` crash in release builds.

## How to Use This Guide

For each stage below:
1. **Apply the changes** to `app/_layout.tsx`
2. **Build release version**: `npx expo run:ios --configuration Release`
3. **Test the app** - does it crash?
4. **Record result** below
5. If crash is **fixed**, you've found the problematic component!
6. If crash **persists**, move to next stage

---

## 🔍 Stage 0: Baseline (Current with Fixes)

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

Test the app with all the null safety fixes we just applied.

**No changes needed** - just build and test:
```bash
npx expo run:ios --configuration Release
```

**If this crashes**: Proceed to Stage 1
**If this works**: Ship it! 🎉

---

## 🔍 Stage 1: Remove InterruptBanner

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

The `InterruptBanner` component uses Convex queries and may trigger property operations.

### Changes to `app/_layout.tsx`:

Comment out line 126:
```typescript
return (
  <OrganizationProvider userId={user?._id ?? null}>
    <NavigationThemeProvider value={DarkTheme}>
      {/* <InterruptBanner /> */}  {/* 🔍 STAGE 1: COMMENTED OUT */}
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
```

### Test:
```bash
npx expo run:ios --configuration Release
```

**If crash is fixed**: The issue is in `InterruptBanner` or its Convex queries
**If crash persists**: Proceed to Stage 2

---

## 🔍 Stage 2: Remove OrganizationProvider

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

The `OrganizationProvider` has complex state management with 9 useState calls.

### Changes to `app/_layout.tsx`:

```typescript
return (
  // <OrganizationProvider userId={user?._id ?? null}>  {/* 🔍 STAGE 2: COMMENTED OUT */}
    <NavigationThemeProvider value={DarkTheme}>
      {/* <InterruptBanner /> */}
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  // </OrganizationProvider>  {/* 🔍 STAGE 2: COMMENTED OUT */}
);
```

**⚠️ Note**: The app will likely crash when trying to use organization features, but we're testing if it **starts** without crashing.

### Test:
```bash
npx expo run:ios --configuration Release
```

**If crash is fixed**: The issue is in `OrganizationProvider` state management
**If crash persists**: Proceed to Stage 3

---

## 🔍 Stage 3: Remove Notification Initialization

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

Notification initialization involves async operations and native modules.

### Changes to `app/_layout.tsx`:

Comment out lines 58-68:
```typescript
// Initialize notifications system early to prevent crashes
// useEffect(() => {  {/* 🔍 STAGE 3: COMMENTED OUT */}
//   // Lazy initialization - run after component mounts to prevent startup crashes
//   const timer = setTimeout(() => {
//     initializeNotifications().catch((err) => {
//       console.error("Failed to initialize notifications in _layout:", err);
//     });
//   }, 0);
//
//   return () => clearTimeout(timer);
// }, []);  {/* 🔍 STAGE 3: COMMENTED OUT */}
```

### Test:
```bash
npx expo run:ios --configuration Release
```

**If crash is fixed**: The issue is in notification initialization
**If crash persists**: Proceed to Stage 4

---

## 🔍 Stage 4: Remove Unistyles Import

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

Unistyles imports and initializes at module load time.

### Changes to `app/_layout.tsx`:

Comment out line 6:
```typescript
// Polyfills for React Native
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

// Initialize Unistyles
// import "../styles/unistyles";  {/* 🔍 STAGE 4: COMMENTED OUT */}
```

### Test:
```bash
npx expo run:ios --configuration Release
```

**If crash is fixed**: The issue is in Unistyles initialization
**If crash persists**: Proceed to Stage 5

---

## 🔍 Stage 5: Minimal App (Everything Removed)

**Status**: ⬜ NOT TESTED | ✅ NO CRASH | ❌ CRASH

Strip down to absolute bare minimum to isolate the issue.

### Replace entire `app/_layout.tsx` with:

```typescript
// Polyfills for React Native
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', padding: 20 }}>🔍 STAGE 5: MINIMAL APP</Text>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
```

### Test:
```bash
npx expo run:ios --configuration Release
```

**If crash is fixed**: The issue is in one of the providers/imports we removed
**If crash STILL persists**: The issue is in:
- A global import (polyfills, React Native itself)
- Expo Router
- Native module initialization
- Or a dependency with module-level side effects

---

## 🔍 Stage 6: Test Individual Providers

If Stage 5 works (minimal app doesn't crash), add back components **one at a time**:

### 6A: Add ConvexAuthProvider Only
```typescript
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { convex } from "../services/convex";

// In RootLayout:
return (
  <ConvexAuthProvider client={convex} storage={AsyncStorage}>
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  </ConvexAuthProvider>
);
```

### 6B: Add ThemeProvider
```typescript
import { ThemeProvider } from "../utils/ThemeContext";

return (
  <ConvexAuthProvider client={convex} storage={AsyncStorage}>
    <ThemeProvider>
      <Stack>...</Stack>
    </ThemeProvider>
  </ConvexAuthProvider>
);
```

### 6C: Add OrganizationProvider (with minimal user)
```typescript
import { OrganizationProvider } from "../contexts/OrganizationContext";

return (
  <ConvexAuthProvider client={convex} storage={AsyncStorage}>
    <ThemeProvider>
      <OrganizationProvider userId={null}>
        <Stack>...</Stack>
      </OrganizationProvider>
    </ThemeProvider>
  </ConvexAuthProvider>
);
```

Test after each addition to pinpoint the exact component!

---

## 📊 Results Tracker

Fill this out as you test:

| Stage | Component Tested | Crash? | Notes |
|-------|-----------------|--------|-------|
| 0 | Baseline (with fixes) | ⬜ | |
| 1 | Without InterruptBanner | ⬜ | |
| 2 | Without OrganizationProvider | ⬜ | |
| 3 | Without Notifications | ⬜ | |
| 4 | Without Unistyles | ⬜ | |
| 5 | Minimal App | ⬜ | |
| 6A | + ConvexAuthProvider | ⬜ | |
| 6B | + ThemeProvider | ⬜ | |
| 6C | + OrganizationProvider | ⬜ | |

---

## 🎯 Once You Find the Culprit

When you identify which stage fixes the crash, focus your debugging efforts on:

- **Stage 1**: `InterruptBanner` component - likely timer/query issues
- **Stage 2**: `OrganizationProvider` - likely state management or useMemo issues
- **Stage 3**: Notification system - likely native module initialization
- **Stage 4**: Unistyles - likely stylesheet creation at module load
- **Stage 5**: Core imports or Convex client
- **Stage 6**: Specific provider causing the issue

Then you can:
1. Add more defensive guards to that specific component
2. Defer initialization further
3. Simplify state management
4. Or replace with a simpler implementation

---

## 🚀 Quick Test Script

Run this after each stage to automate testing:

```bash
#!/bin/bash
# Save as test-stage.sh

echo "🔍 Building release version..."
npx expo run:ios --configuration Release

echo ""
echo "✅ Build complete!"
echo "📱 Testing on device..."
echo ""
echo "Did the app crash on startup? (y/n)"
read -r crashed

if [ "$crashed" = "y" ]; then
  echo "❌ Still crashing - proceed to next stage"
else
  echo "✅ No crash! You found the culprit!"
fi
```

---

## 💡 Additional Tips

1. **Check Xcode Console**: Look for logs right before crash
2. **Use Instruments**: Profile memory allocation during startup
3. **Compare Dev vs Release**: The issue ONLY happens in release builds
4. **Check Metro bundler**: Sometimes minification issues show warnings

Good luck! 🎯
