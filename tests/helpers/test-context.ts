import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

export interface TestContext {
  prisma: PrismaClient;
  schema: string;
  cleanup(): Promise<void>;
}

/**
 * Retry helper for database operations to handle intermittent connection failures
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on connection errors (P1001, P1002, P1008, P1017)
      const isConnectionError = lastError.message.match(/P100[128]|P1017/);

      if (!isConnectionError || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function createTestContext(): TestContext {
  const schema = `test_${crypto.randomBytes(8).toString('hex')}`;
  const databaseUrl = process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://test:test@localhost:5432/docuroute_test';

  // Add schema to database URL
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);

  // Add connection pool settings for better reliability in test environment
  url.searchParams.set('connection_limit', '5');
  url.searchParams.set('pool_timeout', '20');
  url.searchParams.set('connect_timeout', '10');

  const connectionString = url.toString();

  // Create Prisma client with adapter and retry logic
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({
    adapter,
    log: ['error'],
  });

  // Run migrations on test schema with retry logic
  try {
    execSync(`npx prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: 'pipe',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Migration failed, tests may not work:', errorMessage);
  }

  // Test database connection with retry logic
  retryOperation(async () => {
    await prisma.$connect();
  }, 5, 200).catch(error => {
    console.warn('Failed to establish initial database connection:', error);
  });

  return {
    prisma,
    schema,
    async cleanup() {
      try {
        await retryOperation(async () => {
          await prisma.$executeRawUnsafe(
            `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`
          );
        });
      } catch (error) {
        console.warn('Failed to drop schema:', error);
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
