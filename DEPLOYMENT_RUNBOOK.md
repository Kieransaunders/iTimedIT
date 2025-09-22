# Multitenancy Deployment Runbook

## Pre-Deployment Checklist

### Code Quality Gates
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation clean (`npm run lint`)
- [ ] Convex functions deployable (`convex dev --once`)
- [ ] Frontend builds successfully (`npm run build`)

### Environment Preparation
- [ ] Staging environment fully tested with multitenancy features
- [ ] Database backup completed and verified
- [ ] Rollback plan documented and tested
- [ ] Team notification channels prepared

### Dependency Verification
- [ ] Convex backend version compatible
- [ ] No breaking changes in recent Convex platform updates
- [ ] Email service (for invitations) configured and tested
- [ ] Authentication provider (Clerk/Auth0) stable

## Deployment Sequence

### Step 1: Backend Deployment
```bash
# 1. Deploy Convex functions with schema changes
convex deploy --prod

# 2. Verify deployment success
convex logs --prod --tail

# 3. Test critical endpoints
curl -X POST "https://your-convex-deployment/api/organizations/ensurePersonalWorkspace"
```

### Step 2: Frontend Deployment  
```bash
# 1. Build production frontend
npm run build

# 2. Deploy to hosting platform
npm run deploy  # or your deployment command

# 3. Verify deployment
curl -I https://your-app-domain.com
```

### Step 3: Migration Trigger
The migration is **automatic** and triggered when users log in:
- No manual data migration scripts needed
- `ensurePersonalWorkspace` runs on first login post-deployment
- Each user's data migrated individually and safely

### Step 4: Immediate Verification
```bash
# Monitor Convex function logs for migration activity
convex logs --prod --follow

# Check for any error patterns
convex logs --prod --filter="error" --tail=50

# Verify organization creation
# (Use Convex dashboard to check organizations table)
```

## Monitoring During Deployment

### Key Metrics to Watch
1. **Error Rates**
   - Function execution errors < 1%
   - Frontend JavaScript errors < 0.5%
   - Failed authentication attempts < 2%

2. **Performance Metrics**
   - API response times < 500ms (95th percentile)
   - Page load times < 3s
   - Database query times < 100ms

3. **Migration Success Indicators**
   - Organizations created = Unique users logging in
   - Memberships created = Organizations created
   - No orphaned data records

### Alerting Thresholds
```yaml
# Example monitoring configuration
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "2 minutes"
    action: "page_on_call_engineer"
    
  - name: "Migration Failures"
    condition: "ensurePersonalWorkspace_failures > 10"
    duration: "5 minutes"
    action: "investigate_immediately"
    
  - name: "Performance Degradation"
    condition: "p95_response_time > 1000ms"
    duration: "5 minutes"
    action: "monitor_and_alert"
```

## Post-Deployment Validation

### Automated Health Checks
```bash
#!/bin/bash
# health_check.sh - Run after deployment

echo "🔍 Running post-deployment health checks..."

# 1. Test user authentication
echo "Testing authentication..."
curl -f https://your-app.com/api/health/auth || exit 1

# 2. Test organization creation
echo "Testing organization functionality..."
# Perform test login and verify organization creation

# 3. Test invitation flow
echo "Testing invitation system..."
# Send test invitation and verify email delivery

# 4. Test data access
echo "Testing data access permissions..."
# Verify users can access their own data only

echo "✅ All health checks passed!"
```

### Manual Verification Steps
1. **User Login Test**
   - [ ] Existing user can log in successfully
   - [ ] Personal workspace created automatically
   - [ ] Historical data visible and accessible

2. **Team Functionality Test**
   - [ ] Create new organization
   - [ ] Send invitation to team member
   - [ ] Accept invitation and verify access
   - [ ] Test role-based permissions

3. **Data Integrity Test**
   - [ ] All clients visible in personal workspace
   - [ ] All projects associated correctly
   - [ ] Time entries display properly
   - [ ] Timer functionality works

## Rollback Procedures

### Immediate Rollback Triggers
- Error rate > 10% for > 5 minutes
- Complete login failure
- Data loss detected
- Critical functionality broken

### Rollback Execution
```bash
# 1. Revert Convex deployment
convex rollback --prod --to-version=<previous-version>

# 2. Revert frontend deployment
git revert <multitenancy-commits>
npm run build && npm run deploy

# 3. Verify rollback success
./health_check.sh

# 4. Communicate rollback to users
# Send status update via your communication channels
```

### Post-Rollback Actions
1. **Immediate**
   - [ ] Verify all users can access application
   - [ ] Confirm no data loss occurred
   - [ ] Update status page with incident details

2. **Within 24 Hours**
   - [ ] Conduct rollback retrospective
   - [ ] Identify root cause of deployment issues
   - [ ] Plan fixes for identified problems
   - [ ] Schedule retry deployment

## Communication Plan

### Pre-Deployment Communication
```markdown
Subject: Planned Maintenance - Team Collaboration Features Coming Soon

Dear Users,

We're excited to announce that we'll be deploying new team collaboration 
features on [DATE] at [TIME]. During this brief maintenance window:

- The application will remain accessible
- Your existing data will be preserved
- New team invitation features will be available after deployment

Expected duration: 30 minutes
Estimated downtime: None (rolling deployment)

Thank you for your patience!
```

### Post-Deployment Communication
```markdown
Subject: 🎉 Team Collaboration Features Now Live!

The deployment was successful! You can now:

✅ Invite team members to collaborate on projects
✅ Manage organization settings
✅ Control access with role-based permissions

Get started: Click "Settings" → "Organization" in your dashboard

Questions? Reply to this email or visit our help center.
```

### Incident Communication Template
```markdown
Subject: [INCIDENT] Service Impact - Investigation Underway

We're currently investigating reports of [ISSUE DESCRIPTION].

Status: Investigating
Impact: [IMPACT LEVEL]
ETA for Resolution: [TIME]

We'll provide updates every 30 minutes until resolved.
Monitor: https://status.your-app.com
```

## Success Criteria

### Deployment Success Metrics
- [ ] Zero data loss
- [ ] < 1% error rate during migration
- [ ] All existing users can log in within 24 hours
- [ ] Team features functional for new organizations
- [ ] Performance within 10% of baseline

### Business Success Metrics (30 days post-deployment)
- [ ] 25% of users create team organizations
- [ ] 50% of team invitations accepted
- [ ] User satisfaction scores maintained (> 4.0/5.0)
- [ ] No critical security incidents related to multitenancy

---

**Deployment Lead**: [Name]  
**On-Call Engineer**: [Name]  
**Rollback Decision Maker**: [Name]  
**Communication Lead**: [Name]