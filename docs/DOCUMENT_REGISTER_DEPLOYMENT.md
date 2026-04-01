# Document Register - Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration

The migration `20260401_add_documentcode_title` adds two nullable columns to the `Document` table:
- `documentCode` (TEXT, nullable)
- `title` (TEXT, nullable)
- Unique constraint on `(projectId, documentCode)`

**To apply:**

```bash
# In packages/db directory
pnpm exec prisma migrate deploy
```

**Verification:**

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Document'
  AND column_name IN ('documentCode', 'title');

-- Check unique constraint exists
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'Document'
  AND constraint_name = 'Document_projectId_documentCode_key';
```

### 2. Prisma Client Generation

After schema changes, regenerate Prisma client:

```bash
# Root directory
pnpm --filter @docuroute/db exec prisma generate
```

This must be done in CI/CD before building the app.

### 3. Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - For session management
- `UPSTASH_REDIS_REST_URL` - For rate limiting (if needed)

## Deployment Order

### Step 1: Database Migration (Supabase)

1. Run migration in Supabase dashboard or CLI
2. Verify migration succeeded (check logs)
3. Verify RLS policies still work (test query with `app.current_company_id`)

**Safety:**
- Migration is backward compatible (nullable columns)
- Existing documents will have NULL documentCode and title
- No data loss
- Can be rolled back if needed

### Step 2: Deploy Backend

1. Build and deploy API changes
2. Verify `/api/documents` endpoint responds
3. Check Prisma client is up-to-date

**Rollback Plan:**
- If API fails, revert to previous deployment
- Database migration does NOT need rollback (backward compatible)

### Step 3: Deploy Frontend

1. Build and deploy Next.js app
2. Verify `/documents` page loads
3. Test document detail page

## Post-Deployment Verification

### 1. API Health Check

```bash
# Test document list endpoint
curl https://your-domain.com/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Should return 200 with pagination data
```

### 2. Frontend Health Check

1. Navigate to `/documents` in browser
2. Verify table loads
3. Test search and filters
4. Click into a document detail page
5. Verify revisions display correctly

### 3. Performance Check

```sql
-- Check query performance (should be <100ms)
EXPLAIN ANALYZE
SELECT * FROM "Document"
WHERE "companyId" = 'xxx'
  AND status = 'ACTIVE'
ORDER BY "updatedAt" DESC
LIMIT 50;

-- Verify indexes are being used
-- Look for "Index Scan" or "Index Only Scan"
-- Avoid "Seq Scan" (sequential scan - bad!)
```

### 4. Audit Log Check

```sql
-- Verify audit logs are being created
SELECT COUNT(*) FROM "AuditLog"
WHERE action = 'DOCUMENT_DOWNLOADED'
  AND "createdAt" > NOW() - INTERVAL '1 hour';

-- Should see new entries after testing
```

## Monitoring

### Key Metrics to Watch

1. **API Response Time**
   - GET `/api/documents`: Target <1s
   - GET `/api/documents/[id]`: Target <500ms

2. **Database Query Time**
   - Document list query: <100ms
   - Current revision join: <50ms

3. **Error Rates**
   - 404 errors: Should be low (bad document IDs)
   - 403 errors: Should be minimal (permission issues)
   - 500 errors: Should be ZERO

4. **Audit Log Volume**
   - Should see steady increase
   - Spike indicates heavy usage (expected)

## Rollback Procedure

If deployment fails:

### Option 1: Quick Rollback (Recommended)

1. Revert frontend and backend to previous version
2. **DO NOT** rollback database migration (it's safe to keep)
3. Old code will ignore new columns
4. Fix issues and redeploy

### Option 2: Full Rollback (If Absolutely Necessary)

```sql
-- Only if you must remove the migration
ALTER TABLE "Document" DROP COLUMN "documentCode";
ALTER TABLE "Document" DROP COLUMN "title";
```

**Warning:** This will lose any documentCode/title data that was added. Only do this in extreme cases.

## Common Issues

### Issue: Prisma Client Out of Sync

**Symptoms:**
- TypeScript errors about missing fields
- Runtime errors: "Unknown field: documentCode"

**Solution:**
```bash
pnpm --filter @docuroute/db exec prisma generate
pnpm build
```

### Issue: RLS Blocking Queries

**Symptoms:**
- Empty results even when documents exist
- Different results in Supabase SQL editor vs app

**Solution:**
- Verify `getPrismaForCompany()` is used (not `prismaAdmin`)
- Check `app.current_company_id` is being set
- Test RLS policy:
  ```sql
  SET app.current_company_id = 'your-company-id';
  SELECT COUNT(*) FROM "Document";
  ```

### Issue: Slow Query Performance

**Symptoms:**
- API response time >2s
- Database CPU usage high

**Solution:**
- Check indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'Document';
  ```
- Verify query plan uses indexes (EXPLAIN ANALYZE)
- Consider adding index on (documentCode) if many searches

### Issue: Missing Revisions

**Symptoms:**
- revisionCode shows as "-" in table
- No revisions in detail page

**Solution:**
- Check DocumentRevision records exist
- Verify status = "CURRENT" for at least one revision
- Check RLS policies on DocumentRevision table

## Data Migration (Optional)

If you want to populate documentCode and title from existing data:

```sql
-- Extract document code from filename
-- This is project-specific, adjust pattern matching as needed
UPDATE "Document"
SET "documentCode" = REGEXP_REPLACE(filename, '\.pdf$', '', 'i')
WHERE "documentCode" IS NULL;

-- Set title from filename (remove extension)
UPDATE "Document"
SET title = REGEXP_REPLACE(filename, '\.[^.]+$', '')
WHERE title IS NULL;
```

## Performance Tuning

### If Load Time > 1s

1. **Add index on documentCode:**
   ```sql
   CREATE INDEX idx_document_code ON "Document"("companyId", "documentCode");
   ```

2. **Add index on title:**
   ```sql
   CREATE INDEX idx_document_title ON "Document"("companyId", title);
   ```

3. **Consider full-text search:**
   ```sql
   -- If search is slow with large datasets
   CREATE INDEX idx_document_search
   ON "Document"
   USING GIN (to_tsvector('english', "documentCode" || ' ' || COALESCE(title, '')));
   ```

## Success Criteria

Deployment is successful when:
- ✅ Migration applied without errors
- ✅ `/api/documents` endpoint returns 200
- ✅ `/documents` page loads in <1s
- ✅ Document detail page displays correctly
- ✅ Search and filters work
- ✅ Audit logs are being created
- ✅ No 500 errors in logs
- ✅ All tests in test.md pass

## Support

If issues arise:
1. Check application logs
2. Check database logs (Supabase dashboard)
3. Review audit logs for patterns
4. Run queries from test.md manually
5. Check browser console for frontend errors

## Next Steps

After successful deployment:
1. Monitor for 24 hours
2. Gather user feedback
3. Check performance metrics
4. Plan Phase 3 enhancements (if needed)
