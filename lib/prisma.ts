import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // Prisma v7 requires an adapter or accelerateUrl
  // For build time without DATABASE_URL, we provide a dummy connection string
  // that will never actually be used during the build process
  const actualConnectionString = connectionString || "postgresql://localhost:5432/dummy";

  const adapter = new PrismaPg({ connectionString: actualConnectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// NOTE: Audit logging middleware removed due to Prisma v7 removing $use API
// Use createAuditLog() directly in your API routes after database operations
