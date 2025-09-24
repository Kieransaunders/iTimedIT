# React Native Mobile App Plan

## 1. Objectives
- Deliver a fully featured mobile companion to the Freelancer Time Tracker web app.
- Reuse as much Convex backend logic, validation, and shared UI/state as possible to minimize divergence.
- Ship incrementally: start with core time tracking flows, then layer on advanced productivity features.
- Maintain a single source of truth for business logic, authentication, and analytics.

## 2. Current State Recap
- Frontend: Vite + React + TypeScript, entry point `src/App.tsx`.
- Backend: Convex deployment `small-barracuda-254` with Convex Auth (anonymous sign-in by default).
- Shared code opportunities: `src/lib` (helpers, hooks), Convex client types, tailwind design tokens.
- Tooling: Jest for tests, Tailwind CSS, Chef-generated project structure.

## 3. Guiding Decisions
### 3.1 Project structure
- Convert repo into a light monorepo with a new `mobile/` directory while leaving `src/` web app intact.
- Introduce `packages/` for cross-platform modules (`packages/shared-ui`, `packages/shared-logic`).
- Use TypeScript project references to share types between web and mobile.

### 3.2 Tech stack
- Use Expo (React Native + Metro) for fastest bootstrap, OTA updates, and cross-platform builds.
- Navigation: React Navigation (stack + bottom tabs) with React Native Gesture Handler.
- Forms: React Hook Form + Zod (aligns with web typings).
- Styling: Tailwind-like utility via NativeWind or re-write minimal Tailwind tokens into StyleSheet.
- State: `convex/react-native` for queries/mutations, augmented with React Query cache for offline-friendly UX if needed.
- Auth: Convex Auth Anonymous to start, abstraction layer to swap to Email/Social later.

### 3.3 Build & release
- Android & iOS via Expo Application Services (EAS) builds.
- OTA updates through Expo Updates.
- CI: GitHub Actions job to lint/test mobile plus trigger EAS build on tagged releases.

## 4. Implementation Phases
### Phase 0 — Repo preparation (1-2 days)
- [ ] Audit existing shared code for reuse potential (`src/lib`, Convex generated client).
- [ ] Configure TypeScript path aliases for `@shared/*` modules.
- [ ] Add linting/prettier configs that work across web + mobile (adjust ESLint ignore paths).

### Phase 1 — Bootstrap mobile app (2-3 days)
- [ ] Create Expo app (`npx create-expo-app mobile`).
- [ ] Configure TypeScript, EAS, ESLint, Jest setup within `mobile/`.
- [ ] Install Convex client (`npm install convex react-native-url-polyfill`).
- [ ] Wire base providers (SafeAreaProvider, ConvexProvider, QueryClientProvider).
- [ ] Implement root navigation shell with placeholder screens.

### Phase 2 — Shared logic extraction (3-4 days)
- [ ] Move reusable utilities/hooks to `packages/shared-logic` with proper exports.
- [ ] Refactor web app imports to use shared package to ensure parity.
- [ ] Create shared types for `Project`, `Session`, `Invoice`, etc. referencing Convex schema.
- [ ] Add story-driven UI specs and component contracts for time tracking primitives.

### Phase 3 — Core feature parity (6-8 days)
- [ ] Implement authentication bootstrap (anonymous auto-login + user profile hydration).
- [ ] Build dashboard screen (active timers, summaries) consuming Convex queries.
- [ ] Build timer controls with optimistic mutation + background timer persistence.
- [ ] Implement logs/history screen with filters, infinite scroll.
- [ ] Add project/client CRUD flows with soft keyboard-safe forms.
- [ ] Integrate notifications (Expo Notifications) for timer reminders and session completion.

### Phase 4 — UX polish & platform integrations (5-6 days)
- [ ] Offline caching and optimistic updates using React Query persistence.
- [ ] Time tracking background service (ForegroundService Android, background task iOS).
- [ ] Deep link handling (resume timer from notification, create entry from quick action).
- [ ] Analytics + error reporting (Sentry / Expo Updates).
- [ ] Accessibility audit, theming (dark mode), localization scaffolding.

### Phase 5 — Hardening & release (3-4 days)
- [ ] Automated tests: unit (Jest), component (React Native Testing Library), E2E (Detox or Maestro).
- [ ] Performance profiling (Flipper, React Native profiler) and memory leak checks.
- [ ] Beta distribution via TestFlight/Google Play Internal Testing.
- [ ] Release checklist (store assets, privacy policy, in-app purchase verification if applicable).

## 5. Screen Inventory & Priority
1. Home / Active Timer (P0)
2. Timesheet History (P0)
3. Project & Client Management (P1)
4. Reports & Insights (P1)
5. Settings (profile, notification prefs) (P1)
6. Invoice Preparation (P2)
7. Offline Queue Debug (internal) (P3)

## 6. Convex Integration Strategy
- Install and configure `convex/react-native`; ensure WebSocket endpoints point to `small-barracuda-254` deployment.
- Reuse generated client (`convex/_generated/api` & `convex/_generated/dataModel`) by symlinking or sharing via `packages/shared-logic`.
- Wrap `ConvexProviderWithAuth` with custom hook to expose current user/session across platforms.
- Align mutation names and args with web app to keep backend unchanged.
- Introduce Zod schemas mirroring Convex validators for client-side validation before mutation calls.

## 7. Authentication & Authorization
- Phase 1: Auto-provision anonymous accounts; store identity in SecureStore/Keychain.
- Phase 2: Add optional email/password or OAuth using Convex Auth connectors; share login components with web.
- Guard navigation routes based on `identity` presence; redirect to onboarding flow when missing profile data.

## 8. CI/CD & Dev Tooling
- Extend existing GitHub Actions (or add new) to lint/test `mobile/` directory.
- Configure EAS secrets for Convex deployment URL and sentry DSN.
- Add `npm run mobile:dev` (Expo start + Convex dev server) and `npm run mobile:test` scripts at repo root.
- Document runbooks for local development (emulators, physical devices) in `docs/mobile-dev-guide.md`.

## 9. Risk Register & Mitigations
- Web ↔ mobile drift: enforce shared package usage, add lint rule for direct `src/lib` imports from mobile.
- Background timers reliability: research native modules (React Native Background Timer, Expo BackgroundFetch) early.
- Performance on large datasets: paginate Convex queries, use virtualization (FlashList) for history.
- App Store review blockers: confirm privacy disclosures for time tracking, background location (if ever added).

## 10. Open Questions / Next Steps
- Confirm whether to target tablets/desktop (Expo web) in initial launch.
- Decide on design system approach (port Tailwind tokens vs. adopt NativeWind).
- Clarify offline requirements (read-only vs. offline edits queued to Convex).
- Choose E2E framework (Detox vs. Maestro) and integrate into CI.
- Align release timeline with marketing / user onboarding strategy.
