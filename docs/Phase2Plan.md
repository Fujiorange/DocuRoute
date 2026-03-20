# DocuRoute Phase 2 Implementation Plan

## Overview

Phase 2 extends DocuRoute from a foundational document management system into a full-featured construction project management platform. This phase focuses on equipment hierarchy, vendor management, project templates, external integrations, and field execution capabilities that are critical for shipbuilding, offshore platforms, and heavy industrial projects.

**Target Users**: Shipyards, offshore fabricators, EPC contractors, and heavy industrial facilities requiring ISO 9001 compliant document control with equipment asset management.

**Estimated Scope**: 8-10 weeks for core features, with BIM and Classification Society integrations requiring additional vendor coordination time.

---

## P2P1: Equipment Hierarchy Management

### Business Context
Field engineers and commissioning teams need to navigate equipment by location and system hierarchy (e.g., `Hull 1 → Engine Room → Main Engine ME-01 → Fuel Injection System`). Every equipment item must link to its installation/commissioning drawings, maintenance manuals, and spare parts lists.

### Database Schema

#### Equipment Model
```prisma
model Equipment {
  id                String              @id @default(cuid())
  companyId         String
  projectId         String
  tag               String              // Unique equipment identifier (e.g., "ME-01", "P-101A")
  name              String              // Human-readable name
  description       String?
  equipmentType     String              // EquipmentType enum (PUMP, VALVE, MOTOR, etc.)
  manufacturer      String?
  modelNumber       String?
  serialNumber      String?

  // Hierarchy management
  parentId          String?             // Self-referential FK for tree structure
  level             Int                 // COMPUTED COLUMN - derived from parent chain

  // Lifecycle tracking
  lifecycleStage    String              @default("DESIGN")  // DESIGN | PROCUREMENT | FABRICATION | INSTALLED | COMMISSIONED | OPERATIONAL
  commissionedAt    DateTime?
  decommissionedAt  DateTime?

  // Integration fields
  bimModelId        String?             // External 3D model reference (AVEVA/Tribon/Catia)
  bimLastSyncedAt   DateTime?

  metadata          Json?               // Flexible field for custom attributes
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  company           Company             @relation(fields: [companyId], references: [id])
  project           Project             @relation(fields: [projectId], references: [id])
  parent            Equipment?          @relation("EquipmentHierarchy", fields: [parentId], references: [id])
  children          Equipment[]         @relation("EquipmentHierarchy")
  documentMappings  EquipmentDocument[]

  @@unique([projectId, tag])
  @@index([companyId, projectId])
  @@index([parentId])
  @@index([lifecycleStage])
}
```

#### Equipment-Document Mapping
```prisma
model EquipmentDocument {
  id           String    @id @default(cuid())
  equipmentId  String
  documentId   String
  relationship String    // DocumentRelationship enum (INSTALLATION_DRAWING, DATASHEET, MANUAL, etc.)
  isPrimary    Boolean   @default(false)
  createdAt    DateTime  @default(now())

  equipment    Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  document     Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([equipmentId, documentId, relationship])
  @@index([documentId])
}
```

### Implementation Details

**Level Computation Strategy**:
- Use PostgreSQL generated column or database view to compute `level` from parent chain
- Example SQL:
  ```sql
  CREATE OR REPLACE FUNCTION compute_equipment_level(equipment_id TEXT)
  RETURNS INT AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT id, parent_id, 0 AS level
    FROM "Equipment"
    WHERE id = equipment_id
    UNION ALL
    SELECT e.id, e.parent_id, h.level + 1
    FROM "Equipment" e
    JOIN hierarchy h ON e.parent_id = h.id
  )
  SELECT MAX(level) FROM hierarchy;
  $$ LANGUAGE SQL STABLE;
  ```
- Maintains tree integrity without manual level updates
- Enables fast UI rendering while keeping data normalized

**Tree Integrity Validation**:
- Prevent circular references (parent cannot be descendant)
- Maximum depth limit (typically 10 levels)
- Cascade lifecycle stage updates to children (e.g., parent COMMISSIONED → children INSTALLED)

**Permissions**:
- `EQUIPMENT_CREATE` - Create equipment records
- `EQUIPMENT_UPDATE` - Modify equipment details
- `EQUIPMENT_DELETE` - Remove equipment (only if no children or documents)
- `EQUIPMENT_VIEW` - Read equipment hierarchy

### API Endpoints
- `POST /api/equipment` - Create equipment item
- `GET /api/equipment?projectId={id}` - List equipment with hierarchy (nested JSON or flat with level)
- `GET /api/equipment/{id}` - Get equipment details with document mappings
- `PATCH /api/equipment/{id}` - Update equipment
- `DELETE /api/equipment/{id}` - Delete equipment (if allowed)
- `POST /api/equipment/{id}/documents` - Link document to equipment
- `GET /api/equipment/{id}/tree` - Get full ancestor/descendant tree
- `PATCH /api/equipment/{id}/lifecycle` - Update lifecycle stage

### UI Components
- Equipment tree navigator with drag-and-drop reordering
- Equipment card showing: tag, name, type, lifecycle stage, linked documents
- Equipment detail modal with document list grouped by relationship type
- Bulk equipment import from CSV (BIM model export)

---

## P2P3: Project Templates

### Business Context
Organizations repeat similar project structures across multiple builds (e.g., 4 identical container vessels, 10 offshore modules). Templates allow project managers to clone folder structures, equipment lists, workflow sequences, and document checklists without manual recreation.

### Database Schema

```prisma
model ProjectTemplate {
  id                  String   @id @default(cuid())
  companyId           String
  name                String
  description         String?
  category            String   // "NEWBUILD_VESSEL" | "OFFSHORE_PLATFORM" | "REFINERY_MODULE" | "CUSTOM"
  isPublic            Boolean  @default(false)  // If true, available to all companies (requires PLATFORM_ADMIN approval)

  // Snapshot of project configuration
  equipmentStructure  Json?    // Equipment hierarchy tree
  folderStructure     Json?    // Document folder tree
  workflowSequence    Json?    // Workflow stage definitions
  checklistTemplate   Json?    // Document checklist items

  createdBy           String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  company             Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, category])
}

model Project {
  // ... existing fields ...
  templateId          String?  // Reference to ProjectTemplate if cloned
  isSandbox           Boolean  @default(false)  // Read-only simulation mode

  template            ProjectTemplate? @relation(fields: [templateId], references: [id])
}
```

### Key Features

**Sandbox/Simulation Mode**:
- Project Managers can create a `isSandbox=true` clone of an existing project
- Sandbox projects are READ-ONLY for equipment and document structures
- Allows "what-if" scenario testing before formal Change Proposal
- Sandbox projects expire after 30 days or can be converted to live projects
- **Critical**: Prevents the "INSANELY DANGEROUS" scenario where template changes cascade to active projects

**Template Application Rules**:
1. Templates can only be applied to NEW projects (not existing ones, except via sandbox)
2. Template application creates audit vault entry with full template snapshot
3. After application, project becomes independent (no live link to template)
4. Template updates do NOT affect existing projects (explicit re-application required)

**Change Proposal Workflow** (for existing projects):
1. PM creates sandbox clone
2. PM tests template changes in sandbox
3. PM submits formal Change Proposal with sandbox results
4. Document Controller or Project Director approves
5. System applies changes to live project with audit trail

### Implementation Details

**Template Serialization**:
- Equipment structure: JSON array with `{ tag, name, type, parentTag, level }`
- Folder structure: Nested JSON with `{ name, permissions, children[] }`
- Workflow sequence: Array of `{ stage, requiredPermissions, autoTransitionConditions }`

**Application Logic**:
- Transaction-wrapped template instantiation
- Replace all template placeholder IDs with new CUIDs
- Maintain referential integrity (parent-child relationships)
- Log all created records in AuditVaultEntry

**Permissions**:
- `PROJECT_TEMPLATE_CREATE` - Create templates from existing projects
- `PROJECT_TEMPLATE_APPLY` - Apply templates to new projects
- `PROJECT_SANDBOX_CREATE` - Create sandbox simulation projects
- `PROJECT_CHANGE_APPROVE` - Approve change proposals

### API Endpoints
- `POST /api/project-templates` - Create template from existing project
- `GET /api/project-templates?category={cat}` - List available templates
- `POST /api/projects/{id}/apply-template` - Apply template to new project
- `POST /api/projects/{id}/sandbox` - Create sandbox clone
- `POST /api/projects/{id}/apply-sandbox-changes` - Promote sandbox changes to live (with approval)

---

## P2P4: Vendor Company Management

### Business Context
Shipyards work with hundreds of vendors across multiple projects. Vendors must submit technical data packages, installation manuals, test certificates, and as-built drawings. The system must handle vendor contacts in a GDPR/PDPA compliant manner without sacrificing usability.

### Database Schema

```prisma
model VendorCompany {
  id                String   @id @default(cuid())
  companyId         String   // The shipyard/contractor company that owns this vendor record
  name              String
  code              String   // Unique vendor code (e.g., "VEND-001")
  country           String?
  piiScope          String   @default("GLOBAL")  // "GLOBAL" | "PER_VENDOR_COMPANY"

  // Vendor portal access
  portalEnabled     Boolean  @default(false)
  portalUrl         String?

  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company           Company  @relation(fields: [companyId], references: [id])
  contacts          VendorContact[]
  submissions       VendorSubmission[]

  @@unique([companyId, code])
  @@index([companyId])
}

model VendorContact {
  id              String        @id @default(cuid())
  vendorCompanyId String
  email           String
  name            String?
  phone           String?
  role            String?       // "TECHNICAL" | "COMMERCIAL" | "QA_QC"
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  vendorCompany   VendorCompany @relation(fields: [vendorCompanyId], references: [id], onDelete: Cascade)

  // GDPR/PDPA Compliance: Conditional uniqueness based on piiScope
  // If VendorCompany.piiScope = "PER_VENDOR_COMPANY", enforce unique email per vendor
  // If "GLOBAL", allow same email across multiple vendors (consultant scenario)
  @@unique([vendorCompanyId, email])
  @@index([email])
}

model VendorSubmission {
  id              String        @id @default(cuid())
  companyId       String
  vendorCompanyId String
  projectId       String
  submissionCode  String        // Auto-generated: "VS-2026-001"
  title           String
  status          String        @default("DRAFT")  // DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED
  submittedAt     DateTime?
  reviewedAt      DateTime?
  reviewedBy      String?
  reviewComments  String?

  metadata        Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  company         Company       @relation(fields: [companyId], references: [id])
  vendorCompany   VendorCompany @relation(fields: [vendorCompanyId], references: [id])
  project         Project       @relation(fields: [projectId], references: [id])
  documents       Document[]    @relation("VendorSubmissionDocuments")

  @@unique([companyId, submissionCode])
  @@index([vendorCompanyId, status])
  @@index([projectId, status])
}
```

### GDPR/PDPA Compliance Strategy

**PII Scope Toggle**:
- **GLOBAL** (default): Email uniqueness NOT enforced per vendor. Same consultant email can appear in multiple vendor records. Suitable for US/Asia-Pacific yards.
- **PER_VENDOR_COMPANY**: Email uniqueness enforced per vendor. Each contact email is scoped to one vendor company. Required for EU yards (GDPR) and Singapore yards (PDPA).

**Implementation**:
- Application-level validation checks `VendorCompany.piiScope` before creating VendorContact
- Database-level unique constraint: `@@unique([vendorCompanyId, email])`
- GDPR data retention: Vendor contacts auto-archived after 3 years of inactivity
- Data export API: `GET /api/vendor-contacts/{id}/export-pii` for GDPR Subject Access Requests

**Permissions**:
- `VENDOR_MANAGE` - Create/update vendor companies
- `VENDOR_CONTACT_MANAGE` - Add/remove vendor contacts
- `VENDOR_SUBMISSION_REVIEW` - Review vendor submissions
- `VENDOR_PORTAL_ADMIN` - Configure vendor portal settings

### API Endpoints
- `POST /api/vendors` - Create vendor company
- `GET /api/vendors?companyId={id}` - List vendors
- `POST /api/vendors/{id}/contacts` - Add vendor contact (validates PII scope)
- `POST /api/vendors/{id}/submissions` - Create vendor submission package
- `PATCH /api/vendor-submissions/{id}/review` - Approve/reject submission
- `GET /api/vendor-contacts/{id}/export-pii` - GDPR data export

---

## P2P5: BIM / 3D Model Integration

### Business Context
Shipyards already have 3D models in AVEVA Marine, Tribon, Cadmatic, or Catia. Equipment tags and hierarchy are defined in these systems first. Manual re-entry into DocuRoute wastes time and introduces errors. Direct API integration saves ~400 man-hours per newbuild project.

### Integration Architecture

**Import Flow**:
1. BIM system exports equipment list as JSON/CSV with fields: `tag`, `name`, `type`, `parentTag`, `coordinates`, `modelId`
2. DocuRoute API endpoint accepts bulk import with transaction rollback on error
3. System auto-creates Equipment records with proper parent-child links
4. System optionally creates placeholder documents for each equipment item (Installation Drawing, Datasheet, Manual)

**Reverse Sync (Webhook)**:
1. When equipment tag is renamed in DocuRoute, system triggers webhook to BIM system
2. BIM system updates tag in 3D model via REST API
3. System logs sync status in `Equipment.bimLastSyncedAt`

### Database Schema

```prisma
model Equipment {
  // ... existing fields from P2P1 ...
  bimModelId        String?             // External 3D model unique identifier
  bimCoordinates    Json?               // { x, y, z } coordinates in 3D model
  bimLastSyncedAt   DateTime?
}

model BIMSyncLog {
  id           String   @id @default(cuid())
  companyId    String
  projectId    String
  equipmentId  String?
  action       String   // "IMPORT" | "EXPORT" | "TAG_UPDATE"
  status       String   // "SUCCESS" | "FAILED" | "PENDING"
  errorMessage String?
  metadata     Json?    // Full request/response payload
  createdAt    DateTime @default(now())

  company      Company  @relation(fields: [companyId], references: [id])
  project      Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, createdAt])
}
```

### API Endpoints

**Import Equipment from BIM**:
```
POST /api/projects/{id}/import-bim-equipment
Body: {
  "source": "AVEVA_MARINE",
  "modelId": "HULL-001",
  "equipment": [
    { "tag": "ME-01", "name": "Main Engine", "type": "ENGINE", "parentTag": null, "coordinates": { "x": 100, "y": 50, "z": 10 } },
    { "tag": "FIP-01", "name": "Fuel Injection Pump", "type": "PUMP", "parentTag": "ME-01", "coordinates": { "x": 102, "y": 52, "z": 12 } }
  ],
  "createPlaceholderDocuments": true
}
```

**Webhook for Tag Updates** (configured in BIM system):
```
POST /api/webhooks/bim-sync
Headers: X-BIM-API-Key: {configured_secret}
Body: {
  "event": "TAG_UPDATED",
  "projectId": "{docuroute_project_id}",
  "oldTag": "ME-01",
  "newTag": "ME-01A",
  "modelId": "HULL-001"
}
```

**Export Equipment to BIM**:
```
GET /api/projects/{id}/export-bim-equipment
Response: JSON array of all equipment with updated tags/statuses
```

### Implementation Details
- Transaction-wrapped bulk import with validation
- Detect duplicate tags and prompt user for conflict resolution (skip, overwrite, rename)
- Optional: Queue BIM imports as background jobs (BullMQ) for large models (>1000 equipment items)
- Webhook authentication via API key or HMAC signature
- Rate limiting: 10 BIM sync operations per minute per project

**Permissions**:
- `BIM_IMPORT` - Import equipment from 3D models
- `BIM_SYNC_CONFIGURE` - Configure BIM webhook endpoints

---

## P2P6: QR / Barcode Field Execution Layer

### Business Context
Field engineers work in environments without reliable internet (dry docks, offshore platforms, sea trials). Every equipment item and drawing must have a printable QR code for offline verification. Engineers scan QR codes with tablets to view current revision, lifecycle stage, open comments, and upload photo evidence for commissioning sign-off.

### QR Code Functionality

**Equipment QR Codes**:
- Encodes: `https://docuroute.com/verify/equipment/{encryptedId}`
- Offline mode: QR payload includes minimal data (tag, name, lifecycle stage) as JSON
- Online mode: Redirects to equipment detail page with live data

**Document QR Codes** (already implemented in P1P6):
- Encodes: `https://docuroute.com/verify/{encryptedId}`
- Shows: Document code, revision, status, SHA-256 hash
- **Enhancement for P2**: Add equipment tag if document is linked to equipment

### Database Schema

```prisma
model FieldInspection {
  id              String    @id @default(cuid())
  companyId       String
  projectId       String
  equipmentId     String?
  documentId      String?
  inspectorUserId String
  inspectorName   String
  inspectionType  String    // "INSTALLATION_VERIFY" | "COMMISSIONED" | "DAMAGE_REPORT" | "QUALITY_CHECK"
  status          String    // "PASS" | "FAIL" | "CONDITIONAL"
  notes           String?
  photoKeys       String[]  // R2 file keys for uploaded photos
  gpsCoordinates  Json?     // { lat, lon } if available
  timestamp       DateTime  @default(now())

  company         Company   @relation(fields: [companyId], references: [id])
  project         Project   @relation(fields: [projectId], references: [id])
  equipment       Equipment? @relation(fields: [equipmentId], references: [id])
  document        Document?  @relation(fields: [documentId], references: [id])

  @@index([equipmentId, timestamp])
  @@index([projectId, inspectionType])
}
```

### Offline-First Mobile UI

**Progressive Web App (PWA) Enhancements**:
- Service worker caches equipment list and recent document revisions
- IndexedDB stores QR scan history for offline submission when reconnected
- Camera API for QR scanning (no external library needed for modern browsers)
- Background sync for photo uploads when connection restored

**Mobile Inspection Flow**:
1. Engineer scans equipment QR code → app shows cached equipment details
2. Engineer selects inspection type (Installation Verify, Commissioned, etc.)
3. Engineer captures photos of equipment/installation
4. Engineer submits inspection → queued in IndexedDB if offline
5. When online, app syncs all pending inspections to server

### API Endpoints

**Generate QR Codes**:
```
GET /api/equipment/{id}/qr-code?format=png&size=256
GET /api/documents/{id}/qr-code?format=png&size=256
```

**Bulk QR Generation for Printing**:
```
POST /api/equipment/qr-codes/bulk
Body: { "equipmentIds": ["id1", "id2", ...], "format": "pdf", "pageSize": "A4", "codesPerPage": 24 }
Response: PDF with QR codes and labels for printing
```

**Field Inspection Submission**:
```
POST /api/field-inspections
Body: {
  "equipmentId": "...",
  "inspectionType": "COMMISSIONED",
  "status": "PASS",
  "notes": "All systems operational",
  "photoKeys": ["field/inspection-001.jpg"],
  "timestamp": "2026-03-20T10:30:00Z"
}
```

**Offline Sync Endpoint** (accepts batch submissions):
```
POST /api/field-inspections/sync
Body: {
  "inspections": [ /* array of inspection objects */ ]
}
```

### Implementation Details
- QR codes generated with `qrcode` npm package (already installed)
- Encrypted payload uses AES-256 with company-specific key (prevents QR code forgery)
- PDF generation for bulk QR printing uses `pdfkit`
- Photo uploads: direct-to-R2 presigned URLs (same flow as document uploads)
- Offline data retention: 90 days in IndexedDB, auto-purged after sync

**Permissions**:
- `FIELD_INSPECTION_CREATE` - Submit field inspections
- `FIELD_INSPECTION_VIEW` - View inspection history
- `QR_CODE_GENERATE` - Generate QR codes for printing

---

## P2P7: Classification Society Direct Submission Portal

### Business Context
All newbuild vessels require approval from Classification Societies (DNV, ABS, Lloyd's Register, Bureau Veritas). These organizations now provide vendor APIs for document submission. One-click submission from DocuRoute transmittals saves 2-3 days per submission cycle and eliminates manual portal uploads.

### Supported Classification Societies

| Society | API Availability | Authentication | Sandbox |
|---------|------------------|----------------|---------|
| DNV (Det Norske Veritas) | REST API | OAuth 2.0 | Yes |
| ABS (American Bureau of Shipping) | REST API | API Key | Yes |
| Lloyd's Register | REST API | OAuth 2.0 | Yes |
| Bureau Veritas | REST API | API Key | Yes |
| Class NK (Nippon Kaiji Kyokai) | REST API | API Key | Coming 2026 |

### Database Schema

```prisma
model ClassificationSociety {
  id             String   @id @default(cuid())
  code           String   @unique  // "DNV" | "ABS" | "LR" | "BV" | "NK"
  name           String
  apiEndpoint    String
  apiVersion     String
  isActive       Boolean  @default(true)

  configurations ClassSocietyConfiguration[]
}

model ClassSocietyConfiguration {
  id                  String              @id @default(cuid())
  companyId           String
  classificationSocietyId String

  // Credentials (encrypted at rest)
  apiKey              String?             // Encrypted with company-specific key
  oauthClientId       String?
  oauthClientSecret   String?             // Encrypted
  oauthTokenUrl       String?

  // Submission settings
  defaultProjectCode  String?             // Class society's project identifier
  autoSubmitEnabled   Boolean             @default(false)
  notificationEmails  String[]

  isActive            Boolean             @default(true)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  company             Company             @relation(fields: [companyId], references: [id])
  classificationSociety ClassificationSociety @relation(fields: [classificationSocietyId], references: [id])
  submissions         ClassSocietySubmission[]

  @@unique([companyId, classificationSocietyId])
}

model ClassSocietySubmission {
  id                    String                      @id @default(cuid())
  companyId             String
  projectId             String
  configurationId       String
  transmittalId         String?                     // Optional: link to internal transmittal

  submissionCode        String                      // Class society's submission reference
  packageTitle          String
  submissionType        String                      // "APPROVAL" | "INFORMATION" | "AS_BUILT"
  status                String                      @default("PENDING")  // PENDING | SUBMITTED | ACCEPTED | REJECTED

  documentIds           String[]                    // Array of Document IDs included in package
  pdfPackageKey         String?                     // R2 key for combined PDF package
  metadataSnapshot      Json                        // Full submission payload

  submittedAt           DateTime?
  classResponse         Json?                       // Response from class society API
  classResponseAt       DateTime?

  errorMessage          String?
  retryCount            Int                         @default(0)

  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt

  company               Company                     @relation(fields: [companyId], references: [id])
  project               Project                     @relation(fields: [projectId], references: [id])
  configuration         ClassSocietyConfiguration   @relation(fields: [configurationId], references: [id])

  @@unique([companyId, submissionCode])
  @@index([projectId, status])
}
```

### API Integration Flow

**1. Configuration Setup** (one-time per company per class society):
```
POST /api/classification-societies/configure
Body: {
  "classificationSocietyCode": "DNV",
  "apiKey": "sandbox_key_12345",  // Encrypted before storage
  "defaultProjectCode": "HULL-2026-001",
  "autoSubmitEnabled": false
}
```

**2. Submit Package to Class Society**:
```
POST /api/classification-societies/submit
Body: {
  "classificationSocietyCode": "DNV",
  "projectId": "...",
  "packageTitle": "Hull Structure Drawings - Stage 1 Approval",
  "submissionType": "APPROVAL",
  "documentIds": ["doc1", "doc2", "doc3"],
  "metadata": {
    "vesselName": "MV Pacific Explorer",
    "imoNumber": "IMO1234567",
    "drawingStage": "FOR_APPROVAL"
  }
}
```

**3. System Actions**:
- Validate all documents are approved and watermarked
- Generate combined PDF package with cover sheet
- Upload PDF to class society API
- Store submission reference in `ClassSocietySubmission`
- Create audit vault entry
- Send notification to document controller

**4. Status Polling** (async job):
- Background worker polls class society API every 30 minutes
- Updates submission status when class responds
- Sends email notification on acceptance/rejection

### Implementation Details

**API Adapter Pattern**:
```typescript
interface ClassSocietyAdapter {
  authenticate(): Promise<string>; // Returns access token
  submitPackage(payload: SubmissionPayload): Promise<SubmissionResponse>;
  getSubmissionStatus(submissionCode: string): Promise<StatusResponse>;
  downloadClassComments(submissionCode: string): Promise<Buffer>;
}

class DNVAdapter implements ClassSocietyAdapter { /* ... */ }
class ABSAdapter implements ClassSocietyAdapter { /* ... */ }
```

**Security**:
- API keys encrypted with AES-256 using company-specific encryption key
- OAuth tokens refreshed automatically before expiry
- All submissions logged in AuditVaultEntry with full payload hash
- Rate limiting: 5 submissions per hour per class society

**Error Handling**:
- Automatic retry with exponential backoff (max 3 attempts)
- If submission fails after retries, queue for manual review
- Document controller receives email with error details

**Permissions**:
- `CLASS_SOCIETY_CONFIGURE` - Set up API credentials
- `CLASS_SOCIETY_SUBMIT` - Submit packages to class society
- `CLASS_SOCIETY_VIEW` - View submission history

### API Endpoints
- `POST /api/classification-societies/configure` - Configure API credentials
- `POST /api/classification-societies/submit` - Submit document package
- `GET /api/classification-societies/submissions?projectId={id}` - List submissions
- `GET /api/classification-societies/submissions/{id}/status` - Get submission status
- `POST /api/classification-societies/submissions/{id}/retry` - Retry failed submission

---

## P2P8: Immutable Audit Ledger (Blockchain-Style Hash Chain)

### Business Context
When shipyards hand over the as-built documentation package to vessel owners, they need cryptographic proof that no documents were altered post-delivery. This has legal value in arbitration cases and insurance claims. The existing AuditVaultEntry model (from Phase 1) provides immutability triggers, but Phase 2 extends it with SHA-256 hash chains.

### Enhanced Hash Chain Architecture

**Concept**:
- Every document revision, lifecycle transition, transmittal submission, and classification society submission generates an AuditVaultEntry
- Each entry includes:
  - Hash of the entry's own data (timestamp + userId + action + documentId + fileKey + metadata)
  - Hash of the PREVIOUS entry (creating a blockchain-style chain)
  - Document fingerprint (SHA-256 of the file content at that moment)

**Chain Integrity**:
- If any historical entry is tampered with, the chain breaks (next entry's previousHash won't match)
- System provides verification API that recomputes entire chain and confirms integrity
- Exportable audit package includes full hash list for owner verification

### Database Schema Enhancement

```prisma
model AuditVaultEntry {
  // ... existing fields from Phase 1 ...
  hash                String   // SHA-256 of this entry's content
  previousHash        String?  // SHA-256 of previous entry (null for first entry)
  chainIndex          Int      // Sequential index in the chain for this company
  documentFingerprint String?  // SHA-256 of document file (for document-related events)

  @@index([companyId, chainIndex])
  @@unique([companyId, chainIndex])
}
```

### Implementation Details

**Hash Calculation**:
```typescript
function computeAuditHash(entry: AuditVaultEntry, previousHash: string | null): string {
  const payload = JSON.stringify({
    chainIndex: entry.chainIndex,
    companyId: entry.companyId,
    eventType: entry.eventType,
    userId: entry.userId,
    userEmail: entry.userEmail,
    createdAt: entry.createdAt.toISOString(),
    metadata: entry.metadata,
    documentFingerprint: entry.documentFingerprint,
    previousHash: previousHash
  });
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
```

**Chain Verification**:
```typescript
async function verifyAuditChain(companyId: string): Promise<{ valid: boolean; brokenAt?: number }> {
  const entries = await prisma.auditVaultEntry.findMany({
    where: { companyId },
    orderBy: { chainIndex: 'asc' }
  });

  let previousHash: string | null = null;
  for (const entry of entries) {
    const expectedHash = computeAuditHash(entry, previousHash);
    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: entry.chainIndex };
    }
    if (entry.chainIndex > 0 && entry.previousHash !== previousHash) {
      return { valid: false, brokenAt: entry.chainIndex };
    }
    previousHash = entry.hash;
  }

  return { valid: true };
}
```

**Export Format** (for owner handover):
```json
{
  "companyId": "...",
  "projectId": "...",
  "exportedAt": "2026-03-20T10:00:00Z",
  "chainLength": 1523,
  "entries": [
    {
      "chainIndex": 0,
      "eventType": "DOCUMENT_UPLOADED",
      "timestamp": "2025-01-15T08:30:00Z",
      "documentCode": "DWG-001",
      "documentFingerprint": "a3f2e1...",
      "hash": "b4e3c2...",
      "previousHash": null
    },
    // ... all entries ...
  ],
  "verificationInstructions": "Run SHA-256 on each entry payload and compare to 'hash' field. Verify each 'previousHash' matches previous entry's 'hash'."
}
```

### API Endpoints

**Verify Chain Integrity**:
```
GET /api/audit-chain/verify?companyId={id}
Response: { "valid": true, "chainLength": 1523, "lastVerifiedAt": "2026-03-20T10:00:00Z" }
```

**Export Audit Package**:
```
GET /api/audit-chain/export?projectId={id}&format=json
Response: JSON file with full hash chain (can be very large - use streaming)
```

**Verify Single Document History**:
```
GET /api/documents/{id}/audit-trail
Response: Array of AuditVaultEntry records for this document with hash verification
```

### Implementation Details
- Background job runs daily to verify chain integrity for all companies
- If chain break detected, send urgent alert to PLATFORM_ADMIN
- Export endpoint supports pagination for large chains (>10,000 entries)
- Optionally support PDF export with formatted audit report

**Permissions**:
- `AUDIT_CHAIN_VIEW` - View audit chain entries
- `AUDIT_CHAIN_EXPORT` - Export full audit package

---

## P2P9: Per-Project Storage Quota & Archival Pricing

### Business Context
The current Phase 1 system has a hard 1.5 TB limit for PILOT tier. Large shipyards with multiple newbuilds will hit this ceiling within 3 projects. Archival tier allows long-term retention of older projects at lower cost (cold storage).

### Storage Tier Architecture

| Tier | Storage Type | Performance | Cost | Use Case |
|------|--------------|-------------|------|----------|
| **Warm** | Cloudflare R2 Standard | Instant access | Standard R2 pricing | Active projects (<24 months) |
| **Cold** | Cloudflare R2 Infrequent Access | 1-5 minute retrieval | SGD 0.10/GB/month | Archived projects (>24 months) |

### Database Schema

```prisma
model Company {
  // ... existing fields ...
  storageQuotaWarmGB    Int       @default(1536)  // 1.5 TB for PILOT, 5 TB for ENTERPRISE
  storageQuotaColdGB    Int       @default(-1)    // -1 = unlimited
  storageUsedWarmGB     Float     @default(0)
  storageUsedColdGB     Float     @default(0)
}

model Project {
  // ... existing fields ...
  storageTier           String    @default("WARM")  // "WARM" | "COLD"
  archivedAt            DateTime?
  lastAccessedAt        DateTime  @default(now())
  storageUsedGB         Float     @default(0)
}

model StorageQuotaLog {
  id              String   @id @default(cuid())
  companyId       String
  projectId       String?
  action          String   // "UPLOAD" | "DELETE" | "ARCHIVE" | "RESTORE"
  deltaGB         Float    // Positive for increase, negative for decrease
  warmGB          Float    // Snapshot of warm storage after action
  coldGB          Float    // Snapshot of cold storage after action
  timestamp       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, timestamp])
}
```

### Archival Rules

**Automatic Archival**:
- Projects with `lastAccessedAt > 24 months` are eligible for archival
- System sends email notification to COMPANY_OWNER 30 days before archival
- If no objection, project moves to COLD tier automatically
- Archived projects remain fully searchable (metadata stays in warm database)

**Manual Archival**:
- COMPANY_ADMIN can manually archive any project
- Useful for completed projects that won't be accessed frequently

**Restoration**:
- User clicks "Access Document" on archived project → system queues restoration
- Document available within 5 minutes (Cloudflare R2 retrieval time)
- Restored document stays in warm tier for 7 days, then auto-archives again if not accessed

### Implementation Details

**Storage Calculation**:
- Background job runs daily to calculate storage usage per project
- Updates `Project.storageUsedGB` and `Company.storageUsedWarmGB/storageUsedColdGB`
- Formula: `SUM(Document.fileSize + Document.watermarkFileSize) / 1024^3`

**Quota Enforcement**:
- Pre-upload check: `GET /api/upload/presign` rejects if quota exceeded
- Response: `{ "error": "QUOTA_EXCEEDED", "quotaGB": 5120, "usedGB": 5123, "availableTiers": ["COLD"] }`
- UI prompts user to archive old projects or upgrade plan

**Archival Process**:
1. Mark `Project.storageTier = "COLD"` and `archivedAt = now()`
2. Queue BullMQ job to move all project documents to R2 Infrequent Access storage class
3. Update `Company.storageUsedWarmGB` and `storageUsedColdGB`
4. Log action in `StorageQuotaLog`

**Restoration Process**:
1. User clicks document in archived project
2. System checks if document is still in cold storage
3. If yes, queue restoration job (BullMQ)
4. Job copies document back to warm tier (or generates temporary presigned URL directly from cold storage)
5. Notify user when document is ready

### API Endpoints

**Check Storage Quota**:
```
GET /api/storage/quota
Response: {
  "quotaWarmGB": 5120,
  "quotaColdGB": -1,
  "usedWarmGB": 3456.7,
  "usedColdGB": 1234.5,
  "availableWarmGB": 1663.3,
  "projects": [
    { "projectId": "...", "name": "...", "tier": "WARM", "usedGB": 256.3 }
  ]
}
```

**Archive Project**:
```
POST /api/projects/{id}/archive
Response: { "success": true, "estimatedCompletionMinutes": 15 }
```

**Restore Project**:
```
POST /api/projects/{id}/restore
Response: { "success": true, "estimatedCompletionMinutes": 5 }
```

### Pricing Model (for Product/Sales team)

**PILOT Tier**:
- 1.5 TB warm storage included
- Unlimited cold storage
- Cold archival: SGD 0.10/GB/month

**ENTERPRISE Tier**:
- 5 TB warm storage included
- Unlimited cold storage
- Cold archival: SGD 0.10/GB/month
- Optional: Additional warm storage at SGD 0.20/GB/month

**Overage Handling**:
- If company exceeds warm quota, system auto-prompts archival suggestions
- If still over quota after 30 days, oldest projects force-archived (with notification)

**Permissions**:
- `STORAGE_QUOTA_VIEW` - View storage usage
- `PROJECT_ARCHIVE` - Archive projects
- `PROJECT_RESTORE` - Restore archived projects

---

## Implementation Roadmap

### Phase 2A (Weeks 1-4): Core Features
- **P2P1**: Equipment Hierarchy (database + API + basic UI)
- **P2P3**: Project Templates (database + API + basic UI)
- **P2P4**: Vendor Company Management (database + API + GDPR toggle)

### Phase 2B (Weeks 5-6): Field Execution
- **P2P6**: QR Code Enhancements (equipment QR, bulk printing, field inspection API)
- **P2P6**: PWA Offline Mode (IndexedDB caching, background sync)

### Phase 2C (Weeks 7-8): Integrations
- **P2P5**: BIM Integration (import API, webhook setup, sync logging)
- **P2P7**: Classification Society Portal (adapter pattern, DNV + ABS adapters)

### Phase 2D (Weeks 9-10): Compliance & Operations
- **P2P8**: Audit Ledger Hash Chain (enhance AuditVaultEntry, verification API)
- **P2P9**: Storage Quota & Archival (usage calculation, archival jobs, quota enforcement)

### Testing & Validation (Weeks 11-12)
- Integration testing of all P2 features
- Load testing with 10,000 equipment items + 50,000 documents
- GDPR/PDPA compliance audit
- Classification society sandbox testing
- User acceptance testing with pilot customer (Singapore shipyard)

---

## Success Metrics

### Technical Metrics
- Equipment hierarchy tree renders in <500ms (up to 10,000 items)
- BIM import processes 5,000 equipment items in <60 seconds
- QR code generation: <2 seconds for 100 codes
- Classification society submission: <10 seconds for 50 MB package
- Audit chain verification: <5 seconds for 10,000 entries
- Storage archival: <1 hour for 100 GB project

### Business Metrics
- Reduce equipment data entry time by 90% (via BIM import)
- Reduce classification society submission time by 80% (from 2-3 days to 4 hours)
- Zero GDPR/PDPA compliance violations
- Field engineers can work 100% offline for 8-hour shifts
- Audit chain provides legally defensible proof in arbitration cases

---

## Dependencies & Prerequisites

### External Services
- **BIM System APIs**: AVEVA Marine, Tribon, Cadmatic (vendor coordination required)
- **Classification Society APIs**: DNV, ABS, Lloyd's (sandbox access needed 2-4 weeks lead time)
- **Cloudflare R2**: Infrequent Access storage class enabled

### Infrastructure
- **Database**: PostgreSQL 15+ with recursive CTE support (for equipment hierarchy)
- **Background Jobs**: BullMQ workers scaled to handle BIM imports (CPU-intensive)
- **Encryption**: AES-256 key management for API credentials

### Team Requirements
- 2x Backend Engineers (Node.js/Prisma/BullMQ)
- 1x Frontend Engineer (React/PWA/offline-first)
- 1x Integration Engineer (API adapters for BIM/Class societies)
- 1x QA Engineer (compliance testing)

---

## Risk Mitigation

### Technical Risks
1. **BIM API Instability**: Vendor APIs may change without notice
   - *Mitigation*: Adapter pattern allows quick swaps; maintain fallback CSV import
2. **Offline Sync Conflicts**: Multiple engineers editing same equipment offline
   - *Mitigation*: Last-write-wins with conflict detection UI; prompt manual merge
3. **Storage Cost Overruns**: Cold storage costs exceed projections
   - *Mitigation*: Aggressive auto-archival after 18 months (instead of 24)

### Business Risks
1. **GDPR Compliance Failure**: PII scope toggle misconfigured
   - *Mitigation*: Automated compliance tests; legal review before launch
2. **Classification Society API Delays**: Vendor APIs not ready in time
   - *Mitigation*: Launch P2 without P2P7; add in P2.1 update
3. **Customer Resistance to Archival**: Users want all data in warm tier
   - *Mitigation*: Transparent restore process (<5 min); educate on cost savings

---

## Post-Phase 2 Enhancements (Phase 3 Candidates)

- **P3P1**: Advanced Workflow Automation (auto-approve documents based on rules)
- **P3P2**: Multi-Project Dashboards (portfolio view for COMPANY_OWNER)
- **P3P3**: AI-Powered Document Parsing (extract equipment tags from PDFs automatically)
- **P3P4**: Real-Time Collaboration (simultaneous editing of equipment metadata)
- **P3P5**: Mobile Native Apps (iOS/Android for better offline camera access)
- **P3P6**: Blockchain Anchoring (optional: anchor audit hash chain to Ethereum for ultimate immutability)

---

## Appendix: Database Migration Script

```sql
-- Phase 2 Schema Migration
-- Run after Prisma migration to add computed column and triggers

-- Equipment level computation (generated column)
ALTER TABLE "Equipment"
ADD COLUMN "level" INT GENERATED ALWAYS AS (
  (SELECT COUNT(*) FROM "Equipment" AS parent
   WHERE parent.id IN (
     WITH RECURSIVE ancestors AS (
       SELECT parent_id FROM "Equipment" WHERE id = "Equipment".id
       UNION ALL
       SELECT e.parent_id FROM "Equipment" e
       JOIN ancestors a ON e.id = a.parent_id
     )
     SELECT parent_id FROM ancestors WHERE parent_id IS NOT NULL
   ))
) STORED;

-- Prevent circular references in equipment hierarchy
CREATE OR REPLACE FUNCTION prevent_equipment_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.id = NEW.parent_id THEN
      RAISE EXCEPTION 'Equipment cannot be its own parent';
    END IF;

    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT id FROM "Equipment" WHERE parent_id = NEW.id
        UNION ALL
        SELECT e.id FROM "Equipment" e
        JOIN descendants d ON e.parent_id = d.id
      )
      SELECT 1 FROM descendants WHERE id = NEW.parent_id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in equipment hierarchy';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_circular_check
BEFORE INSERT OR UPDATE ON "Equipment"
FOR EACH ROW EXECUTE FUNCTION prevent_equipment_circular_reference();

-- Add indexes for Phase 2 performance
CREATE INDEX idx_equipment_bim_model ON "Equipment"(bim_model_id) WHERE bim_model_id IS NOT NULL;
CREATE INDEX idx_vendor_submission_status ON "VendorSubmission"(status, submitted_at);
CREATE INDEX idx_class_society_submission_status ON "ClassSocietySubmission"(status, submitted_at);
CREATE INDEX idx_audit_vault_chain ON "AuditVaultEntry"(company_id, chain_index);
```

---

**Document Control**
Version: 1.0
Author: DocuRoute Product Team
Last Updated: 2026-03-20
Status: DRAFT - Pending Stakeholder Review
Next Review: 2026-04-01
