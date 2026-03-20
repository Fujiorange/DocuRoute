# Phase 2 Plan - Brutal Engineering Review
## Equipment Hierarchy & Vendor Management System

**Reviewers:** Senior Engineering Team, Shipyard/Construction Company
**Date:** March 20, 2026
**Context:** Review of first 8 parts (P2P1-P2P7) of 13-part Phase 2 implementation plan

---

## Executive Summary

**Overall Assessment:** 6/10 - Good technical foundation, but significant gaps in real-world operational requirements and dangerous oversimplifications in vendor management and equipment lifecycle.

**Can we use this?** Maybe. With major modifications.

**Would we pay for this?** Not in its current form. Too many missing critical features and workflow mismatches.

---

## Part-by-Part Analysis

### P2P1: Equipment Hierarchy & Versioning

#### What You Got Right ✓

1. **Version control for equipment specs** - Absolutely critical. We've lost contracts because of spec drift.
2. **Lifecycle stages** - PLANNED → AS_BUILT progression matches our reality
3. **Multi-discipline ownership** - Essential. Piping owns the pump, but electrical owns the motor on that same pump.
4. **Approval tracking on revisions** - ISO 9001 requirement, you nailed this

#### What's Missing or Wrong ✗

1. **WHERE IS THE PARENT EQUIPMENT REFERENCE?**
   - You have `systemId` and `subsystemId` as Strings, but no FK to Equipment table
   - This is a **SHOW STOPPER**. How do we query "all subsystems under System-042"?
   - Need: `parent Equipment? @relation("EquipmentHierarchy", fields: [systemId], references: [id])`
   - Without this, your hierarchy is just strings in the void

2. **Tag Number vs Name Confusion**
   - In heavy industry, we use **TAG NUMBERS** (e.g., "P-2104-A", "HV-331-01")
   - Tag numbers follow strict conventions: discipline prefix + area code + sequence
   - Your `name` field should be `tagNumber` with validation against naming masks
   - We need BOTH tagNumber (unique identifier) AND description (human readable)

3. **Level as Int is Fragile**
   - What if we need sub-components? Level 5, 6, 7?
   - Better: Make it an ENUM or remove it entirely (derive from parent chain)
   - Or allow configurable depth per company (you mention this in config, but schema doesn't support it)

4. **Missing Critical Fields:**
   ```prisma
   // YOU NEED THESE:
   tagNumber          String    // P-2104-A, not just "Pump"
   description        String    // "Cooling Water Circulation Pump"
   location           String?   // "E-Deck, Frame 42, Port Side"
   drawing            String?   // Reference drawing number
   criticalityLevel   String?   // SAFETY_CRITICAL, PRODUCTION_CRITICAL, STANDARD
   maintenanceType    String?   // PLANNED_MAINTENANCE, CONDITION_BASED, RUN_TO_FAILURE
   ```

5. **EquipmentLifecycleStage is Missing Timestamps**
   - You have `completedAt` but no `startedAt`
   - We need to track: When did INSTALLED stage START vs when it COMPLETED?
   - This affects project scheduling, crew allocation, inspection scheduling

6. **No Support for Equipment Classes/Templates**
   - When we order 47 identical valves, we don't want to copy-paste specs 47 times
   - Need: EquipmentClass model with default specs, then Equipment instances reference it
   - Think: Class = "Butterfly Valve DN200 PN16", Instance = "HV-205-12"

7. **Revision `reason` is Optional?**
   - In shipbuilding, **you cannot create a revision without a change reason**
   - Classification societies (DNV, ABS, Lloyd's) REQUIRE this for hull equipment
   - Make it MANDATORY or we fail audits

8. **No Support for Serial Numbers**
   - When equipment arrives (RECEIVED stage), we need to capture serial numbers
   - Critical for warranty claims, maintenance history, spare parts ordering
   - Add: `serialNumber String?` to Equipment or to the RECEIVED lifecycle stage data

#### Missing Business Logic

You mention these functions but don't specify behavior:

1. **validateStageTransition()** - What are the rules?
   - Can you skip from SPECIFIED → COMMISSIONED? (Answer: No)
   - Can you go backwards? (Answer: Yes, but requires approval + audit log)
   - Who can force-advance stages? (COMPANY_OWNER only? Or MANAGE_EQUIPMENT?)

2. **Auto-supersede rules** - Company configuration
   - What triggers auto-supersede? New revision approval? Manual action?
   - Do we notify equipment owners when their equipment is superseded?
   - Can we REJECT a revision and keep current as CURRENT?

#### Database Performance Concerns

- **No index on `[companyId, level]`** - You mention this but don't show it in schema
- **No index on `[systemId]` or `[subsystemId]`** - Querying hierarchy will be SLOW
- **Equipment table will get HUGE** - 10,000+ equipment items per project is normal
  - Consider partitioning by projectId
  - Consider archiving old projects to separate table

#### Scoring: 6/10
Good bones, but critical missing fields and broken parent relationships.

---

### P2P2: Equipment-Drawing Mapping

#### What You Got Right ✓

1. **Impact type classification** - DIRECT vs INDIRECT is smart
2. **Criticality levels** - Helps us prioritize reviews
3. **Discipline tracking per mapping** - One pump appears on Piping, Electrical, and Instrumentation drawings
4. **Bulk import via CSV** - Absolutely essential, we have 10,000+ mappings per ship

#### What's Missing or Wrong ✗

1. **`drawingId` is String, Not FK**
   - Should be: `drawingId String` with FK to DocumentRevision table
   - Or do you mean Document ID? Then it's FK to Document table
   - **CRITICAL AMBIGUITY**: Does drawingId point to a specific revision or the document record?
   - Our answer: **It should point to DocumentRevision**, because a mapping to "Drawing Rev A" becomes invalid when we issue "Drawing Rev B"

2. **Missing Reverse Mapping Query**
   - You show GET equipment → mappings, but not GET drawing → equipment
   - We need: "Which equipment will be impacted if I change Drawing P&ID-042 Sheet 3?"
   - Add endpoint: `GET /api/drawings/[id]/equipment`

3. **No Support for Sheet Numbers**
   - Large drawings have multiple sheets (Sheet 1 of 8, Sheet 2 of 8)
   - Equipment might only appear on Sheet 3
   - Add: `sheetNumber Int?` to mapping table
   - Add: `zoneOrArea String?` for "Equipment appears in Zone C-4 of this drawing"

4. **Validation Logic is Too Simple**
   - `checkMissingMappings()` - Missing from whose perspective?
     - Some equipment (e.g., small fittings) don't appear on drawings
     - Need: Company configuration for which equipment levels REQUIRE mappings
   - `checkOrphanedDrawings()` - Not all drawings have equipment
     - General arrangement drawings, detail drawings, welding procedures
     - Don't flag these as orphans, it's noise

5. **No Change Impact Workflow**
   - If Drawing Rev B supersedes Rev A, do we:
     - Automatically update all mappings to point to Rev B?
     - Keep mappings to Rev A and flag them as outdated?
     - Notify equipment owners that a related drawing changed?
   - **This is the CORE VALUE of your product**, and you don't specify the behavior

6. **Criticality is Static**
   - In reality, criticality changes based on project phase
   - CRITICAL during construction, STANDARD during operations
   - Need: `criticalityOverrides Json?` with phase-specific values

#### Missing API Endpoints

- `POST /api/drawings/[id]/equipment/bulk` - Bulk map equipment to one drawing
- `GET /api/drawings/[drawingId]/related-drawings` - Drawings that share equipment
- `POST /api/equipment/[id]/impact-analysis` - Generate impact report when equipment spec changes

#### Scoring: 5/10
The idea is right, but implementation is half-baked. Missing the "so what" logic.

---

### P2P3: Project Templates

#### What You Got Right ✓

1. **Versioning templates** - v1.0, v1.1, v2.0 is good
2. **Safety-critical flag** - Classification society requirement
3. **Tracking which projects used which template** - Essential for regulatory updates
4. **Template update types** - SAFETY_CRITICAL vs COSMETIC distinction is important

#### What's Missing or Wrong ✗

1. **JSON Blobs are a COP-OUT**
   ```prisma
   equipmentHierarchy Json   // Complete equipment structure
   equipmentDefinitions Json // Default vendors/models
   drawingRequirements Json  // Required drawings per discipline
   equipmentMappings   Json  // Default mappings
   ```

   **This is lazy schema design.** You're punting all the hard work to application code.

   - No database-level validation
   - No ability to query "which templates include equipment X"
   - No referential integrity
   - No indexing for performance

   **Better approach:**
   - Create TemplateEquipment, TemplateDrawing, TemplateMapping tables
   - Use proper FKs and relations
   - Yes, it's more tables, but it's CORRECT

2. **No Template Inheritance**
   - We have: Base Template → Project Type Template → Vessel Class Template → Specific Project
   - Example: "Offshore Vessel" → "Platform Supply Vessel" → "PSV 4500 DWT" → "Vessel Hull 8234"
   - Your schema only supports ONE level of templates
   - Need: `parentTemplateId String?` for template inheritance

3. **"appliedToProjects Json?" is WRONG**
   - This should be a separate `ProjectTemplate` join table
   - Schema: `model ProjectTemplateApplication { projectId, templateId, appliedAt, appliedBy }`
   - Otherwise you can't query "which projects need a safety update"

4. **Missing Required Fields:**
   ```prisma
   projectType        String    // NEWBUILD, CONVERSION, REPAIR, OFFSHORE
   industryType       String    // SHIPBUILDING, OIL_GAS, CONSTRUCTION
   classificationReq  String[]  // DNV, ABS, BV, LR requirements
   regulatoryRegime   String[]  // IMO, SOLAS, FLAG_STATE requirements
   estimatedDuration  Int?      // months
   estimatedEquipmentCount Int?
   ```

5. **Template Update Impact Analysis is Underspecified**
   - `calculateTemplateImpact()` - What does this return?
   - Do we just list affected projects, or do we:
     - Show which equipment items need updates?
     - Generate a change order for each project?
     - Calculate cost impact of applying the update?
     - Flag projects that are too far along to apply the update?

6. **No Template Approval Workflow**
   - Who can create templates? Anyone with MANAGE_TEMPLATES?
   - Who approves templates before they can be used? QA Manager? Engineering Manager?
   - Templates should have status: DRAFT, APPROVED, DEPRECATED
   - Add: `status String`, `approvedBy String?`, `approvedAt DateTime?`

7. **Tracking Template Drift is Passive**
   - You mention `trackTemplateDrift()` but don't say what triggers it
   - We need: Real-time alerts when a project deviates from template
   - We need: Dashboard showing % compliance with template per project
   - We need: Ability to "lock" certain template aspects (safety-critical equipment cannot be removed)

#### Dangerous Assumptions

> "Apply template update to existing project"

**NO. ABSOLUTELY NOT. This is INSANELY DANGEROUS.**

You cannot auto-apply changes to in-progress construction projects. Here's why:

1. Equipment may already be ordered (cancellation penalties)
2. Drawings may already be issued to client (contractual commitment)
3. Steel may already be cut (physical point of no return)
4. Workers may be installing based on old specs (safety risk if specs change mid-work)

**Reality check:** Template updates should generate **CHANGE PROPOSALS**, not direct modifications.

Flow should be:
1. Template updated → Notify project managers
2. Project manager reviews impact
3. Project manager creates Change Request
4. Change Request approved by client + classification society
5. THEN apply changes to project

Your current design would let someone push a template change and accidentally modify 15 active construction projects. **People could die.**

#### Scoring: 4/10
Conceptually sound, but execution is dangerous and schema is too generic (JSON blobs).

---

### P2P4: Vendor Company Management

#### What You Got Right ✓

1. **Separate VendorCompany from Company** - Correct data model
2. **Multi-contact per vendor** - Realistic
3. **Capabilities tagging** - Helps with vendor selection
4. **Assignment to specific equipment** - Good granularity
5. **Time-limited access with expiresAt** - Security best practice

#### What's Missing or Wrong ✗

1. **GDPR and Data Sovereignty Nightmare**

   You're storing vendor contact data in YOUR database:
   ```prisma
   model VendorContact {
     email String @unique  // ← PROBLEM
     phone String?
   }
   ```

   **Issues:**
   - Email is @unique GLOBALLY? What if two shipyards use your product and both work with the same vendor contact?
   - Are you the data controller for vendor contact PII? Better check with your lawyers.
   - What happens when vendor employee leaves? Who updates their email?
   - What about GDPR right-to-deletion for vendor contacts?

   **Better approach:**
   - Vendor contacts should live in VENDOR'S system, not yours
   - You should only store: `vendorCompanyId` + `externalContactId` + `role`
   - Fetch contact details via API when needed (with caching)
   - Or: Make email unique per `[vendorCompanyId, email]`, not globally

2. **No Vendor Approval/Prequalification Workflow**

   In heavy industry, you don't just "create" a vendor. Process is:
   1. Procurement requests new vendor
   2. QA Manager reviews vendor certifications
   3. Engineering reviews vendor technical capabilities
   4. Legal reviews contracts and insurance
   5. Vendor status changes: PENDING_REVIEW → PREQUALIFIED → APPROVED

   Your schema only has: ACTIVE, INACTIVE, PENDING

   Need:
   ```prisma
   status String // PENDING_REVIEW, PREQUALIFIED, APPROVED, SUSPENDED, BLACKLISTED
   prequalificationExpiresAt DateTime?
   certifications Json? // ISO9001, ISO14001, OHSAS18001, etc.
   insuranceExpiresAt DateTime?
   ```

3. **equipmentIds String[]** - This is a FK Violation Waiting to Happen

   ```prisma
   model VendorProjectAssignment {
     equipmentIds String[] // Which equipment they supply
   }
   ```

   - No referential integrity
   - No cascade delete if equipment is removed
   - No ability to query "which vendors supply this equipment"

   **Correct schema:**
   ```prisma
   model VendorEquipmentAssignment {
     id              String @id @default(cuid())
     vendorCompanyId String
     equipmentId     String
     role            String // MANUFACTURER, INSTALLER, MAINTAINER

     vendorCompany   VendorCompany @relation(...)
     equipment       Equipment @relation(...)

     @@unique([vendorCompanyId, equipmentId])
   }
   ```

4. **Access Level is Too Coarse**

   ```prisma
   accessLevel String // FULL, LIMITED, READ_ONLY
   ```

   What does LIMITED mean? Limited to what?

   In reality, vendor access needs to be:
   - Specific to equipment (see only equipment they supply)
   - Specific to document types (see drawings, but not commercial docs)
   - Specific to project phase (access expires after commissioning)
   - Specific to actions (upload drawings YES, approve drawings NO)

   **Better:** Use Permission-based system like you do for internal users
   - Define: VendorPermission enum
   - Assign: VendorProjectAssignment has `permissions String[]`

5. **No Vendor Performance Tracking**

   We need to track:
   - How many change orders per vendor (measure of spec compliance)
   - Average document turnaround time (days from request to delivery)
   - Number of RFIs (requests for information - measure of drawing quality)
   - Defect rate during commissioning

   This data drives vendor selection for next project.

   Need: VendorPerformanceMetric model

6. **Missing Vendor Document Approval Chain**

   Vendor submits drawing → Our engineer reviews → Feedback sent → Vendor revises → Engineer approves

   Where is this workflow in your schema? You mention it in P2P5/P2P6, but vendor assignment doesn't connect to review system.

7. **Privacy Preview is Backwards**

   > vendor-privacy-preview.tsx - Show what vendor actually sees

   This is a DEVELOPER TOOL, not a production feature. Why would we show this to shipyard staff?

   What we actually need:
   - Vendor-facing portal (separate subdomain: vendor.docuroute.com)
   - Vendor logs in with their own auth (not our company auth)
   - Vendor sees ONLY their assigned projects and equipment
   - Vendor uploads docs directly to their assigned equipment

   Your current design seems to assume vendors log into OUR dashboard. That's wrong.

#### Dangerous Security Implications

> getVisibleProjectsForVendor() - Returns ONLY projects they're assigned to

**How are you authenticating vendors?**

- Do vendors have User accounts in your system?
- If yes, what prevents a vendor user from seeing another vendor's data?
- If no, how do they upload documents? Magic links? API keys?

**You need:**
- VendorUser model (separate from User)
- VendorUser belongs to VendorCompany
- VendorUser has vendorCompanyId in JWT token
- Middleware enforces: VendorUser can only access projects where their VendorCompany is assigned

This is not specified in your schema.

#### Scoring: 5/10
Good attempt, but lacks real-world vendor management complexity and has security gaps.

---

### P2P5: Vendor Drawing Workflow

#### What You Got Right ✓

1. **Submission intent classification** - IFR, IFA, IFC is correct terminology
2. **Parent drawing tracking** - Essential for revision chains
3. **Vendor-specific upload endpoint** - Good isolation

#### What's Missing or Wrong ✗

1. **Adding Fields to Existing Document Model is WRONG**

   ```prisma
   model Document {
     vendorCompanyId  String?  // Which vendor uploaded this
     vendorContactId  String?  // Which contact
     submissionIntent String?  // FOR_REVIEW, FOR_APPROVAL, FOR_CONSTRUCTION
     parentDrawingId  String?  // If this is a revision
   }
   ```

   You're mixing INTERNAL documents and VENDOR documents in the same table.

   **Problems:**
   - Internal documents don't need submissionIntent
   - Vendor documents have different lifecycle (review/approval)
   - Security: easier to leak vendor docs to wrong people if they're in same table

   **Better: Create VendorDocument model**
   ```prisma
   model VendorDocument {
     id               String @id
     vendorCompanyId  String
     equipmentId      String
     submissionIntent String
     internalDocumentId String? // FK to Document (after approval)
     reviewStatus     String  // PENDING_REVIEW, APPROVED, REJECTED, REVISION_REQUIRED
   }
   ```

   When vendor doc is approved, you create a Document record and link it.

2. **SubmissionIntent is Missing States**

   Your enum:
   ```typescript
   FOR_REVIEW     // IFR
   FOR_APPROVAL   // IFA
   FOR_CONSTRUCTION // IFC
   INFO_ONLY
   ```

   Missing:
   - **FOR_TENDER (IFT)** - Drawings issued during bidding phase
   - **AS_BUILT (AB/RFI)** - Final as-built documentation
   - **FOR_CONSTRUCTION_HOLD** - Issued but not yet released to site

   Also missing: Who decides when IFR becomes IFA? Who decides when IFA becomes IFC?
   - These are APPROVAL ACTIONS, not vendor-selectable options

3. **Auto-Supersede is DANGEROUS**

   > autoSupersede() - Move old revision to SUPERSEDED

   **NO.**

   Scenario: Vendor uploads Drawing Rev B while site is building from Rev A.
   If you auto-supersede Rev A, workers on site lose access to the drawing they're following.

   **Correct flow:**
   1. Vendor uploads Rev B
   2. Rev B enters REVIEW status
   3. Engineer approves Rev B
   4. Document Controller manually supersedes Rev A (with notification)
   5. Site is notified of change
   6. Site confirms they've updated their print sets
   7. THEN Rev A is superseded

   Auto-supersede on upload is reckless.

4. **Missing Drawing Revision Comparison**

   When vendor uploads Rev B, engineers need to see:
   - What changed between Rev A and Rev B?
   - Side-by-side PDF comparison
   - Markup highlighting differences
   - Vendor's list of changes (required in transmittal)

   Your schema doesn't capture this.

   Need:
   ```prisma
   model VendorSubmissionChange {
     submissionId String
     changeDescription String
     affectedSheets Int[]
     category String // DIMENSION, MATERIAL, LAYOUT, CORRECTION
   }
   ```

5. **No Email Notification to Reviewers**

   > processVendorUpload() - Handle file, create document, notify reviewers

   Who are the reviewers? How are they notified?
   - Equipment ownership table (P2P1) shows PRIMARY/SECONDARY owners
   - But vendor drawing might need review by multiple disciplines
   - Need: VendorDocumentReviewer table with assignment logic

6. **Vendor Cannot See Review Status**

   Vendors need a dashboard showing:
   - Documents submitted: count
   - Pending review: count + days waiting
   - Approved: count
   - Revision required: count + list of comments
   - Average turnaround time

   Your API only has: GET vendor's drawings, GET comments
   No aggregation endpoints for vendor dashboard.

#### Scoring: 4/10
Conceptually aligned with industry, but implementation details are dangerously oversimplified.

---

### P2P6: Multi-Discipline Review System

#### What You Got Right ✓

1. **Multi-discipline tracking** - Critical for shipyard workflow
2. **Threaded comments** - Must-have for complex reviews
3. **Comment status tracking** - OPEN → CLOSED lifecycle
4. **Attachments on comments** - Screenshots, markup PDFs

#### What's Missing or Wrong ✗

1. **Review Model Lacks Clear States**

   ```prisma
   status String // PENDING, IN_PROGRESS, APPROVED, REJECTED, CHANGES_REQUESTED
   ```

   Confusion:
   - If status is APPROVED, why are there still incomplete disciplines?
   - If status is CHANGES_REQUESTED, can some disciplines still be reviewing?

   **Better: Separate review status from discipline completion**
   ```prisma
   model Review {
     overallStatus String // AWAITING_ALL_DISCIPLINES, PARTIAL_APPROVAL, FULL_APPROVAL, REJECTED
     requiredDisciplines String[]
     disciplineStatuses Json // { PIPING: "APPROVED", ELECTRICAL: "PENDING", ... }
   }
   ```

2. **Missing Review Stages**

   Real workflow:
   1. Vendor submits drawing (IFR)
   2. **Internal technical review** (our engineers check basics)
   3. **Multi-discipline review** (all affected disciplines comment)
   4. **Consolidation review** (lead engineer collects feedback)
   5. **Client review** (if required by contract)
   6. **Final approval** (document controller issues)

   Your schema only supports ONE review per document. We need multiple review rounds.

   Need:
   ```prisma
   reviewRound Int // 1st review, 2nd review after vendor resubmission
   reviewType String // INTERNAL, CLIENT, VENDOR, FINAL
   ```

3. **ReviewApproval is Per-Discipline, But Should Be Per-User**

   ```prisma
   model ReviewApproval {
     discipline String
     userId     String
     decision   String
   }
   ```

   Problem: What if we have 3 piping engineers and all need to review?

   Current schema: Only one approval per discipline

   **Should be:** Multiple approvals per discipline, aggregated into discipline decision

   ```prisma
   model DisciplineReviewApproval {
     reviewId   String
     discipline String
     userId     String
     decision   String
     @@unique([reviewId, discipline, userId])
   }

   // Then: Review has disciplineStatus Json with rollup of individual approvals
   ```

4. **No Support for Review Checklists**

   When we review a P&ID, we check:
   - Equipment tag numbers match MDR
   - Valves sized correctly per process spec
   - Instrument connections shown
   - Safety valves present
   - Compliance with client spec XYZ-123

   This is a CHECKLIST (20-40 items). Each item has Pass/Fail/NA.

   Your schema: Only free-text comments

   Need: ReviewChecklist model with templated items per discipline

5. **Comment Resolution Authority is Unclear**

   > PATCH /api/comments/[id]/resolve - Resolve comment

   Who can resolve comments?
   - Only the person who opened it?
   - Anyone in that discipline?
   - Only the lead engineer?
   - The vendor (after they fix it)?

   Need: `resolvedBy String` (userId) and validation logic

6. **Missing Re-opening of Comments**

   Engineer: "Fix valve size to DN150" (CLOSED)
   Vendor submits revision
   Engineer: "You made it DN100, I said DN150" (REOPEN)

   Your schema has REOPENED status, but no workflow for it.
   - What triggers reopen?
   - Who can reopen?
   - Does reopening a comment change the Review status back to IN_PROGRESS?

7. **No Review Time Tracking**

   We track:
   - Time from vendor submission to first review: Target <3 days
   - Time spent in each discipline: Piping took 5 days, Electrical took 2 days
   - Total review cycle time: Target <10 days

   KPIs for management dashboards.

   Need:
   ```prisma
   model Review {
     assignedAt DateTime?
     firstReviewAt DateTime?
     completedAt DateTime?
   }

   model ReviewApproval {
     assignedAt DateTime
     decidedAt DateTime
   }
   ```

8. **UI Component is Too Basic**

   > review-interface.tsx - PDF viewer with markup tools

   Missing:
   - Multi-sheet navigation (Drawing has 8 sheets, jump to Sheet 5)
   - Zoom to specific zone (Grid reference C-4)
   - Measure tool (check dimensions on drawing)
   - Comment pins on specific XY coordinates
   - Version comparison mode (show Rev A vs Rev B side-by-side)
   - Checklist panel (tick off review items)

   "PDF viewer with markup" is 2010 technology. We need CAD-level tools.

#### Critical Missing Feature: Conditional Approval

Sometimes we approve a drawing **WITH CONDITIONS**:

"Approved for Construction, subject to vendor confirming valve material is 316SS per client spec."

This is neither APPROVED nor REJECTED. It's **APPROVED_WITH_CONDITIONS**.

Need:
```prisma
decision String // APPROVED, APPROVED_WITH_CONDITIONS, CHANGES_REQUIRED, REJECTED
conditions String? // Only for APPROVED_WITH_CONDITIONS
```

#### Scoring: 6/10
Good structure, but missing real-world complexity and review workflow stages.

---

### P2P7: Transmittal System

#### What You Got Right ✓

1. **Formal transmittal numbering** - Auto-incrementing per year is correct
2. **Purpose classification** - FOR_INFO, FOR_REVIEW, etc. matches industry
3. **Acknowledgment tracking** - Essential for legal/contractual proof
4. **Audit trail** - TransmittalAudit model is good
5. **Cover letter support** - Required by most contracts

#### What's Missing or Wrong ✗

1. **recipients Json and documents Json** - Another JSON Cop-Out

   ```prisma
   recipients Json // List of { type, id, email, name }
   documents  Json // List of { documentId, revisionId }
   ```

   **Problems:**
   - No referential integrity
   - Can't query "which transmittals include Document X"
   - Can't query "which transmittals were sent to Vendor Y"
   - Can't enforce business rules (e.g., "can't send VOID documents")

   **Correct schema:**
   ```prisma
   model TransmittalRecipient {
     transmittalId String
     recipientType String // VENDOR, CLIENT, INTERNAL, CLASSIFICATION_SOCIETY
     recipientId   String
     email         String
     acknowledgedAt DateTime?
   }

   model TransmittalDocument {
     transmittalId String
     documentId    String
     revisionCode  String
     purpose       String // Why this doc is in this transmittal
   }
   ```

2. **acknowledgedAt Json? and downloadedAt Json?** - Even Worse

   ```prisma
   acknowledgedAt Json? // Map of recipientId → timestamp
   downloadedAt   Json? // Map of recipientId → timestamp
   ```

   This is denormalized garbage. Use TransmittalRecipient table (above) instead.

3. **Missing Transmittal Response/Return Flow**

   We send transmittal to client → Client reviews → Client returns with comments

   Return options:
   - APPROVED_NO_COMMENT
   - APPROVED_AS_NOTED (see attached comments)
   - REVISE_AND_RESUBMIT
   - REJECTED

   Your schema has `RETURNED` status, but no structure for client's response.

   Need:
   ```prisma
   model TransmittalReturn {
     transmittalId String
     returnStatus  String // TransmittalReturnStatus enum
     returnDate    DateTime
     returnedBy    String
     comments      String?
     attachments   Json? // Client's marked-up PDFs
   }
   ```

4. **No Support for Transmittal Templates**

   We have standard transmittals:
   - Weekly progress transmittal to client
   - IFA submittal package to classification society
   - As-built package to owner at handover

   Each has:
   - Standard cover letter text
   - Standard recipient list
   - Standard document filters (e.g., "all approved drawings since last transmittal")

   Your schema: Manual transmittal creation every time

   Need: TransmittalTemplate model

5. **Missing Transmittal Workflow Approval**

   Before we ISSUE a transmittal, internal approval needed:
   1. Preparer creates transmittal (status: DRAFT)
   2. Document Controller reviews (checks for completeness)
   3. Engineering Manager approves (confirms technical accuracy)
   4. Status changes to ISSUED, email sent to recipients

   Your schema: DRAFT → ISSUED transition has no approval tracking

   Need:
   ```prisma
   model TransmittalApproval {
     transmittalId String
     approverRole  String // DOCUMENT_CONTROLLER, ENGINEERING_MANAGER
     approvedBy    String
     approvedAt    DateTime
   }
   ```

6. **Transmittal Numbering is Too Simple**

   ```prisma
   transmittalNo String // Auto-incrementing per year
   ```

   Real transmittal numbers:
   - Project code: `P2024-042`
   - Discipline: `PIP` (Piping)
   - Sequence: `0234`
   - Full number: `P2024-042-PIP-TR-0234`

   Your simple counter doesn't embed project or discipline context.

   Need: Configurable transmittal numbering mask (like document naming mask)

7. **No Batch Operations**

   Common tasks:
   - "Resend transmittal to recipients who haven't acknowledged"
   - "Generate reminder email for overdue acknowledgments"
   - "Bulk download all documents from 10 transmittals"

   Your API: Single transmittal operations only

8. **Missing Integration with External Systems**

   Transmittals often go to:
   - Client's document management system (auto-upload via API)
   - Classification society portal (DNV, ABS have APIs)
   - Email with tracked delivery receipts

   Your schema: No webhook or integration configuration

#### Critical Gap: Legal Significance

Transmittals are **LEGAL DOCUMENTS** in construction disputes.

If a contractor claims "we never received Drawing Rev B", and we have a transmittal showing:
- Transmittal TR-0234 issued 2024-03-15
- Included Drawing P&ID-042 Rev B
- Sent to contractor's email
- Downloaded 2024-03-16 09:23:15
- Acknowledged 2024-03-16 10:05:42

We can prove delivery. This has saved us from multi-million dollar claims.

**Your audit trail is good, but you need:**
- PDF export of transmittal cover sheet (with timestamp, recipient, document list)
- Hash of transmittal at time of issuance (proves we didn't alter it later)
- Email delivery receipts stored (integration with email service provider)

Need:
```prisma
model Transmittal {
  hash          String  // SHA-256 of transmittal contents at issuance
  pdfFileKey    String? // R2 key for transmittal cover sheet PDF
  emailReceipts Json?   // Raw email delivery receipts from Resend/SendGrid
}
```

#### Scoring: 6/10
Solid foundation, but JSON fields hurt data integrity and missing legal/workflow features.

---

## Cross-Cutting Concerns

### 1. Permission Model Gaps

You keep referencing permissions like `MANAGE_EQUIPMENT`, `REVIEW_DOCUMENTS`, but these aren't in your existing Permission enum (from Phase 1).

Need to add:
```typescript
enum Permission {
  // ... existing permissions ...

  // Phase 2 additions
  MANAGE_EQUIPMENT       = 'MANAGE_EQUIPMENT',
  VIEW_EQUIPMENT         = 'VIEW_EQUIPMENT',
  MANAGE_VENDORS         = 'MANAGE_VENDORS',
  REVIEW_DOCUMENTS       = 'REVIEW_DOCUMENTS',
  MANAGE_REVIEWS         = 'MANAGE_REVIEWS',
  MANAGE_TEMPLATES       = 'MANAGE_TEMPLATES',
  APPROVE_VENDOR_DOCS    = 'APPROVE_VENDOR_DOCS',
  VIEW_TRANSMITTALS      = 'VIEW_TRANSMITTALS', // Already exists
  MANAGE_TRANSMITTALS    = 'MANAGE_TRANSMITTALS',
}
```

### 2. Performance: No Discussion of Scale

- How many equipment items per project? (Answer: 10,000-50,000)
- How many drawings per project? (Answer: 5,000-20,000)
- How many mappings? (Answer: 50,000-200,000)
- How many review comments? (Answer: 10,000-50,000)

Your schema has NO pagination strategy, NO partitioning strategy, NO archival strategy.

**Reality check:**
- Equipment table: 500,000 rows across 50 projects
- Mapping table: 2,000,000 rows
- Comment table: 500,000 rows

PostgreSQL will handle this, but your queries need careful indexing.

**Missing indexes:**
- EquipmentDrawingMapping: `[drawingId]` (reverse lookup)
- Review: `[documentId, status]`
- Comment: `[reviewId, status]`
- ReviewApproval: `[userId, createdAt]` (engineer's review workload)

### 3. No Discussion of Data Migration

Phase 1 has Document model. Phase 2 adds:
- Equipment
- EquipmentDrawingMapping (links to Document)
- Review (links to Document)

**How do existing Phase 1 documents integrate?**
- Do we backfill equipment mappings for existing documents?
- Do we create retroactive reviews?
- Or do Phase 2 features only apply to new documents?

Need: Migration strategy document.

### 4. No Offline Support

Shipyard engineers work in:
- Dry docks (no WiFi)
- Offshore platforms (satellite internet)
- Client sites (restricted network)

Your UI components assume always-online.

**Need:**
- Progressive Web App with offline mode
- Local IndexedDB cache for drawings and equipment lists
- Sync queue for review comments when connection restored

This is in your Phase 0 docs, but Phase 2 features don't mention it.

### 5. No Discussion of File Storage Limits

Equipment attachments, vendor drawings, transmittal PDFs...

**Estimated storage per project:**
- 5,000 drawings × 20 MB/drawing = 100 GB
- 50 transmittals × 10 documents × 20 MB = 10 GB
- Equipment photos (INSTALLED stage) × 10,000 = 50 GB

**Total: 160 GB per project**

With 50 projects: **8 TB storage**

Your plan tiers (from Phase 1):
- PILOT: 1,500 GB

**We'll blow through the limit on 10 projects.**

Either:
1. Increase storage limits dramatically
2. Add per-project archival (old projects moved to cold storage)
3. Charge for overage

### 6. Mobile Experience Not Specified

Field workers use tablets (iPad, Samsung Galaxy Tab) to:
- Scan QR codes on drawings
- View equipment details
- Mark equipment as INSTALLED
- Take photos for lifecycle stage evidence

Your components: `equipment-tree.tsx`, `review-interface.tsx`

**Question:** Are these responsive? Touch-optimized? Work on 10" tablets?

Need: Mobile-first UI/UX design for field features.

### 7. Internationalization: Zero Mention

Shipyards are global:
- Korean shipbuilders (Hyundai, Samsung)
- Chinese shipyards (CSSC, CSIC)
- European yards (Fincantieri, Meyer Werft)

Your enums are English-only:
```typescript
enum EquipmentLifecycleStage {
  PLANNED = 'PLANNED',
  SPECIFIED = 'SPECIFIED',
  // ...
}
```

**Will you support:**
- Korean (한국어)
- Simplified Chinese (简体中文)
- Japanese (日本語)
- Spanish (Español)

If no: You're limiting market to English-speaking companies only.

If yes: You need i18n strategy NOW, not later.

---

## What's Completely Missing (Parts 8-13)

You said this is parts 1-8 of 13. What's in parts 9-13?

**Guessing based on gaps:**
- P2P8: Equipment maintenance scheduling
- P2P9: Document approval workflows (you mention but don't detail)
- P2P10: Reporting and dashboards
- P2P11: Integration with ERP systems (SAP, Oracle)
- P2P12: Mobile apps for field workers
- P2P13: Admin and configuration UI

**If you haven't designed these yet, here's what we NEED:**

### Critical Missing Features

1. **Change Order Management**
   - When specs change mid-project, we need formal change orders
   - Change orders affect: cost, schedule, equipment, drawings
   - Needs approval from: PM, client, classification society

2. **Inspection and Testing Records**
   - Equipment at COMMISSIONED stage requires inspection docs
   - Pressure tests, continuity tests, function tests
   - Test certificates stored as documents, linked to equipment

3. **Spare Parts Management**
   - Each equipment item has recommended spares list
   - Track spare parts inventory
   - Alert when critical spares are low

4. **Warranty Tracking**
   - Equipment has warranty period (start date = INSTALLED or COMMISSIONED)
   - Alert before warranty expires
   - Track warranty claims and resolutions

5. **As-Built Documentation Package**
   - At project completion, generate full as-built package
   - Includes: final drawings, equipment lists, test certificates, O&M manuals
   - Package delivered to owner as contractual deliverable

6. **RFI (Request for Information) Tracking**
   - When drawings are unclear, we send RFI to designer/client
   - Track: RFI number, question, response, impact on schedule
   - RFIs often result in drawing revisions

7. **Deviation Management**
   - Sometimes we deviate from approved drawings (field conditions)
   - Deviation request → Engineering review → Client approval → As-built update
   - Deviations are compliance-critical for classification societies

8. **Project Dashboards**
   - % equipment installed vs planned
   - % drawings approved vs submitted
   - Avg vendor document turnaround time
   - Open review comments by discipline

---

## Honest Assessment: Would We Buy This?

### What You'd Need to Fix for Us to Consider It

**Immediate (Must-Fix Before Pilot):**
1. Fix Equipment parent references (FK to Equipment, not strings)
2. Fix Equipment-Drawing mapping (FK to DocumentRevision)
3. Fix JSON blobs in templates (proper relational tables)
4. Fix vendor document flow (separate VendorDocument model)
5. Add missing equipment fields (tagNumber, description, serialNumber, criticality)
6. Add change impact workflow (don't auto-supersede)
7. Add proper vendor authentication and isolation

**Before Production Use:**
1. Add review stages and checklist support
2. Add transmittal response/return flow
3. Add template inheritance and approval workflow
4. Add performance indexes for scale (100k+ equipment items)
5. Add mobile-optimized UI for field workers
6. Add offline support for dry dock work
7. Add internationalization (at minimum: English, Chinese, Korean)

**Nice-to-Have (Can Add Later):**
1. Change order management
2. Inspection records
3. Spare parts tracking
4. Warranty management
5. RFI tracking
6. Deviation management
7. Executive dashboards

### Pricing Reality Check

Your Phase 1 pricing:
- PILOT: $1,000/month (15 users, 1.5 TB storage)

For Phase 2 (with equipment, vendor, review features):
- **We'd pay $3,000-5,000/month** for a shipyard with 50-100 users
- **Comparable products:** Aconex, Procore, BIM 360 = $5,000-15,000/month
- **Your product at $1,000/month would be a STEAL if it works**

But:
- With current gaps, we'd pay $0 (can't use it)
- With immediate fixes, we'd pilot at $1,500/month
- With production-ready features, we'd pay $4,000/month
- With nice-to-haves, we'd pay $6,000/month and replace Aconex

### Competitive Comparison

| Feature | DocuRoute (Proposed) | Aconex | Procore | Our Assessment |
|---------|---------------------|--------|---------|----------------|
| Equipment hierarchy | ✓ (with fixes) | ✓ | ✓ | You match competitors |
| Drawing-equipment mapping | ✓ (with fixes) | ✓ | ✓ | You match competitors |
| Multi-discipline review | ✓ (basic) | ✓✓ | ✓✓ | They have better checklists |
| Vendor portal | △ (needs work) | ✓✓ | ✓✓ | Yours is half-baked |
| Transmittals | ✓ (basic) | ✓✓ | ✓ | They have better tracking |
| Mobile field app | ✗ | ✓ | ✓ | Critical gap |
| Change orders | ✗ | ✓ | ✓ | Critical gap |
| RFI management | ✗ | ✓ | ✓ | Important gap |
| Project templates | ✓ (if fixed) | ✓ | △ | You could differentiate here |
| Pricing | $$$ | $$$$$ | $$$$ | You're 50-70% cheaper |

**Verdict:** With fixes, you're 80% as good as competitors at 30% of the price. That's a compelling value proposition.

---

## Final Recommendations

### Priority 1: Fix Data Model Integrity
- Remove JSON blobs, use proper FK relationships
- Fix Equipment parent references
- Fix vendor contact uniqueness constraints
- Add missing indexes for performance

### Priority 2: Simplify Dangerous Features
- Remove auto-supersede (make it manual with approval)
- Remove template auto-update to projects (make it proposal-based)
- Add proper vendor authentication and isolation

### Priority 3: Fill Critical Gaps
- Add equipment tagNumber and description fields
- Add review checklist support
- Add transmittal recipient/document tables
- Add vendor performance tracking

### Priority 4: Add Missing Workflows
- Equipment stage transition validation and approval
- Vendor document review and feedback loop
- Multi-round review support
- Transmittal approval before issuance

### Priority 5: Plan for Scale
- Add pagination to all list endpoints
- Add bulk operations for common tasks
- Add project archival strategy
- Document expected data volumes

---

## Conclusion

**Overall Score: 6/10**

You have the right concepts and understand the industry domain. The database schema has good bones. But the execution has critical gaps that would prevent us from using it in production:

1. **Data integrity issues** (JSON blobs, missing FKs)
2. **Dangerous automation** (auto-supersede, template auto-update)
3. **Missing real-world complexity** (multi-stage reviews, vendor auth, change impact)
4. **Scale not addressed** (100k+ records, indexing, archival)

**Our advice:**
- Get Parts 1-8 to 8/10 quality before releasing Parts 9-13
- Hire a shipyard document controller as an advisor (we can introduce you)
- Do a pilot with a small repair yard (not a newbuild shipyard) to test the workflow
- Don't oversell capabilities you haven't built yet

**Would we pilot this?** Yes, if you fix the immediate issues above.

**Would we replace our current system with this?** Not yet, but you're on the right track.

---

**Signed:**
Senior Engineering Team
[Shipyard Name Withheld]
Heavy Construction Industry
March 20, 2026
