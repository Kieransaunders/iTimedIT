# Timer Screen Crash Debugging - Step by Step

The mobile app's timer screen (`app/(tabs)/index.tsx`) is **574 lines** and the most complex component in the app. This is the prime suspect for the Hermes crash.

## 🎯 Testing Strategy

We'll replace the complex timer screen with progressively more complex versions to isolate the exact code causing the crash.

---

## 📋 Before You Start

**Current State:**
- ✅ Original file backed up at: `app/(tabs)/index.tsx.backup`
- ✅ Placeholder created at: `app/(tabs)/index.PLACEHOLDER.tsx`
- ✅ All null safety fixes applied to:
  - `app.config.ts` (string operations)
  - `contexts/OrganizationContext.tsx` (property access)
  - `services/convex.ts` (lazy initialization)
  - `hooks/useTimer.ts` (defensive guards)
  - `services/soundManager.ts` (lazy loading)
  - `services/timerNotification.ts` (lazy loading)
  - `app/_layout.tsx` (crash guards)

---

## 🧪 Test 1: Minimal Placeholder (No Timer Logic)

**Goal**: Test if the crash is in the timer screen or elsewhere

### Steps:
```bash
# 1. Replace with minimal placeholder
cp apps/mobile/app/\(tabs\)/index.PLACEHOLDER.tsx apps/mobile/app/\(tabs\)/index.tsx

# 2. Build for TestFlight
cd apps/mobile
eas build --profile production --platform ios

# 3. Upload to TestFlight and test
```

### Expected Results:

**✅ If app DOES NOT crash:**
- The issue is **definitely in the timer screen** (`index.tsx`)
- Proceed to Test 2 to isolate which part

**❌ If app STILL crashes:**
- The issue is **NOT in the timer screen**
- The problem is in one of:
  - Providers (_layout.tsx)
  - Organization context
  - Notification system
  - A global service/hook
- Refer to `CRASH_DEBUG_GUIDE.md` for provider-level debugging

---

## 🧪 Test 2: Add Timer Hook Only

**Goal**: Test if `useTimer()` hook causes the crash

### Create: `app/(tabs)/index.TEST2.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/utils/ThemeContext";
import { useTimer } from "@/hooks/useTimer";

export default function Index() {
  const { colors } = useTheme();

  // 🔍 TEST 2: Add useTimer hook
  const {
    runningTimer,
    elapsedTime,
    isLoading,
    error,
  } = useTimer();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        🔍 Test 2: Timer Hook
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Timer Running: {runningTimer ? "Yes" : "No"}
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Elapsed: {elapsedTime}s
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Loading: {isLoading ? "Yes" : "No"}
      </Text>

      {error && (
        <Text style={[styles.error, { color: "red" }]}>
          Error: {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  info: { fontSize: 16, marginBottom: 8 },
  error: { fontSize: 14, marginTop: 16 },
});
```

### Test:
```bash
cp apps/mobile/app/\(tabs\)/index.TEST2.tsx apps/mobile/app/\(tabs\)/index.tsx
eas build --profile production --platform ios
```

**✅ If NO crash**: `useTimer()` is safe, proceed to Test 3
**❌ If CRASH**: Issue is in `useTimer()` hook - focus debugging there

---

## 🧪 Test 3: Add Projects Hook

**Goal**: Test if `useProjects()` hook causes the crash

### Create: `app/(tabs)/index.TEST3.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useTheme } from "@/utils/ThemeContext";
import { useTimer } from "@/hooks/useTimer";
import { useProjects } from "@/hooks/useProjects";

export default function Index() {
  const { colors } = useTheme();
  const { runningTimer, elapsedTime } = useTimer();

  // 🔍 TEST 3: Add useProjects hook
  const { projects, currentWorkspace } = useProjects();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        🔍 Test 3: Projects Hook
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Timer: {elapsedTime}s
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Workspace: {currentWorkspace}
      </Text>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        Projects: {projects?.length ?? 0}
      </Text>

      {projects && projects.length > 0 && (
        <FlatList
          data={projects.slice(0, 3)}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Text style={[styles.project, { color: colors.text }]}>
              • {item.name}
            </Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, marginBottom: 8 },
  project: { fontSize: 14, marginLeft: 16, marginTop: 4 },
});
```

### Test:
```bash
cp apps/mobile/app/\(tabs\)/index.TEST3.tsx apps/mobile/app/\(tabs\)/index.tsx
eas build --profile production --platform ios
```

**✅ If NO crash**: Hooks are safe, proceed to Test 4
**❌ If CRASH**: Issue is in `useProjects()` or project rendering

---

## 🧪 Test 4: Add Timer Display Component

**Goal**: Test if `LargeTimerDisplay` component causes the crash

### Create: `app/(tabs)/index.TEST4.tsx`

```typescript
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/utils/ThemeContext";
import { useTimer } from "@/hooks/useTimer";
import { useProjects } from "@/hooks/useProjects";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";

export default function Index() {
  const { colors } = useTheme();
  const { runningTimer, elapsedTime, selectedProject } = useTimer();
  const { projects } = useProjects();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 🔍 TEST 4: Add LargeTimerDisplay */}
      <LargeTimerDisplay
        elapsedTime={elapsedTime}
        isRunning={!!runningTimer}
        project={selectedProject}
        pomodoroPhase={runningTimer?.pomodoroPhase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
});
```

### Test:
```bash
cp apps/mobile/app/\(tabs\)/index.TEST4.tsx apps/mobile/app/\(tabs\)/index.tsx
eas build --profile production --platform ios
```

**✅ If NO crash**: Timer display is safe, proceed to Test 5
**❌ If CRASH**: Issue is in `LargeTimerDisplay` component

---

## 🧪 Test 5: Add Timer Controls

**Goal**: Test if `TimerControls` component with mutations causes the crash

### Create: `app/(tabs)/index.TEST5.tsx`

```typescript
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/utils/ThemeContext";
import { useTimer } from "@/hooks/useTimer";
import { LargeTimerDisplay } from "@/components/timer/LargeTimerDisplay";
import { TimerControls } from "@/components/timer/TimerControls";

export default function Index() {
  const { colors } = useTheme();
  const {
    runningTimer,
    elapsedTime,
    selectedProject,
    startTimer,
    stopTimer,
    resetTimer,
  } = useTimer();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LargeTimerDisplay
        elapsedTime={elapsedTime}
        isRunning={!!runningTimer}
        project={selectedProject}
        pomodoroPhase={runningTimer?.pomodoroPhase}
      />

      {/* 🔍 TEST 5: Add TimerControls with mutations */}
      <TimerControls
        isRunning={!!runningTimer}
        isDisabled={!selectedProject}
        onStart={() => selectedProject && startTimer(selectedProject._id)}
        onStop={stopTimer}
        onReset={resetTimer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
});
```

### Test:
```bash
cp apps/mobile/app/\(tabs\)/index.TEST5.tsx apps/mobile/app/\(tabs\)/index.tsx
eas build --profile production --platform ios
```

**✅ If NO crash**: Controls are safe, proceed to Test 6
**❌ If CRASH**: Issue is in `TimerControls` or mutation handling

---

## 🧪 Test 6: Full Screen (All Features)

**Goal**: Restore full timer screen to see if the issue was fixed by earlier changes

### Steps:
```bash
# Restore original file
cp apps/mobile/app/\(tabs\)/index.tsx.backup apps/mobile/app/\(tabs\)/index.tsx

# Build and test
eas build --profile production --platform ios
```

**✅ If NO crash**: All the null safety fixes we applied resolved the issue! 🎉
**❌ If CRASH**: We know which test introduced the crash, focus debugging there

---

## 📊 Results Tracker

| Test | Component/Hook | Result | Notes |
|------|---------------|--------|-------|
| 1 | Minimal Placeholder | ⬜ | No hooks, just UI |
| 2 | + useTimer() | ⬜ | Timer state hook |
| 3 | + useProjects() | ⬜ | Projects hook |
| 4 | + LargeTimerDisplay | ⬜ | Timer display component |
| 5 | + TimerControls | ⬜ | Start/stop buttons with mutations |
| 6 | Full Screen | ⬜ | Original 574-line component |

---

## 🎯 Quick Reference

### Restore Original File
```bash
cp apps/mobile/app/\(tabs\)/index.tsx.backup apps/mobile/app/\(tabs\)/index.tsx
```

### Check Which File is Active
```bash
head -5 apps/mobile/app/\(tabs\)/index.tsx
```

### Build Commands
```bash
# Local release test
npx expo run:ios --configuration Release

# EAS production build
eas build --profile production --platform ios

# Check build status
eas build:list
```

---

## 🔍 Key Suspects in Original Timer Screen

Based on the crash analysis, these sections are most suspicious:

1. **Lines 73-88**: Budget status monitoring with `useEffect` and `calculateBudgetStatus`
2. **Lines 135-153**: Elapsed time formatting with string operations
3. **Lines 215-237**: Timer start handler with complex state updates
4. **Lines 295-350**: Project carousel rendering with animations
5. **Lines 450-500**: Entry list rendering with date calculations

If you identify which test causes the crash, focus on these sections in the corresponding component.

---

## 💡 Pro Tips

1. **Check Xcode Console**: Watch for logs right before crash
2. **Symbolicate Crash Logs**: Use the crash log from TestFlight to pinpoint exact line
3. **Test Locally First**: Use `--configuration Release` to reproduce before uploading to TestFlight
4. **One Change at a Time**: Only add one component/hook per test
5. **Document Everything**: Keep notes in the tracker table

Good luck! 🚀
