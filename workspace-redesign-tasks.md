# Workspace System Redesign Tasks

## Phase 1: Schema & Backend Foundation

### Task 1.1: Update Schema
- [ ] Add `workspaceType` field to organizations table
- [ ] Add index `byUserType` for efficient queries
- [ ] Keep `isPersonalWorkspace` for backward compatibility

**Files:** `apps/web/convex/schema.ts`

### Task 1.2: Update Organization Creation Logic
- [ ] Modify `ensureMembership()` to detect invitation vs organic signup
- [ ] For organic signup: create Personal + Work workspaces
- [ ] For invited users: only ensure Personal workspace exists
- [ ] Set appropriate default workspace based on signup type

**Files:** `apps/web/convex/orgContext.ts`

### Task 1.3: Add Workspace Management Mutations
- [ ] Create `createWorkspace(name: string)` mutation
- [ ] Create `getPersonalWorkspace()` query
- [ ] Create `getWorkWorkspaces()` query
- [ ] Add validation to prevent duplicate Personal workspaces

**Files:** `apps/web/convex/organizations.ts`

### Task 1.4: Update Invitation Logic
- [ ] Add validation to prevent invites to Personal workspaces
- [ ] Check `workspaceType === "work"` before allowing invitations
- [ ] Update error messages

**Files:** `apps/web/convex/invitations.ts` or related files

---

## Phase 2: Web App UI Updates

### Task 2.1: Update WorkspaceSwitcher Component
- [ ] Rename type from `"team"` to `"work"`
- [ ] Update button text: "Team" → "Work"
- [ ] Update prop types and interfaces

**Files:** `apps/web/src/components/WorkspaceSwitcher.tsx`

### Task 2.2: Update OrganizationContext
- [ ] Remove hardcoded workspace logic
- [ ] Use database `workspaceType` field
- [ ] Expose workspace type in context value

**Files:** `apps/web/src/lib/organization-context.tsx`

### Task 2.3: Add Create Workspace UI (Optional for MVP)
- [ ] Add "Create Workspace" button in settings/menu
- [ ] Create modal/dialog for workspace creation
- [ ] Call `createWorkspace()` mutation
- [ ] Auto-switch to new workspace after creation

**Files:** New or existing settings components

---

## Phase 3: Mobile App UI Updates

### Task 3.1: Update WorkspaceSwitcher Component
- [ ] Rename type from `"team"` to `"work"`
- [ ] Update button text: "Team" → "Work"
- [ ] Update accessibility labels
- [ ] Update storage key handling

**Files:** `apps/mobile/components/WorkspaceSwitcher.tsx`

### Task 3.2: Update OrganizationContext
- [ ] Change type: `"personal" | "team"` → `"personal" | "work"`
- [ ] Update default workspace to "work"
- [ ] Add migration logic for stored preferences ("team" → "work")
- [ ] Update all type references

**Files:** `apps/mobile/contexts/OrganizationContext.tsx`

### Task 3.3: Update Storage Migration
- [ ] Check for "team" value in storage
- [ ] Convert to "work" on load
- [ ] Handle edge cases

**Files:** `apps/mobile/contexts/OrganizationContext.tsx`

---

## Phase 4: Migration & Backward Compatibility

### Task 4.1: Create Migration Script/Function
- [ ] Backfill existing organizations with `workspaceType`
- [ ] If `isPersonalWorkspace === true`: set `workspaceType: "personal"`
- [ ] Otherwise: set `workspaceType: "work"`
- [ ] Create Work workspace for existing users who only have Personal

**Files:** `apps/web/convex/migrations.ts` (new file) or add to organizations.ts

### Task 4.2: Test Migration
- [ ] Test with existing user data
- [ ] Verify workspace types are set correctly
- [ ] Verify no data loss
- [ ] Verify invitations still work

---

## Phase 5: Testing & Validation

### Task 5.1: Backend Testing
- [ ] New user signup creates 2 workspaces
- [ ] Work workspace is active by default
- [ ] Invited user joins correct workspace
- [ ] Cannot invite to Personal workspace
- [ ] Can invite to Work workspace
- [ ] Can create additional Work workspaces
- [ ] Workspace switching works correctly

### Task 5.2: Web App Testing
- [ ] WorkspaceSwitcher shows "Work" not "Team"
- [ ] Can switch between workspaces
- [ ] Create workspace flow works
- [ ] Invitation flow works
- [ ] No console errors

### Task 5.3: Mobile App Testing
- [ ] WorkspaceSwitcher shows "Work" not "Team"
- [ ] Storage migration works
- [ ] Can switch between workspaces
- [ ] Invitation flow works
- [ ] No crashes or errors

### Task 5.4: Integration Testing
- [ ] Cross-platform data consistency
- [ ] Invitation links work on both platforms
- [ ] Workspace switching syncs across devices
- [ ] Real-time updates work correctly

---

## Phase 6: Documentation & Cleanup

### Task 6.1: Update Documentation
- [ ] Update CLAUDE.md with new workspace system
- [ ] Update README.md if needed
- [ ] Add migration notes to MIGRATION_GUIDE.md

### Task 6.2: Code Cleanup
- [ ] Remove unused code
- [ ] Update comments
- [ ] Fix any linting errors
- [ ] Run type checks

---

## Priority Order

1. **Phase 1** (Backend Foundation) - Must be completed first
2. **Phase 4.1** (Migration) - Run immediately after Phase 1
3. **Phase 2 & 3** (UI Updates) - Can be done in parallel
4. **Phase 5** (Testing) - After all implementation complete
5. **Phase 6** (Documentation) - Final cleanup

---

## Notes

- Backend changes affect both web and mobile (shared Convex)
- Test thoroughly before deploying to production
- Consider feature flag for gradual rollout
- Monitor error logs after deployment
