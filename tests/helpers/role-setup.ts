// Role fixtures and helpers
export const ROLES = {
  IT_ADMIN: 'it_admin',
  SUPER_ADMIN: 'it_admin', // Alias for IT_ADMIN (god mode)
  PROJECT_ADMIN: 'project_admin',
  ENGINEER: 'engineer',
  CLIENT: 'client',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Permission matrix
export const PERMISSIONS = {
  documents: {
    create: ['it_admin', 'project_admin', 'engineer'] as Role[],
    read: ['it_admin', 'project_admin', 'engineer', 'client'] as Role[],
    update: ['it_admin', 'project_admin', 'engineer'] as Role[],
    delete: ['it_admin', 'project_admin'] as Role[],
  },
  users: {
    create: ['it_admin', 'project_admin'] as Role[],
    read: ['it_admin', 'project_admin', 'engineer'] as Role[],
    update: ['it_admin', 'project_admin'] as Role[],
    delete: ['it_admin'] as Role[],
  },
  projects: {
    create: ['it_admin', 'project_admin'] as Role[],
    read: ['it_admin', 'project_admin', 'engineer', 'client'] as Role[],
    update: ['it_admin', 'project_admin'] as Role[],
    delete: ['it_admin'] as Role[],
  },
  folders: {
    create: ['it_admin', 'project_admin', 'engineer'] as Role[],
    read: ['it_admin', 'project_admin', 'engineer', 'client'] as Role[],
    update: ['it_admin', 'project_admin', 'engineer'] as Role[],
    delete: ['it_admin', 'project_admin'] as Role[],
  },
};

export function hasPermission(role: Role, resource: string, action: string): boolean {
  const resourcePerms = PERMISSIONS[resource as keyof typeof PERMISSIONS];
  if (!resourcePerms) return false;

  const actionPerms = resourcePerms[action as keyof typeof resourcePerms];
  if (!actionPerms) return false;

  return actionPerms.includes(role);
}
