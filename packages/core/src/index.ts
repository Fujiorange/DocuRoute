import { Permission, SystemRole, SYSTEM_ROLE_PERMISSIONS, type UserRole } from "@docuroute/types";

export { Permission, SystemRole, SYSTEM_ROLE_PERMISSIONS };
export type { UserRole };

/**
 * Resolves the permissions for a given user role.
 * Works identically for both system roles and custom roles.
 */
export function resolvePermissions(role: UserRole): Permission[] {
  if (role.type === "system") {
    return SYSTEM_ROLE_PERMISSIONS[role.role];
  }
  return role.permissions;
}

/**
 * Checks if a user role has a specific permission.
 * This is the primary authorization function for the hybrid PBAC+RBAC model.
 * All authorization decisions are made against the Permission enum, never against role name strings.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return resolvePermissions(role).includes(permission);
}

/**
 * Throws an error if the user does not have the required permission.
 * Use this in server-side code to enforce authorization.
 */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Unauthorized: missing permission ${permission}`);
  }
}

/**
 * Checks if a user role has all of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Checks if a user role has any of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
