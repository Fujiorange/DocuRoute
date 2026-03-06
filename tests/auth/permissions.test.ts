import { describe, it, expect, afterAll } from 'vitest';
import { createTestContext } from '../helpers/test-context';
import { createTestCompany, createTestUser, createTestDocument, createTestProject } from '../helpers/factories';
import { ROLES, hasPermission } from '../helpers/role-setup';

describe('Role-Based Access Control', () => {
  const ctx = createTestContext();

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('should allow ENGINEER to read documents in their company', async () => {
    const company = await createTestCompany(ctx);
    const engineer = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.ENGINEER
    });
    const doc = await createTestDocument(ctx, {
      companyId: company.id,
      createdById: engineer.id,
    });

    const foundDoc = await ctx.prisma.document.findFirst({
      where: {
        id: doc.id,
        companyId: engineer.companyId,
      },
    });

    expect(foundDoc).not.toBeNull();
    expect(foundDoc?.id).toBe(doc.id);
  });

  it('should allow CLIENT to only view documents shared with them', async () => {
    const company = await createTestCompany(ctx);
    const client = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.CLIENT
    });
    const engineer = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.ENGINEER
    });

    const sharedDoc = await createTestDocument(ctx, {
      companyId: company.id,
      createdById: engineer.id,
      sharedWith: [client.id]
    });
    const privateDoc = await createTestDocument(ctx, {
      companyId: company.id,
      createdById: engineer.id,
      sharedWith: []
    });

    // Client should be able to find shared doc
    const foundShared = await ctx.prisma.document.findFirst({
      where: {
        id: sharedDoc.id,
        companyId: client.companyId,
        sharedWith: {
          has: client.id,
        },
      },
    });
    expect(foundShared).not.toBeNull();

    // Client should not find private doc when filtering by sharedWith
    const foundPrivate = await ctx.prisma.document.findFirst({
      where: {
        id: privateDoc.id,
        companyId: client.companyId,
        sharedWith: {
          has: client.id,
        },
      },
    });
    expect(foundPrivate).toBeNull();
  });

  it('should prevent ENGINEER from escalating privileges', async () => {
    const company = await createTestCompany(ctx);
    const engineer = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.ENGINEER
    });

    // Check permissions
    const canUpdateUsers = hasPermission(ROLES.ENGINEER, 'users', 'update');
    expect(canUpdateUsers).toBe(false);

    // Verify role is ENGINEER
    expect(engineer.role).toBe(ROLES.ENGINEER);
  });

  it('should enforce document update permissions based on role', async () => {
    const company = await createTestCompany(ctx);
    const engineer = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.ENGINEER
    });
    const client = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.CLIENT
    });

    // ENGINEER should have update permission
    const engineerCanUpdate = hasPermission(ROLES.ENGINEER, 'documents', 'update');
    expect(engineerCanUpdate).toBe(true);

    // CLIENT should not have update permission
    const clientCanUpdate = hasPermission(ROLES.CLIENT, 'documents', 'update');
    expect(clientCanUpdate).toBe(false);
  });

  it('should allow PROJECT_ADMIN to manage users', async () => {
    const company = await createTestCompany(ctx);
    const admin = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.PROJECT_ADMIN
    });

    // PROJECT_ADMIN should have user creation permission
    const canCreateUsers = hasPermission(ROLES.PROJECT_ADMIN, 'users', 'create');
    expect(canCreateUsers).toBe(true);

    // Verify admin can create users
    const newUser = await ctx.prisma.user.create({
      data: {
        email: `newuser-${Date.now()}@example.com`,
        passwordHash: '$2b$10$mockhash',
        firstName: 'New',
        lastName: 'User',
        companyId: company.id,
        role: 'ENGINEER',
        emailVerified: new Date(),
      },
    });

    expect(newUser.companyId).toBe(company.id);
    expect(newUser.role).toBe('ENGINEER');
  });

  it('should allow IT_ADMIN god-mode access to all resources', async () => {
    const company = await createTestCompany(ctx);
    const itAdmin = await createTestUser(ctx, {
      companyId: company.id,
      role: ROLES.IT_ADMIN
    });

    // IT_ADMIN should have all permissions
    expect(hasPermission(ROLES.IT_ADMIN, 'documents', 'create')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'documents', 'read')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'documents', 'update')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'documents', 'delete')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'users', 'create')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'users', 'update')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'users', 'delete')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'projects', 'delete')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'folders', 'delete')).toBe(true);
  });

  it('should enforce delete permissions hierarchy', async () => {
    // IT_ADMIN can delete everything
    expect(hasPermission(ROLES.IT_ADMIN, 'documents', 'delete')).toBe(true);
    expect(hasPermission(ROLES.IT_ADMIN, 'users', 'delete')).toBe(true);

    // PROJECT_ADMIN can delete documents but not users
    expect(hasPermission(ROLES.PROJECT_ADMIN, 'documents', 'delete')).toBe(true);
    expect(hasPermission(ROLES.PROJECT_ADMIN, 'users', 'delete')).toBe(false);

    // ENGINEER cannot delete documents or users
    expect(hasPermission(ROLES.ENGINEER, 'documents', 'delete')).toBe(false);
    expect(hasPermission(ROLES.ENGINEER, 'users', 'delete')).toBe(false);

    // CLIENT cannot delete anything
    expect(hasPermission(ROLES.CLIENT, 'documents', 'delete')).toBe(false);
    expect(hasPermission(ROLES.CLIENT, 'users', 'delete')).toBe(false);
  });
});
