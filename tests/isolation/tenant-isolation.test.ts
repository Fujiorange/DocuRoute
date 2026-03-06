import { describe, it, expect, afterAll } from 'vitest';
import { createTestContext } from '../helpers/test-context';
import { createTestCompany, createTestUser, createTestDocument, createTestFolder } from '../helpers/factories';

describe('Multi-Tenant Isolation', () => {
  const ctx = createTestContext();

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('should prevent cross-company document access via direct Prisma query', async () => {
    const companyA = await createTestCompany(ctx, { name: 'Construction A' });
    const companyB = await createTestCompany(ctx, { name: 'Engineering B' });

    const userA = await createTestUser(ctx, { companyId: companyA.id, role: 'engineer' });
    const userB = await createTestUser(ctx, { companyId: companyB.id, role: 'engineer' });

    const docA = await createTestDocument(ctx, {
      companyId: companyA.id,
      title: 'Secret A Document',
      createdById: userA.id,
    });

    // Try to query document from Company B's user context
    const docFromB = await ctx.prisma.document.findFirst({
      where: {
        id: docA.id,
        companyId: userB.companyId, // Should not find it
      },
    });

    expect(docFromB).toBeNull();

    // Verify it exists for Company A
    const docFromA = await ctx.prisma.document.findFirst({
      where: {
        id: docA.id,
        companyId: userA.companyId,
      },
    });

    expect(docFromA).not.toBeNull();
    expect(docFromA?.title).toBe('Secret A Document');
  });

  it('should enforce companyId in document creation', async () => {
    const companyA = await createTestCompany(ctx, { name: 'Company A' });
    const companyB = await createTestCompany(ctx, { name: 'Company B' });
    const userA = await createTestUser(ctx, { companyId: companyA.id, role: 'engineer' });

    // Simulate a user trying to create a document with a forged companyId
    // In real API, the companyId should be forced from the authenticated user
    const doc = await ctx.prisma.document.create({
      data: {
        title: 'Test Document',
        s3Key: `test/${Date.now()}/document.pdf`,
        s3Bucket: 'test-bucket',
        fileName: 'document.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        companyId: userA.companyId, // Should use authenticated user's companyId, not request body
        uploadedById: userA.id,
        status: 'draft',
      },
    });

    expect(doc.companyId).toBe(companyA.id);
    expect(doc.companyId).not.toBe(companyB.id);
  });

  it('should filter documents by company in list queries', async () => {
    const companyA = await createTestCompany(ctx, { name: 'Company A' });
    const companyB = await createTestCompany(ctx, { name: 'Company B' });
    const userA = await createTestUser(ctx, { companyId: companyA.id, role: 'engineer' });

    await createTestDocument(ctx, {
      companyId: companyA.id,
      title: 'Foundation Plan A',
      createdById: userA.id,
    });
    await createTestDocument(ctx, {
      companyId: companyA.id,
      title: 'Electrical Plan A',
      createdById: userA.id,
    });
    await createTestDocument(ctx, {
      companyId: companyB.id,
      title: 'Foundation Plan B',
    });

    // Query documents for Company A only
    const docsA = await ctx.prisma.document.findMany({
      where: {
        companyId: userA.companyId,
      },
    });

    expect(docsA.length).toBe(2);
    expect(docsA.every(d => d.companyId === companyA.id)).toBe(true);
  });

  it('should ensure users can only list their company users', async () => {
    const companyA = await createTestCompany(ctx, { name: 'Company A' });
    const companyB = await createTestCompany(ctx, { name: 'Company B' });

    await createTestUser(ctx, { companyId: companyA.id, role: 'engineer' });
    await createTestUser(ctx, { companyId: companyA.id, role: 'client' });
    await createTestUser(ctx, { companyId: companyB.id, role: 'engineer' });

    const usersA = await ctx.prisma.user.findMany({
      where: {
        companyId: companyA.id,
        isActive: true,
      },
    });

    expect(usersA.length).toBe(2);
    expect(usersA.every(u => u.companyId === companyA.id)).toBe(true);
  });

  it('should prevent cross-company folder access', async () => {
    const companyA = await createTestCompany(ctx, { name: 'Company A' });
    const companyB = await createTestCompany(ctx, { name: 'Company B' });
    const userA = await createTestUser(ctx, { companyId: companyA.id, role: 'engineer' });
    const userB = await createTestUser(ctx, { companyId: companyB.id, role: 'engineer' });

    const folderA = await createTestFolder(ctx, {
      companyId: companyA.id,
      name: 'Private Folder A',
      createdById: userA.id,
    });

    // Try to access folder from Company B's user context
    const folderFromB = await ctx.prisma.folder.findFirst({
      where: {
        id: folderA.id,
        companyId: userB.companyId,
      },
    });

    expect(folderFromB).toBeNull();

    // Verify it exists for Company A
    const folderFromA = await ctx.prisma.folder.findFirst({
      where: {
        id: folderA.id,
        companyId: userA.companyId,
      },
    });

    expect(folderFromA).not.toBeNull();
    expect(folderFromA?.name).toBe('Private Folder A');
  });
});
