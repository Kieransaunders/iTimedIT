# Research: Timer Interruption System

## Overview
Research findings for implementing server-side timer interruption checks using Convex scheduler capabilities.

## Key Decisions

### 1. Scheduling Pattern
**Decision**: Use scheduler.runAt for precise per-user interrupt timing
**Rationale**: Provides exact timing control, continues working when browser closed, supports user-specific intervals
**Alternatives considered**:
- scheduler.cron: Less precise (minute resolution), not user-specific
- Client-side intervals: Fails when tab/browser closed, unreliable

### 2. Interrupt Flow Architecture
**Decision**: Pattern A - Server alarms with scheduler.runAt
**Rationale**:
- Precise per-second timing for grace periods
- Zero reliance on browser being open
- Fully idempotent with state checks before actions
**Alternatives considered**:
- Pattern B - Sweeper cron: Lower precision (~1 minute resolution)
- Hybrid approach: Unnecessary complexity for MVP

### 3. State Management
**Decision**: Store interrupt state in runningTimers table with dedicated fields
**Rationale**:
- Single source of truth for timer and interrupt state
- Atomic updates prevent race conditions
- Efficient queries with existing indexes
**Fields added**:
- `nextInterruptAt`: Schedule next check timestamp
- `awaitingInterruptAck`: Boolean flag for pending response
- `interruptShownAt`: Timestamp when modal displayed

### 4. Grace Period Implementation
**Decision**: 60-second fixed grace period with scheduled auto-stop job
**Rationale**:
- Reasonable time for user to notice and respond
- Prevents indefinite billing for abandoned sessions
- Simple to understand and implement
**Alternatives considered**:
- Configurable grace period: Added complexity, 60s covers most cases
- No grace period: Too aggressive, poor UX

### 5. Overrun Handling
**Decision**: Create separate timeEntry with isOverrun=true and source="overrun"
**Rationale**:
- Clear audit trail of auto-stops
- Allows user to review and merge if legitimate
- Preserves data integrity
**Implementation**:
- Auto-stopped entry gets source="autoStop"
- New overrun entry starts at auto-stop time
- Merge UI combines entries if user confirms

### 6. Heartbeat Strategy
**Decision**: 30-second heartbeat interval with 5-minute stale threshold
**Rationale**:
- Balances server load with responsiveness
- Detects crashed/sleeping clients reliably
- Works well with Convex's connection model
**Alternatives considered**:
- No heartbeat: Can't detect stale clients
- Shorter interval: Unnecessary server load

### 7. Multi-tab Synchronization
**Decision**: Use Convex subscriptions for real-time state sync
**Rationale**:
- Built-in Convex feature, no custom implementation
- Instant updates across all tabs
- Handles race conditions automatically
**Implementation**: Single modal response updates all tabs via reactive queries

### 8. Convex Function Types
**Decision**: Use actions for scheduled functions, mutations for user interactions
**Rationale**:
- Actions support longer runtime for scheduled jobs
- Mutations provide atomic updates for user actions
- Clear separation of concerns
**Function breakdown**:
- Actions: interrupt.check, interrupt.autoStopIfNoAck
- Mutations: timer.start, timer.stop, timer.ackInterrupt, timer.heartbeat

## Technical Specifications

### Timing Defaults
- Heartbeat: every 30 seconds
- Interrupt intervals: 5, 15, 30, 60, 120 minutes (user configurable)
- Grace window: 60 seconds (fixed)
- Stale heartbeat threshold: 5 minutes

### Database Schema Updates
```typescript
runningTimers: {
  // Existing fields...
  nextInterruptAt: v.optional(v.number()),  // Next scheduled interrupt
  awaitingInterruptAck: v.boolean(),        // Modal is showing
  interruptShownAt: v.optional(v.number())  // When modal was shown
}

timeEntries: {
  // Existing fields...
  source: v.union(
    v.literal("manual"),
    v.literal("timer"),
    v.literal("autoStop"),  // Auto-stopped by interrupt
    v.literal("overrun")     // Potential working time after auto-stop
  ),
  isOverrun: v.boolean()
}
```

### Scheduled Job Idempotency
All scheduled jobs re-check current state before acting:
- Compare timestamps to detect stale jobs
- Verify flags haven't changed
- No-op if state has changed since scheduling

## Implementation Priority
1. Core interrupt flow with scheduler.runAt
2. Grace period and auto-stop
3. Overrun tracking and merge UI
4. Heartbeat and stale detection
5. Multi-tab synchronization
6. Settings UI for interval configuration

## Risk Mitigation
- **Double-click protection**: Re-read state in all mutations
- **Stale job handling**: Timestamp comparison in scheduled functions
- **Clock skew**: Always use server time (Date.now())
- **Race conditions**: Atomic Convex mutations with optimistic locking

## Resolved Clarifications
All technical decisions have been made based on the comprehensive implementation details provided. No NEEDS CLARIFICATION items remain.