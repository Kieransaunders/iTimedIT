# Freelancer Time Tracker App Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-19

## Active Technologies
- TypeScript 5.7.2 + React 19 + Convex (001-timer-interruption-feature)
- Vite build system + Tailwind CSS + shadcn/ui components
- Convex scheduler.runAt for server-side timing
- Node.js 20 runtime for Convex actions (required for push notifications)

## Project Structure
```
convex/
├── timer.ts            # Timer mutations and queries
├── categories.ts       # Category management functions
├── interrupts.ts       # Scheduled actions for interruptions
├── schema.ts           # Updated with interrupt and category fields
└── _generated/

src/
├── components/
│   ├── ui/             # shadcn/ui components (Button, Card, Dialog, etc.)
│   ├── ModernDashboard.tsx  # ACTIVE: Main timer interface (App.tsx line 198)
│   ├── InterruptModal.tsx   # Interruption acknowledgment modal
│   └── OverrunBanner.tsx    # Overrun merge notification
└── lib/

tests/
├── contract/           # Contract tests for Convex functions
├── integration/        # User flow tests
└── unit/              # Component tests
```

## Component Architecture
### Active Components (Currently Used)
- **ModernDashboard.tsx** - Main timer interface with project selection, category dropdown, and timer controls
- **App.tsx** - Main application routing and authenticated wrapper
- **Settings/**, **ClientsPage.tsx**, **ProjectsPage.tsx** - Management interfaces

### Component Development Guidelines
- **ALWAYS verify component usage** before implementing features by searching for imports
- **Check App.tsx** to see which components are actually rendered in the UI flow
- **ModernDashboard.tsx is the ONLY active timer interface** - do not confuse with legacy code

## Deployment Configuration
### Production Setup
- **Production URL**: https://itrackit.netlify.app
- **Production Convex Backend**: `VITE_CONVEX_URL=https://basic-greyhound-928.convex.cloud`
- **Development Convex Backend**: `VITE_CONVEX_URL=https://watchful-hedgehog-860.convex.cloud`

The `VITE_CONVEX_URL` environment variable points to the Convex site and controls the hosted URL in the Convex dashboard. This URL must match the deployment configuration for proper backend connectivity.

## Commands
- `npm run dev` - Start development server with Convex backend
- `npm run build` - Build for production
- `npm run lint` - TypeScript checks + linting
- `npx convex dev` - Start Convex development backend (uses Node.js 20 runtime)
- `npx convex deploy` - Deploy to production Convex backend

## Code Style
- TypeScript: Strict mode, no `any` types
- React: Functional components with hooks
- Tailwind: Utility classes only, no inline styles
- shadcn/ui: Use pre-built components with @/ imports (e.g., @/components/ui/button)
- Convex: Strongly typed functions with v.object() validators

## Recent Changes
- 001-timer-interruption-feature: Added server-side timer interruptions with scheduler.runAt, 60-second grace periods, and overrun tracking
- Category system: Added time entry categories with dropdown selection and management functions
- Code cleanup: Removed unused TimerCard.tsx component to eliminate confusion

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->