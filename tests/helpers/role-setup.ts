// Role fixtures and helpers
export const ROLES = {
  IT_ADMIN: 'IT_ADMIN',
  SUPER_ADMIN: 'IT_ADMIN', // Alias for IT_ADMIN (god mode)
  PROJECT_ADMIN: 'PROJECT_ADMIN',
  ENGINEER: 'ENGINEER',
  CLIENT: 'CLIENT',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Permission matrix
export const PERMISSIONS = {
  documents: {
    create: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER'],
    read: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER', 'CLIENT'],
    update: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER'],
    delete: ['IT_ADMIN', 'PROJECT_ADMIN'],
  },
  users: {
    create: ['IT_ADMIN', 'PROJECT_ADMIN'],
    read: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER'],
    update: ['IT_ADMIN', 'PROJECT_ADMIN'],
    delete: ['IT_ADMIN'],
  },
  projects: {
    create: ['IT_ADMIN', 'PROJECT_ADMIN'],
    read: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER', 'CLIENT'],
    update: ['IT_ADMIN', 'PROJECT_ADMIN'],
    delete: ['IT_ADMIN'],
  },
  folders: {
    create: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER'],
    read: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER', 'CLIENT'],
    update: ['IT_ADMIN', 'PROJECT_ADMIN', 'ENGINEER'],
    delete: ['IT_ADMIN', 'PROJECT_ADMIN'],
  },
} as const;

export function hasPermission(role: Role, resource: string, action: string): boolean {
  const resourcePerms = PERMISSIONS[resource as keyof typeof PERMISSIONS];
  if (!resourcePerms) return false;

  const actionPerms = resourcePerms[action as keyof typeof resourcePerms];
  if (!actionPerms) return false;

  return actionPerms.includes(role);
}
