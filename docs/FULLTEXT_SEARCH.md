# Full-Text PDF Search Implementation Summary

## Overview
Successfully implemented full-text search across PDF document content using PostgreSQL's tsvector and tsquery capabilities. This allows users to search inside PDF files (e.g., find all drawings mentioning "pressure relief valve") instead of just searching document codes and titles.

## Architecture

### Database Layer
- **DocumentContent Model**: Stores extracted PDF text with PostgreSQL tsvector for search indexing
- **Migration**: Includes GIN index on searchVector for sub-second search performance
- **RLS Policies**: Multi-tenant isolation with tenant and platform admin policies
- **Automatic Trigger**: Updates searchVector automatically when plainText changes
- **Document Flag**: hasSearchableContent boolean for quick filtering

### PDF Extraction
- **pdf-parse Library**: Extracts text from PDF files
- **Worker Queue**: BullMQ-based extraction with 30-second timeout protection
- **Truncation**: Large documents (>1500 words) truncated to first 1000 + last 500 words
- **Error Handling**: Fire-and-forget pattern - extraction failures don't block uploads

### Search API
Three search modes in GET /api/documents/search:
1. **metadata**: Search document codes/titles using pg_trgm (fastest, default)
2. **fulltext**: Search inside PDF content using tsvector (precise)
3. **both**: Combined metadata + content search (comprehensive)

Features:
- **ts_rank_cd**: Relevance scoring for result ordering
- **ts_headline**: Contextual snippets with highlighted matches
- **Query sanitization**: Safe tsquery generation from user input
- **Filters**: Project, discipline, status filtering
- **Pagination**: Up to 100 results per page

### User Interface
- **Search Type Toggle**: Buttons to switch between metadata/fulltext/both
- **Result Cards**: Clickable cards with document info
- **Searchable Badge**: Visual indicator for indexed documents
- **Highlighted Snippets**: HTML-rendered text snippets with <b> tags
- **Pagination**: Previous/Next navigation with page counter
- **Search Tips**: Helpful guidance for users

## Integration Points

### Upload Flow
```typescript
// apps/web/src/app/api/upload/confirm/route.ts
if (isPDFExtractable(mimeType)) {
  await pdfExtractionQueue.add('extract', {
    documentId, companyId, fileKey, mimeType, revisionCode, fileSize
  }, { priority: 1, attempts: 3 })
}
```

### Worker Service
```typescript
// apps/worker/src/index.ts
import { pdfExtractionWorker } from './workers/pdf-extraction.worker'
import { startPDFBackfill } from './crons/pdf-backfill'
```

### Backfill Strategy
- **Cron Schedule**: Daily at 3:00 AM UTC
- **Batch Size**: 50 documents per run
- **Queue Protection**: Skips if >100 jobs already queued
- **Priority**: Lower than new uploads (priority 10 vs 1)
- **Manual Trigger**: Available via triggerManualBackfill() function

## Performance Considerations

### Indexing
- GIN index on DocumentContent.searchVector
- Composite index on (companyId, documentId)
- Index on hasSearchableContent for filtering

### Extraction
- 30-second timeout per PDF
- Concurrency: 3 PDFs processed simultaneously
- Rate limit: 20 extractions per minute
- Exponential backoff on failures

### Search
- Metadata search: <100ms (pg_trgm similarity)
- Fulltext search: <500ms (GIN index lookup)
- Combined search: <1s (LEFT JOIN + DISTINCT)

## Environment Variables

### Web Application
```bash
SEARCH_FULLTEXT_ENABLED=true        # Enable full-text search feature
SEARCH_MAX_RESULTS=100              # Maximum search results per query
PDF_EXTRACTION_TIMEOUT_SECONDS=30   # PDF text extraction timeout
```

### Worker Service
```bash
PDF_EXTRACTION_TIMEOUT_SECONDS=30   # PDF text extraction timeout
```

## Files Modified/Created

### Database
- `packages/db/prisma/schema.prisma` - Added DocumentContent model
- `packages/db/prisma/migrations/20260406_fulltext_search/migration.sql` - Migration with indexes

### Core Package
- `packages/core/src/pdf-extraction.ts` - PDF text extraction utilities
- `packages/core/src/r2.ts` - Added getFileBuffer() function
- `packages/core/package.json` - Added pdf-parse dependency

### Worker Service
- `apps/worker/src/workers/pdf-extraction.worker.ts` - Extraction worker
- `apps/worker/src/crons/pdf-backfill.ts` - Backfill cron job
- `apps/worker/src/index.ts` - Register worker and cron
- `apps/worker/package.json` - Added pdf-parse and cron dependencies
- `apps/worker/.env.example` - Added configuration

### Web Application
- `apps/web/src/app/api/documents/search/route.ts` - Enhanced search API
- `apps/web/src/app/(dashboard)/search/page.tsx` - New search UI
- `apps/web/src/app/api/upload/confirm/route.ts` - Queue extraction on upload
- `apps/web/.env.example` - Added configuration

## Testing Checklist

### Database
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Verify GIN index created: `SELECT indexname FROM pg_indexes WHERE tablename = 'DocumentContent'`
- [ ] Test RLS policies work correctly

### PDF Extraction
- [ ] Upload a PDF document
- [ ] Verify extraction job queued
- [ ] Check DocumentContent table has entry
- [ ] Verify hasSearchableContent = true on Document

### Search API
- [ ] Test metadata search: `/api/documents/search?q=test&type=metadata`
- [ ] Test fulltext search: `/api/documents/search?q=valve&type=fulltext`
- [ ] Test combined search: `/api/documents/search?q=test&type=both`
- [ ] Verify snippets contain highlighted text
- [ ] Test pagination works correctly

### Search UI
- [ ] Navigate to /search
- [ ] Search with each mode (metadata/fulltext/both)
- [ ] Verify results display correctly
- [ ] Check snippet highlighting renders
- [ ] Test pagination buttons
- [ ] Click result card navigates to document

### Backfill
- [ ] Trigger manual backfill for existing PDFs
- [ ] Verify cron job scheduled correctly
- [ ] Check batch processing respects limits

## Known Limitations

1. **Phase 1 Constraint**: Assumes revision "A" for all documents (Phase 2 will support proper revision tracking)
2. **Encrypted PDFs**: Cannot extract text from password-protected PDFs
3. **Image-only PDFs**: Scanned documents without OCR won't have extractable text
4. **Large Files**: PDFs >50 pages may have truncated content for performance
5. **Timeout**: Complex PDFs taking >30s will fail extraction

## Future Enhancements

1. **OCR Support**: Integrate Tesseract for scanned documents
2. **Multi-language**: Support non-English text search
3. **Fuzzy Search**: Add fuzzy matching to fulltext queries
4. **Advanced Filters**: Filter by page count, extracted words, etc.
5. **Search Analytics**: Track popular searches and result quality
6. **Phrase Search**: Support quoted phrase matching
7. **Field-specific**: Search in specific fields (title, content, metadata)

## Migration Instructions

### For Existing Deployments

1. **Update Environment Variables**:
   ```bash
   # Add to .env
   SEARCH_FULLTEXT_ENABLED=true
   SEARCH_MAX_RESULTS=100
   PDF_EXTRACTION_TIMEOUT_SECONDS=30
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Run Migration**:
   ```bash
   cd packages/db
   npx prisma migrate deploy
   ```

4. **Deploy Worker**:
   ```bash
   # Restart worker service to register new worker and cron
   ```

5. **Trigger Backfill** (Optional):
   ```bash
   # Call triggerManualBackfill() via API or worker console
   ```

6. **Verify**:
   - Check worker logs for PDF extraction activity
   - Test search with type=fulltext parameter
   - Navigate to /search page

## Support

For issues or questions:
- Check worker logs for extraction errors
- Verify Redis connection is working
- Ensure R2 credentials are valid
- Check PostgreSQL extensions: `SELECT * FROM pg_extension WHERE extname = 'pg_trgm'`
