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

**One-Way Import Flow**:
1. BIM system exports equipment list as CSV/JSON/XML with fields: `tag`, `name`, `type`, `parentTag`, `coordinates`, `modelId`
2. DocuRoute API endpoint accepts bulk import with transaction rollback on error
3. System auto-creates Equipment records with proper parent-child links
4. System optionally creates placeholder documents for each equipment item (Installation Drawing, Datasheet, Manual)
5. System logs import with full source file checksum for traceability

**Export for BIM Update** (manual process):
1. User exports updated equipment list from DocuRoute as CSV/JSON
2. User manually imports into BIM system using BIM vendor's import tools
3. Alternative: User provides updated CSV to BIM administrator for batch update

**Why Not Reverse Sync?**
- **Reality Check (2026)**: AVEVA Marine, Tribon, Cadmatic do NOT expose public REST APIs for bidirectional sync
- Export formats: CSV/XML/custom reports (manual or scripted)
- Import back into AVEVA/Cadmatic: manual or via their own macro/PML/.NET API
- Webhook → BIM system update would require customers to develop custom listeners (high friction)
- **Mitigation**: Manual tag conflict resolution UI if re-import detects mismatches

**Future Integration Path** (Phase 3 candidate):
- If BIM vendor exposes webhook endpoints, add optional reverse sync
- Proof-of-concept required with at least one major BIM vendor before production use

### Database Schema

```prisma
model Equipment {
  // ... existing fields from P2P1 ...
  bimModelId        String?             // External 3D model unique identifier
  bimCoordinates    Json?               // { x, y, z } coordinates in 3D model for viewer pinning
  bimLastImportedAt DateTime?           // Last import timestamp (NOT sync—one-way only)
}

model BIMImportLog {
  id               String   @id @default(cuid())
  companyId        String
  projectId        String
  importSource     String   // "AVEVA_MARINE" | "TRIBON" | "CADMATIC" | "CATIA" | "CSV_UPLOAD"
  fileName         String   // Original import file name
  fileChecksum     String   // SHA-256 of import file for audit trail
  recordsImported  Int      // Count of successfully imported equipment
  recordsSkipped   Int      // Count of skipped (duplicates or validation failures)
  recordsUpdated   Int      // Count of updated existing equipment
  status           String   // "SUCCESS" | "PARTIAL" | "FAILED"
  errorSummary     String?  // High-level error description
  errorDetails     Json?    // Detailed error log per record
  importedBy       String   // User ID who initiated import
  createdAt        DateTime @default(now())

  company          Company  @relation(fields: [companyId], references: [id])
  project          Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, createdAt])
  @@index([companyId, createdAt])
}
```

### API Endpoints

**Import Equipment from BIM**:
```
POST /api/projects/{id}/import-bim-equipment
Body: {
  "source": "AVEVA_MARINE",
  "modelId": "HULL-001",
  "updateExisting": true,  // If true, update existing equipment; if false, skip duplicates
  "equipment": [
    { "tag": "ME-01", "name": "Main Engine", "type": "ENGINE", "parentTag": null, "coordinates": { "x": 100, "y": 50, "z": 10 } },
    { "tag": "FIP-01", "name": "Fuel Injection Pump", "type": "PUMP", "parentTag": "ME-01", "coordinates": { "x": 102, "y": 52, "z": 12 } }
  ],
  "createPlaceholderDocuments": true
}
Response: {
  "importLogId": "...",
  "recordsImported": 245,
  "recordsUpdated": 12,
  "recordsSkipped": 3,
  "conflicts": [
    { "tag": "ME-01", "issue": "Tag exists but parentTag different", "action": "skipped" }
  ]
}
```

**Export Equipment for BIM**:
```
GET /api/projects/{id}/export-bim-equipment?format=csv
Response: CSV file with all equipment (tags, names, types, parent relationships, coordinates, lifecycle stages)

GET /api/projects/{id}/export-bim-equipment?format=json
Response: JSON array of all equipment with full metadata
```

**Conflict Resolution UI**:
```
GET /api/projects/{id}/bim-import-conflicts?importLogId={id}
Response: List of equipment with conflicts (tag exists, different attributes)

POST /api/projects/{id}/resolve-bim-conflict
Body: {
  "equipmentId": "...",
  "action": "OVERWRITE" | "KEEP_EXISTING" | "MERGE"
}
```

### Implementation Details
- Transaction-wrapped bulk import with validation
- Detect duplicate tags and present conflict resolution UI (skip, overwrite, merge)
- CSV parser supports multiple BIM export formats (configurable column mappings)
- Optional: Queue BIM imports as background jobs (BullMQ) for large models (>1000 equipment items)
- Import logs retained for 12 months for audit trail

**Permissions**:
- `BIM_IMPORT` - Import equipment from CSV/JSON exports
- `BIM_EXPORT` - Export equipment data for BIM system update
- `BIM_CONFLICT_RESOLVE` - Resolve import conflicts

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
  inspectionType  String    // "INSTALLATION_VERIFY" | "COMMISSIONED" | "DAMAGE_REPORT" | "QUALITY_CHECK" | "PRESSURE_TEST" | "LOOP_CHECK"
  status          String    // "PASS" | "FAIL" | "CONDITIONAL"
  notes           String?
  photoKeys       String[]  // R2 file keys for uploaded photos
  gpsCoordinates  Json?     // { lat, lon } if available

  // Enhanced commissioning support
  checklistItems  Json?     // [{ item: "Valve opens fully", result: "PASS" | "FAIL" | "NA", notes: "" }]
  testResults     Json?     // Test-specific data (pressure readings, loop voltages, etc.)
  witnessSignatures Json?   // [{ party: "YARD" | "VENDOR" | "CLASS" | "OWNER", name, signedAt }]

  timestamp       DateTime  @default(now())

  company         Company   @relation(fields: [companyId], references: [id])
  project         Project   @relation(fields: [projectId], references: [id])
  equipment       Equipment? @relation(fields: [equipmentId], references: [id])
  document        Document?  @relation(fields: [documentId], references: [id])

  @@index([equipmentId, timestamp])
  @@index([projectId, inspectionType])
  @@index([status])
}

model CommissioningRecord {
  id              String    @id @default(cuid())
  companyId       String
  projectId       String
  equipmentId     String
  recordType      String    // "PRESSURE_TEST" | "LOOP_CHECK" | "FUNCTIONAL_TEST" | "PERFORMANCE_TEST"
  testProcedure   String?   // Reference to test procedure document

  plannedDate     DateTime?
  executedAt      DateTime?

  testData        Json      // Test-specific structured data
  verdict         String    // "PASS" | "FAIL" | "RETEST_REQUIRED"

  // Multi-party witness tracking
  yardWitness     String?
  vendorWitness   String?
  classWitness    String?
  ownerWitness    String?

  punchListItems  Json[]    // [{ item, severity, status, assignedTo, dueDate }]

  linkedInspectionIds String[] // References to FieldInspection records (photo evidence)

  createdBy       String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company         Company   @relation(fields: [companyId], references: [id])
  project         Project   @relation(fields: [projectId], references: [id])
  equipment       Equipment @relation(fields: [equipmentId], references: [id])

  @@index([equipmentId, recordType])
  @@index([projectId, verdict])
}

model PunchItem {
  id              String    @id @default(cuid())
  companyId       String
  projectId       String
  equipmentId     String?
  commissioningRecordId String?

  itemNumber      String    // Auto-generated: "PI-2026-001"
  description     String
  severity        String    // "CRITICAL" | "MAJOR" | "MINOR"
  status          String    @default("OPEN")  // OPEN | IN_PROGRESS | RESOLVED | VERIFIED | CLOSED

  raisedBy        String
  assignedTo      String?
  targetDate      DateTime?
  closedAt        DateTime?

  photoKeys       String[]
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company         Company   @relation(fields: [companyId], references: [id])
  project         Project   @relation(fields: [projectId], references: [id])
  equipment       Equipment? @relation(fields: [equipmentId], references: [id])

  @@unique([companyId, itemNumber])
  @@index([equipmentId, status])
  @@index([projectId, status, severity])
  @@index([assignedTo, status])
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

## P2P7: Classification Society Assisted Submission

### Business Context
All newbuild vessels require approval from Classification Societies (DNV, ABS, Lloyd's Register, Bureau Veritas). These organizations currently use portal-based submission systems (ABS MyFreedom, DNV Veristar, LR MOVE, BV Approval Explorer). DocuRoute generates correctly formatted submission packages with cover letters and metadata, allowing users to upload manually to society portals. This eliminates formatting errors and saves preparation time while avoiding dependencies on non-existent public APIs.

**2026 Reality Check**: Classification societies do NOT provide public REST APIs for bulk document submission. Portal-based upload is the standard industry practice. Future API integrations will require bespoke per-society partnerships (6-18 month negotiation cycles).

### Supported Classification Societies

| Society | Portal Upload | Package Generation | Status Tracking |
|---------|---------------|-------------------|-----------------|
| DNV (Det Norske Veritas) | Veristar Portal | ✓ | Manual (future API candidate) |
| ABS (American Bureau of Shipping) | MyFreedom Client | ✓ | Manual (future API candidate) |
| Lloyd's Register | MOVE Portal | ✓ | Manual (future API candidate) |
| Bureau Veritas | Approval Explorer | ✓ | Manual (future API candidate) |
| Class NK (Nippon Kaiji Kyokai) | Portal Upload | ✓ | Manual (future API candidate) |

### Database Schema

```prisma
model ClassificationSociety {
  id             String   @id @default(cuid())
  code           String   @unique  // "DNV" | "ABS" | "LR" | "BV" | "NK"
  name           String
  portalUrl      String   // URL to society's upload portal
  isActive       Boolean  @default(true)

  configurations ClassSocietyConfiguration[]
}

model ClassSocietyConfiguration {
  id                     String              @id @default(cuid())
  companyId              String
  classificationSocietyId String

  // Submission settings
  defaultProjectCode     String?             // Class society's project identifier
  vesselImoNumber        String?             // Vessel IMO number (if applicable)
  coverSheetTemplate     String              @default("STANDARD")  // Template for cover letter generation
  notificationEmails     String[]

  isActive               Boolean             @default(true)
  createdAt              DateTime            @default(now())
  updatedAt              DateTime            @updatedAt

  company                Company             @relation(fields: [companyId], references: [id])
  classificationSociety  ClassificationSociety @relation(fields: [classificationSocietyId], references: [id])
  submissions            ClassSocietySubmission[]

  @@unique([companyId, classificationSocietyId])
}

model ClassSocietySubmission {
  id                    String                      @id @default(cuid())
  companyId             String
  projectId             String
  configurationId       String
  transmittalId         String?                     // Link to internal transmittal for traceability

  packageTitle          String
  submissionType        String                      // "APPROVAL" | "INFORMATION" | "AS_BUILT"
  status                String                      @default("PENDING")  // PENDING | PACKAGE_READY | MANUALLY_SUBMITTED | CONFIRMED

  documentIds           String[]                    // Array of Document IDs included in package
  pdfPackageKey         String?                     // R2 key for generated PDF package
  coverLetterKey        String?                     // R2 key for generated cover letter
  metadataJsonKey       String?                     // R2 key for metadata JSON file
  zipPackageKey         String?                     // R2 key for complete ZIP package (PDF + metadata)

  generatedAt           DateTime?                   // When package was generated
  downloadedAt          DateTime?                   // When user downloaded package
  manuallySubmittedAt   DateTime?                   // When user confirmed manual upload to portal
  confirmedBy           String?                     // User who confirmed submission

  notes                 String?                     // User notes about submission
  classReferenceNumber  String?                     // Society's reference after manual submission

  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt

  company               Company                     @relation(fields: [companyId], references: [id])
  project               Project                     @relation(fields: [projectId], references: [id])
  configuration         ClassSocietyConfiguration   @relation(fields: [configurationId], references: [id])

  @@index([projectId, status])
  @@index([companyId, createdAt])
}
```

### Package Generation Flow

**1. Configuration Setup** (one-time per company per class society):
```
POST /api/classification-societies/configure
Body: {
  "classificationSocietyCode": "DNV",
  "defaultProjectCode": "HULL-2026-001",
  "vesselImoNumber": "IMO1234567",
  "coverSheetTemplate": "STANDARD"
}
```

**2. Generate Submission Package**:
```
POST /api/classification-societies/generate-package
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
- Generate professional cover letter (PDF) with submission metadata
- Combine all documents into single PDF package (with bookmarks/TOC)
- Create metadata JSON file with document codes, revisions, and checksums
- Bundle everything into ZIP file
- Store all files in R2 with presigned download URLs (valid 7 days)
- Create audit vault entry
- Send notification to document controller with download link

**4. User Manual Upload**:
- User downloads ZIP package from DocuRoute
- User logs into classification society portal (e.g., ABS MyFreedom)
- User uploads ZIP file via portal interface
- Society portal sends confirmation email with reference number
- User returns to DocuRoute and marks submission as "MANUALLY_SUBMITTED" with reference number
- System updates status and logs submission timestamp

**5. Traceability**:
- Transmittal → ClassSocietySubmission linkage maintained
- Full audit trail: package generation → download → manual upload → confirmation
- If society later provides status APIs, system can poll for updates

### Implementation Details

**Package Generator Pattern**:
```typescript
interface ClassSocietyPackageGenerator {
  generateCoverLetter(submission: SubmissionMetadata): Promise<Buffer>; // Returns PDF
  combineDocuments(documentKeys: string[]): Promise<Buffer>; // Returns merged PDF with bookmarks
  generateMetadataJson(documents: Document[]): Promise<string>; // Returns JSON string
  createZipPackage(files: PackageFile[]): Promise<Buffer>; // Returns ZIP bundle
}

class DNVPackageGenerator implements ClassSocietyPackageGenerator {
  // DNV-specific cover letter format, file naming conventions
}
class ABSPackageGenerator implements ClassSocietyPackageGenerator {
  // ABS-specific requirements (>1GB support, specific metadata fields)
}
```

**Cover Letter Generation**:
- Use React-PDF or PDFKit to generate professional cover sheets
- Include: project details, document list with codes/revisions, submission type, contact info
- Society-specific formatting (DNV requires different layout than ABS)

**Document Merging**:
- Use `pdf-lib` to merge multiple watermarked PDFs
- Generate bookmarks for easy navigation (one bookmark per document)
- Add table of contents page at the beginning
- Preserve original document metadata

**Security**:
- All package files stored in R2 with presigned URLs (7-day expiry)
- Download events logged in audit trail
- Package files auto-deleted after 30 days (company can re-generate if needed)

**Error Handling**:
- If document merge fails (corrupted PDF), system identifies problematic document
- User notified with specific document code that failed
- Partial package not generated (all-or-nothing approach)

**Permissions**:
- `CLASS_SOCIETY_CONFIGURE` - Set up submission settings
- `CLASS_SOCIETY_GENERATE_PACKAGE` - Generate submission packages
- `CLASS_SOCIETY_VIEW` - View submission history

**Future API Integration Path** (Phase 3 candidate):
- When societies expose APIs, extend PackageGenerator to include `submitToAPI()` method
- Existing assisted flow remains as fallback
- No schema changes required—just add optional API submission alongside manual flow

### API Endpoints
- `POST /api/classification-societies/configure` - Configure submission settings
- `POST /api/classification-societies/generate-package` - Generate download package
- `GET /api/classification-societies/submissions?projectId={id}` - List submissions
- `GET /api/classification-societies/submissions/{id}/download` - Get package download URLs
- `PATCH /api/classification-societies/submissions/{id}/confirm` - Mark as manually submitted
- `POST /api/classification-societies/submissions/{id}/regenerate` - Re-generate package

---

## P2P8: Immutable Audit Ledger with Optional Anchoring

### Business Context
When shipyards hand over the as-built documentation package to vessel owners, they need cryptographic proof that no documents were altered post-delivery. This has legal value in arbitration cases and insurance claims. The existing AuditVaultEntry model (from Phase 1) provides immutability triggers, but Phase 2 extends it with SHA-256 hash chains and optional third-party anchoring for independent verification.

**Legal Defensibility Requirements**:
- Hash chain alone (internal system) = NOT sufficient for most arbitration/insurance claims
- Owners and lawyers will not trust "vendor SaaS says chain is intact"
- **Solution**: Optional anchoring to external timestamp authorities or blockchain for independent verification

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

  // Optional external anchoring
  anchorType          String?  // "OPENTIMESTAMPS" | "BITCOIN" | "ETHEREUM" | "IRON_MOUNTAIN" | null
  anchorProof         String?  // Proof data from anchoring service (OTS file, tx hash, etc.)
  anchoredAt          DateTime?

  @@index([companyId, chainIndex])
  @@unique([companyId, chainIndex])
}

model AuditAnchorBatch {
  id              String   @id @default(cuid())
  companyId       String
  batchStartIndex Int      // First chain index in this batch
  batchEndIndex   Int      // Last chain index in this batch
  merkleRoot      String   // Root hash of this batch
  anchorType      String   // "OPENTIMESTAMPS" | "BITCOIN" | "ETHEREUM" | "IRON_MOUNTAIN"
  anchorProof     String   // Blockchain transaction hash or timestamp authority proof
  anchoredAt      DateTime
  verificationUrl String?  // Public URL for independent verification

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, anchoredAt])
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
  "anchorBatches": [
    {
      "merkleRoot": "d4f5c3...",
      "anchorType": "OPENTIMESTAMPS",
      "anchorProof": "base64_encoded_ots_file",
      "anchoredAt": "2026-01-15T00:00:00Z",
      "verificationUrl": "https://opentimestamps.org",
      "batchStartIndex": 0,
      "batchEndIndex": 999
    }
  ],
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
  "verificationInstructions": "1) Verify internal chain: Run SHA-256 on each entry and compare to 'hash' field. 2) Verify anchors: Use anchor proofs to verify merkle roots on blockchain/timestamp service."
}
```

### Anchoring Implementation

**Anchoring Options**:

1. **OpenTimestamps (Recommended for cost-effectiveness)**:
   - Free Bitcoin-based timestamping service
   - Submit merkle root of batch (e.g., daily or per 1000 entries)
   - Returns .ots proof file for independent verification
   - Verification: Anyone can verify timestamp using OpenTimestamps tools
   - Cost: ~$0 (uses existing Bitcoin transactions)

2. **Direct Bitcoin/Ethereum Anchoring**:
   - Submit merkle root as OP_RETURN transaction
   - Permanent record on public blockchain
   - Cost: ~$5-20 per anchor (transaction fees)
   - Best for high-value projects (LNG carriers, offshore platforms >$100M)

3. **Trusted Timestamp Authority (Iron Mountain, etc.)**:
   - Commercial long-term archiving provider
   - Notarized timestamp certificates
   - Legal teams familiar with this approach
   - Cost: $50-200 per batch
   - Best for companies requiring traditional legal proofs

4. **None (Internal only)**:
   - Hash chain verification within DocuRoute only
   - No external proof
   - Suitable for internal audits, not arbitration/insurance claims

**Anchoring Strategy**:
- Batch entries into merkle trees (e.g., daily or per 1000 entries)
- Anchor merkle root to chosen service
- Store anchor proof in `AuditAnchorBatch`
- Individual entries link to batch via `chainIndex` range
- Export includes both internal chain AND anchor proofs for full verification

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

## P2P10: Multi-Round Document Review & Conditional Approval

### Business Context
Vendor drawing review cycles in shipyards typically go through 2-4 rounds: IFR (Issued for Review) → IFA (Issued for Approval) → IFC (Issued for Construction) → AB (As-Built). Conditional approval ("Approved subject to corrections") is extremely common. The system must track review rounds, supersession chains, and conditional approval conditions.

### Database Schema

```prisma
model DocumentRevision {
  // ... existing fields from Phase 1 ...
  reviewRound     Int       @default(1)  // 1, 2, 3, 4 (increments with each review cycle)
  supersededById  String?   // Link to newer revision that supersedes this one
  supersedes      DocumentRevision? @relation("RevisionSupersession", fields: [supersededById], references: [id])
  supersededBy    DocumentRevision[] @relation("RevisionSupersession")

  reviews         Review[]
}

model Review {
  id                  String            @id @default(cuid())
  companyId           String
  documentId          String
  revisionId          String
  reviewRound         Int               // Must match DocumentRevision.reviewRound

  reviewerUserId      String
  reviewerName        String
  reviewerRole        String?           // "ENGINEERING_MANAGER" | "QA_QC" | "PROJECT_MANAGER" | etc.

  decision            String            // "APPROVED" | "APPROVED_WITH_CONDITIONS" | "REJECTED" | "REVISE_AND_RESUBMIT"
  conditions          String?           // Required if decision = "APPROVED_WITH_CONDITIONS"
  comments            String?

  // Attachment support for review comments with markups
  markupFileKey       String?           // R2 key for PDF with review annotations

  reviewedAt          DateTime          @default(now())
  createdAt           DateTime          @default(now())

  company             Company           @relation(fields: [companyId], references: [id])
  document            Document          @relation(fields: [documentId], references: [id])
  revision            DocumentRevision  @relation(fields: [revisionId], references: [id])

  @@index([documentId, reviewRound])
  @@index([revisionId])
  @@index([reviewerUserId, reviewedAt])
  @@index([companyId, decision])
}
```

### Key Features

**Review Round Tracking**:
- Each document revision has a `reviewRound` counter
- When vendor resubmits after review, system creates new revision with `reviewRound + 1`
- Supersession chain links old revision to new: `Revision-2 supersededById → Revision-1`
- UI shows full history: "Rev B (Round 2) supersedes Rev A (Round 1)"

**Conditional Approval**:
- Reviewer selects "Approved with Conditions"
- System requires `conditions` field (e.g., "Correct valve tag from V-101 to V-102 on sheet 3")
- Document status becomes "CONDITIONALLY_APPROVED"
- Vendor must acknowledge conditions before proceeding to construction
- Acknowledgment logged in audit trail

**Review Decision Types**:
1. **APPROVED** - No changes required, proceed to next stage
2. **APPROVED_WITH_CONDITIONS** - Minor corrections required, vendor must acknowledge
3. **REJECTED** - Major issues, cannot proceed
4. **REVISE_AND_RESUBMIT** - Changes required, submit new revision for next round

**Markup Support**:
- Reviewers can upload annotated PDF with review comments
- Stored in R2 with presigned download URL
- Linked to Review record via `markupFileKey`

### API Endpoints

**Submit Review**:
```
POST /api/documents/{id}/revisions/{revId}/review
Body: {
  "decision": "APPROVED_WITH_CONDITIONS",
  "conditions": "1. Correct valve tag from V-101 to V-102 on sheet 3\n2. Update material spec to ASTM A106 Gr.B",
  "comments": "Overall design is acceptable, minor corrections required",
  "markupFileKey": "reviews/markup-abc123.pdf"  // Optional
}
```

**Create New Revision After Review**:
```
POST /api/documents/{id}/revisions/new-round
Body: {
  "previousRevisionId": "...",
  "changes": "Addressed all review comments from Round 1",
  "fileKey": "documents/new-file.pdf"
}
Response: {
  "revisionId": "...",
  "reviewRound": 2,
  "supersedes": "previous-revision-id"
}
```

**Get Review History**:
```
GET /api/documents/{id}/review-history
Response: [
  {
    "revisionNumber": "A",
    "reviewRound": 1,
    "reviews": [
      { "reviewer": "John Doe", "decision": "REVISE_AND_RESUBMIT", "comments": "..." }
    ],
    "supersededBy": "revision-id-2"
  },
  {
    "revisionNumber": "B",
    "reviewRound": 2,
    "reviews": [
      { "reviewer": "John Doe", "decision": "APPROVED_WITH_CONDITIONS", "conditions": "..." }
    ]
  }
]
```

**Acknowledge Conditional Approval**:
```
POST /api/documents/{id}/revisions/{revId}/acknowledge-conditions
Body: {
  "acknowledgedBy": "vendor-user-id",
  "acknowledgementNotes": "All conditions will be addressed in fabrication"
}
```

### Implementation Details

**Permissions**:
- `DOCUMENT_REVIEW` - Submit document reviews
- `DOCUMENT_REVIEW_ACKNOWLEDGE` - Acknowledge conditional approval conditions
- `DOCUMENT_REVIEW_VIEW` - View review history

**UI Components**:
- Review form with decision dropdown + conditional conditions field
- Review history timeline showing all rounds and decisions
- Conditional approval banner on document detail page
- Supersession chain visualization (Rev A → Rev B → Rev C)

**Validation Rules**:
- `conditions` field required if `decision = "APPROVED_WITH_CONDITIONS"`
- New revision `reviewRound` must be `previousRevision.reviewRound + 1`
- Cannot delete revisions that are part of supersession chain
- Review can only be submitted by users with `DOCUMENT_REVIEW` permission

---

## Implementation Roadmap

### Phase 2A (Weeks 1-4): Core Features
- **P2P1**: Equipment Hierarchy (database + API + basic UI + bimCoordinates field)
- **P2P3**: Project Templates (database + API + sandbox mode + change proposals)
- **P2P4**: Vendor Company Management (database + API + GDPR/PDPA toggle)
- **P2P10**: Multi-Round Review (database + API + conditional approval)

### Phase 2B (Weeks 5-6): Field Execution
- **P2P6**: QR Code Enhancements (equipment QR, bulk printing, field inspection API)
- **P2P6**: Commissioning & Punch List (CommissioningRecord + PunchItem models, witness tracking)
- **P2P6**: PWA Offline Mode (IndexedDB caching, background sync, checklist items)

### Phase 2C (Weeks 7-8): Integrations
- **P2P5**: BIM One-Way Import (CSV/JSON import, conflict resolution UI, export for BIM update)
- **P2P7**: Classification Society Assisted Submission (package generation, cover letter, ZIP download)

### Phase 2D (Weeks 9-10): Compliance & Operations
- **P2P8**: Audit Ledger with Anchoring (hash chain, OpenTimestamps integration, export with proofs)
- **P2P9**: Storage Quota & Archival (usage calculation, archival jobs, quota enforcement)

### Testing & Validation (Weeks 11-12)
- Integration testing of all P2 features
- Load testing with 10,000 equipment items + 50,000 documents
- GDPR/PDPA compliance audit
- Classification society package generation testing (DNV, ABS formats)
- Multi-round review workflow testing
- User acceptance testing with pilot customer (Singapore shipyard)

---

## Success Metrics

### Technical Metrics
- Equipment hierarchy tree renders in <500ms (up to 10,000 items)
- BIM import processes 5,000 equipment items in <60 seconds
- QR code generation: <2 seconds for 100 codes
- Classification society package generation: <10 seconds for 50 MB (including cover letter + ZIP)
- Audit chain verification: <5 seconds for 10,000 entries
- Audit anchoring: <30 seconds for OpenTimestamps submission
- Storage archival: <1 hour for 100 GB project
- Multi-round review submission: <2 seconds

### Business Metrics
- Reduce equipment data entry time by 90% (via BIM one-way import)
- Reduce classification society submission preparation time by 75% (from 4 hours to 1 hour via assisted package generation)
- Zero GDPR/PDPA compliance violations
- Field engineers can work 100% offline for 8-hour shifts
- Audit chain with external anchoring provides legally defensible proof (via OpenTimestamps or timestamp authority)
- Multi-round review tracking reduces document version confusion by 95%
- Commissioning dossier completion time reduced by 60% (structured test records vs manual forms)

---

## Dependencies & Prerequisites

### External Services
- **BIM System Exports**: AVEVA Marine, Tribon, Cadmatic (CSV/JSON export capabilities - no API required)
- **Classification Society Portals**: DNV Veristar, ABS MyFreedom, LR MOVE, BV Approval Explorer (manual upload)
- **OpenTimestamps**: Free Bitcoin-based timestamping (optional for audit anchoring)
- **Cloudflare R2**: Infrequent Access storage class enabled

### Infrastructure
- **Database**: PostgreSQL 15+ with recursive CTE support (for equipment hierarchy)
- **Background Jobs**: BullMQ workers scaled to handle BIM imports (CPU-intensive)
- **PDF Processing**: `pdf-lib` for document merging, `pdfkit` for cover letter generation
- **Merkle Tree Library**: For audit chain batching (if using anchoring)

### Team Requirements
- 2x Backend Engineers (Node.js/Prisma/BullMQ)
- 1x Frontend Engineer (React/PWA/offline-first)
- 1x Integration Engineer (BIM import formats, classification society package standards)
- 1x QA Engineer (compliance testing, multi-round review workflows)

---

## Risk Mitigation

### Technical Risks
1. **BIM Import Format Variability**: Different BIM systems export different CSV/XML schemas
   - *Mitigation*: Configurable column mapping UI; support 3-5 common formats out-of-box; CSV template generator
2. **Offline Sync Conflicts**: Multiple engineers editing same equipment offline
   - *Mitigation*: Last-write-wins with conflict detection UI; prompt manual merge
3. **Storage Cost Overruns**: Cold storage costs exceed projections
   - *Mitigation*: Aggressive auto-archival after 18 months (instead of 24)
4. **Audit Anchoring Delays**: OpenTimestamps Bitcoin confirmation can take 1-6 hours
   - *Mitigation*: Batch anchoring (daily); immediate export still works, anchoring completes asynchronously

### Business Risks
1. **GDPR Compliance Failure**: PII scope toggle misconfigured
   - *Mitigation*: Automated compliance tests; legal review before launch
2. **Classification Society Manual Upload Friction**: Users resist manual portal upload step
   - *Mitigation*: Streamline package download UX; provide clear instructions with screenshots per society
   - *Future Path*: Move to Phase 3 when societies expose APIs (requires 6-18 month partnerships)
3. **Customer Resistance to Archival**: Users want all data in warm tier
   - *Mitigation*: Transparent restore process (<5 min); educate on cost savings; offer higher warm quota tiers
4. **Multi-Round Review Adoption**: Users continue using email/spreadsheets
   - *Mitigation*: Demonstrate time savings (version tracking, conditional approval automation); integrate with existing transmittal workflow

---

## Post-Phase 2 Enhancements (Phase 3 Candidates)

- **P3P1**: Advanced Workflow Automation (auto-approve documents based on rules)
- **P3P2**: Multi-Project Dashboards (portfolio view for COMPANY_OWNER)
- **P3P3**: AI-Powered Document Parsing (extract equipment tags from PDFs automatically)
- **P3P4**: Real-Time Collaboration (simultaneous editing of equipment metadata)
- **P3P5**: Mobile Native Apps (iOS/Android for better offline camera access)
- **P3P6**: Classification Society Direct API Integration (when societies expose APIs - requires partnerships)
- **P3P7**: BIM Bidirectional Sync (when BIM vendors expose webhook endpoints - requires proof-of-concept)
- **P3P8**: 3D Viewer Integration (use bimCoordinates for equipment pinning in web-based 3D model viewer)
- **P3P9**: Advanced Commissioning Workflows (automatic test sequence scheduling, multi-system dependencies)

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
Version: 2.0 (Updated based on Singapore shipyard feedback)
Author: DocuRoute Product Team
Last Updated: 2026-03-23
Status: REVISED - Incorporating production feedback from pilot customer
Next Review: 2026-04-15

**Key Changes in v2.0**:
- P2P7: Downgraded to assisted package generation (no direct API integration)
- P2P5: Limited to one-way BIM import only (removed reverse sync)
- P2P8: Added optional blockchain/timestamp anchoring for legal defensibility
- P2P10: Added multi-round review with conditional approval support
- P2P6: Enhanced with commissioning dossiers and punch list management
- P2P1: Added bimCoordinates field for 3D viewer integration
- Updated success metrics and risk mitigation to reflect realistic 2026 landscape
