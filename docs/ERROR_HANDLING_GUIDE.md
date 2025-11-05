# Error Handling & Crash Prevention Guide

## Overview

This document provides comprehensive guidance on error handling, crash prevention, and testing for the iTimedIT application (both web and mobile).

## Table of Contents

1. [Critical Issues Found](#critical-issues-found)
2. [Error Handling Architecture](#error-handling-architecture)
3. [Implementation Guide](#implementation-guide)
4. [Testing Procedures](#testing-procedures)
5. [Monitoring & Logging](#monitoring--logging)

---

## Critical Issues Found

### 1. Missing Null/Undefined Checks

**Location**: `apps/web/convex/timer.ts:67-68`

**Issue**:
```typescript
const project = await ctx.db.get(timer.projectId);
const client = project?.clientId ? await ctx.db.get(project.clientId) : null;
```

**Problem**: If `project` is null (deleted), the next line still attempts to access `project.clientId`.

**Fix**: Use validation helpers from `errorHandling.ts`:
```typescript
const project = await ctx.db.get(timer.projectId);
validateProject(project, timer.projectId);
const client = project.clientId ? await ctx.db.get(project.clientId) : null;
```

### 2. Incomplete Error Handling in Mutations

**Locations**:
- `apps/web/convex/timer.ts` - All mutation functions
- `apps/web/convex/entries.ts` - CRUD operations
- `apps/web/convex/projects.ts` - Project management

**Issue**: Most mutations throw generic JavaScript errors instead of structured ConvexErrors.

**Problem**:
- Users see technical error messages
- No distinction between retryable and non-retryable errors
- Hard to track error categories

**Fix Example**:
```typescript
// BEFORE
if (!project) {
  throw new Error("Project not found");
}

// AFTER
import { NotFoundError, throwAppError } from "./errorHandling";
const project = await ctx.db.get(args.projectId);
if (!project) {
  throwAppError(NotFoundError.project(args.projectId));
}
```

### 3. Missing Input Validation

**Locations**: Throughout Convex functions

**Issue**: Direct use of user input without validation.

**Problem**:
- Negative numbers for budgets
- Empty strings after trimming
- Excessively long strings
- Invalid time ranges

**Fix Example**:
```typescript
import { validateString, validateNumber, validateTimeRange } from "./errorHandling";

// Validate string inputs
const name = validateString(args.name, "project name", {
  minLength: 1,
  maxLength: 100,
  trim: true,
});

// Validate numeric inputs
const hourlyRate = validateNumber(args.hourlyRate, "hourly rate", {
  min: 0.01,
  max: 100000,
});

// Validate time ranges
validateTimeRange(args.startedAt, args.stoppedAt);
```

### 4. No Error Boundaries in React Web App

**Location**: `apps/web/src/App.tsx`

**Issue**: No error boundary wrapping the main application.

**Problem**: Uncaught errors crash the entire app with blank screen.

**Fix**: Wrap main app with ErrorBoundary:
```typescript
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

### 5. Insufficient Mobile Error Handling

**Location**: `apps/mobile/hooks/useAuth.ts`, `apps/mobile/hooks/useTimer.ts`

**Issue**: Generic try-catch blocks without proper error categorization.

**Problem**:
- Users don't know if error is retryable
- No network error detection
- Poor offline experience

**Fix**: Use error handler utilities:
```typescript
import { withErrorHandling, handleError } from "@/utils/errorHandler";

// In hooks
const result = await withErrorHandling(
  () => mutation({ ... }),
  "useTimer.start",
  undefined,
  true // show alert
);
```

### 6. Race Conditions in Timer Operations

**Location**: `apps/web/convex/timer.ts:166-181`

**Issue**: Checking for multiple timers without proper locking.

**Problem**:
- User clicks "start" multiple times quickly
- Multiple timers could be created
- Data inconsistency

**Fix**: Add idempotency checks:
```typescript
// Check for VERY recent timer (within 2 seconds)
const existingTimer = await getRunningTimerForUser(ctx, userId, organizationId);
if (existingTimer && (now - existingTimer.startedAt) < 2000) {
  return { success: true, timerId: existingTimer._id, nextInterruptAt: existingTimer.nextInterruptAt };
}
```

### 7. Missing Workspace Initialization Error Handling

**Location**: `apps/web/src/App.tsx:115-139`

**Issue**: Workspace initialization can fail silently in some cases.

**Problem**:
- New OAuth users may not get Personal Workspace created
- App shows loading spinner indefinitely
- No clear error message

**Current Fix**: Already implemented with retry logic and error toast.

---

## Error Handling Architecture

### Backend (Convex Functions)

```
┌─────────────────────────────────────────┐
│ Client (Web/Mobile)                      │
│ Makes request with invalid data         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Convex Function                          │
│ 1. Validate inputs (errorHandling.ts)   │
│ 2. Check permissions (orgContext.ts)    │
│ 3. Perform operation with try-catch     │
│ 4. Throw structured ConvexError         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Error Response                           │
│ {                                        │
│   category: "VALIDATION",                │
│   message: "Technical details",          │
│   userMessage: "User-friendly message",  │
│   retryable: false,                      │
│   details: { field: "name" }             │
│ }                                        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Client Error Handler                     │
│ 1. Check error category                 │
│ 2. Show appropriate UI (toast/alert)    │
│ 3. Log error with context               │
│ 4. Offer retry if applicable             │
└─────────────────────────────────────────┘
```

### Frontend Error Handling Layers

1. **Error Boundary** (React components)
   - Catches rendering errors
   - Provides fallback UI
   - Prevents white screen crashes

2. **Hook-level Error Handling** (useAuth, useTimer, etc.)
   - Wraps Convex mutations/queries
   - Shows user-friendly toasts/alerts
   - Manages loading/error states

3. **Network Error Detection**
   - Detects offline state
   - Shows appropriate messages
   - Enables retry mechanisms

4. **Global Error Handlers** (Mobile only)
   - Catches unhandled promise rejections
   - Logs to error tracking service
   - Last line of defense

---

## Implementation Guide

### Step 1: Update Convex Functions

1. **Import error handling utilities**:
```typescript
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
  throwAppError,
  validateString,
  validateNumber,
  validateTimeRange,
} from "./errorHandling";
```

2. **Add validation at function start**:
```typescript
export const create = mutation({
  args: {
    name: v.string(),
    hourlyRate: v.number(),
    // ...
  },
  handler: async (ctx, args) => {
    // Validate inputs
    const name = validateString(args.name, "project name", {
      minLength: 1,
      maxLength: 100,
    });

    const hourlyRate = validateNumber(args.hourlyRate, "hourly rate", {
      min: 0.01,
      max: 100000,
    });

    // ... rest of function
  },
});
```

3. **Replace generic errors**:
```typescript
// BEFORE
if (!project) {
  throw new Error("Project not found");
}

// AFTER
if (!project) {
  throwAppError(NotFoundError.project(args.projectId));
}
```

### Step 2: Add Error Boundaries (Web)

1. **Wrap main app**:
```typescript
// apps/web/src/App.tsx
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

2. **Wrap critical features**:
```typescript
// Around timer component
<ErrorBoundary fallback={<TimerErrorFallback />}>
  <ModernDashboard />
</ErrorBoundary>
```

### Step 3: Enhance Mobile Error Handling

1. **Use error handler utilities**:
```typescript
// apps/mobile/hooks/useTimer.ts
import { withErrorHandling, handleError } from "@/utils/errorHandler";

export function useTimer() {
  const startTimer = useCallback(async (projectId: string) => {
    const result = await withErrorHandling(
      () => startMutation({ projectId: projectId as Id<"projects"> }),
      "useTimer.start"
    );

    if (result) {
      // Success
      return result;
    }
  }, [startMutation]);

  return { startTimer, /* ... */ };
}
```

2. **Add retry logic for network operations**:
```typescript
import { createRetryHandler } from "@/utils/errorHandler";

const fetchWithRetry = createRetryHandler(
  () => query(api.projects.listAll, {}),
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt) => {
      console.log(`Retrying... attempt ${attempt}`);
    },
  }
);
```

### Step 4: Add Defensive Checks

1. **Always validate before using**:
```typescript
// BEFORE
const client = await ctx.db.get(project.clientId);

// AFTER
const client = project.clientId ? await ctx.db.get(project.clientId) : null;
if (project.clientId && !client) {
  // Client was deleted, log but don't fail
  console.warn(`Client ${project.clientId} not found for project ${project._id}`);
}
```

2. **Check for stale references**:
```typescript
// Verify project still exists before starting timer
const project = await ctx.db.get(args.projectId);
if (!project) {
  throwAppError(NotFoundError.project(args.projectId));
}
```

3. **Handle concurrent operations**:
```typescript
// Check if timer was created very recently (prevents double-click issues)
const now = Date.now();
if (existingTimer && (now - existingTimer.startedAt) < 2000) {
  return { success: true, timerId: existingTimer._id };
}
```

---

## Testing Procedures

### Unit Tests (Convex Functions)

```typescript
// apps/web/tests/contract/timer.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

test("start timer with invalid project", async () => {
  const t = convexTest(schema);

  await expect(
    t.mutation(api.timer.start, {
      projectId: t.id("projects") as any, // Non-existent ID
    })
  ).rejects.toThrow("Project not found");
});

test("start timer with archived project", async () => {
  const t = convexTest(schema);

  // Create archived project
  const projectId = await t.mutation(api.projects.create, {
    name: "Test",
    hourlyRate: 100,
    budgetType: "hours",
    budgetHours: 10,
    archived: true,
  });

  await expect(
    t.mutation(api.timer.start, { projectId })
  ).rejects.toThrow("archived");
});

test("timer validation - negative duration", async () => {
  const t = convexTest(schema);

  await expect(
    t.mutation(api.timer.createManualEntry, {
      projectId: t.id("projects"),
      startedAt: Date.now(),
      stoppedAt: Date.now() - 1000, // Before start time
    })
  ).rejects.toThrow("end time must be after start time");
});
```

### Integration Tests (Web)

```typescript
// apps/web/tests/integration/timer-flow.test.ts
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModernDashboard } from "../src/components/ModernDashboard";

test("shows error when starting timer with deleted project", async () => {
  render(<ModernDashboard />);

  // Click project that was just deleted
  await userEvent.click(screen.getByText("Deleted Project"));
  await userEvent.click(screen.getByText("Start"));

  // Should show error toast
  await waitFor(() => {
    expect(screen.getByText(/project.*not found/i)).toBeInTheDocument();
  });
});

test("recovers from error and allows retry", async () => {
  render(<ModernDashboard />);

  // Simulate network error
  mockNetworkError();

  await userEvent.click(screen.getByText("Start"));

  // Should show error with retry option
  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  // Restore network
  restoreNetwork();

  // Retry should work
  await userEvent.click(screen.getByText("Retry"));

  await waitFor(() => {
    expect(screen.getByText("Timer started")).toBeInTheDocument();
  });
});
```

### E2E Tests (Mobile)

```typescript
// apps/mobile/__tests__/e2e/timer.test.tsx
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TimerScreen } from "@/app/(tabs)/index";

test("handles offline gracefully", async () => {
  // Simulate offline
  mockOffline();

  const { getByText } = render(<TimerScreen />);

  fireEvent.press(getByText("Start Timer"));

  await waitFor(() => {
    expect(getByText(/no internet connection/i)).toBeTruthy();
  });
});

test("shows error for archived project", async () => {
  const { getByText } = render(<TimerScreen />);

  // Select archived project
  fireEvent.press(getByText("Archived Project"));
  fireEvent.press(getByText("Start"));

  await waitFor(() => {
    expect(getByText(/archived.*unarchive/i)).toBeTruthy();
  });
});
```

### Manual Testing Checklist

#### Critical Error Scenarios

- [ ] **Invalid Input**
  - [ ] Start timer with empty project name
  - [ ] Create project with negative hourly rate
  - [ ] Create manual entry with end time before start time
  - [ ] Create project with name > 100 characters

- [ ] **Not Found Scenarios**
  - [ ] Start timer with deleted project
  - [ ] Edit time entry that was deleted
  - [ ] View project detail for deleted project
  - [ ] Switch to deleted workspace

- [ ] **Permission Errors**
  - [ ] Access another user's personal project
  - [ ] Delete project as member (non-owner)
  - [ ] Invite user as member (non-admin)

- [ ] **Conflict Scenarios**
  - [ ] Start timer while timer is running
  - [ ] Start timer on archived project
  - [ ] Delete project with time entries
  - [ ] Delete client with projects

- [ ] **Network Errors**
  - [ ] Go offline and try to start timer
  - [ ] Lose connection during timer operation
  - [ ] Slow network (throttled to 3G)

- [ ] **Race Conditions**
  - [ ] Double-click "Start Timer" button
  - [ ] Start timer on two devices simultaneously
  - [ ] Edit same entry on web and mobile at once

- [ ] **Edge Cases**
  - [ ] Create 100 projects and try to load them
  - [ ] Run timer for 24+ hours
  - [ ] Create manual entry spanning midnight
  - [ ] Switch workspaces while timer is running

---

## Monitoring & Logging

### Error Logging Best Practices

1. **Log with context**:
```typescript
console.error(`[Timer Error - start]`, {
  userId,
  projectId: args.projectId,
  organizationId,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

2. **Use structured logging**:
```typescript
import { logTimerError } from "./timerHelpers";

logTimerError("start", error, {
  userId,
  projectId: args.projectId,
  workspaceType: isPersonal ? "personal" : "work",
});
```

3. **Track error rates**:
```typescript
// Add to error handler
const errorMetrics = {
  category: error.category,
  retryable: error.retryable,
  timestamp: Date.now(),
};

// TODO: Send to analytics service
```

### Error Tracking Integration

**Recommended**: Sentry for both web and mobile

```typescript
// apps/web/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// apps/mobile/App.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
});
```

### Convex Dashboard Monitoring

1. Navigate to: https://dashboard.convex.dev/d/basic-greyhound-928
2. Check "Functions" tab for error rates
3. Check "Logs" tab for error messages
4. Set up alerts for error spikes

### Key Metrics to Monitor

1. **Error Rate**: Errors per 1000 requests
2. **Error Categories**: Distribution of error types
3. **Retryable vs Non-Retryable**: Ratio
4. **Time to Recovery**: How long users take to recover from errors
5. **Silent Failures**: Operations that fail without user notification

---

## Quick Reference

### Common Error Patterns

```typescript
// ✅ GOOD - Structured error with user message
if (!project) {
  throwAppError(NotFoundError.project(args.projectId));
}

// ❌ BAD - Generic error
if (!project) {
  throw new Error("Project not found");
}

// ✅ GOOD - Validate before use
const name = validateString(args.name, "project name", {
  minLength: 1,
  maxLength: 100,
});

// ❌ BAD - Direct use without validation
const name = args.name.trim();

// ✅ GOOD - Safe property access
const client = project.clientId ? await ctx.db.get(project.clientId) : null;

// ❌ BAD - Unsafe property access
const client = await ctx.db.get(project.clientId);
```

### Error Response Format

```typescript
{
  category: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | ...,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  message: "Technical details for logging",
  userMessage: "User-friendly message",
  details: { field: "name", reason: "..." },
  retryable: true | false,
  timestamp: 1699999999999
}
```

---

## Next Steps

1. **Phase 1** (Week 1): Implement error handling in critical paths
   - Timer start/stop/reset
   - Project create/update/delete
   - Entry create/edit/delete

2. **Phase 2** (Week 2): Add validation to all Convex functions
   - Input validation
   - Permission checks
   - Data consistency checks

3. **Phase 3** (Week 3): Enhance frontend error handling
   - Error boundaries
   - Retry mechanisms
   - Offline support

4. **Phase 4** (Week 4): Testing & monitoring
   - Unit tests for error cases
   - Integration tests
   - Set up error tracking
   - Monitor and iterate

---

## Support

For questions or issues:
- Check Convex logs: https://dashboard.convex.dev
- Review error tracking dashboard (Sentry)
- Contact: support@itimedit.com
