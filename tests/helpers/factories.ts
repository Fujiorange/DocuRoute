import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { TestContext } from './test-context';

export async function createTestCompany(ctx: TestContext, overrides: Record<string, unknown> = {}) {
  return ctx.prisma.company.create({
    data: {
      name: `Test Company ${Date.now()}`,
      subscriptionTier: 'FREE',
      ...overrides,
    },
  });
}

export async function createTestUser(
  ctx: TestContext,
  options: {
    companyId: string;
    role?: 'IT_ADMIN' | 'PROJECT_ADMIN' | 'ENGINEER' | 'CLIENT';
    [key: string]: unknown;
  }
) {
  const { companyId, role = 'ENGINEER', ...overrides } = options;
  const email = `test-${Date.now()}-${Math.random()}@example.com`;

  const user = await ctx.prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('TestPassword123!', 10),
      firstName: 'Test',
      lastName: 'User',
      companyId,
      role,
      emailVerified: new Date(),
      isActive: true,
      ...overrides,
    },
  });

  // Generate session token for API calls
  const token = jwt.sign(
    {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );

  return {
    ...user,
    sessionToken: token,
  };
}

export async function createTestDocument(
  ctx: TestContext,
  options: {
    companyId: string;
    createdById?: string;
    [key: string]: unknown;
  }
) {
  const { companyId, createdById, ...overrides } = options;

  let userId = createdById;
  if (!userId) {
    const user = await createTestUser(ctx, { companyId, role: 'ENGINEER' });
    userId = user.id;
  }

  return ctx.prisma.document.create({
    data: {
      title: `Test Document ${Date.now()}`,
      content: 'Test content',
      companyId,
      createdById: userId,
      status: 'DRAFT',
      ...overrides,
    },
  });
}

export async function createTestFolder(
  ctx: TestContext,
  options: {
    companyId: string;
    createdById?: string;
    projectId?: string;
    parentId?: string;
    [key: string]: unknown;
  }
) {
  const { companyId, createdById, projectId, parentId, ...overrides } = options;

  let userId = createdById;
  if (!userId) {
    const user = await createTestUser(ctx, { companyId, role: 'ENGINEER' });
    userId = user.id;
  }

  return ctx.prisma.folder.create({
    data: {
      name: `Test Folder ${Date.now()}`,
      companyId,
      createdById: userId,
      ...(projectId && { projectId }),
      ...(parentId && { parentId }),
      ...overrides,
    },
  });
}

export async function createTestProject(
  ctx: TestContext,
  options: {
    companyId: string;
    createdById?: string;
    [key: string]: unknown;
  }
) {
  const { companyId, createdById, ...overrides } = options;

  let userId = createdById;
  if (!userId) {
    const user = await createTestUser(ctx, { companyId, role: 'PROJECT_ADMIN' });
    userId = user.id;
  }

  return ctx.prisma.project.create({
    data: {
      name: `Test Project ${Date.now()}`,
      description: 'Test project description',
      companyId,
      createdById: userId,
      status: 'ACTIVE',
      ...overrides,
    },
  });
}

export function createTestSessionToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    process.env.JWT_SECRET || 'test-secret'
  );
}
