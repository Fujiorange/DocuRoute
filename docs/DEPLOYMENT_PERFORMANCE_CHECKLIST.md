# Deployment Performance Checklist

This document lists critical performance-related steps that must be completed before production deployment.

## Critical Database Indexes

### 1. GIN Index for Role Permissions Array

**Priority:** 🔴 CRITICAL - Must complete before Phase 1 API deployment

**Problem:** Permission-based role queries will perform full table scans without this index.

**SQL to Execute:**
```sql
-- Create GIN index for array containment queries on Role.permissions
CREATE INDEX idx_role_permissions ON "Role" USING GIN (permissions);
```

**When to run:** After initial Prisma migration but before deploying any API routes that query roles by permission.

**How to verify:**
```sql
-- Check that index exists
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'Role' AND indexname = 'idx_role_permissions';

-- Verify index is used in query plan
EXPLAIN SELECT * FROM "Role" WHERE permissions @> ARRAY['UPLOAD_DOCUMENT'];
-- Should show "Bitmap Index Scan using idx_role_permissions"
```

**Impact if missing:**
- O(n) full table scans on every permission-based role lookup
- Notification systems will be slow
- User search by permission will timeout with many roles
- Performance degrades linearly with role count

---

## Performance Optimizations (Recommended Before Production)

### 2. Redis Caching Layer

**Priority:** 🟠 HIGH - Implement in Phase 1 or early Phase 2

**Components to cache:**
- User permissions (5 minute TTL)
- System role definitions (1 hour TTL)
- Company settings (30 minute TTL)

**Expected Impact:**
- 80-90% cache hit rate for permissions
- 30-40% reduction in database load
- 20-30ms faster API response times

**Implementation:** See `docs/PERFORMANCE_ANALYSIS.md` section 2.4

---

### 3. R2 Watermark Caching

**Priority:** 🔴 CRITICAL - Must implement before watermarking goes live

**Current Status:** Stub functions return null/no-op

**Files to complete:**
- `packages/core/src/watermark.ts` - `getCachedWatermark()` and `saveCachedWatermark()`

**Expected Impact:**
- 70-80% reduction in duplicate watermark processing
- Better user experience (instant downloads for cached files)
- Lower infrastructure costs

**Implementation:** See `docs/PERFORMANCE_ANALYSIS.md` section 1.3

---

### 4. Watermark Memory Optimization

**Priority:** 🔴 CRITICAL - Fix before processing files >150MB

**Current Issue:** Base64 encoding causes 35% memory overhead (467MB for 200MB file)

**Recommended Fix:** Use temporary files instead of base64 for IPC

**Expected Impact:**
- 35% reduction in memory usage per watermark job
- Can safely process files up to 300MB (vs current 200MB risk of OOM)
- Eliminates worker crash risk

**Implementation:** See `docs/PERFORMANCE_ANALYSIS.md` section 1.2

---

## Monitoring Setup

### 5. Query Performance Monitoring

**Priority:** 🟡 MEDIUM - Set up before Phase 2

**What to monitor:**
- Slow queries (>100ms)
- N+1 query patterns
- Database connection pool utilization

**Tool:** Prisma middleware for query logging

**Implementation:** See `docs/PERFORMANCE_ANALYSIS.md` section 3.3

---

### 6. Worker Health Monitoring

**Priority:** 🟡 MEDIUM - Implement with Phase 1 deployment

**Current Status:** Health endpoint returns static values

**Metrics to expose:**
- Actual pool utilization (busyWorkers / totalWorkers)
- Queue depth (active, waiting, failed jobs)
- Memory usage per worker
- Job processing duration (p50, p95, p99)

**Implementation:** See `docs/PERFORMANCE_ANALYSIS.md` section 3.4

---

## Post-Deployment Verification

### Verify GIN Index is Used

```sql
-- Run this query and check execution plan
EXPLAIN ANALYZE
SELECT * FROM "Role"
WHERE permissions @> ARRAY['UPLOAD_DOCUMENT'];
```

Expected: `Bitmap Index Scan using idx_role_permissions`
Not expected: `Seq Scan on "Role"`

### Verify Permission Caching

Check Redis for cached permissions:
```bash
redis-cli
> KEYS user:*:permissions
> GET user:abc123:permissions
```

Should return JSON array of permissions after first request.

### Verify Watermark Caching

Check R2 bucket for cached watermarks:
```bash
aws s3 ls s3://your-bucket/watermarked/ --endpoint-url=YOUR_R2_ENDPOINT
```

Should see files after first watermark job completes.

---

## Performance Testing Targets

Before marking deployment as "production-ready":

**Authentication:**
- ✅ 1,000 req/s with <50ms p95 latency
- ✅ Redis cache hit rate >80%

**Watermarking:**
- ✅ Process 100 PDFs/hour
- ✅ Cache hit rate >60% after warmup
- ✅ Zero OOM crashes with 200MB files

**Database:**
- ✅ All queries <100ms at p95
- ✅ GIN index used for permission queries
- ✅ No N+1 patterns detected

---

## Rollback Plan

If performance issues are discovered in production:

1. **Missing GIN Index:**
   - Create index with `CONCURRENTLY` to avoid table lock
   - `CREATE INDEX CONCURRENTLY idx_role_permissions ON "Role" USING GIN (permissions);`

2. **Watermark OOM Crashes:**
   - Reduce `MAX_WATERMARK_SIZE_BYTES` from 200MB to 150MB
   - Increase worker memory from 512MB to 768MB
   - Or implement temporary file solution immediately

3. **High Database Load:**
   - Enable Redis caching as emergency measure
   - Start with 5-minute TTL for user permissions
   - Monitor cache hit rate and adjust

---

## Sign-off Checklist

Before production deployment:

- [ ] GIN index created and verified
- [ ] R2 watermark caching implemented and tested
- [ ] Watermark memory issue addressed (temp files or reduced limit)
- [ ] Query monitoring configured
- [ ] Worker health monitoring configured
- [ ] Load testing completed with targets met
- [ ] Rollback plan documented and tested

**Approved By:** _________________
**Date:** _________________

---

## Related Documents

- `docs/PERFORMANCE_ANALYSIS.md` - Detailed analysis and implementation examples
- `docs/DEPLOYMENT_CHECKLIST.md` - General deployment checklist
- `docs/SECURITY_MANUAL_CHECKLIST.md` - Security deployment checklist
- `packages/db/prisma/schema.prisma` - Database schema with index comments
