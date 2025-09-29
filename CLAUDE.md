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
- **Production URL**: https://itimedit.netlify.app
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

## Implemented Features

### ✅ Multitenancy & Organization Management
- **Organization System**: Complete multi-organization data model with `organizations`, `memberships`, and `invitations` tables
- **Role-based Access**: Owner/admin/member roles with enforced permissions across all Convex functions
- **Personal Workspaces**: Auto-creation of personal workspaces for individual users with legacy data migration
- **Team Invitations**: Full invitation lifecycle (create, resend, revoke, accept) with secure tokens and email delivery
- **Organization Context**: Frontend organization selector and context management throughout the app
- **Data Migration**: Seamless migration from single-user to multi-organization structure

### ✅ Notification System & User Attention
- **Web Push Notifications**: Complete VAPID-based push notification system with service worker
- **Timer Alerts**: Real-time notifications for interruptions, overruns, and Pomodoro transitions
- **In-app Attention**: App badging, title blinking, sound alerts, and vibration support
- **Multi-channel Notifications**: Email, SMS, and Slack/Discord integration for escalated alerts
- **Notification Preferences**: Comprehensive user settings for notification channels and quiet hours
- **Wake Lock Support**: Optional screen wake lock during active timing sessions

### ✅ Email Integration (Resend)
- **VAPID Configuration**: Secure email delivery through Resend with proper API key management
- **Invitation Emails**: HTML email templates for organization invitations with branded styling
- **Email Testing**: Built-in test email functionality for verifying email configuration
- **Environment Setup**: Proper development and production email configuration

### ✅ Node.js Runtime Migration
- **Node.js 20 Support**: Migrated Convex actions to Node.js 20 runtime (required for push notifications)
- **Compatibility Testing**: Verified `web-push` package compatibility with Node.js 20
- **Documentation**: Updated deployment requirements for Node.js 20

## Planned Features (In Development)

### 🚧 Pomodoro Timer Improvements
- **Auto-stop During Breaks**: Timer stops during break periods instead of continuous running
- **Separate Break Tracking**: Break periods not counted as billable time
- **Enhanced UI States**: Clear visual distinction between work and break phases
- **Improved Notifications**: No false "long-running timer" alerts during breaks

### 🚧 Personal vs Team Workspace Distinction
- **Workspace Types**: Enhanced schema with `workspaceType` field for projects and clients
- **Separate UI Flows**: Different interfaces for personal vs team project management
- **Client Management**: Optional client association for personal projects

### 🚧 Client Area Enhancement
- **Analytics Dashboard**: Comprehensive client metrics and performance indicators
- **Advanced Filtering**: Search, sort, and filter capabilities for client management
- **Multiple View Options**: Table and card view layouts for client data
- **Export Functionality**: CSV/PDF export for client reports and analytics

### 🚧 Workspace Name Editing
- **Custom Workspace Names**: Ability to rename personal and team workspaces
- **Owner-only Editing**: Proper permission checking for workspace name changes
- **UI Integration**: Settings interface for workspace management

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->