import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

export interface TestContext {
  prisma: PrismaClient;
  schema: string;
  cleanup(): Promise<void>;
}

export function createTestContext(): TestContext {
  const schema = `test_${crypto.randomBytes(8).toString('hex')}`;
  const databaseUrl = process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://test:test@localhost:5432/docuroute_test';

  // Add schema to database URL
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  const connectionString = url.toString();

  // Create Prisma client with adapter
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter, log: ['error'] });

  // Run migrations on test schema
  try {
    execSync(`npx prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: 'pipe',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Migration failed, tests may not work:', errorMessage);
  }

  return {
    prisma,
    schema,
    async cleanup() {
      try {
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`
        );
      } catch (error) {
        console.warn('Failed to drop schema:', error);
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
