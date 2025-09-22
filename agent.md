# Agent Onboarding Notes

## Project Snapshot
- Name: Freelancer Time Tracker App (Convex Chef template)
- Frontend: TypeScript 5.7 + React 19 + Vite + Tailwind + shadcn/ui
- Backend: Convex with scheduler.runAt interruptions feature
- Deployment: Convex project `small-barracuda-254`; latest build hosted on Netlify

## Directory Guide
- `src/` — React UI components (`components/ui`, `TimerCard`, `InterruptModal`, `OverrunBanner`)
- `convex/` — Business logic (`timer.ts`, `interrupts.ts`, `schema.ts`, generated client)
- `tests/` — `unit`, `integration`, and `contract` suites for frontend and Convex functions
- `specs/` — Product specs (active: `002-timer-interruption-feature`)
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

## Recent Feature Focus
- `001-timer-interruption-feature`: adds timed interruptions, 60s grace window, and overrun notifications surfaced through `InterruptModal` and `OverrunBanner`

## Operational Notes
- Auth defaults to anonymous Convex Auth; consider tightening before production
- Start Convex separately with `npx convex dev` when needed (already included in `npm run dev`)
- `.env.local` likely required for local secrets; never commit

