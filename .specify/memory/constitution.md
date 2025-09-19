<!--
Sync Impact Report:
- Version change: NEW → 1.0.0
- Initial constitution creation for Freelancer Time Tracker App
- Added sections: Core Principles (5), Performance Standards, Development Workflow, Governance
- Templates requiring updates: ✅ No updates needed (initial constitution)
- Follow-up TODOs: None
-->

# Freelancer Time Tracker App Constitution

## Core Principles

### I. Convex-First Architecture
All backend functionality MUST be implemented as Convex functions; Database operations MUST use Convex's reactive queries and mutations; Real-time updates MUST leverage Convex subscriptions for optimal performance and consistency.

### II. Type Safety (NON-NEGOTIABLE)
TypeScript MUST be used throughout frontend and backend; All Convex schema definitions MUST be strongly typed; Vite build MUST pass TypeScript checks without errors; No `any` types permitted in production code.

### III. Component-First UI
React components MUST be modular and reusable; Tailwind CSS MUST be used for styling consistency; No inline styles or CSS-in-JS permitted; Components MUST follow single responsibility principle.

### IV. Real-time Data Consistency
Timer state MUST be synchronized across browser tabs; Data updates MUST be instantly reflected in UI through Convex reactivity; Offline changes MUST be queued and synced when reconnected.

### V. User-Centric Design
All features MUST serve freelancer time tracking workflows; UI MUST be responsive and accessible; Performance MUST support real-time timer operations without lag; User experience MUST prioritize productivity and efficiency.

## Performance Standards

Timer accuracy MUST be within 1-second precision for billing accuracy; UI updates MUST complete within 100ms to maintain responsive feel; App MUST handle 1000+ time entries per user efficiently; Database queries MUST use appropriate indexes for fast retrieval.

## Development Workflow

All schema changes MUST be backward compatible to prevent data loss; Convex functions MUST be tested in development environment before deployment; Database migrations MUST preserve user data integrity; Code reviews MUST verify compliance with constitutional principles.

## Governance

Constitution supersedes all development practices; Schema changes require constitution compliance review; Use `.specify/templates/agent-file-template.md` for AI assistant guidance; All implementations MUST verify constitutional compliance before merging.

**Version**: 1.0.0 | **Ratified**: 2025-09-19 | **Last Amended**: 2025-09-19