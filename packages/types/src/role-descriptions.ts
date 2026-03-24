/**
 * Human-readable descriptions for system roles
 * Used in invitation flow to explain what each role can do
 */

import { SystemRoleKey } from './index'

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRoleKey, string> = {
  PLATFORM_ADMIN: 'Platform administrator with access to all companies and emergency controls.',
  COMPANY_OWNER: 'Full access to all company operations, settings, and data. Can manage billing and transfer ownership.',
  COMPANY_ADMIN: 'Manages users, roles, documents, workflows, and company settings. Cannot transfer ownership or manage billing.',
  DOCUMENT_CONTROLLER: 'Manages document uploads, metadata, workflows, transmittals, and legal holds. ISO 9001 compliant role.',
  AUDITOR: 'Read-only access to audit logs, vault exports, documents, and transmittals for compliance reviews.',
  BILLING_CONTACT: 'Manages billing, subscriptions, and payment methods. Limited document access for invoices.',
}

/**
 * Human-readable labels for permissions
 * Used when displaying custom role permissions to invited users
 */
export const PERMISSION_LABELS: Record<string, string> = {
  // Document operations
  UPLOAD_DOCUMENT: 'Upload documents',
  VIEW_DOCUMENT: 'View documents',
  DOWNLOAD_DOCUMENT: 'Download documents',
  DELETE_DOCUMENT: 'Delete documents',
  ARCHIVE_DOCUMENT: 'Archive documents',
  HARD_PURGE_DOCUMENT: 'Permanently delete documents',

  // Metadata and naming
  EDIT_DOCUMENT_METADATA: 'Edit document metadata',
  VALIDATE_NAMING_MASK: 'Validate naming conventions',
  CONFIGURE_NAMING_MASK: 'Configure naming conventions',

  // MDR and bulk operations
  IMPORT_MDR: 'Import Master Document Register',
  BULK_OPERATION: 'Perform bulk operations',
  UNDO_BULK_OPERATION: 'Undo bulk operations',

  // Workflow
  START_WORKFLOW: 'Start workflows',
  APPROVE_WORKFLOW: 'Approve workflows',
  REJECT_WORKFLOW: 'Reject workflows',
  FORCE_UNLOCK_WORKFLOW: 'Force unlock workflows',
  MANAGE_WORKFLOW_TEMPLATES: 'Manage workflow templates',

  // Transmittals
  CREATE_TRANSMITTAL: 'Create transmittals',
  SEND_TRANSMITTAL: 'Send transmittals',
  VIEW_TRANSMITTAL: 'View transmittals',

  // Users and roles
  INVITE_USERS: 'Invite users',
  MANAGE_USERS: 'Manage users',
  DEACTIVATE_USERS: 'Deactivate users',
  MANAGE_CUSTOM_ROLES: 'Manage custom roles',

  // Legal and compliance
  PLACE_LEGAL_HOLD: 'Place legal holds',
  LIFT_LEGAL_HOLD: 'Lift legal holds',
  BYPASS_LEGAL_HOLD: 'Bypass legal holds',
  CONFIGURE_RETENTION: 'Configure retention policies',
  VIEW_AUDIT_LOG: 'View audit log',
  EXPORT_AUDIT_VAULT: 'Export audit vault',
  MANAGE_LEGAL_HOLDS: 'Manage legal holds',

  // Security and identity
  CONFIGURE_SSO: 'Configure single sign-on',
  MANAGE_SCIM: 'Manage SCIM provisioning',
  CREATE_API_KEY: 'Create API keys',
  REVOKE_API_KEY: 'Revoke API keys',
  MANAGE_SERVICE_ACCOUNTS: 'Manage service accounts',

  // Billing and ownership
  MANAGE_BILLING: 'Manage billing',
  TRANSFER_OWNERSHIP: 'Transfer ownership',
  CONFIGURE_SUCCESSION: 'Configure succession plan',

  // Platform (PLATFORM_ADMIN only)
  PLATFORM_ADMIN_ACCESS: 'Platform administration',
  EMERGENCY_TRANSFER: 'Emergency ownership transfer',
}
