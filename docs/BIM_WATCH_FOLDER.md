# BIM Automated Watch Folder

## Overview

The BIM Watch Folder feature eliminates manual weekly CSV uploads by automatically polling designated folders for new equipment data files. When CSV files are detected, they are automatically imported, validated, and archived, with email notifications sent to platform administrators for any conflicts or successful imports.

## Architecture

### Components

1. **Database Model** (`BIMWatchFolder`) - Stores watch folder configuration per project
2. **Cron Job** (`apps/worker/src/crons/bim-watch.ts`) - Polls folders every 15 minutes
3. **Import Logic** (`packages/core/src/bim-import.ts`) - CSV parsing and validation
4. **Email Notifications** (`apps/web/src/lib/email.ts`) - Sends import reports
5. **Tag Validation** (`packages/core/src/naming-mask.ts`) - Validates equipment tags against project format

### Database Schema

```prisma
model BIMWatchFolder {
  id              String    @id @default(cuid())
  companyId       String
  projectId       String    @unique  // One watch folder per project
  folderPath      String              // Absolute path to watch folder
  enabled         Boolean   @default(true)
  lastPolledAt    DateTime?
  lastImportedAt  DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company         Company   @relation(fields: [companyId], references: [id])
  project         Project   @relation(fields: [projectId], references: [id])

  @@unique([companyId, folderPath])
  @@index([companyId, enabled])
  @@index([enabled, lastPolledAt])
}
```

### Workflow

```
┌─────────────────┐
│  BIM Admin      │
│  Exports CSV    │
│  to Watch Folder│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Watch Folder           │
│  /data/bim/project-123/ │
│  - equipment_export.csv │
└────────┬────────────────┘
         │
         │ (Every 15 minutes)
         ▼
┌─────────────────────────┐
│  BIM Watch Cron Job     │
│  - List CSV files       │
│  - Parse each file      │
│  - Validate tags        │
│  - Import equipment     │
│  - Move to /processed/  │
└────────┬────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌──────────────┐   ┌────────────────┐
│  Email       │   │  Database      │
│  Notification│   │  Equipment     │
│  (Conflicts) │   │  Records       │
└──────────────┘   └────────────────┘
```

## Configuration

### Creating a Watch Folder

```typescript
import { getPrismaForCompany } from '@docuroute/db'

const prisma = getPrismaForCompany(companyId)

const watchFolder = await prisma.bIMWatchFolder.create({
  data: {
    companyId,
    projectId,
    folderPath: '/data/bim/project-vessel-001',
    enabled: true
  }
})
```

### File System Setup

1. **Create watch folder directory:**
```bash
mkdir -p /data/bim/project-vessel-001
mkdir -p /data/bim/project-vessel-001/processed
```

2. **Set permissions:**
```bash
# Worker process needs read/write access
chown -R worker:worker /data/bim/project-vessel-001
chmod 755 /data/bim/project-vessel-001
```

3. **Add to .gitignore:**
```bash
# In /data/.gitignore
/bim/*/
!/bim/.gitkeep
```

### Environment Variables

```bash
# Required for email notifications
PLATFORM_ADMIN_EMAIL=admin@yourcompany.com
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@docuroute.com

# Application URL for email links
NEXTAUTH_URL=https://app.docuroute.com
```

## CSV File Format

### Required Columns

- `tag` - Equipment tag (required, validated against project format)

### Optional Columns

- `description` - Equipment description
- `discipline` - Engineering discipline (E, M, H, I, etc.)
- `area` - Location/area code
- `type` - Equipment type code
- `bimModelId` - Reference to BIM model
- Any additional columns are preserved

### Example CSV

```csv
tag,description,discipline,area,type,bimModelId
E-ER-PMP-0001,Main Seawater Pump,E,ER,PMP,model-123
E-ER-PMP-0002,Backup Seawater Pump,E,ER,PMP,model-124
M-ER-FAN-0001,Engine Room Ventilation Fan,M,ER,FAN,model-125
H-ACC-AC-0001,Accommodation Air Conditioner,H,ACC,AC,model-126
```

### File Naming

- Files must have `.csv` extension (case-insensitive)
- Any filename is accepted: `equipment_export.csv`, `tags_2026-03-27.csv`, etc.
- Multiple CSV files can be present - all will be processed

## Polling Behavior

### Timing

- **Interval:** Every 15 minutes
- **Cron Expression:** `*/15 * * * *`
- **First Run:** Immediate on worker startup (optional)

### Processing Steps

1. **List CSV Files** - Find all `.csv` files in watch folder
2. **Parse CSV** - Read and parse each CSV file
3. **Validate Tags** - Check each tag against project's tag format
4. **Import Records** - Create/update equipment records (Phase 2)
5. **Move to Archive** - Move processed file to `processed/` subfolder
6. **Update Timestamps** - Set `lastPolledAt` and `lastImportedAt`
7. **Send Email** - Notify admin if conflicts or imports occurred

### Conflict Detection

Conflicts are detected for:

- **Missing required fields** - Tag column is empty or missing
- **Invalid tag format** - Tag doesn't match project's format pattern
- **Duplicate tags** - Tag already exists in project (Phase 2)
- **File parsing errors** - Malformed CSV, encoding issues

### Error Handling

- **File access errors** - Logged, folder marked as failed, email sent
- **Parsing errors** - Individual file skipped, others continue
- **Validation errors** - Recorded as conflicts, row skipped
- **Database errors** - Transaction rolled back, email sent

## Email Notifications

### Success Email

**Sent when:** Import completes with records imported and/or conflicts

**To:** `PLATFORM_ADMIN_EMAIL`

**Subject:** `BIM Import Success: {projectName} ({imported} records)` or `BIM Import Conflicts: {projectName} ({conflicts} issues)`

**Content:**
```
BIM Import Report: Vessel Project Alpha

Company: Acme Shipyard
Project: Vessel Project Alpha
Files Processed: 2
Records Imported: 45

Conflicts (3):
- Row 12: Tag "INVALID-TAG" - Does not match pattern (error)
- Row 23: Tag "" - Missing required field: tag (error)
- Row 34: Tag "E-ER-PMP-9999" - Duplicate tag (warning)

[View Project Button]
```

### Error Email

**Sent when:** Watch folder processing fails completely

**To:** `PLATFORM_ADMIN_EMAIL`

**Subject:** `BIM Import Failed: {projectName}`

**Content:**
```
BIM Import Failed

Company: Acme Shipyard
Project: Vessel Project Alpha
Folder Path: /data/bim/project-vessel-001

Error:
Failed to read directory: EACCES: permission denied

[Check Project Settings Button]
```

### Email Opt-Out

If `PLATFORM_ADMIN_EMAIL` is not set, emails are skipped with a warning:

```
[BIM_EMAIL] PLATFORM_ADMIN_EMAIL not set, skipping BIM import notification
```

## Monitoring

### Database Queries

```typescript
import { prismaAdmin } from '@docuroute/db'

// List all watch folders with recent activity
const watchFolders = await prismaAdmin.bIMWatchFolder.findMany({
  include: {
    project: true,
    company: true
  },
  orderBy: { lastPolledAt: 'desc' }
})

// Find stale watch folders (not polled in 1 hour)
const staleWatchFolders = await prismaAdmin.bIMWatchFolder.findMany({
  where: {
    enabled: true,
    lastPolledAt: {
      lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    }
  }
})

// Check import activity
const recentImports = await prismaAdmin.bIMWatchFolder.findMany({
  where: {
    lastImportedAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  },
  include: { project: true }
})
```

### Logs

The cron job logs detailed information:

```typescript
console.log(`[BIM_WATCH] Processing ${watchFolders.length} watch folders`)
console.log(`[BIM_WATCH] Folder ${folder.id}: Found ${files.length} CSV files`)
console.log(`[BIM_WATCH] Folder ${folder.id}: Imported ${result.imported}, Conflicts ${result.conflicts.length}`)
console.error(`[BIM_WATCH] Error processing folder ${folder.id}:`, error)
```

Search logs with:

```bash
grep "BIM_WATCH" /var/log/worker.log
```

## Cron Job Implementation

### Worker Setup

```typescript
// apps/worker/src/crons/bim-watch.ts
import { Queue } from 'bullmq'
import { runBIMWatchFolderJob } from './bim-watch'

const bimWatchQueue = new Queue('bim-watch', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
})

// Add recurring job
await bimWatchQueue.add(
  'poll-watch-folders',
  {},
  {
    repeat: {
      pattern: '*/15 * * * *' // Every 15 minutes
    }
  }
)

// Process jobs
const worker = new Worker(
  'bim-watch',
  async (job) => {
    await runBIMWatchFolderJob()
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  }
)
```

### Manual Trigger

For testing or manual imports:

```typescript
import { runBIMWatchFolderJob } from './crons/bim-watch'

// Trigger immediate poll
await runBIMWatchFolderJob()
```

## Usage Examples

### Enable/Disable Watch Folder

```typescript
import { getPrismaForCompany } from '@docuroute/db'

const prisma = getPrismaForCompany(companyId)

// Disable watch folder
await prisma.bIMWatchFolder.update({
  where: { projectId },
  data: { enabled: false }
})

// Re-enable watch folder
await prisma.bIMWatchFolder.update({
  where: { projectId },
  data: { enabled: true }
})
```

### Change Watch Folder Path

```typescript
// Update folder path
await prisma.bIMWatchFolder.update({
  where: { projectId },
  data: {
    folderPath: '/data/bim/project-new-path',
    lastPolledAt: null // Reset poll timestamp
  }
})
```

### Delete Watch Folder

```typescript
// Remove watch folder configuration
await prisma.bIMWatchFolder.delete({
  where: { projectId }
})
```

### Check Import Status

```typescript
const watchFolder = await prisma.bIMWatchFolder.findUnique({
  where: { projectId },
  include: { project: true }
})

console.log('Last polled:', watchFolder.lastPolledAt)
console.log('Last imported:', watchFolder.lastImportedAt)
console.log('Enabled:', watchFolder.enabled)
```

## Troubleshooting

### No files being imported

**Problem:** CSV files are in watch folder but not being imported.

**Checklist:**
1. Verify watch folder is enabled:
   ```typescript
   const folder = await prisma.bIMWatchFolder.findUnique({ where: { projectId } })
   console.log('Enabled:', folder.enabled)
   ```

2. Check worker is running:
   ```bash
   pm2 status worker
   # or
   docker ps | grep worker
   ```

3. Check file permissions:
   ```bash
   ls -la /data/bim/project-vessel-001/
   # Worker should have read/write access
   ```

4. Verify cron job is running:
   ```bash
   # Check Redis for scheduled jobs
   redis-cli
   > KEYS bim-watch:*
   ```

5. Check logs for errors:
   ```bash
   grep "BIM_WATCH" /var/log/worker.log | tail -50
   ```

### Files not moved to processed folder

**Problem:** Files are imported but remain in watch folder.

**Solution:** Check that `processed/` subfolder exists and is writable:

```bash
mkdir -p /data/bim/project-vessel-001/processed
chmod 755 /data/bim/project-vessel-001/processed
chown worker:worker /data/bim/project-vessel-001/processed
```

### Email notifications not received

**Problem:** Import succeeds but no email is sent.

**Checklist:**
1. Verify `PLATFORM_ADMIN_EMAIL` is set:
   ```bash
   echo $PLATFORM_ADMIN_EMAIL
   ```

2. Check Resend API key:
   ```bash
   echo $RESEND_API_KEY
   ```

3. Check email logs:
   ```bash
   grep "BIM_EMAIL" /var/log/worker.log
   ```

4. Verify email was sent via Resend dashboard:
   https://resend.com/emails

### Tag validation failures

**Problem:** Valid tags are being rejected as conflicts.

**Solution:**
1. Check project's tag format:
   ```typescript
   const project = await prisma.project.findUnique({
     where: { id: projectId },
     include: { tagFormat: true }
   })
   console.log('Format pattern:', project.tagFormat?.pattern)
   ```

2. Manually validate a tag:
   ```typescript
   import { validateEquipmentTag } from '@docuroute/core/src/naming-mask'

   const result = await validateEquipmentTag(companyId, 'E-ER-PMP-0001', projectId)
   console.log('Valid:', result.isValid)
   console.log('Errors:', result.errors)
   ```

3. Update project's tag format if needed:
   ```typescript
   await prisma.project.update({
     where: { id: projectId },
     data: { tagFormatId: correctFormatId }
   })
   ```

### Watch folder path issues

**Problem:** Folder not found or permission denied errors.

**Solution:**
1. Use absolute paths, not relative:
   ```typescript
   // Good
   folderPath: '/data/bim/project-vessel-001'

   // Bad
   folderPath: './data/bim/project-vessel-001'
   folderPath: '~/data/bim/project-vessel-001'
   ```

2. Verify path exists:
   ```bash
   ls -la /data/bim/project-vessel-001
   ```

3. Check worker user permissions:
   ```bash
   sudo -u worker ls /data/bim/project-vessel-001
   ```

### CSV parsing errors

**Problem:** Valid CSV files fail to parse.

**Common Issues:**
1. **Encoding** - Ensure UTF-8 encoding:
   ```bash
   file -i /data/bim/project-vessel-001/equipment.csv
   # Should show: charset=utf-8
   ```

2. **Line endings** - Convert Windows to Unix:
   ```bash
   dos2unix /data/bim/project-vessel-001/equipment.csv
   ```

3. **Quotes** - Escape special characters:
   ```csv
   tag,description
   E-ER-PMP-0001,"Main pump, 50HP"  # Correct
   E-ER-PMP-0002,Main pump, 50HP    # Incorrect (comma not quoted)
   ```

4. **Header row** - First row must be column names:
   ```csv
   tag,description  # Header row required
   E-ER-PMP-0001,Main Pump
   ```

## Performance

### Scaling Considerations

- **File size** - CSV files up to 10,000 rows process efficiently
- **Number of projects** - System handles 100+ watch folders concurrently
- **Polling interval** - 15 minutes balances responsiveness and load
- **Concurrent workers** - Multiple worker instances can process different folders

### Optimization

For large CSV files (>10,000 rows):

1. **Batch processing** - Process in chunks of 1,000 rows
2. **Transaction batching** - Use `createMany` instead of individual `create` calls
3. **Increase worker concurrency** - Add more worker instances
4. **Adjust polling interval** - Increase to 30 minutes for large datasets

## Security

### File Access

- Watch folders should be isolated per company/project
- Worker process should run with minimal permissions
- Use dedicated service account for worker
- Avoid world-readable permissions

### Path Traversal Prevention

The system validates folder paths to prevent path traversal attacks:

```typescript
// Validates that folderPath is absolute and doesn't contain '..'
const normalizedPath = path.normalize(folderPath)
if (!path.isAbsolute(normalizedPath) || normalizedPath.includes('..')) {
  throw new Error('Invalid folder path')
}
```

### Data Validation

- All equipment tags are validated against project format
- CSV parsing is sandboxed to prevent code injection
- File operations use secure Node.js APIs

## Future Enhancements (Phase 2)

1. **Real-time file watching** - Use `fs.watch()` for immediate imports
2. **Excel support** - Accept `.xlsx` files in addition to CSV
3. **FTP/SFTP integration** - Pull files from remote servers
4. **Webhook notifications** - POST to external systems on import
5. **Duplicate resolution** - UI for handling duplicate tags
6. **Import history** - Track all imports with audit trail
7. **Scheduled imports** - Per-project custom schedules
8. **File validation** - Pre-import validation with dry-run mode

## Related Documentation

- [Project-Level Tag Format Override](./TAG_FORMAT_PROJECT_OVERRIDE.md)
- [RLS Transaction Safety](./RLS_TRANSACTION_SAFETY.md)
- BIM Import Logic: `packages/core/src/bim-import.ts`
- Cron Job: `apps/worker/src/crons/bim-watch.ts`
- Email Functions: `apps/web/src/lib/email.ts`
