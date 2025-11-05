# Mobile App Error Handling Analysis

## Summary

The mobile app has **GOOD** error handling, with some areas for improvement.

---

## ✅ What's Working Well

### 1. Network Error Handling (`networkErrorHandler.ts`)
**Status**: ✅ Excellent

**Features**:
- ✅ Exponential backoff retry logic
- ✅ Retryable error detection
- ✅ Offline detection
- ✅ User-friendly error messages
- ✅ Configurable retry options

**Implementation**:
```typescript
// Used in useTimer hook
await NetworkErrorHandler.withRetry(async () => {
  await startMutation({ projectId, category, pomodoroEnabled, startedFrom: "mobile" });
}, { maxRetries: 3 });
```

**Strengths**:
- Automatically retries network failures
- Shows appropriate alerts (offline vs network error)
- Integrates well with Convex mutations

### 2. Error Pattern Matching in `useTimer.ts`
**Status**: ✅ Good

**Implementation** (lines 322-357):
```typescript
catch (err: any) {
  let errorMessage = "Failed to start timer";

  if (err?.message) {
    const msg = err.message;

    if (msg.includes("Project not found")) {
      errorMessage = "This project no longer exists...";
    } else if (msg.includes("archived project")) {
      errorMessage = "Cannot start timer for archived projects...";
    } else if (msg.includes("don't have permission")) {
      errorMessage = "You don't have permission to use this project.";
    }
    // ... more patterns
  }

  setError(errorMessage);
  throw new Error(errorMessage);
}
```

**Strengths**:
- Catches specific backend error messages
- Translates to user-friendly mobile alerts
- Handles workspace/permission errors

### 3. Enhanced Error Handler (`errorHandler.ts`)
**Status**: ✅ Excellent (newly created)

**Features**:
- ✅ Error categories (AUTHENTICATION, VALIDATION, NOT_FOUND, etc.)
- ✅ Convex error extraction
- ✅ Alert-based error display
- ✅ Retry handler with exponential backoff
- ✅ Silent error logging

**Note**: User added `UNKNOWN` category to handle edge cases.

---

## 🟡 Areas for Improvement

### 1. Integration Gap
**Issue**: New `errorHandler.ts` utilities not yet used in hooks

**Current State**:
- `useTimer.ts` - Uses pattern matching (✅ working)
- `useProjects.ts` - Unknown error handling
- `useClients.ts` - Unknown error handling
- `useAuth.ts` - Has own error handling (✅ working)

**Recommendation**: Gradually integrate `errorHandler.ts` utilities

**Example Migration**:
```typescript
// BEFORE (current)
catch (err: any) {
  let errorMessage = "Failed to start timer";
  if (err?.message?.includes("Project not found")) {
    errorMessage = "This project no longer exists...";
  }
  setError(errorMessage);
  throw new Error(errorMessage);
}

// AFTER (recommended)
import { handleError, extractConvexErrorData } from "@/utils/errorHandler";

catch (err: any) {
  const errorData = extractConvexErrorData(err);
  if (errorData) {
    // Use structured error from backend
    setError(errorData.userMessage);
    handleError(err, "useTimer.startTimer", onRetry);
  } else {
    // Fallback to pattern matching for non-Convex errors
    setError(err?.message || "Failed to start timer");
  }
}
```

### 2. Missing Validation Helpers
**Issue**: No TypeScript-side validation utilities

**Current State**:
- All validation happens on backend (Convex)
- Mobile sends raw input

**Recommendation**: Add lightweight client-side validation

**Example**:
```typescript
// apps/mobile/utils/validation.ts
export function validateProjectSelection(projectId: string | null): boolean {
  if (!projectId) {
    Alert.alert("No Project Selected", "Please select a project before starting the timer.");
    return false;
  }
  return true;
}

// In useTimer.ts
const startTimer = async (projectId, category) => {
  if (!validateProjectSelection(projectId)) {
    return; // Early exit
  }

  await NetworkErrorHandler.withRetry(async () => {
    await startMutation({ projectId, category });
  });
};
```

**Benefits**:
- Faster feedback (no network round-trip)
- Saves backend resources
- Better UX (instant validation)

### 3. Error Logging/Tracking
**Issue**: Console-only logging, no error tracking service

**Current State**:
```typescript
catch (err) {
  console.error("Failed to start timer:", err);
  // No tracking to external service
}
```

**Recommendation**: Integrate Sentry or similar

**Example**:
```typescript
import * as Sentry from "@sentry/react-native";

catch (err) {
  console.error("Failed to start timer:", err);

  // Track in Sentry with context
  Sentry.captureException(err, {
    tags: {
      component: "useTimer",
      action: "startTimer",
      workspace: currentWorkspace,
    },
    extra: {
      projectId,
      category,
      pomodoroEnabled,
    },
  });

  setError(errorMessage);
}
```

---

## 🔍 Comparison: Mobile vs Web Error Handling

| Feature | Mobile | Web | Winner |
|---------|--------|-----|--------|
| **Network Retry** | ✅ NetworkErrorHandler | ❌ Not implemented | 🏆 Mobile |
| **Structured Errors** | 🟡 Partial (pattern matching) | ✅ Full (ConvexError) | 🏆 Web |
| **Error Boundaries** | ❌ N/A (React Native) | ✅ ErrorBoundary component | 🏆 Web |
| **Validation Helpers** | ❌ Backend only | ✅ Full validation module | 🏆 Web |
| **Error Categories** | ✅ errorHandler.ts (new) | ✅ errorHandling.ts | 🏆 Tie |
| **User-Friendly Messages** | ✅ Pattern matching | ✅ Structured | 🏆 Tie |
| **Offline Support** | ✅ NetworkErrorHandler | 🟡 Basic | 🏆 Mobile |
| **Error Tracking** | ❌ Console only | ❌ Console only | 🏆 Neither |

---

## ✅ Mobile-Specific Strengths

### 1. Battery Optimization Handling
```typescript
// After starting timer, check if we should request battery exemption
const shouldRequest = await shouldRequestBatteryOptimization();
if (shouldRequest) {
  setTimeout(() => {
    requestBatteryOptimizationExemption();
  }, 2000);
}
```
**Verdict**: ✅ Excellent mobile-specific consideration

### 2. Platform-Aware Notifications
```typescript
// Detect timer started from web
if (startedFrom === "web") {
  scheduleLocalNotification(
    "Timer Started on Web",
    `${runningTimer?.project?.name} timer is now running`
  );
}
```
**Verdict**: ✅ Great cross-platform awareness

### 3. Workspace Switching Protection
```typescript
// Stop timer if workspace changes while running
if (previousWorkspace !== currentWorkspace && runningTimer) {
  console.warn("Workspace changed during active timer session");
  stopTimerRef.current().catch(console.error);
}
```
**Verdict**: ✅ Prevents data inconsistency

---

## 🎯 Recommendations

### Priority 1: Integrate Convex Error Extraction (Easy Win)
**Effort**: Low (1-2 hours)
**Impact**: High

Update `useTimer.ts` to use `extractConvexErrorData()`:

```typescript
import { extractConvexErrorData } from "@/utils/errorHandler";

catch (err: any) {
  const errorData = extractConvexErrorData(err);

  if (errorData) {
    // Backend sent structured error
    setError(errorData.userMessage);

    // Show alert if not retryable
    if (!errorData.retryable) {
      Alert.alert(
        getErrorTitle(errorData.category),
        errorData.userMessage
      );
    }
  } else {
    // Fallback to pattern matching
    setError(err?.message || "Failed to start timer");
  }
}
```

**Benefits**:
- Consistent with web app error handling
- Leverages backend validation
- Less pattern matching code

### Priority 2: Add Client-Side Validation (Medium Effort)
**Effort**: Medium (3-4 hours)
**Impact**: Medium

Create `apps/mobile/utils/validation.ts` with common validations:
- Project selection validation
- Time range validation
- Input sanitization

### Priority 3: Set Up Error Tracking (Medium Effort)
**Effort**: Medium (2-3 hours setup)
**Impact**: High

Integrate Sentry for production error tracking:
1. Install: `npx expo install @sentry/react-native`
2. Configure in `App.tsx`
3. Add to catch blocks

### Priority 4: Unified Error Handler (Low Priority)
**Effort**: High (8+ hours)
**Impact**: Low (already working well)

Merge `NetworkErrorHandler` and `errorHandler` utilities into single system.

**Note**: Not urgent - current approach works well

---

## 🧪 Testing Recommendations

### Scenarios to Test

#### ✅ Already Covered
1. Network retry on failure
2. Offline detection
3. Pattern matching for backend errors
4. Workspace switching during timer

#### 🟡 Needs Testing
1. **Convex Error Integration**
   - Test with new structured errors from backend
   - Verify category-based handling works
   - Check retry logic for retryable errors

2. **Edge Cases**
   - Timer started on web, stopped on mobile
   - Project deleted while timer running
   - Network failure during heartbeat
   - Rapid workspace switching

3. **Error Recovery**
   - User can retry after network error
   - State recovered correctly after error
   - No orphaned timers after crash

### Test Plan

```typescript
// apps/mobile/__tests__/hooks/useTimer.test.tsx
describe('useTimer error handling', () => {
  it('extracts Convex error data correctly', async () => {
    const convexError = {
      data: {
        category: 'NOT_FOUND',
        userMessage: 'Project not found',
        retryable: false,
      }
    };

    // Test error extraction
    const errorData = extractConvexErrorData(convexError);
    expect(errorData?.userMessage).toBe('Project not found');
    expect(errorData?.retryable).toBe(false);
  });

  it('retries network errors', async () => {
    let attempts = 0;
    const mutation = jest.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('network request failed');
      return { success: true };
    });

    await NetworkErrorHandler.withRetry(mutation);
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    const mutation = jest.fn(async () => {
      throw new Error('Project not found');
    });

    await expect(
      NetworkErrorHandler.withRetry(mutation)
    ).rejects.toThrow('Project not found');
    expect(mutation).toHaveBeenCalledTimes(1);
  });
});
```

---

## 📊 Overall Assessment

### Score: 8/10 (Very Good)

**Strengths**:
- ✅ Robust network error handling
- ✅ Good user-facing error messages
- ✅ Mobile-specific considerations (battery, notifications)
- ✅ Workspace protection logic
- ✅ New error handler utilities created

**Weaknesses**:
- 🟡 New error utilities not yet integrated
- 🟡 No client-side validation
- 🟡 No error tracking service
- 🟡 Pattern matching could be replaced with structured errors

**Verdict**: **The mobile app has good error handling that works well in production.** The new `errorHandler.ts` utilities provide a path for future improvements, but the current implementation is solid and safe.

---

## 🚀 Action Plan

### Immediate (Optional)
Nothing urgent - current implementation is production-ready

### Short-term (This Month)
1. Integrate `extractConvexErrorData()` in useTimer
2. Add Sentry error tracking
3. Write tests for error scenarios

### Long-term (Next Quarter)
1. Add client-side validation
2. Unify error handling utilities
3. Create error analytics dashboard

---

## Example: Ideal Error Flow

```typescript
// Current Flow (Working Well)
User starts timer
  ↓
NetworkErrorHandler.withRetry() catches network errors
  ↓
Pattern matching catches specific backend errors
  ↓
User sees clear message: "This project no longer exists..."
  ↓
✅ User knows what to do

// Ideal Flow (With Integration)
User starts timer
  ↓
NetworkErrorHandler.withRetry() catches network errors
  ↓
extractConvexErrorData() extracts structured error
  ↓
Alert shows category-specific title + user message
  ↓
Error logged to Sentry with context
  ↓
✅ Better tracking, same UX
```

---

## Conclusion

**The mobile app's error handling is in good shape.** It has:
- Solid network error handling with retry
- Good user-facing error messages
- Mobile-specific considerations
- A path forward with new utilities

**No urgent changes needed** - the app is production-ready as-is. The recommendations are for incremental improvements over time.
