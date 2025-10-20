# Mobile App Enhancement Tasks

**Project Goal:** Transform the mobile timer dashboard into a world-class experience with sliding project panels and lock screen timer display.

---

## 🎯 Priority 1: Sliding Project Panels (User Requested)

### Phase 1.1: Horizontal Recent Projects Carousel

#### Core Implementation
- [x] Create `apps/mobile/components/timer/ProjectCarousel.tsx`
  - [x] Implement `FlatList` with `horizontal={true}`
  - [x] Add `snapToInterval` for card-to-card snapping
  - [x] Set `decelerationRate="fast"` for crisp stopping
  - [x] Hide scrollbar with `showsHorizontalScrollIndicator={false}`
  - [x] Enable touch-optimized scrolling with `scrollEventThrottle={16}`

- [x] Create `apps/mobile/components/timer/ProjectCard.tsx`
  - [x] Design 280px wide card layout
  - [x] Add 4px color-coded left border (project color)
  - [x] Display: Project name, client, hourly rate
  - [x] Add "Today's time logged" for this project
  - [x] Implement subtle gradient background based on project color
  - [x] Add elevated shadow for active card
  - [x] Implement scale animation on selection

#### Visual Indicators
- [x] Add pagination dots component below carousel
  - [x] Show current position in carousel
  - [x] Animate dot transitions

- [x] Implement edge fade gradients (like web dashboard)
  - [x] Left edge fade when scrolled right
  - [x] Right edge fade when more content available

- [ ] Add "Swipe for more →" hint
  - [ ] Show on first app open
  - [ ] Fade after first interaction
  - [ ] Store dismissal state in AsyncStorage

#### Sections & Organization
- [x] Create separate carousel sections:
  - [x] "Recent Projects" (last 5 used)
  - [x] "Personal Projects" carousel
  - [x] "Work Projects" carousel

- [x] Make sections collapsible
  - [x] Add animated chevron icon
  - [x] Smooth expand/collapse animation
  - [ ] Store collapsed state in AsyncStorage

#### Integration
- [x] Update `apps/mobile/app/(tabs)/index.tsx`
  - [x] Remove old project selector
  - [x] Add carousel above timer display
  - [x] Connect to `useProjects` hook
  - [x] Handle project selection from carousel

---

## 🎯 Priority 2: Enhanced Dashboard Information

### Phase 2.1: Today's Summary Card

- [x] Create `apps/mobile/components/timer/TodaySummaryCard.tsx`
  - [x] Show today's total tracked time (large, prominent)
  - [x] Display number of entries today
  - [x] Show top project today with color indicator
  - [x] Calculate and display earnings today

- [x] Add collapsible functionality
  - [x] Tap to expand → hourly breakdown chart
  - [x] Swipe down to collapse
  - [x] Smooth animation transitions

- [x] Add dismissal option
  - [x] "Don't show again" button
  - [x] Store preference in AsyncStorage
  - [x] Re-enable from Settings

- [x] Integrate into dashboard
  - [x] Place ABOVE project carousel
  - [x] Add to `apps/mobile/app/(tabs)/index.tsx`

### Phase 2.2: Relocate Footer Banner

- [x] Create `apps/mobile/components/common/TipsBottomSheet.tsx`
  - [x] Convert footer content to bottom sheet
  - [x] Add smooth slide-up animation
  - [x] Include dismiss functionality

- [x] Update `apps/mobile/app/(tabs)/index.tsx`
  - [x] Remove fixed footer (`<CompanionAppFooter />`)
  - [x] Add "💡 Tips" button (replaced header "?" button)
  - [x] Connect to tips bottom sheet

- [x] Add first-time experience
  - [x] Show automatically on first 3 app opens
  - [x] Track with AsyncStorage counter
  - [x] Don't interrupt active timer

### Phase 2.3: Enhanced Timer Display

#### Animations
- [x] Update `apps/mobile/components/timer/LargeTimerDisplay.tsx`
  - [x] Add pulsing glow effect when running (React Native Animated)
  - [x] Implement color transitions based on budget status
  - [x] Increase font size to 100-120px (adaptive)
  - [x] Use Menlo (iOS) / monospace (Android) for crispness

- [ ] Create `apps/mobile/components/timer/TimerProgressRing.tsx`
  - [ ] Use `react-native-svg` for circular progress
  - [ ] Animate ring fill based on budget usage
  - [ ] Color-code: green (safe), yellow (near limit), red (exceeded)
  - [ ] Add to timer display

#### Contextual Information
- [ ] Create `apps/mobile/components/timer/ProjectBudgetBar.tsx`
  - [ ] Show budget progress bar (if project has budget)
  - [ ] Display time logged TODAY on this project
  - [ ] Show last entry timestamp
  - [ ] Integrate below timer display

---

## 🎯 Priority 3: Micro-interactions & Delight

### Phase 3.1: Gesture Interactions

- [ ] Add long-press to project cards
  - [ ] Create quick action menu modal
  - [ ] Actions: "View Details", "Start Timer", "Add to Favorites ⭐"
  - [ ] Add haptic feedback on long-press

- [ ] Implement pull-to-refresh
  - [ ] Add `RefreshControl` to main ScrollView
  - [ ] Sync with Convex backend on pull
  - [ ] Show loading indicator

- [ ] (Optional) Swipe timer gesture
  - [ ] Swipe up → Start timer
  - [ ] Swipe down → Stop timer
  - [ ] Needs user testing before implementation

### Phase 3.2: Haptic Feedback

- [x] Create `apps/mobile/utils/haptics.ts`
  - [x] Centralize haptic feedback functions
  - [x] Export: `lightTap()`, `mediumTap()`, `heavyTap()`, `softTap()`

- [ ] Update `apps/mobile/components/timer/TimerControls.tsx`
  - [ ] Add light tap on project selection
  - [ ] Add medium tap on timer start
  - [ ] Add heavy tap on timer stop

- [x] Add to carousel
  - [x] Soft tap on carousel collapse/expand
  - [x] Light tap on card press

### Phase 3.3: Animations

- [ ] Install dependencies
  - [ ] `react-native-reanimated` (already installed ✅)
  - [ ] `react-native-confetti-cannon` for celebrations

- [ ] Implement timer start/stop animations
  - [ ] Scale + fade in controls on start
  - [ ] Smooth color transition

- [ ] Add project selection animations
  - [ ] Card elevation on selection
  - [ ] Subtle glow effect

- [ ] Budget warning animations
  - [ ] Gentle pulsing (not jarring)
  - [ ] Color shift animation

- [ ] Entry saved celebration
  - [ ] Subtle confetti burst
  - [ ] Haptic + visual feedback

---

## 🎯 Priority 4: Smart Features

### Phase 4.1: Quick Actions

- [ ] Create `apps/mobile/components/timer/FloatingActionButton.tsx`
  - [ ] Position: Bottom right (above tab bar)
  - [ ] Action: Quick-start last used project
  - [ ] Add bounce animation on mount

- [ ] Add long-press menu to FAB
  - [ ] Show recent 3 projects
  - [ ] Quick tap to start any project
  - [ ] Smooth popup animation

- [ ] Add "⚡ Quick Start" to project cards
  - [ ] Button on each carousel card
  - [ ] Starts timer without closing carousel
  - [ ] Haptic feedback on tap

### Phase 4.2: Contextual Intelligence

- [ ] Create `apps/mobile/hooks/useSmartSuggestions.ts`
  - [ ] Analyze timer usage patterns
  - [ ] Detect time-of-day preferences
  - [ ] Return suggested project at current time

- [ ] Implement smart suggestions UI
  - [ ] "You usually work on [Project] at this time"
  - [ ] Show at top of carousel (9-10am)
  - [ ] Dismissible with "Not now" button

- [ ] Add budget warnings
  - [ ] Yellow glow when 80% budget used
  - [ ] Red pulsing when 95%+ used
  - [ ] Local notification when budget exceeded

### Phase 4.3: Favorites System

- [ ] Create `apps/mobile/hooks/useFavoriteProjects.ts`
  - [ ] CRUD operations for favorites
  - [ ] Persist in AsyncStorage
  - [ ] Sync order/changes

- [ ] Add star icon to project cards
  - [ ] Toggle favorite state on tap
  - [ ] Animate star fill/unfill
  - [ ] Show filled star for favorites

- [ ] Create favorites section
  - [ ] "⭐ Favorites" carousel at top
  - [ ] Always visible above recent projects
  - [ ] Drag to reorder (future enhancement)

---

## 🎯 Priority 5: Lock Screen Timer Display

### Phase 5.1: Timer Notification Service

- [ ] Create `apps/mobile/services/timerNotification.ts`
  - [ ] `startTimerNotification(project, startTime)`
  - [ ] `updateTimerNotification(elapsedSeconds)`
  - [ ] `stopTimerNotification()`
  - [ ] Platform-specific implementations

#### Android Implementation
- [ ] Update `apps/mobile/services/notifications.ts`
  - [ ] Create "timer-foreground" channel
  - [ ] Set `importance: HIGH`
  - [ ] Set `lockscreenVisibility: PUBLIC`
  - [ ] Configure `ongoing: true`

- [ ] Design notification layout
  - [ ] Content title: "iTimedIT Timer Running"
  - [ ] Content text: "Project: [Name] • HH:MM:SS"
  - [ ] Add project color to notification
  - [ ] Add Stop and Pause action buttons

#### iOS Implementation
- [ ] Create timer notification category
  - [ ] Set `categoryIdentifier: "timer-running"`
  - [ ] Set `interruptionLevel: "timeSensitive"`
  - [ ] Silent updates (no sound)

- [ ] Design notification content
  - [ ] Title: "[Project Name]"
  - [ ] Subtitle: "Timer Running"
  - [ ] Body: "HH:MM:SS"
  - [ ] Add actions: "Stop Timer", "View Details"

### Phase 5.2: Background Timer Updates

- [ ] Create `apps/mobile/services/timerBackgroundTask.ts`
  - [ ] Define task with `TaskManager.defineTask`
  - [ ] Get timer state from AsyncStorage
  - [ ] Calculate elapsed time
  - [ ] Update notification
  - [ ] Return success status

- [ ] Implement platform-specific update logic
  - [ ] **Android**: 3-second update intervals (foreground service)
  - [ ] **iOS**: 5-second notification updates (system limit)

- [ ] Register/unregister task lifecycle
  - [ ] Register when timer starts
  - [ ] Unregister when timer stops
  - [ ] Handle app termination (Android only)

### Phase 5.3: Integration with Timer Hook

- [ ] Update `apps/mobile/hooks/useTimer.ts`
  - [ ] Import `TimerNotificationService`
  - [ ] Call `startTimerNotification()` in `startTimer()`
  - [ ] Call `stopTimerNotification()` in `stopTimer()`
  - [ ] Register background task on timer start
  - [ ] Unregister on timer stop

- [ ] Add notification update on foreground
  - [ ] Detect app state changes
  - [ ] Update notification when app becomes active
  - [ ] Sync elapsed time

- [ ] Handle notification actions
  - [ ] Add handler in `useNotifications.ts`
  - [ ] Case 'STOP_TIMER': call `stopTimer()`
  - [ ] Case 'PAUSE_TIMER': call `pauseTimer()` (future)

### Phase 5.4: UI/UX Polish

#### Custom Android Notification Layout
- [ ] Design rich notification layout
  - [ ] Large elapsed time (60pt font)
  - [ ] Project color bar on left edge
  - [ ] Client name subtitle
  - [ ] Hourly rate + earnings counter

- [ ] Implement using RemoteViews (if possible with Expo)
  - [ ] Or use `expo-notifications` advanced options

#### Settings Integration
- [ ] Update `apps/mobile/app/(tabs)/settings.tsx`
  - [ ] Add "Show timer on lock screen" toggle
  - [ ] Store preference in Convex user settings
  - [ ] Disable/enable notification service based on preference

#### Battery Optimization (Android)
- [ ] Create `apps/mobile/services/batteryOptimization.ts`
  - [ ] Check if battery optimization is enabled
  - [ ] Detect optimization status
  - [ ] Provide method to request exemption

- [ ] Show battery optimization prompt
  - [ ] Detect on first timer start
  - [ ] Alert with explanation
  - [ ] Button to open device settings
  - [ ] Don't show again option

### Phase 5.5: App Configuration

- [ ] Update `apps/mobile/app.json`
  - [ ] **iOS**: Add `"processing"` to `UIBackgroundModes`
  - [ ] **Android**: Add permissions:
    - [ ] `FOREGROUND_SERVICE`
    - [ ] `WAKE_LOCK`
    - [ ] `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
  - [ ] Add `expo-notifications` plugin config

- [ ] Update `apps/mobile/app.config.ts`
  - [ ] Add Android foreground service config
  - [ ] Set notification ID, channel, title, message
  - [ ] Configure notification icon

---

## 🎯 Priority 6: Visual Polish

### Phase 6.1: Dark Mode Refinements

- [ ] Update `apps/mobile/utils/theme.ts`
  - [ ] Change dark background to OLED black (#000000)
  - [ ] Ensure vibrant project colors pop
  - [ ] Add subtle glow effects on cards

- [ ] Test all components in dark mode
  - [ ] Timer display readability
  - [ ] Project card contrast
  - [ ] Notification visibility

### Phase 6.2: Accessibility

- [ ] Audit tap target sizes
  - [ ] Ensure min 44x44pt for all interactive elements
  - [ ] Increase if needed

- [ ] Add VoiceOver/TalkBack support
  - [ ] Label all interactive elements
  - [ ] Set `accessibilityRole` props
  - [ ] Add `accessibilityHint` where helpful

- [ ] Implement high contrast mode
  - [ ] Detect system setting
  - [ ] Increase border widths
  - [ ] Use higher contrast colors

- [ ] Support reduced motion preference
  - [ ] Detect `AccessibilityInfo.isReduceMotionEnabled()`
  - [ ] Disable animations when enabled
  - [ ] Keep functional transitions only

### Phase 6.3: Loading States

- [ ] Create skeleton components
  - [ ] Project card skeleton
  - [ ] Timer display skeleton
  - [ ] Summary card skeleton

- [ ] Add shimmer effect
  - [ ] Use `react-native-reanimated`
  - [ ] Smooth shimmer animation

- [ ] Implement optimistic UI
  - [ ] Instant feedback on timer start/stop
  - [ ] Sync with backend in background
  - [ ] Rollback on error

---

## 🧪 Testing & Quality Assurance

### Feature Testing
- [ ] Test sliding project panels
  - [ ] Smooth scrolling on various devices
  - [ ] Snap-to-card behavior
  - [ ] Pagination dots accuracy
  - [ ] Fade indicators visibility

- [ ] Test lock screen timer
  - [ ] Notification appears on lock screen (both platforms)
  - [ ] Timer updates accurately (±2 seconds over 8 hours)
  - [ ] Stop/Pause buttons work from lock screen
  - [ ] Notification removes on timer stop

### Performance Testing
- [ ] Measure battery impact
  - [ ] Run 1-hour timer session
  - [ ] Monitor battery drain (target: <3% per hour)
  - [ ] Test with screen locked

- [ ] Test FPS during carousel scroll
  - [ ] Ensure 60fps on mid-range devices
  - [ ] Optimize if needed with `getItemLayout`

- [ ] Memory leak testing
  - [ ] Run timer for 4+ hours
  - [ ] Monitor memory usage
  - [ ] Check for listener cleanup

### Edge Cases
- [ ] Timer notification during phone calls
- [ ] Behavior in Do Not Disturb mode
- [ ] Multiple foreground services (Android)
- [ ] App termination/restart scenarios
- [ ] Low memory conditions
- [ ] Offline functionality
- [ ] Rapid timer start/stop/start cycles

### Device Testing
- [ ] Test on iOS devices
  - [ ] iPhone 14 Pro (Dynamic Island)
  - [ ] iPhone 13 (standard)
  - [ ] iPhone SE (small screen)

- [ ] Test on Android devices
  - [ ] Pixel 7 (latest Android)
  - [ ] Samsung S21 (One UI)
  - [ ] Budget device (low-end specs)

---

## 📦 Dependencies to Install

- [x] Install `expo-linear-gradient` ✅
  ```bash
  npm install expo-linear-gradient --workspace=@itimedit/mobile
  ```

- [ ] Install `react-native-confetti-cannon`
  ```bash
  npm install react-native-confetti-cannon --workspace=@itimedit/mobile
  ```

---

## 📚 Documentation

- [ ] Create user guide
  - [ ] How to use sliding project panels
  - [ ] How to enable lock screen timer
  - [ ] Battery optimization instructions (Android)

- [ ] Update README.md
  - [ ] Document new features
  - [ ] Add screenshots
  - [ ] Include setup instructions

- [ ] Code documentation
  - [ ] Add JSDoc comments to all new services
  - [ ] Document props for new components
  - [ ] Add inline comments for complex logic

---

## 🚀 Launch Checklist

- [ ] All tests passing
- [ ] No console warnings or errors
- [ ] Performance metrics met
- [ ] Accessibility audit complete
- [ ] Battery impact acceptable
- [ ] User documentation complete
- [ ] App store screenshots updated
- [ ] Beta test with 5+ users
- [ ] Fix all critical bugs
- [ ] Update version number
- [ ] Build production release
- [ ] Submit to app stores

---

## 📊 Success Metrics

### Sliding Project Panels
- [ ] 70%+ users interact with carousel within first session
- [ ] Time-to-timer-start reduced from 4 taps → 1-2 taps
- [ ] 60fps scrolling maintained on all devices
- [ ] 5+ micro-moments of delight per session

### Lock Screen Timer
- [ ] Timer visible within 1 second of screen lock
- [ ] <2 second drift over 8-hour session
- [ ] <5% battery drain per hour with timer running
- [ ] 99%+ uptime (no unexpected stops)
- [ ] 80%+ users keep feature enabled

---

## 🔮 Future Enhancements (Post-Launch)

### iOS Live Activities
- [ ] Research custom native module development
- [ ] Implement Dynamic Island support (iPhone 14 Pro+)
- [ ] Add Always-On Display support
- [ ] Migrate from local notifications to Live Activities

### Wearable Support
- [ ] Apple Watch complications
- [ ] Wear OS complications
- [ ] Quick timer start from watch
- [ ] Voice commands via Siri/Google Assistant

### Lock Screen Widgets
- [ ] Android 12+ lock screen widget
- [ ] iOS 16+ lock screen widget
- [ ] Show timer + quick start buttons
- [ ] Interactive widget actions

### Advanced Gestures
- [ ] Swipe timer up/down to start/stop
- [ ] Pinch timer to reset
- [ ] 3D Touch menus (iOS)
- [ ] Shake to reset with confirmation

---

**Last Updated:** 2025-10-15
**Total Tasks:** 200+
**Estimated Completion:** 4 weeks
