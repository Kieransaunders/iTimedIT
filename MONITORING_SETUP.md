# Monitoring and Alerting Setup for Multitenancy

## Overview
This document outlines the monitoring strategy for the multitenancy feature rollout, including key metrics, alerting thresholds, and dashboard configurations.

## Key Performance Indicators (KPIs)

### Migration Health Metrics
```javascript
// 1. Organization Creation Success Rate
const orgCreationRate = {
  metric: "organizations_created_per_day",
  target: "> 95% of daily active users",
  alert_threshold: "< 90% for 1 hour",
  query: `
    SELECT COUNT(*) as orgs_created,
           COUNT(DISTINCT createdBy) as unique_users
    FROM organizations 
    WHERE createdAt >= NOW() - INTERVAL 1 DAY
  `
};

// 2. Migration Error Rate  
const migrationErrorRate = {
  metric: "ensurePersonalWorkspace_failures",
  target: "< 1% of attempts",
  alert_threshold: "> 5% for 5 minutes",
  convex_function: "organizations.ensurePersonalWorkspace"
};

// 3. Data Consistency Score
const dataConsistency = {
  metric: "orphaned_records_count", 
  target: "0 orphaned records",
  alert_threshold: "> 10 orphaned records",
  checks: [
    "clients without organizationId",
    "projects without organizationId", 
    "timeEntries without organizationId"
  ]
};
```

### User Experience Metrics
```javascript
// 1. Login Success Rate Post-Migration
const loginSuccessRate = {
  metric: "successful_logins_rate",
  target: "> 99%",
  alert_threshold: "< 95% for 2 minutes",
  measurement: "successful_auth / total_auth_attempts"
};

// 2. Page Load Performance
const pageLoadTimes = {
  metric: "p95_page_load_time",
  target: "< 3 seconds",
  alert_threshold: "> 5 seconds for 5 minutes",
  pages_to_monitor: [
    "/dashboard",
    "/projects", 
    "/clients",
    "/settings"
  ]
};

// 3. API Response Times
const apiResponseTimes = {
  metric: "p95_api_response_time",
  target: "< 500ms",
  alert_threshold: "> 1000ms for 3 minutes",
  endpoints: [
    "organizations.listMemberships",
    "projects.listAll",
    "clients.list",
    "entries.list"
  ]
};
```

### Team Collaboration Metrics
```javascript
// 1. Invitation Success Rate
const invitationMetrics = {
  sent: "invitations.create success rate > 95%",
  delivered: "email delivery success rate > 98%", 
  accepted: "invitation acceptance rate (tracked over 7 days)",
  alert_on: "email delivery failure > 5% for 10 minutes"
};

// 2. Organization Growth
const organizationGrowth = {
  metric: "multi_member_organizations",
  target: "25% of organizations have > 1 member within 30 days",
  tracking: "weekly cohort analysis"
};
```

## Convex Function Monitoring

### Function Performance Tracking
```typescript
// Monitor these specific functions for performance
const criticalFunctions = [
  {
    name: "organizations.ensurePersonalWorkspace",
    max_execution_time: "2000ms",
    max_memory_usage: "128MB",
    success_rate_threshold: "99%"
  },
  {
    name: "organizations.currentMembership", 
    max_execution_time: "200ms",
    success_rate_threshold: "99.9%"
  },
  {
    name: "invitations.create",
    max_execution_time: "1000ms", 
    success_rate_threshold: "98%"
  },
  {
    name: "projects.listAll",
    max_execution_time: "500ms",
    success_rate_threshold: "99.5%"
  }
];

// Error pattern detection
const errorPatterns = [
  "Permission denied",
  "Organization not found", 
  "Membership not found",
  "Database timeout",
  "Email delivery failed"
];
```

### Custom Metrics Collection
```javascript
// Add to Convex functions for custom metrics
export const trackMigrationMetrics = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    success: v.boolean(),
    duration: v.optional(v.number()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("metrics", {
      timestamp: Date.now(),
      userId: args.userId,
      action: args.action,
      success: args.success,
      duration: args.duration,
      metadata: args.metadata
    });
  }
});

// Usage in migration functions
const startTime = Date.now();
try {
  // ... migration logic
  await trackMigrationMetrics({
    userId: user._id,
    action: "ensurePersonalWorkspace",
    success: true,
    duration: Date.now() - startTime
  });
} catch (error) {
  await trackMigrationMetrics({
    userId: user._id, 
    action: "ensurePersonalWorkspace",
    success: false,
    duration: Date.now() - startTime,
    metadata: { error: error.message }
  });
}
```

## Dashboard Configuration

### Convex Dashboard Widgets
```yaml
# Dashboard layout for multitenancy monitoring
dashboards:
  migration_health:
    widgets:
      - type: "line_chart"
        title: "Organizations Created (Daily)"
        query: "SELECT DATE(createdAt), COUNT(*) FROM organizations GROUP BY DATE(createdAt)"
        
      - type: "gauge"
        title: "Migration Success Rate"
        query: "SELECT (successful_migrations / total_migrations) * 100 FROM migration_stats"
        
      - type: "table"
        title: "Function Error Rates (Last 24h)"
        query: "SELECT function_name, error_count, total_calls FROM function_stats WHERE timestamp > NOW() - INTERVAL 1 DAY"

  user_experience:
    widgets:
      - type: "histogram" 
        title: "API Response Time Distribution"
        metric: "api_response_times"
        
      - type: "line_chart"
        title: "Active Users by Organization Size"
        query: "SELECT org_member_count, COUNT(DISTINCT userId) FROM user_org_stats GROUP BY org_member_count"

  team_adoption:
    widgets:
      - type: "funnel"
        title: "Invitation Funnel"
        stages: ["sent", "delivered", "opened", "accepted"]
        
      - type: "pie_chart"
        title: "Organization Types"
        query: "SELECT CASE WHEN member_count = 1 THEN 'Personal' ELSE 'Team' END, COUNT(*) FROM organization_stats GROUP BY CASE WHEN member_count = 1 THEN 'Personal' ELSE 'Team' END"
```

### External Monitoring Tools

#### Application Performance Monitoring (APM)
```typescript
// Frontend monitoring with Sentry/DataDog
import { captureException, addBreadcrumb } from '@sentry/react';

// Track organization context errors
export const useOrganizationWithMonitoring = () => {
  const orgContext = useOrganization();
  
  useEffect(() => {
    if (!orgContext.isReady) {
      addBreadcrumb({
        message: 'Organization context loading',
        level: 'info'
      });
    }
    
    if (orgContext.activeOrganization) {
      addBreadcrumb({
        message: `Active org: ${orgContext.activeOrganization.name}`,
        level: 'info'
      });
    }
  }, [orgContext]);
  
  return orgContext;
};

// Error tracking for migration issues
export const trackMigrationError = (error: Error, context: any) => {
  captureException(error, {
    tags: {
      feature: 'multitenancy',
      migration_step: context.step
    },
    extra: context
  });
};
```

#### Log Aggregation
```yaml
# Example Datadog/Splunk configuration
log_monitoring:
  sources:
    - convex_functions
    - frontend_errors
    - email_service
    
  patterns:
    - name: "migration_failures"
      pattern: "ensurePersonalWorkspace.*failed"
      alert_threshold: "> 5 occurrences in 5 minutes"
      
    - name: "permission_errors" 
      pattern: "Permission denied.*organization"
      alert_threshold: "> 10 occurrences in 5 minutes"
      
    - name: "email_delivery_failures"
      pattern: "email.*delivery.*failed"
      alert_threshold: "> 3 occurrences in 1 minute"
```

## Alert Configuration

### Critical Alerts (Immediate Response)
```yaml
critical_alerts:
  - name: "Migration Complete Failure"
    condition: "ensurePersonalWorkspace success rate < 50% for 10 minutes"
    channels: ["page", "slack-critical", "email"]
    escalation: "every 10 minutes until resolved"
    
  - name: "Mass User Lockout"
    condition: "login success rate < 80% for 5 minutes"  
    channels: ["page", "slack-critical"]
    escalation: "immediate"
    
  - name: "Data Loss Detected"
    condition: "orphaned_records > 100 OR user_data_count_decrease > 10%"
    channels: ["page", "slack-critical", "email", "sms"]
    escalation: "immediate"
```

### Warning Alerts (Monitor and Investigate)
```yaml
warning_alerts:
  - name: "Performance Degradation"
    condition: "p95_response_time > 1000ms for 10 minutes"
    channels: ["slack-monitoring"]
    escalation: "after 30 minutes"
    
  - name: "Invitation Delivery Issues"
    condition: "email delivery rate < 95% for 15 minutes"
    channels: ["slack-team", "email"]
    
  - name: "Organization Creation Slowdown"
    condition: "organization creation rate < expected for 1 hour"
    channels: ["slack-monitoring"]
```

### Business Metrics Alerts
```yaml
business_alerts:
  - name: "Low Team Adoption"
    condition: "team_organizations_percentage < 15% after 14 days"
    channels: ["slack-product", "email"]
    frequency: "daily"
    
  - name: "High Invitation Rejection"
    condition: "invitation_acceptance_rate < 60% (7-day rolling)"
    channels: ["slack-product"]
    frequency: "weekly"
```

## Monitoring Automation

### Health Check Scripts
```bash
#!/bin/bash
# multitenancy_health_check.sh

echo "🔍 Running multitenancy health checks..."

# 1. Check organization count vs user count
ORG_COUNT=$(convex query "db.query('organizations').collect().length")
USER_COUNT=$(convex query "db.query('users').collect().length") 

if [ "$ORG_COUNT" -lt "$USER_COUNT" ]; then
  echo "⚠️  Warning: Fewer organizations than users ($ORG_COUNT vs $USER_COUNT)"
fi

# 2. Check for orphaned data
ORPHANED_CLIENTS=$(convex query "db.query('clients').filter(q => !q.field('organizationId')).collect().length")
if [ "$ORPHANED_CLIENTS" -gt 0 ]; then
  echo "🚨 Error: $ORPHANED_CLIENTS orphaned clients found"
  exit 1
fi

# 3. Test critical functions
convex query "api.organizations.currentMembership" > /dev/null || {
  echo "🚨 Error: currentMembership function failing"
  exit 1
}

echo "✅ All health checks passed"
```

### Automated Recovery Scripts
```bash
#!/bin/bash
# auto_recovery.sh

# Monitor for common issues and attempt automatic fixes
while true; do
  # Check for users without organizations
  USERS_WITHOUT_ORGS=$(convex query "
    const users = await db.query('users').collect();
    const usersWithoutOrgs = [];
    for (const user of users) {
      const org = await db.query('organizations')
        .filter(q => q.eq(q.field('createdBy'), user._id))
        .unique();
      if (!org) usersWithoutOrgs.push(user);
    }
    return usersWithoutOrgs.length;
  ")
  
  if [ "$USERS_WITHOUT_ORGS" -gt 0 ]; then
    echo "🔧 Found $USERS_WITHOUT_ORGS users without organizations, attempting fix..."
    # Trigger workspace creation for affected users
    convex run api.organizations.bulkEnsureWorkspaces
  fi
  
  sleep 300 # Check every 5 minutes
done
```

## Runbook Integration

### Alert Response Procedures
```markdown
## When You Receive a Multitenancy Alert

### Step 1: Assess Severity
- Critical: Follow emergency procedures, page additional team members
- Warning: Investigate within 30 minutes
- Business: Review during business hours

### Step 2: Initial Investigation
1. Check Convex dashboard for function errors
2. Review application logs for error patterns
3. Verify database consistency with health check script

### Step 3: Common Fixes
- Migration failures: Re-run ensurePersonalWorkspace for affected users
- Permission errors: Check and fix user memberships
- Performance issues: Check for database index usage

### Step 4: Escalation
If unable to resolve within SLA:
- Critical: Escalate to senior engineer immediately
- Warning: Escalate after 1 hour of investigation
- Business: Escalate to product team
```

---

**Monitoring Contacts:**
- **Primary On-Call**: [Contact]
- **Secondary On-Call**: [Contact]
- **Escalation Manager**: [Contact]

**Dashboard URLs:**
- **Convex Dashboard**: https://dashboard.convex.dev/d/your-deployment
- **APM Dashboard**: [Your APM URL]
- **Business Metrics**: [Your analytics URL]