# Multitenancy Migration Guide

## Overview
This guide outlines the steps to migrate the Freelancer Time Tracker App from single-user to multi-organization (multitenant) architecture. The migration introduces organizations, memberships, and invitation-based team collaboration.

## Pre-Migration Checklist

### 1. Environment Validation
- [ ] Verify all environments (dev/staging/prod) are running latest stable version
- [ ] Confirm Convex deployment is healthy and accessible
- [ ] Backup current database state (export via Convex dashboard)
- [ ] Ensure sufficient Convex compute resources for migration

### 2. Code Deployment Verification
- [ ] All multitenancy code changes deployed to target environment
- [ ] Frontend organization context working in staging
- [ ] Backend `orgContext.ts` helpers functioning correctly
- [ ] Invitation flow tested end-to-end in staging environment

### 3. Data Integrity Checks
```bash
# Run these queries in Convex dashboard before migration
# Check total record counts
clients.count()
projects.count()  
timeEntries.count()
runningTimers.count()

# Verify no orphaned records
# All projects should have valid clientId
# All timeEntries should have valid projectId
```

## Migration Execution

### Phase 1: Schema Migration (Automatic)
The schema changes are automatically applied when Convex functions are deployed:

```typescript
// New tables created automatically:
organizations: {
  name: string,
  createdBy: Id<"users">,
  // ... other fields
}

memberships: {
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  role: "owner" | "admin" | "member",
  // ... other fields
}

invitations: {
  organizationId: Id<"organizations">,
  email: string,
  role: "admin" | "member",
  // ... other fields
}
```

### Phase 2: Data Migration via ensurePersonalWorkspace
The migration happens automatically when users log in via the `ensurePersonalWorkspace` mutation:

1. **Personal Organization Creation**
   - Creates one organization per existing user
   - Names it "{User Name}'s Workspace"
   - Sets user as owner

2. **Legacy Data Association**
   - Updates all user's clients with organizationId
   - Updates all user's projects with organizationId  
   - Updates all user's timeEntries with organizationId
   - Updates all user's runningTimers with organizationId

3. **Membership Creation**
   - Creates owner membership for user in their personal organization
   - Sets as active organization

### Phase 3: Validation Commands

#### Post-Migration Verification Queries
```javascript
// Run in Convex dashboard after migration

// 1. Verify all users have personal organizations
const users = await db.query("users").collect();
const orgs = await db.query("organizations").collect();
console.log(`Users: ${users.length}, Organizations: ${orgs.length}`);

// 2. Verify all users have owner memberships
const memberships = await db.query("memberships")
  .filter(q => q.eq(q.field("role"), "owner"))
  .collect();
console.log(`Owner memberships: ${memberships.length}`);

// 3. Verify all domain records have organizationId
const clientsWithOrg = await db.query("clients")
  .filter(q => q.neq(q.field("organizationId"), undefined))
  .collect();
const projectsWithOrg = await db.query("projects")
  .filter(q => q.neq(q.field("organizationId"), undefined))  
  .collect();
console.log(`Clients with org: ${clientsWithOrg.length}`);
console.log(`Projects with org: ${projectsWithOrg.length}`);

// 4. Check for any orphaned records
const orphanedClients = await db.query("clients")
  .filter(q => q.eq(q.field("organizationId"), undefined))
  .collect();
console.log(`Orphaned clients: ${orphanedClients.length}`);
```

## Post-Migration Steps

### 1. User Communication
- [ ] Send migration notification email to all users
- [ ] Update documentation/help articles with team features
- [ ] Announce new collaboration features

### 2. Feature Enablement
- [ ] Enable invitation features in production UI
- [ ] Update onboarding flow to mention team capabilities
- [ ] Monitor invitation email delivery

### 3. Monitoring Setup
- [ ] Set up alerts for failed organization creation
- [ ] Monitor invitation acceptance rates
- [ ] Track organization membership growth

## Rollback Procedures

### Emergency Rollback (if migration fails)
1. **Immediate Steps**
   ```bash
   # Revert to pre-migration Convex deployment
   convex deploy --prod --env production-backup
   
   # Restore frontend to pre-multitenancy version
   git revert <multitenancy-commit-hash>
   npm run build && npm run deploy
   ```

2. **Data Cleanup** (if partial migration occurred)
   ```javascript
   // Remove partially created organizations (manual cleanup in dashboard)
   // Only if migration failed mid-process and left inconsistent state
   
   // Remove orphaned memberships
   const orphanedMemberships = await db.query("memberships").collect();
   // Review and delete if necessary
   
   // Remove orphaned invitations  
   const orphanedInvitations = await db.query("invitations").collect();
   // Review and delete if necessary
   ```

### Planned Rollback (if issues discovered post-migration)
1. **Assessment Period**: 72 hours post-migration
2. **Rollback Decision Criteria**:
   - User login success rate < 95%
   - Data access errors > 1% of requests
   - Performance degradation > 20%
   - Critical functionality broken

3. **Rollback Process**:
   - Deploy pre-migration code version
   - Restore database from pre-migration backup
   - Communicate rollback to users
   - Investigate and fix issues before retry

## Success Metrics

### Migration Success Indicators
- [ ] 100% of existing users can log in successfully
- [ ] All historical data accessible in personal workspaces
- [ ] No increase in error rates post-migration
- [ ] Team invitation flow working for new collaborations

### Performance Benchmarks
- [ ] Page load times within 5% of pre-migration baseline
- [ ] API response times within 10% of pre-migration baseline
- [ ] No database query timeout errors

## Support Procedures

### User Issues Resolution
1. **Login Problems**: Direct users to clear browser cache, retry
2. **Missing Data**: Check user's personal organization in Convex dashboard
3. **Permission Errors**: Verify user membership and role in organization
4. **Invitation Issues**: Check invitation status and expiry in dashboard

### Escalation Path
1. **Level 1**: Standard user support (login, basic functionality)
2. **Level 2**: Data migration issues (missing records, organization problems)  
3. **Level 3**: Critical system issues (complete data loss, system outages)

## Timeline

### Recommended Migration Schedule
- **Week -2**: Deploy to staging, full testing
- **Week -1**: User communication, prepare rollback procedures
- **Day 0**: Execute migration during low-traffic window
- **Day +1**: Monitor metrics, user feedback
- **Day +3**: Migration success review, rollback decision point
- **Week +1**: Post-migration optimization and user training

---

**Last Updated**: [Current Date]  
**Migration Version**: v1.0  
**Contact**: [Support Email/Team]