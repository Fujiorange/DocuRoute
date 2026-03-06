// Role-based access control (RBAC) permissions

export enum Role {
  IT_ADMIN = "it_admin",
  PROJECT_ADMIN = "project_admin",
  ENGINEER = "engineer",
  CLIENT = "client",
}

export enum Permission {
  // Company management
  COMPANY_UPDATE = "company:update",
  COMPANY_DELETE = "company:delete",

  // User management
  USER_INVITE = "user:invite",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_VIEW = "user:view",

  // Project management
  PROJECT_CREATE = "project:create",
  PROJECT_UPDATE = "project:update",
  PROJECT_DELETE = "project:delete",
  PROJECT_VIEW = "project:view",

  // Document management
  DOCUMENT_CREATE = "document:create",
  DOCUMENT_UPDATE = "document:update",
  DOCUMENT_DELETE = "document:delete",
  DOCUMENT_VIEW = "document:view",
  DOCUMENT_DOWNLOAD = "document:download",
  DOCUMENT_APPROVE = "document:approve",

  // Folder management
  FOLDER_CREATE = "folder:create",
  FOLDER_UPDATE = "folder:update",
  FOLDER_DELETE = "folder:delete",
  FOLDER_VIEW = "folder:view",

  // Comment management
  COMMENT_CREATE = "comment:create",
  COMMENT_UPDATE_OWN = "comment:update:own",
  COMMENT_DELETE_OWN = "comment:delete:own",
  COMMENT_DELETE_ANY = "comment:delete:any",

  // Audit logs
  AUDIT_LOG_VIEW = "audit:view",

  // Settings
  SETTINGS_VIEW = "settings:view",
  SETTINGS_UPDATE = "settings:update",
}

// Role permission mappings
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.IT_ADMIN]: [
    // Full access to everything
    Permission.COMPANY_UPDATE,
    Permission.COMPANY_DELETE,
    Permission.USER_INVITE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_VIEW,
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_DELETE,
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.DOCUMENT_APPROVE,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.FOLDER_VIEW,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_DELETE_OWN,
    Permission.COMMENT_DELETE_ANY,
    Permission.AUDIT_LOG_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
  ],
  [Role.PROJECT_ADMIN]: [
    Permission.USER_INVITE,
    Permission.USER_VIEW,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_VIEW,
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_UPDATE,
    Permission.DOCUMENT_DELETE,
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.DOCUMENT_APPROVE,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.FOLDER_VIEW,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_DELETE_OWN,
    Permission.COMMENT_DELETE_ANY,
    Permission.SETTINGS_VIEW,
  ],
  [Role.ENGINEER]: [
    Permission.USER_VIEW,
    Permission.PROJECT_VIEW,
    Permission.DOCUMENT_CREATE,
    Permission.DOCUMENT_UPDATE, // Own documents
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.FOLDER_VIEW,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_DELETE_OWN,
    Permission.SETTINGS_VIEW,
  ],
  [Role.CLIENT]: [
    // Read-only access
    Permission.PROJECT_VIEW,
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.FOLDER_VIEW,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_UPDATE_OWN,
    Permission.COMMENT_DELETE_OWN,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const roleEnum = role as Role;
  const permissions = ROLE_PERMISSIONS[roleEnum];
  return permissions?.includes(permission) || false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  const roleEnum = role as Role;
  return ROLE_PERMISSIONS[roleEnum] || [];
}

/**
 * Check if user can access a specific folder (for client role)
 * Clients should only see folders they're explicitly granted access to
 */
export function canAccessFolder(
  role: string,
  folderId: string,
  allowedFolderIds: string[]
): boolean {
  if (role !== Role.CLIENT) {
    return hasPermission(role, Permission.FOLDER_VIEW);
  }

  return allowedFolderIds.includes(folderId);
}
