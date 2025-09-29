# Agent Onboarding Notes

## Project Snapshot
- Name: Freelancer Time Tracker App (Convex Chef template)
- Frontend: TypeScript 5.7 + React 19 + Vite + Tailwind + shadcn/ui
- Backend: Convex multi-organization stack with role-based access, invitation lifecycle, and scheduler-driven timer interrupts
- Realtime notifications: Web push service worker with escalation routes (email/SMS/Slack) and in-app attention helpers
- Deployment: Convex project `small-barracuda-254` on Node.js 20 runtime; frontend hosted on Netlify

## Directory Guide
- `src/` — React UI components (org management in `InvitePage`, `OrganizationManagementCard`, `WorkspaceSwitcher`; notifications controls in `Settings.tsx`; timing surfaces like `ModernDashboard`, `InterruptModal`, `PomodoroBreakTimer`)
- `src/lib/` — Shared helpers (`push.ts`, `attention.ts`, `organization-context.tsx`, `sounds.ts`) for subscriptions, app badging, and org state
- `public/` — Static assets plus `sw.js` push service worker (version when updating)
- `convex/` — Business logic (`schema.ts` multi-org tables, `organizations.ts`, `invitations.ts`, `orgContext.ts`, `pushNotifications.ts`, `pushActions.ts`, timer/interrupt modules)
- `tests/` — `unit`, `integration`, and `contract` suites covering org scoping, invitations, and notification flows
- `docs/` — Runbooks and QA references (`notification-qa-matrix.md`, `e2e-notification-scenario.md`, migration/deployment guides)
- `dist/` — Vite build output (do not edit manually)

## Key Scripts
- `npm run dev` — runs Vite frontend + Convex backend in parallel
- `npm run build` — production build via Vite (includes Convex schema validation)
- `npm run lint` — Type checking for Convex + app, then single-run Convex dev + build
- `npm run test` / `test:watch` / `test:coverage` — Jest suites

## Coding Conventions
- TypeScript in strict mode; avoid `any`
- React functional components with hooks; prefer shadcn/ui primitives via `@/components/ui/*`
- Tailwind utility-first styling; no inline styles
- Convex modules must export typed queries/mutations with `v.object()` validators
- Enforce organization context via `convex/orgContext.ts` helpers before reading or mutating data

## Recent Feature Focus
- Multitenancy & Invitations: `schema.ts` now defines `organizations`, `memberships`, `invitations`, plus helpers in `organizations.ts`/`orgContext.ts` and UI in `InvitePage`, `OrganizationManagementCard`, `WorkspaceSwitcher`
- User Attention & Notifications: `public/sw.js`, `src/lib/push.ts`, `convex/pushNotifications.ts`, and settings toggles deliver web push, app badging, sounds, vibration, wake lock, and optional email/SMS/Slack escalation
- Convex Node.js 20 Migration: `convex.json` pins the runtime; push actions validated against Node 20 and documented in runbooks

## Operational Notes
- Auth defaults to anonymous Convex Auth; tighten before production and ensure `organizations.ensurePersonalWorkspace` runs after sign-in
- Active org selection lives in React state; persisting it per user is still TODO (see `task.md`)
- Configure VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`) and notification providers in `.env.local` / deployment settings
- Service worker updates require cache busting (`public/sw.js` version bump) when shipping notification changes
- Start Convex separately with `npx convex dev` if the combined `npm run dev` flow fails; both require Node 20 locally
- `.env.local` holds secrets (email/SMS API keys, Convex URLs); never commit

## Pending Work
- Finalize legacy data backfill for multi-org migration beyond `ensurePersonalWorkspace`
- Persist users' active organization selection server-side
- Finish personal vs team workspace experience (wire `convex/personalProjects.ts`, `personalClients.ts`, `components/WorkspaceSwitcher.tsx` into the app flow)
- Implement client analytics hub (metrics, filters, exports) as specced in `task.md`
- Address Pomodoro timer break handling and UI clarity items tracked under "Pomodoro Timer Improvements"
