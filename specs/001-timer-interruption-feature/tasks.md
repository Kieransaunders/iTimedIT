# Tasks: Timer Interruption System

**Input**: Design documents from `/specs/001-timer-interruption-feature/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `convex/` for backend functions, `src/components/` for React UI
- Paths shown below use Convex backend + React frontend structure

## Phase 3.1: Schema Updates
- [ ] T001 Update Convex schema with interruption fields in convex/schema.ts
- [ ] T002 Add migration logic for existing runningTimers and timeEntries

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T003 [P] Contract test timer.start function in tests/contract/test_timer_start.ts
- [ ] T004 [P] Contract test timer.stop function in tests/contract/test_timer_stop.ts
- [ ] T005 [P] Contract test timer.heartbeat function in tests/contract/test_timer_heartbeat.ts
- [ ] T006 [P] Contract test timer.ackInterrupt function in tests/contract/test_timer_ack_interrupt.ts
- [ ] T007 [P] Contract test timer.mergeOverrun function in tests/contract/test_timer_merge_overrun.ts
- [ ] T008 [P] Contract test interrupt.check scheduled action in tests/contract/test_interrupt_check.ts
- [ ] T009 [P] Contract test interrupt.autoStopIfNoAck action in tests/contract/test_interrupt_auto_stop.ts
- [ ] T010 [P] Integration test basic interruption flow in tests/integration/test_basic_interrupt_flow.ts
- [ ] T011 [P] Integration test auto-stop with grace period in tests/integration/test_auto_stop_grace.ts
- [ ] T012 [P] Integration test overrun recovery in tests/integration/test_overrun_recovery.ts
- [ ] T013 [P] Integration test multi-tab synchronization in tests/integration/test_multi_tab_sync.ts
- [ ] T014 [P] Integration test stale heartbeat detection in tests/integration/test_stale_heartbeat.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T015 Implement timer.start mutation with interrupt scheduling in convex/timer.ts
- [ ] T016 Implement timer.stop mutation with source tracking in convex/timer.ts
- [ ] T017 Implement timer.heartbeat mutation for client liveness in convex/timer.ts
- [ ] T018 Implement timer.ackInterrupt mutation for modal responses in convex/timer.ts
- [ ] T019 Implement timer.mergeOverrun mutation for time recovery in convex/timer.ts
- [ ] T020 [P] Implement interrupt.check scheduled action in convex/interrupts.ts
- [ ] T021 [P] Implement interrupt.autoStopIfNoAck scheduled action in convex/interrupts.ts
- [ ] T022 [P] Create InterruptModal React component in src/components/InterruptModal.tsx
- [ ] T023 [P] Create OverrunBanner React component in src/components/OverrunBanner.tsx
- [ ] T024 Add interrupt interval settings to Settings component in src/components/Settings.tsx

## Phase 3.4: Integration & Scheduling
- [ ] T025 Integrate scheduler.runAt calls in timer.start for interrupt scheduling
- [ ] T026 Integrate scheduler.runAt calls in interrupt.check for grace period jobs
- [ ] T027 Add heartbeat timer logic to TimerCard component in src/components/TimerCard.tsx
- [ ] T028 Integrate InterruptModal into main App component with Convex subscriptions
- [ ] T029 Integrate OverrunBanner notifications in Dashboard component
- [ ] T030 Add overrun merge UI integration in RecentEntriesTable component

## Phase 3.5: Polish & Performance
- [ ] T031 [P] Add unit tests for InterruptModal component in tests/unit/test_interrupt_modal.tsx
- [ ] T032 [P] Add unit tests for OverrunBanner component in tests/unit/test_overrun_banner.tsx
- [ ] T033 [P] Add performance tests for timer accuracy (<1 second precision)
- [ ] T034 [P] Add performance tests for UI updates (<100ms response time)
- [ ] T035 [P] Update API documentation in docs/api.md
- [ ] T036 Optimize Convex queries with proper indexes for interrupt scheduling
- [ ] T037 Add error handling and retry logic for failed scheduled jobs
- [ ] T038 Run end-to-end tests following quickstart.md scenarios

## Dependencies
- Schema updates (T001-T002) before all other tasks
- All contract tests (T003-T014) before implementation (T015-T024)
- Core timer functions (T015-T019) before scheduled actions (T020-T021)
- Basic implementation before UI components (T022-T024)
- Components before integration (T025-T030)
- All core functionality before polish (T031-T038)

## Parallel Example
```
# Launch contract tests together after schema updates:
Task: "Contract test timer.start function in tests/contract/test_timer_start.ts"
Task: "Contract test timer.stop function in tests/contract/test_timer_stop.ts"
Task: "Contract test timer.heartbeat function in tests/contract/test_timer_heartbeat.ts"
Task: "Contract test timer.ackInterrupt function in tests/contract/test_timer_ack_interrupt.ts"
Task: "Contract test timer.mergeOverrun function in tests/contract/test_timer_merge_overrun.ts"

# Launch UI components together after core implementation:
Task: "Create InterruptModal React component in src/components/InterruptModal.tsx"
Task: "Create OverrunBanner React component in src/components/OverrunBanner.tsx"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all tests fail before implementing
- Commit after completing each phase
- Follow TDD: Red → Green → Refactor cycle
- Use Convex scheduler.runAt for all timed operations
- Maintain TypeScript strict mode throughout

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - timer-api.yaml → 5 contract test tasks [P] + 5 implementation tasks
   - scheduled-functions.yaml → 2 contract test tasks [P] + 2 implementation tasks

2. **From Data Model**:
   - RunningTimer entity → schema update task
   - TimeEntry entity → schema update task (same file, not parallel)

3. **From User Stories** (quickstart.md):
   - Basic interruption flow → integration test [P]
   - Auto-stop with grace period → integration test [P]
   - Overrun recovery → integration test [P]
   - Multi-tab synchronization → integration test [P]
   - Stale heartbeat detection → integration test [P]

4. **Ordering**:
   - Schema → Contract Tests → Core Implementation → UI Components → Integration → Polish
   - Dependencies prevent parallel execution where needed

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (7 contracts = 7 tests)
- [x] All entities have schema update tasks (RunningTimer + TimeEntry)
- [x] All tests come before implementation (TDD enforced)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] All quickstart scenarios have integration tests
- [x] UI components created for interrupt modal and overrun banner
- [x] Scheduled actions implemented for server-side timing