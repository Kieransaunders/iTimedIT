# Multitenancy & Invitations Implementation

## Task Overview
- [ ] Introduce multi-organization data model and migrate existing data
- [ ] Enforce organization scoping and role-based access in Convex functions
- [ ] Build invitation lifecycle (issue, resend, revoke, accept) with secure tokens
- [ ] Extend frontend to manage organizations, members, and invitations
- [ ] Add tests and deployment steps for multitenant rollout

## Subtasks
### Data Model & Migration
- [ ] Add `organizations`, `memberships`, `invitations` tables in `convex/schema.ts`
- [ ] Replace `ownerId` references with `organizationId` across domain tables
- [ ] Write backfill script/mutations to create default org per user and migrate existing records

### Access Control & Services
- [ ] Create helper to load caller membership and active org context
- [ ] Enforce role permissions (owner/admin/member) in Convex queries/mutations
- [ ] Persist active organization selection per user

### Invitations & Membership
- [ ] Implement invitation mutations (create/resend/revoke)
- [ ] Generate secure acceptance tokens and optional HTTP route for deep links
- [ ] Add mutation for accepting invites and creating membership

### Frontend Experience
- [ ] Add organization selector and membership management UI
- [ ] Build invitation form and pending invites list
- [ ] Update data-fetching hooks/components to include org context

### Quality & Rollout
- [ ] Cover new logic with unit/contract/integration tests
- [ ] Document migration + ops steps for release
- [ ] Validate with `npm run lint` and `npm run test`
