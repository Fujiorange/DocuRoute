export enum Permission {
  // Document permissions
  CREATE_DOCUMENT = "CREATE_DOCUMENT",
  READ_DOCUMENT = "READ_DOCUMENT",
  UPDATE_DOCUMENT = "UPDATE_DOCUMENT",
  DELETE_DOCUMENT = "DELETE_DOCUMENT",
  APPROVE_DOCUMENT = "APPROVE_DOCUMENT",
  REJECT_DOCUMENT = "REJECT_DOCUMENT",
  PUBLISH_DOCUMENT = "PUBLISH_DOCUMENT",
  ARCHIVE_DOCUMENT = "ARCHIVE_DOCUMENT",
  
  // User management
  CREATE_USER = "CREATE_USER",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  
  // Role management
  CREATE_ROLE = "CREATE_ROLE",
  READ_ROLE = "READ_ROLE",
  UPDATE_ROLE = "UPDATE_ROLE",
  DELETE_ROLE = "DELETE_ROLE",
  ASSIGN_ROLE = "ASSIGN_ROLE",
  
  // Company management
  READ_COMPANY = "READ_COMPANY",
  UPDATE_COMPANY = "UPDATE_COMPANY",
  
  // Billing
  MANAGE_BILLING = "MANAGE_BILLING",
  READ_BILLING = "READ_BILLING",
  
  // Audit
  READ_AUDIT_LOG = "READ_AUDIT_LOG",
  
  // Platform admin (cross-company)
  PLATFORM_MANAGE_COMPANIES = "PLATFORM_MANAGE_COMPANIES",
  PLATFORM_READ_ALL = "PLATFORM_READ_ALL",
}

export enum SystemRole {
  COMPANY_OWNER = "COMPANY_OWNER",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  DOCUMENT_CONTROLLER = "DOCUMENT_CONTROLLER",
  AUDITOR = "AUDITOR",
  BILLING_CONTACT = "BILLING_CONTACT",
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
}

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.COMPANY_OWNER]: Object.values(Permission),
  [SystemRole.COMPANY_ADMIN]: [
    Permission.CREATE_DOCUMENT,
    Permission.READ_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.APPROVE_DOCUMENT,
    Permission.REJECT_DOCUMENT,
    Permission.PUBLISH_DOCUMENT,
    Permission.ARCHIVE_DOCUMENT,
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_ROLE,
    Permission.READ_ROLE,
    Permission.UPDATE_ROLE,
    Permission.DELETE_ROLE,
    Permission.ASSIGN_ROLE,
    Permission.READ_COMPANY,
    Permission.UPDATE_COMPANY,
    Permission.READ_BILLING,
    Permission.READ_AUDIT_LOG,
  ],
  [SystemRole.DOCUMENT_CONTROLLER]: [
    Permission.CREATE_DOCUMENT,
    Permission.READ_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.APPROVE_DOCUMENT,
    Permission.REJECT_DOCUMENT,
    Permission.PUBLISH_DOCUMENT,
    Permission.ARCHIVE_DOCUMENT,
    Permission.READ_USER,
    Permission.READ_ROLE,
  ],
  [SystemRole.AUDITOR]: [
    Permission.READ_DOCUMENT,
    Permission.READ_USER,
    Permission.READ_ROLE,
    Permission.READ_COMPANY,
    Permission.READ_BILLING,
    Permission.READ_AUDIT_LOG,
  ],
  [SystemRole.BILLING_CONTACT]: [
    Permission.READ_DOCUMENT,
    Permission.READ_USER,
    Permission.MANAGE_BILLING,
    Permission.READ_BILLING,
  ],
  [SystemRole.PLATFORM_ADMIN]: Object.values(Permission),
};

export type UserRole = 
  | { type: "system"; role: SystemRole }
  | { type: "custom"; permissions: Permission[] };
