# Multitenancy Troubleshooting Guide

## Common Issues and Solutions

### 1. User Cannot Log In After Migration

**Symptoms:**
- User gets authentication error
- "Organization not found" message
- Infinite loading on login

**Diagnosis:**
```javascript
// Check in Convex dashboard
const user = await db.query("users")
  .filter(q => q.eq(q.field("email"), "user@example.com"))
  .unique();

const membership = await db.query("memberships")
  .filter(q => q.eq(q.field("userId"), user._id))
  .collect();

console.log("User:", user);
console.log("Memberships:", membership);
```

**Solutions:**
1. **Missing Personal Organization**
   ```javascript
   // Manually trigger workspace creation
   await api.organizations.ensurePersonalWorkspace.run({});
   ```

2. **Missing Membership**
   ```javascript
   // Create missing membership
   const org = await db.query("organizations")
     .filter(q => q.eq(q.field("createdBy"), user._id))
     .unique();
   
   await db.insert("memberships", {
     organizationId: org._id,
     userId: user._id,
     role: "owner",
     isActive: true,
     invitedAt: Date.now(),
     acceptedAt: Date.now(),
   });
   ```

### 2. Data Missing After Migration

**Symptoms:**
- User can log in but sees no clients/projects
- "No data found" messages
- Historical time entries missing

**Diagnosis:**
```javascript
// Check data organization assignment
const user = await db.query("users")
  .filter(q => q.eq(q.field("email"), "user@example.com"))
  .unique();

const clients = await db.query("clients")
  .filter(q => q.eq(q.field("ownerId"), user._id)) // Legacy field
  .collect();

const clientsWithOrg = await db.query("clients")
  .filter(q => q.eq(q.field("organizationId"), user.activeOrganizationId))
  .collect();

console.log("Legacy clients:", clients.length);
console.log("Org-scoped clients:", clientsWithOrg.length);
```

**Solutions:**
1. **Incomplete Migration**
   ```javascript
   // Find user's personal organization
   const org = await db.query("organizations")
     .filter(q => q.eq(q.field("createdBy"), user._id))
     .unique();

   // Migrate clients
   const legacyClients = await db.query("clients")
     .filter(q => q.eq(q.field("ownerId"), user._id))
     .collect();
   
   for (const client of legacyClients) {
     await db.patch(client._id, { organizationId: org._id });
   }

   // Migrate projects
   const legacyProjects = await db.query("projects")
     .filter(q => q.eq(q.field("ownerId"), user._id))
     .collect();
   
   for (const project of legacyProjects) {
     await db.patch(project._id, { organizationId: org._id });
   }
   ```

### 3. Invitation Emails Not Sending

**Symptoms:**
- Invitations created but emails not received
- "Invitation sent" message but no email delivery
- SMTP/email service errors in logs

**Diagnosis:**
```javascript
// Check invitation status
const invitation = await db.query("invitations")
  .filter(q => q.eq(q.field("email"), "invitee@example.com"))
  .order("desc")
  .first();

console.log("Invitation:", invitation);
console.log("Status:", invitation.status);
console.log("Created:", new Date(invitation.createdAt));
```

**Solutions:**
1. **Email Service Configuration**
   ```bash
   # Check environment variables
   echo $RESEND_API_KEY
   echo $FROM_EMAIL
   
   # Test email service
   curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from": "test@your-domain.com", "to": "test@example.com", "subject": "Test", "text": "Test email"}'
   ```

2. **Resend Failed Invitation**
   ```javascript
   // Resend invitation
   await api.invitations.resend.run({ 
     invitationId: invitation._id 
   });
   ```

### 4. Permission Denied Errors

**Symptoms:**
- "Access denied" when accessing data
- Users can't see organization data they should have access to
- Role-based access not working correctly

**Diagnosis:**
```javascript
// Check user's role in organization
const membership = await db.query("memberships")
  .filter(q => q.and(
    q.eq(q.field("userId"), userId),
    q.eq(q.field("organizationId"), organizationId)
  ))
  .unique();

console.log("User role:", membership?.role);
console.log("Membership active:", membership?.isActive);
```

**Solutions:**
1. **Incorrect Role Assignment**
   ```javascript
   // Update user role
   await db.patch(membership._id, {
     role: "admin", // or appropriate role
     isActive: true
   });
   ```

2. **Missing Organization Context**
   ```javascript
   // Set active organization for user
   await api.organizations.setActiveOrganization.run({
     organizationId: organizationId
   });
   ```

### 5. Performance Issues After Migration

**Symptoms:**
- Slow page loads
- Database query timeouts
- High memory usage

**Diagnosis:**
```bash
# Check Convex function performance
convex logs --prod --filter="slow" --tail=100

# Monitor database query times
convex dashboard # Check function execution times
```

**Solutions:**
1. **Optimize Queries**
   ```javascript
   // Add indexes for organization-scoped queries
   // In schema.ts, ensure proper indexing:
   
   clients: defineTable({
     // ... fields
   }).index("byOrganization", ["organizationId"])
   
   projects: defineTable({
     // ... fields  
   }).index("byOrganization", ["organizationId"])
   ```

2. **Implement Query Pagination**
   ```javascript
   // For large datasets, use pagination
   const result = await ctx.db
     .query("timeEntries")
     .withIndex("byOrganization", q => q.eq("organizationId", orgId))
     .paginate(paginationOpts);
   ```

### 6. Organization Switching Not Working

**Symptoms:**
- UI doesn't update when switching organizations
- Data from wrong organization displayed
- Organization selector shows incorrect state

**Diagnosis:**
```javascript
// Check active organization state
const currentMembership = await api.organizations.currentMembership.run();
console.log("Active org:", currentMembership?.organization);

// Check user's memberships
const memberships = await api.organizations.listMemberships.run();
console.log("User memberships:", memberships.length);
```

**Solutions:**
1. **Clear Frontend Cache**
   ```typescript
   // In React component, force refetch
   const { switchOrganization } = useOrganization();
   
   const handleOrgSwitch = async (orgId: Id<"organizations">) => {
     await switchOrganization(orgId);
     // Force component remount or data refetch
     window.location.reload(); // Temporary solution
   };
   ```

2. **Fix Organization Context**
   ```javascript
   // Ensure user has valid active organization
   await api.organizations.setActiveOrganization.run({
     organizationId: validOrganizationId
   });
   ```

## Emergency Procedures

### Data Recovery

**If user data appears lost:**
1. **Check Database Backup**
   ```bash
   # Restore from backup if available
   convex import --prod backup-file.jsonl
   ```

2. **Manual Data Recovery**
   ```javascript
   // Find orphaned records by legacy ownerId
   const orphanedClients = await db.query("clients")
     .filter(q => q.and(
       q.neq(q.field("ownerId"), undefined),
       q.eq(q.field("organizationId"), undefined)
     ))
     .collect();

   // Associate with user's personal organization
   for (const client of orphanedClients) {
     const user = await db.get(client.ownerId);
     const org = await db.query("organizations")
       .filter(q => q.eq(q.field("createdBy"), user._id))
       .unique();
     
     await db.patch(client._id, { organizationId: org._id });
   }
   ```

### System-Wide Issues

**If multiple users affected:**
1. **Enable Maintenance Mode**
   ```javascript
   // Add maintenance flag to environment
   process.env.MAINTENANCE_MODE = "true";
   
   // Display maintenance message in frontend
   if (process.env.MAINTENANCE_MODE === "true") {
     return <MaintenanceMessage />;
   }
   ```

2. **Mass Data Fix**
   ```javascript
   // Script to fix common issues across all users
   const allUsers = await db.query("users").collect();
   
   for (const user of allUsers) {
     try {
       await api.organizations.ensurePersonalWorkspace.run({}, { user });
       console.log(`Fixed user: ${user.email}`);
     } catch (error) {
       console.error(`Failed to fix user ${user.email}:`, error);
     }
   }
   ```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Migration Success Rate**
   ```sql
   -- Organizations created vs unique logins
   SELECT COUNT(*) as org_count FROM organizations;
   SELECT COUNT(DISTINCT userId) as user_count FROM user_sessions;
   ```

2. **Error Patterns**
   ```bash
   # Common error monitoring
   convex logs --prod | grep -E "(organization|permission|access)" | head -50
   ```

3. **Performance Metrics**
   ```javascript
   // Function execution time monitoring
   const slowFunctions = await db.query("function_logs")
     .filter(q => q.gt(q.field("executionTime"), 1000))
     .collect();
   ```

### Alert Configuration

```yaml
# Example monitoring alerts
alerts:
  migration_failures:
    condition: "ensurePersonalWorkspace_errors > 5 in 5m"
    action: "immediate_investigation"
    
  permission_errors:
    condition: "access_denied_errors > 10 in 5m" 
    action: "check_role_assignments"
    
  data_inconsistency:
    condition: "orphaned_records > 0"
    action: "run_data_integrity_check"
```

---

**Support Escalation Path:**
1. **Level 1**: Check this guide, basic troubleshooting
2. **Level 2**: Database investigation, user-specific issues  
3. **Level 3**: System-wide problems, emergency rollback consideration

**Contact Information:**
- **On-Call Engineer**: [Phone/Slack]
- **Database Admin**: [Contact]
- **Product Team**: [Contact]