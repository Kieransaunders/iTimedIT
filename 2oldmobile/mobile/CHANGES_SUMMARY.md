# Summary of Changes - Minimal Build Test

## 📋 All Changes Made to Fix Hermes Crash

This document summarizes **ALL** changes made to identify and fix the Hermes `DictPropertyMap::findOrAdd()` crash.

---

## 🚨 Crash Investigation Log (2025-11-06)

- **Action Taken:** Re-applied a temporary fix based on previous analysis.
- **File Modified:** `apps/mobile/app/_layout.tsx`
- **Change:** Commented out the `...FontAwesome.font` spread in the `useFonts` hook.
- **Reason:** A crash log from TestFlight (Incident ID: `BFC2C206-7097-4F97-B342-4BEB1C373AE2`) pointed to a failure in the Hermes JavaScript engine during an iterator operation (`caseIteratorNext`). This aligns with the original suspicion that the object spread over `FontAwesome.font` is triggering a bug in Hermes. The line was found to be active, despite previous notes suggesting it should be commented out for testing.
- **Status:** This change is for diagnosis. If the crash is resolved, a permanent fix will be required to load icons safely.

---

## ✅ Phase 1: Null Safety Fixes (Applied)

These defensive programming fixes were applied to prevent null pointer dereferences:

### 1. `app.config.ts` - Safe String Manipulation (Lines 3-40)
**Before:**
```typescript
const parts = googleClientId.split(".");
googleClientScheme = parts.reverse().join(".");
```

**After:**
```typescript
// Safe string reversal without array operations (avoids Hermes DictPropertyMap crash)
const parts: string[] = [];
let currentPart = '';
for (let i = 0; i < googleClientId.length; i++) {
  const char = googleClientId.charAt(i);
  if (char === '.') {
    if (currentPart) parts.push(currentPart);
    currentPart = '';
  } else {
    currentPart += char;
  }
}
// Reverse by building from end to start
let reversed = '';
for (let i = parts.length - 1; i >= 0; i--) {
  reversed += parts[i];
  if (i > 0) reversed += '.';
}
googleClientScheme = reversed || undefined;
```

### 2. `contexts/OrganizationContext.tsx` - Null Safety Guards
- Added defensive property access for `currentMembership`
- Added type checks: `typeof currentMembership === 'object' && 'membershipId' in currentMembership`
- Protected `memberships` with `Array.isArray()` check
- Guarded all `targetOrganization` property access
- Protected error message extraction

### 3. `services/convex.ts` - Lazy Initialization
**Before:**
```typescript
export const convexClient = new ConvexReactClient(convexUrl);
```

**After:**
```typescript
let _convexClient: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (!_convexClient) {
    try {
      const url = getConvexUrl();
      _convexClient = new ConvexReactClient(url);
    } catch (error) {
      console.error("Failed to initialize Convex client:", error);
      throw error;
    }
  }
  return _convexClient;
}
export const convexClient = getConvexClient();
```

### 4. `hooks/useTimer.ts` - Defensive Guards
- Added null checks in `calculateElapsed()` timer function
- Protected `runningTimer.startedAt` access with type validation
- Added defensive access to `nextInterruptAt` and `awaitingInterruptAck`

### 5. `services/soundManager.ts` - Lazy Loading
```typescript
let _soundManager: SoundManager | null = null;
function getSoundManager(): SoundManager {
  if (!_soundManager) {
    _soundManager = new SoundManager();
  }
  return _soundManager;
}
```

### 6. `services/timerNotification.ts` - Lazy Loading
```typescript
let _timerNotificationService: TimerNotificationService | null = null;
function getTimerNotificationService(): TimerNotificationService {
  if (!_timerNotificationService) {
    _timerNotificationService = new TimerNotificationService();
  }
  return _timerNotificationService;
}
```

### 7. `app/_layout.tsx` - Crash Guards
- Wrapped provider initialization in try-catch
- Added null safety to navigation segment array access
- Protected splash screen hiding with .catch()
- Added error handlers to notification initialization

---

## ✅ Phase 2: Suspect Package Removal (For Testing)

These packages were **temporarily commented out** to test if they cause the crash:

### 1. Unistyles (Line 7)
```typescript
// 🔍 CRASH TEST: Commenting out Unistyles to test if it causes Hermes crash
// import "../styles/unistyles";
```
**Reason:** Creates stylesheet objects with many properties at module load time

### 2. React Native Reanimated (Line 16)
```typescript
// 🔍 CRASH TEST: Commenting out reanimated to test if it causes Hermes crash
// import 'react-native-reanimated';
```
**Reason:** Animation library with native module initialization

### 3. FontAwesome Font Spread (Line 44)
```typescript
const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // ...FontAwesome.font,  // COMMENTED OUT FOR TESTING
});
```
**Reason:** Object spread operation that iterates over many icon properties

### 4. Notification Initialization (Lines 62-71)
```typescript
// 🔍 CRASH TEST: Commenting out notification init to test if it causes Hermes crash
// useEffect(() => {
//   const timer = setTimeout(() => {
//     initializeNotifications().catch((err) => {
//       console.error("Failed to initialize notifications in _layout:", err);
//     });
//   }, 0);
//   return () => clearTimeout(timer);
// }, []);
```
**Reason:** Native module initialization with channel creation

### 5. Notifications Import (Line 27)
```typescript
// 🔍 CRASH TEST: Commenting out notifications import (module may load at import time)
// import { initializeNotifications } from "../services/notifications";
```
**Reason:** Prevents notification module from loading at all

---

## 🎯 Testing Strategy

### Current State
- ✅ All Phase 1 null safety fixes applied
- ✅ All Phase 2 suspect packages removed
- ⏳ Ready to build and test

### Next Steps

**1. Build Minimal Version:**
```bash
cd apps/mobile
eas build --profile production --platform ios
```

**2. Test on TestFlight:**
- Install build on device
- Launch app
- **Does it crash on startup?**

**3. Results Analysis:**

#### ✅ If app DOES NOT crash:
One of the removed packages was the culprit. Add back **one at a time**:
1. Re-enable Unistyles → Test
2. Re-enable Reanimated → Test
3. Re-enable FontAwesome → Test
4. Re-enable Notifications → Test

When crash reappears, you've found the culprit!

#### ❌ If app STILL crashes:
The problem is in providers or organization context. Next steps:
1. Remove OrganizationProvider
2. Remove ConvexAuthProvider
3. Test with minimal providers

---

## 📊 Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `app.config.ts` | Safe string operations | Avoid array operations |
| `contexts/OrganizationContext.tsx` | Null safety guards | Prevent null dereference |
| `services/convex.ts` | Lazy initialization | Defer object creation |
| `hooks/useTimer.ts` | Defensive guards | Protect property access |
| `services/soundManager.ts` | Lazy loading | Defer singleton creation |
| `services/timerNotification.ts` | Lazy loading | Defer singleton creation |
| `app/_layout.tsx` | Crash guards + package removal | Prevent crashes & isolate culprit |

---

## 🔄 Restoring Original Code

If you need to restore the original `_layout.tsx`:

```bash
# View changes
git diff apps/mobile/app/_layout.tsx

# Restore original
git checkout apps/mobile/app/_layout.tsx
```

Or manually uncomment all the test changes (search for `🔍 CRASH TEST`).

---

## 📝 Build Commands

```bash
# Build for TestFlight
cd apps/mobile
eas build --profile production --platform ios

# Check build status
eas build:list

# View build logs
eas build:view [build-id]

# Local release test (faster)
npx expo run:ios --configuration Release
```

---

## 🎯 Next Actions

1. **Build** the minimal version
2. **Upload** to TestFlight
3. **Test** on device
4. **Document** result in `MINIMAL_BUILD_TEST.md`
5. If no crash: **Add back packages one-by-one**
6. If still crashes: **Follow STARTUP_CRASH_ANALYSIS.md Stage D**

---

## 💡 Key Insight

**If crash happens before landing page loads:**
- ✅ Problem is in module-level code (_layout.tsx imports)
- ❌ NOT in route-specific components (timer screen, etc.)

**Execution order:**
1. Module imports (Unistyles, Reanimated, services)
2. RootLayout renders (fonts, providers)
3. RootLayoutNav renders (auth check, routing)
4. Landing page renders (marketing content)
5. **ONLY THEN** timer screen loads (if authenticated)

The crash happens in steps 1-3, so that's where we're focusing! 🎯

---

Good luck! 🚀
