P1: Implementation Plan: Performance & Cost Control                                             
                                     
 Context                             

 This plan implements the three P1 tasks from /Users/lisagu/Projects/fitnessai-1/docs/TODOs.md
 under "Performance & Cost Control":

 1. Add caching + TTL verification for exercise registry reads - Caching is already fully
 implemented using Next.js unstable_cache. We need to verify and document the existing
 configuration.
 2. Monitor Firestore read/write costs in prod (dashboard + alerts) - Currently missing. We'll
 use GCP's built-in Firestore metrics with Cloud Monitoring alerts for immediate coverage, with
 a clear path to add custom tracking later if needed.
 3. Add rate limits for AI features (already present) and confirm limits in prod - Rate limiting
  is fully implemented for all 6 AI features. We need production verification and monitoring
 setup.

 The goal is to provide production-ready observability for cost control without
 over-engineering, while laying groundwork for future enhancements.

 ---
 Task 1: Caching Verification & Documentation

 Current State

 - Server-side: /Users/lisagu/Projects/fitnessai-1/src/lib/exercise-registry.server.ts uses
 Next.js unstable_cache
   - Active exercises: 1 hour TTL (3600s)
   - Exercise aliases: 24 hour TTL (86400s)
   - Strength ratios: 24 hour TTL (86400s)
 - Client-side: React Query with 1 hour staleTime in
 /Users/lisagu/Projects/fitnessai-1/src/lib/firestore.service.ts

 Implementation

 1. Create verification script /scripts/verify-cache-config.ts
 - Scan codebase for all unstable_cache usage
 - Extract TTL values and cache keys
 - Validate no missing revalidate parameters
 - Check for unintentional cache bypasses
 - Output summary report

 2. Create documentation /docs/caching-strategy.md
 - Document all cached operations with TTL values
 - Explain rationale for each TTL choice
 - Provide cache invalidation procedures
 - Include client-side React Query caching notes
 - Add troubleshooting section for cache issues

 3. Update package.json
 - Add npm script: "verify:cache": "tsx scripts/verify-cache-config.ts"

 Verification

 - Run npm run verify:cache
 - Review output for any misconfigurations
 - Confirm no exercise-related queries bypass caching

 ---
 Task 2: Firestore Cost Monitoring (Hybrid Approach)

 Current State

 - Cloud Logging configured with @google-cloud/logging
 - No Firestore cost monitoring or alerts
 - No quota threshold warnings
 - Health check endpoint exists at /api/health

 Implementation

 Phase A: Immediate - Built-in Metrics & Alerts

 1. Create alert setup script /scripts/setup-firestore-alerts.ts
 - Use GCP's built-in Firestore metrics (no code changes needed):
   - firestore.googleapis.com/document/read_count
   - firestore.googleapis.com/document/write_count
   - firestore.googleapis.com/document/delete_count
 - Create Cloud Monitoring alert policies:
   - Alert 1: Daily reads > 500,000 (approaching free tier limit of 1M)
   - Alert 2: Daily writes > 50,000 (10% of free tier)
   - Alert 3: Sudden spike (2x hourly average)
   - Alert 4: Estimated daily cost > $5
 - Configure email notification channel
 - Make script idempotent for safe re-runs

 2. Update ops runbook /docs/ops-runbook.md
 - Add "Firestore Cost Monitoring" section
 - Document alert policies and thresholds
 - Provide Cloud Console dashboard links
 - Add response procedures for cost alerts
 - Include useful Cloud Logging queries for Firestore operations

 3. Create cost estimation guide /docs/firestore-cost-estimation.md
 - Document GCP Firestore pricing (current as of Feb 2026)
 - Provide formulas for cost calculation
 - Include usage patterns and projections
 - Note optimization opportunities (e.g., collections-split.md)

 Phase B: Future - Custom Metrics (when needed)

 Document in /docs/firestore-cost-estimation.md how to add custom tracking:
 - Wrapper pattern for firestore-server.ts operations
 - Using @google-cloud/monitoring for custom metrics
 - Tracking by collection and feature
 - Implementation guide for when built-in metrics aren't sufficient

 Verification

 - Run npm run setup:firestore-alerts in production
 - Verify alert policies visible in Cloud Console
 - Trigger test alert (if possible in staging)
 - Confirm notification emails received
 - Check GCP dashboards show Firestore metrics

 ---
 Task 3: Rate Limit Verification

 Current State

 - Fully implemented in /Users/lisagu/Projects/fitnessai-1/src/lib/rate-limit-config.ts
 - 6 AI features protected with daily per-user limits:
   - prParses: 10/day
   - screenshotParses: 5/day
   - strengthAnalyses: 5/day
   - planGenerations: 5/day
   - liftProgressionAnalyses: 20/day
   - goalAnalyses: 5/day
 - Enforcement via checkRateLimit() in
 /Users/lisagu/Projects/fitnessai-1/src/app/prs/rate-limiting.ts
 - Storage in Firestore users/{userId} document under aiUsage field
 - Development bypass: NODE_ENV !== 'development'

 Implementation

 1. Create verification script /scripts/verify-rate-limits.ts
 - Scan all AI server actions for rate limit checks
 - Verify coverage for all features in rate-limit-config.ts
 - Check for production bypasses (security issue)
 - Validate configuration consistency
 - Output coverage report with any gaps

 2. Create verification guide /docs/rate-limit-verification.md
 - Production testing checklist for each AI feature
 - Expected error messages and behaviors
 - Steps to manually verify limits in production
 - Instructions for adjusting limits based on usage
 - Development bypass verification steps

 3. Update ops runbook /docs/ops-runbook.md
 - Add "Rate Limit Monitoring" section
 - Cloud Logging queries for rate limit events:
 # Users hitting rate limits today
 logName="projects/fitnessai-prod/logs/fitnessai"
 jsonPayload.error=~"DAILY_LIMIT_REACHED"
 timestamp >= "YYYY-MM-DDT00:00:00Z"
 - Query for violations by feature
 - Query for heavy AI users (top 10)
 - Add to incident response procedures

 4. Update package.json
 - Add npm script: "verify:rate-limits": "tsx scripts/verify-rate-limits.ts"

 Verification

 Automated:
 - Run npm run verify:rate-limits
 - Review coverage report
 - Confirm all AI operations have rate limiting

 Manual (Production):
 - Create test user account
 - For each AI feature:
   - Trigger until hitting daily limit
   - Verify "DAILY_LIMIT_REACHED" error
   - Check Firestore aiUsage counter increments
   - Verify counter resets next day
 - Check Cloud Logging for rate limit events
 - Verify development bypass works locally

 ---
 Implementation Sequence

 Week 1: Verification Infrastructure

 1. Create /scripts/verify-cache-config.ts
 2. Create /scripts/verify-rate-limits.ts
 3. Create /docs/caching-strategy.md
 4. Create /docs/rate-limit-verification.md
 5. Update package.json with verify scripts
 6. Run both verification scripts and document findings

 Week 2: Firestore Monitoring

 1. Create /scripts/setup-firestore-alerts.ts
 2. Create /docs/firestore-cost-estimation.md
 3. Update /docs/ops-runbook.md with monitoring sections
 4. Run alert setup script in production
 5. Verify alerts in Cloud Console

 Week 3: Production Validation

 1. Execute manual rate limit testing in production
 2. Verify Firestore alerts trigger correctly
 3. Test all monitoring queries in Cloud Logging
 4. Document findings and tune alert thresholds if needed
 5. Update TODOs.md to mark tasks complete

 ---
 Files to Create/Modify

 New Files (7)

 - /Users/lisagu/Projects/fitnessai-1/scripts/verify-cache-config.ts - Cache verification script
 - /Users/lisagu/Projects/fitnessai-1/scripts/verify-rate-limits.ts - Rate limit verification
 script
 - /Users/lisagu/Projects/fitnessai-1/scripts/setup-firestore-alerts.ts - Alert configuration
 script
 - /Users/lisagu/Projects/fitnessai-1/docs/caching-strategy.md - Cache documentation
 - /Users/lisagu/Projects/fitnessai-1/docs/rate-limit-verification.md - Rate limit testing guide
 - /Users/lisagu/Projects/fitnessai-1/docs/firestore-cost-estimation.md - Cost monitoring guide

 Modified Files (2)

 - /Users/lisagu/Projects/fitnessai-1/package.json - Add verify scripts
 - /Users/lisagu/Projects/fitnessai-1/docs/ops-runbook.md - Add monitoring sections

 ---
 Dependencies

 No New Dependencies Required

 All required packages already installed:
 - @google-cloud/logging (already in use)
 - tsx (for running TypeScript scripts)
 - Firebase Admin SDK (for Firestore access)

 Cloud Monitoring alerts use GCP API (authenticated via service account), no SDK needed for
 basic setup.

 ---
 Success Criteria

 Task 1: Caching ✓

 - Verification script runs successfully and reports no issues
 - All cache configurations documented with TTL rationale
 - No missing cache tags or bypasses identified

 Task 2: Firestore Monitoring ✓

 - Alert policies created and visible in Cloud Console
 - Test alert triggers correctly
 - Ops runbook includes monitoring procedures
 - Cost estimation guide complete
 - GCP dashboards showing Firestore metrics

 Task 3: Rate Limiting ✓

 - Verification script confirms 100% coverage
 - All 6 AI features verified in production
 - Rate limit errors logged correctly
 - Development bypass works
 - Monitoring queries return expected data

 ---
 Rollback Plan

 All changes are additive (scripts and documentation):
 - No production code changes to core application
 - Alert scripts are idempotent and can be re-run
 - If alerts are too noisy, adjust thresholds via script
 - No database migrations or schema changes

 ---
 Future Enhancements

 When built-in metrics prove insufficient:
 1. Implement custom metrics tracking as outlined in Plan agent's Phase 2
 2. Add @google-cloud/monitoring dependency
 3. Create wrapper functions in /src/lib/monitoring/firestore-metrics.ts
 4. Add metrics tracking to /src/lib/firestore-server.ts operations
 5. Build dashboard API endpoint at /api/monitoring/firestore-stats

 Trigger: When you need granular tracking by collection, feature, or user segment.