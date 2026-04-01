/**
 * AUTHORIZATION MODEL: Hybrid PBAC + System Roles
 *
 * All permission checks use the Permission enum — never role name strings.
 *
 * How resolution works:
 *   1. User has a roleId (FK to Role table)
 *   2. Role has either:
 *      a. systemRoleKey: keyof typeof SYSTEM_ROLE_PERMISSIONS — immutable system role
 *      b. permissions: Permission[] — custom role defined by the company
 *   3. requirePermission() resolves the user's effective permissions and checks
 *
 * Why system roles exist alongside custom roles:
 *   ISO 9001 and classification society (DNV, ABS, BV) audits require named,
 *   accountable roles in the quality management system. "Section 4 Foreman with
 *   APPROVE_WORKFLOW permission" does not satisfy an ISO audit.
 *   "Document Controller approved revision B" does.
 *   System roles provide compliance traceability.
 *   Custom roles provide organisational flexibility.
 *   Both are mandatory.
 */

// ─── Permission enum (Pillar 1 — the atomic actions) ─────────────────────────

export enum Permission {
  // Document operations
  UPLOAD_DOCUMENT        = 'UPLOAD_DOCUMENT',
  VIEW_DOCUMENT          = 'VIEW_DOCUMENT',
  DOWNLOAD_DOCUMENT      = 'DOWNLOAD_DOCUMENT',
  DELETE_DOCUMENT        = 'DELETE_DOCUMENT',
  ARCHIVE_DOCUMENT       = 'ARCHIVE_DOCUMENT',
  HARD_PURGE_DOCUMENT    = 'HARD_PURGE_DOCUMENT',

  // Metadata and naming
  EDIT_DOCUMENT_METADATA = 'EDIT_DOCUMENT_METADATA',
  VALIDATE_NAMING_MASK   = 'VALIDATE_NAMING_MASK',
  CONFIGURE_NAMING_MASK  = 'CONFIGURE_NAMING_MASK',

  // MDR and bulk operations
  IMPORT_MDR             = 'IMPORT_MDR',
  BULK_OPERATION         = 'BULK_OPERATION',
  UNDO_BULK_OPERATION    = 'UNDO_BULK_OPERATION',

  // Workflow
  START_WORKFLOW         = 'START_WORKFLOW',
  APPROVE_WORKFLOW       = 'APPROVE_WORKFLOW',
  REJECT_WORKFLOW        = 'REJECT_WORKFLOW',
  FORCE_UNLOCK_WORKFLOW  = 'FORCE_UNLOCK_WORKFLOW',
  MANAGE_WORKFLOW_TEMPLATES = 'MANAGE_WORKFLOW_TEMPLATES',

  // Transmittals
  CREATE_TRANSMITTAL     = 'CREATE_TRANSMITTAL',
  SEND_TRANSMITTAL       = 'SEND_TRANSMITTAL',
  VIEW_TRANSMITTAL       = 'VIEW_TRANSMITTAL',

  // Users and roles
  INVITE_USERS           = 'INVITE_USERS',
  MANAGE_USERS           = 'MANAGE_USERS',
  DEACTIVATE_USERS       = 'DEACTIVATE_USERS',
  MANAGE_CUSTOM_ROLES    = 'MANAGE_CUSTOM_ROLES',

  // Legal and compliance
  PLACE_LEGAL_HOLD       = 'PLACE_LEGAL_HOLD',
  LIFT_LEGAL_HOLD        = 'LIFT_LEGAL_HOLD',
  BYPASS_LEGAL_HOLD      = 'BYPASS_LEGAL_HOLD',    // COMPANY_OWNER only
  CONFIGURE_RETENTION    = 'CONFIGURE_RETENTION',
  VIEW_AUDIT_LOG         = 'VIEW_AUDIT_LOG',
  EXPORT_AUDIT_VAULT     = 'EXPORT_AUDIT_VAULT',
  MANAGE_LEGAL_HOLDS     = 'MANAGE_LEGAL_HOLDS',

  // Security and identity
  CONFIGURE_SSO          = 'CONFIGURE_SSO',
  MANAGE_SCIM            = 'MANAGE_SCIM',
  CREATE_API_KEY         = 'CREATE_API_KEY',
  REVOKE_API_KEY         = 'REVOKE_API_KEY',
  MANAGE_SERVICE_ACCOUNTS = 'MANAGE_SERVICE_ACCOUNTS',

  // Billing and ownership
  MANAGE_BILLING         = 'MANAGE_BILLING',
  TRANSFER_OWNERSHIP     = 'TRANSFER_OWNERSHIP',
  CONFIGURE_SUCCESSION   = 'CONFIGURE_SUCCESSION',

  // Platform (PLATFORM_ADMIN only — never assignable to custom roles)
  PLATFORM_ADMIN_ACCESS  = 'PLATFORM_ADMIN_ACCESS',
  EMERGENCY_TRANSFER     = 'EMERGENCY_TRANSFER',
}

// ─── System role permission sets ─────────────────────────────────────────────

/**
 * SYSTEM_ROLE_PERMISSIONS defines the immutable permission sets for system roles.
 * These cannot be changed by any company owner or admin.
 * They are the compliance-traceable roles required for ISO 9001 quality systems.
 *
 * PERFORMANCE: COMPANY_OWNER permissions are pre-computed at module load time
 * instead of being filtered on every permission resolution call.
 */

// Platform-only permissions that COMPANY_OWNER should NOT have
const PLATFORM_ONLY_PERMISSIONS = [
  Permission.PLATFORM_ADMIN_ACCESS,
  Permission.EMERGENCY_TRANSFER,
]

// Pre-compute COMPANY_OWNER permissions (all except platform-only)
// PERFORMANCE: This runs once when module loads, not on every permission check
const ALL_PERMISSIONS = Object.values(Permission)
const COMPANY_OWNER_PERMISSIONS = ALL_PERMISSIONS.filter(
  p => !PLATFORM_ONLY_PERMISSIONS.includes(p)
)

export const SYSTEM_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  PLATFORM_ADMIN: [
    Permission.PLATFORM_ADMIN_ACCESS,
    Permission.EMERGENCY_TRANSFER,
    Permission.VIEW_AUDIT_LOG,
    Permission.EXPORT_AUDIT_VAULT,
  ],
  COMPANY_OWNER: COMPANY_OWNER_PERMISSIONS, // Pre-computed constant
  COMPANY_ADMIN: [
    Permission.INVITE_USERS, Permission.MANAGE_USERS, Permission.DEACTIVATE_USERS,
    Permission.MANAGE_CUSTOM_ROLES,
    Permission.UPLOAD_DOCUMENT, Permission.VIEW_DOCUMENT, Permission.DOWNLOAD_DOCUMENT,
    Permission.DELETE_DOCUMENT, Permission.ARCHIVE_DOCUMENT,
    Permission.EDIT_DOCUMENT_METADATA, Permission.BULK_OPERATION,
    Permission.UNDO_BULK_OPERATION, Permission.IMPORT_MDR,
    Permission.START_WORKFLOW, Permission.APPROVE_WORKFLOW, Permission.REJECT_WORKFLOW,
    Permission.FORCE_UNLOCK_WORKFLOW, Permission.MANAGE_WORKFLOW_TEMPLATES,
    Permission.CREATE_TRANSMITTAL, Permission.SEND_TRANSMITTAL, Permission.VIEW_TRANSMITTAL,
    Permission.VIEW_AUDIT_LOG, Permission.MANAGE_BILLING,
    Permission.CONFIGURE_NAMING_MASK,
  ],
  DOCUMENT_CONTROLLER: [
    Permission.UPLOAD_DOCUMENT, Permission.VIEW_DOCUMENT, Permission.DOWNLOAD_DOCUMENT,
    Permission.DELETE_DOCUMENT, Permission.ARCHIVE_DOCUMENT, Permission.UNDO_BULK_OPERATION,
    Permission.EDIT_DOCUMENT_METADATA, Permission.VALIDATE_NAMING_MASK,
    Permission.BULK_OPERATION, Permission.IMPORT_MDR,
    Permission.START_WORKFLOW, Permission.FORCE_UNLOCK_WORKFLOW,
    Permission.CREATE_TRANSMITTAL, Permission.SEND_TRANSMITTAL, Permission.VIEW_TRANSMITTAL,
    Permission.PLACE_LEGAL_HOLD,
  ],
  AUDITOR: [
    Permission.VIEW_AUDIT_LOG, Permission.EXPORT_AUDIT_VAULT,
    Permission.VIEW_DOCUMENT, Permission.VIEW_TRANSMITTAL,
    // DOWNLOAD_DOCUMENT for AUDITOR is conditional: enabled per-project by SECURITY_ADMIN
    // This is enforced in the view endpoint, not in this permission set
  ],
  BILLING_CONTACT: [
    Permission.MANAGE_BILLING, Permission.VIEW_DOCUMENT,
  ],
}

/**
 * System role keys — these are the only roles that cannot be deleted or renamed.
 * They are stored as Role records in the DB with isSystemRole: true.
 */
export const SYSTEM_ROLE_KEYS = [
  'PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_ADMIN',
  'DOCUMENT_CONTROLLER', 'AUDITOR', 'BILLING_CONTACT',
] as const
export type SystemRoleKey = typeof SYSTEM_ROLE_KEYS[number]

// ─── Industry enums ───────────────────────────────────────────────────────────

export enum EngineeringDiscipline {
  PIPING          = 'PIPING',
  STRUCTURAL      = 'STRUCTURAL',
  ELECTRICAL      = 'ELECTRICAL',
  HVAC            = 'HVAC',
  MECHANICAL      = 'MECHANICAL',
  INSTRUMENTATION = 'INSTRUMENTATION',
  CIVIL           = 'CIVIL',
  ARCHITECTURAL   = 'ARCHITECTURAL',
  PROCESS         = 'PROCESS',
  SAFETY          = 'SAFETY',
  MARINE          = 'MARINE',
  GENERAL         = 'GENERAL',
}

export enum IssuePurpose {
  FOR_INFORMATION  = 'FOR_INFORMATION',
  FOR_TENDER       = 'FOR_TENDER',
  FOR_REVIEW       = 'FOR_REVIEW',
  FOR_APPROVAL     = 'FOR_APPROVAL',
  FOR_CONSTRUCTION = 'FOR_CONSTRUCTION',
  AS_BUILT         = 'AS_BUILT',
  SUPERSEDED       = 'SUPERSEDED',
  VOID             = 'VOID',
}

export const DEPARTMENT_SUGGESTIONS = [
  'Quality Control',
  'Health & Safety',
  'Project Management',
  'Structural Engineering',
  'Site Operations',
  'Marine Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Document Control',
  'Procurement',
  'Classification & Compliance',
] as const

export type QRVerificationStatus = {
  isSafe: boolean
  headline: string
  headlineColour: 'green' | 'red' | 'amber' | 'blue'
  documentCode: string
  revisionCode: string
  issuePurpose: IssuePurpose
  status: DocumentStatus
  discipline: EngineeringDiscipline
  projectName: string
  verifiedAt: string
  latestRevisionCode?: string
  watermarkSkipped?: boolean
}

// File size limits for upload and watermark processing
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024  // 500MB
export const MAX_WATERMARK_SIZE_BYTES = 200 * 1024 * 1024  // 200MB

export enum DocumentStatus {
  PENDING          = 'PENDING',
  ACTIVE           = 'ACTIVE',
  SUPERSEDED       = 'SUPERSEDED',
  DELETED          = 'DELETED',
  QUARANTINED      = 'QUARANTINED',
  ENCRYPTING       = 'ENCRYPTING',
  PENDING_METADATA = 'PENDING_METADATA',
  ARCHIVED         = 'ARCHIVED',
}

export enum VirusScanStatus  { PENDING = 'PENDING', CLEAN = 'CLEAN',
  QUARANTINED = 'QUARANTINED', SKIPPED = 'SKIPPED' }
export enum WatermarkStatus  { PENDING = 'PENDING', PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE', FAILED = 'FAILED',
  SKIPPED_TOO_LARGE = 'SKIPPED_TOO_LARGE', SKIPPED_ENCRYPTED = 'SKIPPED_ENCRYPTED' }
export enum BulkOperationType { DELETE = 'DELETE', ARCHIVE = 'ARCHIVE',
  MOVE_PROJECT = 'MOVE_PROJECT', CHANGE_STATUS = 'CHANGE_STATUS',
  DOWNLOAD_ZIP = 'DOWNLOAD_ZIP' }
export enum StagingStatus    { UNREVIEWED = 'UNREVIEWED',
  CONFIRMED = 'CONFIRMED', REJECTED = 'REJECTED' }
export enum DocumentRecordStatus { ACTIVE = 'ACTIVE', ARCHIVED = 'ARCHIVED' }
export enum TransmittalReturnStatus {
  PENDING_RETURN = 'PENDING_RETURN', APPROVED = 'APPROVED',
  APPROVED_WITH_COMMENTS = 'APPROVED_WITH_COMMENTS',
  REJECTED = 'REJECTED', FOR_INFO_ONLY = 'FOR_INFO_ONLY' }
export enum PlanTier {
  STARTER = 'STARTER', GROWTH = 'GROWTH', PROFESSIONAL = 'PROFESSIONAL',
  SCALE = 'SCALE', CORE = 'CORE', PRO_MID = 'PRO_MID',
  ENTERPRISE_MID = 'ENTERPRISE_MID', PILOT = 'PILOT' }
export enum APIScope {
  READ_PROJECT = 'READ_PROJECT', WRITE_DOCUMENT = 'WRITE_DOCUMENT',
  READ_DOCUMENT = 'READ_DOCUMENT', READ_TRANSMITTAL = 'READ_TRANSMITTAL',
  WRITE_TRANSMITTAL = 'WRITE_TRANSMITTAL', READ_AUDIT = 'READ_AUDIT' }
export enum AuditAction {
  USER_INVITED = 'USER_INVITED', USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_DEACTIVATED = 'USER_DEACTIVATED', SESSION_STARTED = 'SESSION_STARTED',
  SESSION_ENDED = 'SESSION_ENDED', DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED', DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_QUARANTINED = 'DOCUMENT_QUARANTINED',
  REVISION_CREATED = 'REVISION_CREATED', REVISION_SUPERSEDED = 'REVISION_SUPERSEDED',
  LEGAL_HOLD_PLACED = 'LEGAL_HOLD_PLACED', LEGAL_HOLD_LIFTED = 'LEGAL_HOLD_LIFTED',
  BULK_OPERATION = 'BULK_OPERATION', OWNERSHIP_TRANSFERRED = 'OWNERSHIP_TRANSFERRED',
  SSO_CONFIGURED = 'SSO_CONFIGURED', API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED', PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONFLICT_RESOLVED = 'CONFLICT_RESOLVED', SCIM_OPERATION = 'SCIM_OPERATION',
  CUSTOM_ROLE_CREATED = 'CUSTOM_ROLE_CREATED', CUSTOM_ROLE_UPDATED = 'CUSTOM_ROLE_UPDATED',
  CUSTOM_ROLE_DELETED = 'CUSTOM_ROLE_DELETED',
  TRANSMITTAL_CREATED = 'TRANSMITTAL_CREATED', TRANSMITTAL_SENT = 'TRANSMITTAL_SENT',
}
export enum AuditVaultEventType {
  SUPERSEDED_DOC_ACKNOWLEDGED = 'SUPERSEDED_DOC_ACKNOWLEDGED',
  LEGAL_HOLD_PLACED = 'LEGAL_HOLD_PLACED', LEGAL_HOLD_LIFTED = 'LEGAL_HOLD_LIFTED',
  DOCUMENT_PURGED = 'DOCUMENT_PURGED',
  RETENTION_POLICY_TRIGGERED = 'RETENTION_POLICY_TRIGGERED',
  OWNERSHIP_TRANSFERRED = 'OWNERSHIP_TRANSFERRED', BREAK_GLASS_ACCESS = 'BREAK_GLASS_ACCESS',
  WORKFLOW_FORCE_UNLOCKED = 'WORKFLOW_FORCE_UNLOCKED', SSO_BYPASS_USED = 'SSO_BYPASS_USED',
  CONFLICT_RESOLVED = 'CONFLICT_RESOLVED', BULK_OPERATION = 'BULK_OPERATION',
  API_KEY_CREATED = 'API_KEY_CREATED', API_KEY_REVOKED = 'API_KEY_REVOKED',
  TRANSMITTAL_RETURNED = 'TRANSMITTAL_RETURNED',
  TRANSMITTAL_ACKNOWLEDGED = 'TRANSMITTAL_ACKNOWLEDGED',
  CUSTOM_ROLE_PERMISSION_CHANGE = 'CUSTOM_ROLE_PERMISSION_CHANGE',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION', // File integrity violations, hash mismatches
}
export enum NotificationType {
  WORKFLOW_ACTION_REQUIRED = 'WORKFLOW_ACTION_REQUIRED',
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED', WORKFLOW_REJECTED = 'WORKFLOW_REJECTED',
  DOCUMENT_QUARANTINED = 'DOCUMENT_QUARANTINED',
  LEGAL_HOLD_PLACED = 'LEGAL_HOLD_PLACED',
  STORAGE_LIMIT_WARNING = 'STORAGE_LIMIT_WARNING',
  TRANSMITTAL_ACKNOWLEDGED = 'TRANSMITTAL_ACKNOWLEDGED',
  TRANSMITTAL_RETURNED = 'TRANSMITTAL_RETURNED', API_KEY_EXPIRING = 'API_KEY_EXPIRING',
}

export type WorkflowStage = {
  stageNumber: number
  name: string
  type: 'REVIEW' | 'APPROVAL'
  requiredPermission: Permission  // permission checked for action — NOT a role name string
  requiredApprovals: number
  allowReject: boolean
  timeoutHours: number | null
}

export const STANDARD_WORKFLOW_TEMPLATES = [
  {
    name: 'Internal Review',
    completedLabel: 'Approved for Issue',
    stages: [
      { stageNumber: 1, name: 'Technical Review', type: 'REVIEW',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 48 },
      { stageNumber: 2, name: 'Document Controller Check', type: 'APPROVAL',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 24 },
    ],
  },
  {
    name: 'Client Approval',
    completedLabel: 'Client Approved',
    stages: [
      { stageNumber: 1, name: 'Internal Pre-Check', type: 'REVIEW',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 24 },
      { stageNumber: 2, name: 'Client Review', type: 'APPROVAL',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 168 },
    ],
  },
  {
    name: 'Construction Release',
    completedLabel: 'Released for Construction',
    stages: [
      { stageNumber: 1, name: 'Engineering Sign-Off', type: 'APPROVAL',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 48 },
      { stageNumber: 2, name: 'QA/QC Verification', type: 'APPROVAL',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: true, timeoutHours: 24 },
      { stageNumber: 3, name: 'Document Controller Release', type: 'APPROVAL',
        requiredPermission: Permission.APPROVE_WORKFLOW,
        requiredApprovals: 1, allowReject: false, timeoutHours: 8 },
    ],
  },
] as const

// ─── Role descriptions and permission labels ─────────────────────────────────
export * from './role-descriptions'

export const PLAN_LIMITS: Record<PlanTier, { users: number, storageGB: number, price: number }> = {
  STARTER:        { users: 10, storageGB: 500,  price: 200 },
  GROWTH:         { users: 10, storageGB: 1000, price: 350 },
  PROFESSIONAL:   { users: 10, storageGB: 2000, price: 600 },
  SCALE:          { users: 25, storageGB: 2000, price: 850 },
  CORE:           { users: 50, storageGB: 2000, price: 1200 },
  PRO_MID:        { users: 50, storageGB: 4000, price: 1800 },
  ENTERPRISE_MID: { users: 50, storageGB: 6000, price: 2400 },
  PILOT:          { users: 15, storageGB: 1500, price: 1000 },
}
