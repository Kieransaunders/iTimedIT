# Startup Crash Analysis - Critical Insight

## 🔥 Key Finding: Crash Happens BEFORE Landing Page

Based on your observation, if the app crashes **on startup** (before you even see the landing page), then:

**❌ NOT the problem:**
- Timer screen (`app/(tabs)/index.tsx`)
- Any tab screens
- Components that load after authentication
- Route-specific code

**✅ The problem MUST be:**
- Code that runs during **module initialization** (top-level imports)
- Providers in `_layout.tsx` that initialize immediately
- Services that create singletons at import time
- Hooks that run in RootLayoutNav before rendering

---

## 🎯 Execution Order Analysis

Here's what loads BEFORE the landing page appears:

### 1. **Module-Level Imports** (Immediate)
```typescript
// app/_layout.tsx (lines 1-24)
import "react-native-get-random-values";        // ✅ Simple polyfill
import "react-native-url-polyfill/auto";        // ✅ Simple polyfill
import "../styles/unistyles";                    // ⚠️ SUSPECT: Stylesheet creation
import { convex } from "../services/convex";     // ⚠️ SUSPECT: ConvexClient creation
```

**Crash could happen here if:**
- Unistyles creates objects with properties during module load
- ConvexClient constructor allocates memory (FIXED with lazy loading)

### 2. **RootLayout Component** (Fonts Loading)
```typescript
const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  ...FontAwesome.font,  // ⚠️ SUSPECT: Font object spread
});
```

**Crash could happen here if:**
- Spreading `FontAwesome.font` creates properties dynamically
- Font loading triggers native module calls

### 3. **Notification Initialization**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    initializeNotifications().catch((err) => {
      console.error("Failed to initialize notifications in _layout:", err);
    });
  }, 0);
  return () => clearTimeout(timer);
}, []);
```

**Crash could happen here if:**
- `initializeNotifications()` creates notification channel objects
- Native module bridge has timing issues

### 4. **Provider Tree**
```typescript
<GestureHandlerRootView style={{ flex: 1 }}>
  <ConvexAuthProvider client={convex} storage={AsyncStorage}>  // ⚠️ SUSPECT
    <ThemeProvider>  // ⚠️ SUSPECT
      <RootLayoutNav />
    </ThemeProvider>
  </ConvexAuthProvider>
</GestureHandlerRootView>
```

**Crash could happen here if:**
- `ConvexAuthProvider` creates internal state objects
- `ThemeProvider` allocates theme objects with many properties
- Provider initialization is too early for Hermes VM

### 5. **RootLayoutNav Component** (Auth Check)
```typescript
function RootLayoutNav() {
  const { user, isLoading } = useAuth();  // ⚠️ SUSPECT: Convex query
  const router = useRouter();
  const segments = useSegments();  // ⚠️ SUSPECT: Array operations (FIXED)

  // Navigation redirect logic (lines 97-117)
  useEffect(() => {
    // ... segment checking and routing
  }, [user, isLoading, segments]);
```

**Crash could happen here if:**
- `useAuth()` triggers Convex query that creates objects
- Router/segments access triggers property allocation
- Navigation redirect happens before Hermes is stable

---

## 🔍 Most Likely Culprits (Based on Crash Analysis)

### #1: **Unistyles Import** (`import "../styles/unistyles"`)

**Evidence:**
- Runs during module initialization (before React renders)
- Creates stylesheet objects with many properties
- Known to have initialization issues in release builds

**Why it matches the crash:**
- `DictPropertyMap::findOrAdd()` crash happens when adding properties to objects
- Unistyles creates large style objects at module load time
- Hermes optimizer may deallocate property maps during stylesheet creation

**Test:**
Comment out line 6 in `app/_layout.tsx`:
```typescript
// import "../styles/unistyles";  // 🔍 TEST: Comment this out
```

---

### #2: **FontAwesome.font Spread** (`...FontAwesome.font`)

**Evidence:**
- Object spread operation (`...`) triggers property enumeration
- FontAwesome.font likely has many icon definitions as properties
- Happens during `useFonts()` initialization

**Why it matches the crash:**
- Spread operator iterates over object properties and adds them one-by-one
- In release builds, Hermes optimizes this aggressively
- Could trigger `DictPropertyMap::findOrAdd()` crash if property map is null

**Test:**
```typescript
const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // ...FontAwesome.font,  // 🔍 TEST: Comment this out
});
```

---

### #3: **ConvexAuthProvider Initialization**

**Evidence:**
- Creates auth client with internal state objects
- Connects to AsyncStorage (async operation)
- Happens before landing page renders

**Why it matches the crash:**
- Provider initialization creates context value object
- `client={convex}` passes ConvexClient with complex internal state
- May trigger property allocation before Hermes is ready

**Test:**
Replace provider with minimal version in `_layout.tsx`:
```typescript
// Temporarily remove to test
// <ConvexAuthProvider client={convex} storage={AsyncStorage}>
  <ThemeProvider>
    <RootLayoutNav />
  </ThemeProvider>
// </ConvexAuthProvider>
```

---

## 🎯 Recommended Testing Order

Based on the crash log and code analysis:

### Stage A: Test Unistyles (Highest Probability)
```bash
# Edit app/_layout.tsx line 6
# // import "../styles/unistyles";

eas build --profile production --platform ios
```

**Why first:** Module-level code, creates many objects, runs before everything

---

### Stage B: Test FontAwesome Spread
```bash
# Edit app/_layout.tsx lines 40-43
# const [loaded, error] = useFonts({
#   SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
#   // ...FontAwesome.font,
# });

eas build --profile production --platform ios
```

**Why second:** Object spread operation during initialization

---

### Stage C: Test Notification Init
```bash
# Comment out lines 58-68 in app/_layout.tsx

eas build --profile production --platform ios
```

**Why third:** Async native module call during startup

---

### Stage D: Test Minimal Providers
```bash
# Remove all providers except Stack in RootLayoutNav

eas build --profile production --platform ios
```

**Why fourth:** Provider initialization complexity

---

## 📊 Testing Checklist

| Stage | What to Remove | Probability | Result | Notes |
|-------|---------------|-------------|---------|-------|
| A | Unistyles import | 🔥 40% | ⬜ | Module-level stylesheet creation |
| B | FontAwesome.font spread | 🔥 30% | ⬜ | Object spread during init |
| C | Notification init | 🔥 20% | ⬜ | Native module timing |
| D | ConvexAuthProvider | 🔥 10% | ⬜ | Provider with complex state |

---

## 🚀 Quick Start

### Test Stage A (Unistyles) RIGHT NOW:

```bash
# 1. Comment out Unistyles
sed -i.bak 's/import "..\/styles\/unistyles";/\/\/ import "..\/styles\/unistyles";/' apps/mobile/app/_layout.tsx

# 2. Build for TestFlight
cd apps/mobile
eas build --profile production --platform ios

# 3. Monitor build
eas build:list

# 4. If crash is fixed, Unistyles was the culprit!
```

---

## 💡 If Unistyles Is the Problem

**Workarounds:**

1. **Defer Unistyles initialization**:
```typescript
// Instead of top-level import
// import "../styles/unistyles";

// Initialize in useEffect
useEffect(() => {
  import("../styles/unistyles").catch(err => {
    console.error("Failed to load Unistyles:", err);
  });
}, []);
```

2. **Use StyleSheet.create() instead**:
Replace Unistyles with React Native's built-in StyleSheet

3. **Update Unistyles version**:
Check if newer version fixes the crash

---

## 🔬 Advanced: Check What Loads in Landing Page

The landing page (`app/index.tsx`) imports:

```typescript
import { useAuth } from "../hooks/useAuth";  // ⚠️ Triggers Convex query
import { HeroSection } from "../components/marketing/HeroSection";  // UI only
import { FeatureCard } from "../components/marketing/FeatureCard";  // UI only
import { CTAButtons } from "../components/marketing/CTAButtons";  // UI only
```

**Key point:** `useAuth()` runs a Convex query immediately, which could trigger the crash if OrganizationContext is the problem.

---

## ✅ Next Steps

1. **Test Stage A (Unistyles)** first - highest probability
2. **If crash persists**, move to Stage B (FontAwesome)
3. **If crash persists**, move to Stage C (Notifications)
4. **Document results** in the checklist above
5. **Once you find the culprit**, we can implement a proper fix

---

## 📝 Notes from Crash Log

```
Thread 10 Crashed:
0   hermes: hermes::vm::DictPropertyMap::findOrAdd + 52
```

This is **React Native's JS thread**, which means:
- ✅ The crash happens during JavaScript execution
- ✅ It's triggered by property addition to an object
- ✅ It happens **before** the landing page renders (or you'd see it)
- ❌ It's NOT triggered by user interaction (no navigation yet)

**Conclusion:** The crash is in **module initialization** or **provider setup**, NOT in route-specific components.

Good luck! 🎯
