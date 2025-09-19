# Quickstart: Timer Interruption System

## Overview
This guide demonstrates the timer interruption system functionality through common user scenarios.

## Prerequisites
1. User logged in with configured settings
2. At least one project created
3. Interruption settings configured (or using defaults)

## Scenario 1: Basic Interruption Flow

### Steps
1. **Start a timer**
   ```javascript
   // User clicks "Start Timer" on a project
   await convex.mutation(api.timer.start, { projectId: "project123" })
   // Timer starts, nextInterruptAt scheduled for +30 minutes (default)
   ```

2. **Wait for interruption** (or simulate by advancing time)
   ```javascript
   // After 30 minutes, interrupt.check runs automatically
   // User sees modal: "Are you still working?"
   ```

3. **Acknowledge - Continue Working**
   ```javascript
   // User clicks "Yes, I'm still working"
   await convex.mutation(api.timer.ackInterrupt, { continue: true })
   // Timer continues, next interruption in 30 minutes
   ```

4. **Stop timer manually**
   ```javascript
   // User clicks "Stop Timer"
   await convex.mutation(api.timer.stop)
   // Time entry created with source="timer"
   ```

### Expected Results
- Timer runs continuously with periodic checks
- Modal appears at configured intervals
- Timer continues after acknowledgment
- Clean time entry with accurate duration

## Scenario 2: Auto-Stop with Grace Period

### Steps
1. **Start a timer with short interval** (testing)
   ```javascript
   // Configure 5-minute interruptions for testing
   await convex.mutation(api.userSettings.update, {
     interruptInterval: 5,
     interruptEnabled: true
   })
   await convex.mutation(api.timer.start, { projectId: "project456" })
   ```

2. **Close browser when interruption appears**
   ```javascript
   // After 5 minutes, modal appears
   // User closes browser/tab without responding
   ```

3. **Grace period expires** (60 seconds)
   ```javascript
   // interrupt.autoStopIfNoAck runs after 60 seconds
   // Creates two entries:
   // 1. Original timer entry (source="autoStop")
   // 2. Overrun entry (source="overrun", isOverrun=true)
   ```

4. **Return to app later**
   ```javascript
   // User opens app again
   // Sees notification: "Timer was auto-stopped at 10:35 AM"
   // Shows overrun time: "15 minutes of potential work time"
   ```

### Expected Results
- Timer auto-stops after 60-second grace period
- Two entries created (stopped + overrun)
- User notified on return
- Option to merge overrun time

## Scenario 3: Overrun Recovery

### Steps
1. **Review auto-stopped timer**
   ```javascript
   // Query shows both entries
   const entries = await convex.query(api.entries.recent)
   // Shows: autoStop entry (5 min) + overrun entry (15 min open)
   ```

2. **User was actually working - merge time**
   ```javascript
   // User clicks "I was working - merge this time"
   await convex.mutation(api.timer.mergeOverrun, {
     overrunId: "overrun789",
     targetId: "entry456"
   })
   ```

3. **Verify merged result**
   ```javascript
   // Original entry now has 20 minutes total
   // Overrun entry marked as merged/deleted
   ```

### Expected Results
- Overrun time successfully merged
- Single clean entry for billing
- Audit trail preserved

## Scenario 4: Multi-Tab Synchronization

### Steps
1. **Open app in multiple tabs**
2. **Start timer in Tab 1**
3. **Wait for interruption**
   - Both tabs show modal simultaneously
4. **Acknowledge in Tab 2**
   - Modal disappears in both tabs instantly
5. **Timer continues in both tabs**

### Expected Results
- Synchronized interruption state
- Single acknowledgment sufficient
- No duplicate modals or actions

## Scenario 5: Stale Heartbeat Detection

### Steps
1. **Start timer**
2. **Put laptop to sleep** (or kill browser process)
3. **Wait > 5 minutes**
4. **Optional sweep cron detects stale timer**
   ```javascript
   // interrupt.sweep runs every minute
   // Finds timer with lastHeartbeatAt > 5 min old
   // Auto-stops with overrun tracking
   ```

### Expected Results
- Stale timer detected and stopped
- Overrun entry created for recovery
- User notified when returning

## Testing Checklist

### Functional Tests
- [ ] Timer starts with correct nextInterruptAt
- [ ] Interruption modal appears at scheduled time
- [ ] Continue button schedules next interruption
- [ ] Stop button creates correct time entry
- [ ] Grace period triggers after 60 seconds
- [ ] Auto-stop creates both entries correctly
- [ ] Overrun merge combines time accurately
- [ ] Multi-tab sync works correctly
- [ ] Heartbeat updates every 30 seconds
- [ ] Stale detection after 5 minutes

### Edge Cases
- [ ] Browser crash during interruption
- [ ] Network disconnect during acknowledgment
- [ ] Timezone changes during timer
- [ ] Multiple rapid acknowledgments
- [ ] Starting new timer with pending overrun

### Performance Tests
- [ ] Modal appears within 1 second of scheduled time
- [ ] Acknowledgment processes < 100ms
- [ ] Heartbeat doesn't impact UI performance
- [ ] 100+ concurrent timers handled smoothly

## Configuration

### Default Settings
```typescript
{
  interruptInterval: 30,      // minutes
  interruptEnabled: true,      // feature on/off
  graceperiod: 60,            // seconds (fixed)
  heartbeatInterval: 30,      // seconds (fixed)
  staleThreshold: 300        // 5 minutes (fixed)
}
```

### User-Configurable Options
- Interrupt interval: 5, 15, 30, 60, or 120 minutes
- Feature enable/disable toggle

## Troubleshooting

### Modal doesn't appear
1. Check interruptEnabled setting
2. Verify timer is running (query runningTimers)
3. Check nextInterruptAt timestamp
4. Look for console errors

### Timer stops unexpectedly
1. Check for stale heartbeat (> 5 min)
2. Review interrupt.autoStopIfNoAck logs
3. Verify no manual stop called

### Overrun not created
1. Confirm autoStop source on entry
2. Check for existing overrun entries
3. Review interrupt.autoStopIfNoAck execution

## Success Metrics
- Zero lost billable time
- < 1% false auto-stops
- 95% of interruptions acknowledged within 30 seconds
- Zero duplicate timer incidents