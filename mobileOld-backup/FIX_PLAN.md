# Organization Membership Fix Plan

## Current Problem
Guest/anonymous users get "No active organization membership" errors when trying to use the app because:
1. They don't have an organization membership when they first sign in
2. Queries run before any mutation has a chance to create the Personal Workspace
3. The `requireMembership().catch()` pattern isn't working as expected

## Root Cause Analysis

### Issue 1: Query Execution Order
- `useQuery(api.timer.getRunningTimer)` runs immediately on component mount
- This happens BEFORE the user takes any action (like starting a timer)
- No mutation has run yet, so no Personal Workspace exists
- Query fails with "No active organization membership"

### Issue 2: Catch Pattern Not Working
The pattern `await requireMembership(ctx).catch(() => null)` doesn't work because:
- `requireMembership` is an async function that throws inside its execution
- The error is thrown in the Convex runtime, not caught by JavaScript catch
- Need a different approach

## Solution Strategy

### Option A: Create Membership on Sign-In (Recommended)
**Pros:**
- Membership exists before any queries run
- Clean separation of concerns
- Matches web app pattern

**Cons:**
- Requires modifying auth flow
- Need to ensure it runs for all auth methods (anonymous, password, Google)

**Implementation:**
1. Create a `convex/users.ts` mutation that runs after authentication
2. Call it from the app when user signs in
3. Use `ensureMembership` to create Personal Workspace if needed

### Option B: Make Queries Membership-Optional
**Pros:**
- Simpler immediate fix
- Queries gracefully handle missing membership

**Cons:**
- Every query needs special handling
- Inconsistent with web app
- Doesn't solve the underlying issue

**Implementation:**
1. Create `maybeMembership()` helper that returns null instead of throwing
2. Update all queries to use it
3. Return empty/null results when no membership

### Option C: Hybrid Approach (Best)
**Pros:**
- Combines benefits of both approaches
- Robust and user-friendly
- Handles edge cases

**Cons:**
- More code changes

**Implementation:**
1. Create membership on sign-in (Option A)
2. Add `maybeMembership()` helper as fallback (Option B)
3. Update queries to handle null membership gracefully

## Recommended Implementation Plan

### Phase 1: Add Helper Functions
- [ ] Add `maybeMembership()` to `convex/orgContext.ts`
- [ ] Test that it returns null without throwing

### Phase 2: Update Queries
- [ ] Update `convex/timer.ts` - `getRunningTimer` to use `maybeMembership()`
- [ ] Update `convex/projects.ts` - `listAll` to use `maybeMembership()`
- [ ] Update `convex/categories.ts` - `getCategories` to use `maybeMembership()`
- [ ] Update `convex/entries.ts` - `list` to use `maybeMembership()`

### Phase 3: Add Post-Auth Initialization
- [ ] Create `convex/users.ts` with `initializeUser` mutation
- [ ] Call it from app after successful authentication
- [ ] Ensure it runs for all auth types (anonymous, password, Google)

### Phase 4: Update App Components
- [ ] Add initialization call in auth flow
- [ ] Handle loading states while membership is being created
- [ ] Test with fresh anonymous users

### Phase 5: Testing
- [ ] Test anonymous sign-in → immediate query → should return null/empty
- [ ] Test anonymous sign-in → start timer → should create workspace
- [ ] Test password sign-in → should work immediately
- [ ] Test switching between workspaces (future feature)

## Files to Modify

### Backend (Convex)
1. `convex/orgContext.ts` - Add `maybeMembership()` helper
2. `convex/timer.ts` - Update `getRunningTimer` query
3. `convex/projects.ts` - Update `listAll` query
4. `convex/categories.ts` - Update `getCategories` query
5. `convex/entries.ts` - Update `list` query
6. `convex/users.ts` - Add `initializeUser` mutation (create if doesn't exist)

### Frontend (React Native)
1. `app/auth/sign-in.tsx` - Add initialization call after sign-in
2. `app/index.tsx` - Handle loading state during initialization
3. `hooks/useAuth.ts` (if exists) - Add initialization logic

## Success Criteria
- [ ] Anonymous users can sign in and see empty state (no errors)
- [ ] Anonymous users can start timer and it creates Personal Workspace
- [ ] Authenticated users can sign in and use app immediately
- [ ] No "No active organization membership" errors in console
- [ ] All queries return gracefully when no membership exists

## Rollback Plan
If issues occur:
1. Revert to re-exporting from web app: `export * from "../WebCompanianApp/..."`
2. Document that mobile app requires web app's Convex deployment
3. Consider alternative: separate Convex deployments for web and mobile

## Next Steps
1. Review this plan
2. Decide on approach (recommend Option C - Hybrid)
3. Start with Phase 1 (add helper functions)
4. Test incrementally after each phase
