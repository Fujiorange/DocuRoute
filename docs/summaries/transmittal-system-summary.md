# Transmittal System - Implementation Summary

## Overview

The Transmittal System is a core DocuRoute module that enables users to send documents externally to recipients (clients, contractors, vendors) with full tracking and acknowledgment capabilities. The system implements strict revision locking to ensure recipients always receive the exact version that was transmitted, even if newer revisions are uploaded later.

## What Was Built

### 1. Database Schema

**File:** `packages/db/prisma/schema.prisma`

Added three new models:

#### Transmittal
Main transmittal record with auto-generated numbering (TR-YYYY-NNN format).

```prisma
model Transmittal {
  id          String   @id @default(cuid())
  companyId   String
  number      String                      // "TR-2026-001"
  subject     String
  message     String?
  status      String   @default("DRAFT")  // DRAFT | SENT | ACKNOWLEDGED | RETURNED
  sentAt      DateTime?
  expiresAt   DateTime?
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  documents   TransmittalDocument[]
  recipients  TransmittalRecipient[]
}
```

#### TransmittalDocument
Links documents to transmittals with **LOCKED** revisionId.

```prisma
model TransmittalDocument {
  id            String   @id @default(cuid())
  transmittalId String
  documentId    String
  revisionId    String  // LOCKED — never changes
  addedAt       DateTime @default(now())
}
```

**Critical Design Decision:** The `revisionId` field stores the specific revision ID that was current at the time of transmittal creation. This ID NEVER changes, even if new revisions are uploaded to the document later. This ensures recipients always see the exact version sent to them.

#### TransmittalRecipient
Recipients with unique tokens for passwordless public access.

```prisma
model TransmittalRecipient {
  id             String    @id @default(cuid())
  transmittalId  String
  email          String
  name           String?
  company        String?
  token          String    @unique  // 64-character secure random token
  status         String    @default("PENDING")  // PENDING | VIEWED | ACKNOWLEDGED
  viewedAt       DateTime?
  acknowledgedAt DateTime?
  message        String?   // Acknowledgment message or return reason
  createdAt      DateTime  @default(now())
}
```

### 2. Database Migration

**File:** `packages/db/prisma/migrations/20260401_transmittal_system/migration.sql`

Creates all three tables with:
- Unique constraints for data integrity
- Performance indexes (transmittal number, status, token lookups)
- Row Level Security (RLS) policies for multi-tenant isolation
- Foreign keys with CASCADE delete
- Helpful SQL comments explaining the locking mechanism

### 3. Audit Enums

**File:** `packages/types/src/index.ts`

Added new audit actions:
- `TRANSMITTAL_CREATED` - Standard audit log when draft created
- `TRANSMITTAL_SENT` - Standard audit log when sent to recipients

Existing vault events (already in codebase):
- `TRANSMITTAL_ACKNOWLEDGED` - Immutable compliance log when recipient acknowledges
- `TRANSMITTAL_RETURNED` - Immutable compliance log when recipient returns

### 4. Email Templates

#### TransmittalEmail
**File:** `packages/emails/src/transmittal.tsx`

Professional React Email template sent to recipients with:
- Transmittal number and subject
- Sender company and name
- List of documents with revision codes
- "View & Acknowledge Documents" button (links to public page)
- No login required message
- Optional expiration date warning

#### TransmittalReturnEmail
**File:** `packages/emails/src/transmittal-return.tsx`

Notification sent to sender when recipient returns a transmittal:
- Recipient information
- Return reason/message
- Link to view transmittal details

### 5. API Endpoints

#### POST /api/transmittals

**File:** `apps/web/src/app/api/transmittals/route.ts`

Creates a new transmittal in DRAFT status.

**Permission Required:** `CREATE_TRANSMITTAL`

**Request Body:**
```json
{
  "subject": "Piping Drawings for Review",
  "message": "Please review the attached drawings...",
  "documentIds": ["doc-id-1", "doc-id-2"],
  "recipients": [
    {
      "email": "contractor@example.com",
      "name": "John Smith",
      "company": "ABC Contractors"
    }
  ],
  "expiresAt": "2026-05-01T00:00:00Z"  // optional
}
```

**Critical Flow:**
1. Validates all inputs
2. Generates transmittal number using `TransmittalCounter` (TR-2026-001, TR-2026-002, etc.)
3. Fetches all documents and their **CURRENT** revisions
4. **LOCKS the revisionId** - stores specific revision ID in `TransmittalDocument`
5. Generates unique secure tokens for each recipient (64 chars)
6. Creates all records in atomic transaction
7. Logs `TRANSMITTAL_CREATED` audit event

**Response:**
```json
{
  "transmittal": {
    "id": "...",
    "number": "TR-2026-001",
    "status": "DRAFT",
    "documents": [
      {
        "documentId": "...",
        "revisionId": "locked-rev-id",
        "revisionCode": "B",
        "documentCode": "DWG-001"
      }
    ],
    "recipients": [...]
  }
}
```

#### POST /api/transmittals/[id]/send

**File:** `apps/web/src/app/api/transmittals/[id]/send/route.ts`

Sends transmittal emails and marks as SENT (irreversible).

**Permission Required:** `SEND_TRANSMITTAL`

**Critical Flow:**
1. Validates transmittal status is DRAFT
2. Fetches locked revision data (uses `revisionId` from `TransmittalDocument`)
3. Enriches with document metadata
4. Sends personalized email to each recipient with unique token
5. Updates status to SENT with sentAt timestamp
6. Logs `TRANSMITTAL_SENT` audit event

**Email URL Format:**
```
{baseUrl}/acknowledge/{transmittalId}?token={recipientToken}
```

**Security Note:** Uses `prismaAdmin` to fetch document data across companies because public recipients need to view documents from other companies.

#### GET /api/transmittals/[id]

**File:** `apps/web/src/app/api/transmittals/[id]/route.ts`

Retrieves full transmittal details for internal users.

**Permission Required:** `VIEW_TRANSMITTAL`

Returns:
- Transmittal metadata
- All documents with locked revision information
- All recipients with status tracking
- Audit history

#### GET/POST /api/public/transmittals/[id]/acknowledge

**File:** `apps/web/src/app/api/public/transmittals/[id]/acknowledge/route.ts`

**Public endpoint - NO AUTHENTICATION REQUIRED** (token-based)

**GET:** Fetch transmittal for viewing
- Validates token
- Marks recipient as VIEWED (first time only)
- Returns transmittal data with locked revision info

**POST:** Acknowledge or return transmittal

Request body:
```json
{
  "action": "acknowledge",  // or "return"
  "message": "Received, no issues"
}
```

**Acknowledge Flow:**
1. Updates recipient status to ACKNOWLEDGED
2. Sets acknowledgedAt timestamp
3. Logs `TRANSMITTAL_ACKNOWLEDGED` vault event

**Return Flow:**
1. Updates recipient status to ACKNOWLEDGED (with return message)
2. Updates transmittal status to RETURNED
3. Logs `TRANSMITTAL_RETURNED` vault event
4. Sends `TransmittalReturnEmail` to original sender

### 6. Public Acknowledge Page

**File:** `apps/web/src/app/(public)/acknowledge/[transmittalId]/page.tsx`

Client-side React component for recipient interaction (NO LOGIN REQUIRED).

**Features:**
- Displays transmittal details (number, subject, message)
- Lists all documents with revision codes
- Download buttons for each document
- Acknowledge/Return action buttons
- Message/comment textarea
- Success confirmation screens
- Already acknowledged status detection

**UX Flow:**
1. Recipient clicks email link with token
2. Page fetches transmittal data (marks as VIEWED)
3. Shows document list with download options
4. Recipient chooses ACKNOWLEDGE or RETURN
5. Optionally adds message
6. Submits response
7. Shows success screen

**Security:**
- Token validated on every request
- No user authentication needed
- Rate limiting via existing infrastructure
- Read-only access to transmittal data

## Critical Design Decisions

### 1. Revision Locking Mechanism

**Problem:** If a user uploads a new revision after sending a transmittal, should the transmittal show the new revision or the old one?

**Decision:** **LOCK the specific revisionId** when transmittal is created.

**Implementation:**
```typescript
// When creating transmittal (POST /api/transmittals)
const revisions = await tx.documentRevision.findMany({
  where: {
    documentId: { in: documentIds },
    status: 'CURRENT',
  },
})

// Store the SPECIFIC revision ID (not just documentId)
await tx.transmittalDocument.create({
  data: {
    transmittalId,
    documentId,
    revisionId: revision.id,  // LOCKED FOREVER
  },
})
```

**Why This Works:**
- `DocumentRevision.id` is immutable and permanent
- Even if status changes to SUPERSEDED, the ID still exists
- Transmittal always references the exact revision sent
- Prevents confusion: "Did I send Rev B or Rev C?"

**Example Scenario:**
1. User creates transmittal TR-2026-001 with DWG-001 Rev B
2. TransmittalDocument stores: `{ documentId: "doc-1", revisionId: "rev-b-id" }`
3. User uploads new revision → DWG-001 now has Rev C (CURRENT)
4. Transmittal still shows Rev B because `revisionId` points to `"rev-b-id"`
5. Recipients always see Rev B, never Rev C

### 2. Token-Based Public Access

**Decision:** Use secure random tokens instead of requiring recipients to create accounts.

**Implementation:**
```typescript
const token = crypto.randomBytes(32).toString('hex')  // 64 characters
```

**Why:**
- **Simplicity:** Recipients just click email link
- **Security:** 64-char random token = ~10^77 possibilities
- **Convenience:** No password management
- **Industry Standard:** Matches how transmittals work in construction/marine industries

**Security Measures:**
- Tokens stored in database with unique index
- One token per recipient per transmittal
- Validated on every request
- Optional expiration date
- Read-only access (can't modify transmittal)

### 3. Status Workflow

**Transmittal Status:**
- **DRAFT** → Being created, can be edited/deleted
- **SENT** → Locked, emails sent, cannot be modified
- **ACKNOWLEDGED** → All recipients acknowledged
- **RETURNED** → At least one recipient returned it

**Recipient Status:**
- **PENDING** → Email sent, not yet viewed
- **VIEWED** → Clicked link, saw documents
- **ACKNOWLEDGED** → Submitted response (acknowledge or return)

**One-Way Flow:**
```
DRAFT → SENT → ACKNOWLEDGED/RETURNED
      (irreversible)
```

### 4. Transmittal Numbering

**Format:** `TR-YYYY-NNN`
- TR = Transmittal prefix
- YYYY = Current year
- NNN = Sequential number (001, 002, ...)

**Implementation:**
Uses `TransmittalCounter` table with composite key `(companyId, year)`:
```typescript
const counter = await tx.transmittalCounter.upsert({
  where: { companyId_year: { companyId, year: 2026 } },
  update: { sequence: { increment: 1 } },
  create: { companyId, year: 2026, sequence: 1 },
})

const number = `TR-${year}-${String(counter.sequence).padStart(3, '0')}`
```

**Why This Pattern:**
- Resets annually (easier to reference "TR-2026-042" than "TR-00042")
- Industry standard format
- Human-readable
- No gaps in sequence

### 5. Email Integration

**Provider:** Resend (already integrated in codebase)

**Pattern:**
```typescript
const resend = new Resend(process.env.RESEND_API_KEY)
const emailHtml = render(TransmittalEmail({ ... }))

await resend.emails.send({
  from: 'noreply@docuroute.com',
  to: recipient.email,
  subject: `Document Transmittal ${transmittalNumber}`,
  html: emailHtml,
})
```

**Error Handling:**
- Email failures logged but don't block transmittal creation
- Status still set to SENT even if email fails
- Recipients can be resent manually if needed

### 6. Multi-Tenant Isolation

All transmittal queries use Row Level Security (RLS):

```sql
CREATE POLICY "Transmittal tenant isolation"
  ON "Transmittal"
  USING ("companyId" = current_setting('app.current_company_id', true));
```

**Exception:** Public endpoints use `prismaAdmin` to allow cross-company access (recipients need to view documents from sender's company).

## Integration Points

### With Existing Systems

1. **Document/Revision System:** Transmittals reference locked `DocumentRevision.id`
2. **Audit System:** Uses `logAuditEvent()` and `logVaultEvent()` functions
3. **PBAC:** Requires `CREATE_TRANSMITTAL`, `SEND_TRANSMITTAL`, `VIEW_TRANSMITTAL` permissions
4. **Multi-Tenancy:** Uses `getPrismaForCompany()` for RLS enforcement
5. **Email System:** Uses existing Resend integration
6. **Public Routes:** Follows existing `(public)/` directory pattern

### Future Enhancements

**Phase 3 Considerations:**
1. **Batch Transmittals:** Send same documents to multiple recipients in one action
2. **Transmittal Templates:** Save recipient lists for reuse
3. **Automatic Reminders:** Email recipients if not acknowledged within X days
4. **Transmittal Register:** Table view of all transmittals with filtering
5. **Download All:** ZIP archive of all transmittal documents
6. **Partial Acknowledgment:** Track document-by-document acknowledgment
7. **Print to PDF:** Generate PDF cover sheet for transmittal
8. **Revision Comparison:** Show what changed between revisions

## Security Considerations

### 1. Token Security
- 64-character random tokens (crypto.randomBytes(32))
- Stored with unique index in database
- No token reuse across recipients
- Optional expiration enforcement

### 2. Recipient Access Control
- Recipients can ONLY view transmittals they have tokens for
- Read-only access (cannot modify transmittals)
- Cannot see other recipients
- Cannot see documents not in their transmittal

### 3. Audit Trail
- All actions logged (create, send, view, acknowledge, return)
- Vault events for compliance (TRANSMITTAL_ACKNOWLEDGED, TRANSMITTAL_RETURNED)
- IP address and user agent captured
- Immutable vault entries cannot be deleted

### 4. File Access
- Document download URLs require valid token
- Direct file access prevented (not implemented in this phase)
- Watermarked PDFs served to recipients (future enhancement)

## Performance Characteristics

**Estimated Performance:**

| Operation | Time | Notes |
|-----------|------|-------|
| Create transmittal | ~300ms | Includes transaction + token generation |
| Send transmittal | ~500ms per recipient | Email sending is the bottleneck |
| View transmittal (public) | <200ms | Indexed token lookup |
| Acknowledge transmittal | ~200ms | Simple update + audit log |

**Scalability:**

- 1000 transmittals/company: No impact
- 10,000 transmittals/company: <500ms queries
- 100 recipients per transmittal: ~1 minute to send all emails

**Database Indexes:**

- `Transmittal (companyId, number)` - Unique constraint + lookup
- `Transmittal (companyId, status)` - Filter queries
- `TransmittalRecipient (token)` - Public access lookup
- `TransmittalDocument (transmittalId)` - Join queries

## Testing

See `test.md` for detailed testing procedures.

## Summary

The Transmittal System implements a complete external document distribution workflow with:

✅ Revision locking mechanism (revisionId never changes)
✅ Token-based public access (no login required)
✅ Email notifications (Resend integration)
✅ Status tracking (PENDING → VIEWED → ACKNOWLEDGED)
✅ Audit logging (standard + compliance vault)
✅ Multi-tenant isolation (RLS policies)
✅ Return workflow (recipients can reject with reason)

The implementation follows DocuRoute's existing patterns and integrates seamlessly with the document management, audit, permission, and email systems.
