# Freelancer Time Tracker App Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-19

## Active Technologies
- TypeScript 5.7.2 + React 19 + Convex (001-timer-interruption-feature)
- Vite build system + Tailwind CSS
- Convex scheduler.runAt for server-side timing

## Project Structure
```
convex/
├── timer.ts            # Timer mutations and queries
├── interrupts.ts       # Scheduled actions for interruptions
├── schema.ts           # Updated with interrupt fields
└── _generated/

src/
├── components/
│   ├── TimerCard.tsx   # Timer UI component
│   ├── InterruptModal.tsx  # New: Interruption acknowledgment modal
│   └── OverrunBanner.tsx   # New: Overrun merge notification
└── lib/

tests/
├── contract/           # Contract tests for Convex functions
├── integration/        # User flow tests
└── unit/              # Component tests
```

## Commands
- `npm run dev` - Start development server with Convex backend
- `npm run build` - Build for production
- `npm run lint` - TypeScript checks + linting
- `npx convex dev` - Start Convex development backend

## Code Style
- TypeScript: Strict mode, no `any` types
- React: Functional components with hooks
- Tailwind: Utility classes only, no inline styles
- Convex: Strongly typed functions with v.object() validators

## Recent Changes
- 001-timer-interruption-feature: Added server-side timer interruptions with scheduler.runAt, 60-second grace periods, and overrun tracking

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->