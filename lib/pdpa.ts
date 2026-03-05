import { prisma } from "./prisma";
import { Parser } from "json2csv";

/**
 * Export all user data in JSON format (PDPA compliance)
 */
export async function exportUserData(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      company: true,
      projects: true,
      documents: {
        include: {
          project: true,
          folder: true,
          versions: true,
          comments: true,
        },
      },
      invitations: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 1000, // Last 1000 audit logs
      },
      comments: {
        include: {
          document: {
            select: { id: true, title: true },
          },
        },
      },
      documentVersions: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Remove sensitive fields
  const { passwordHash, ...userData } = user;

  return {
    exportDate: new Date().toISOString(),
    user: userData,
    dataRetentionPolicy: {
      retentionDays: parseInt(process.env.DATA_RETENTION_DAYS || "2555", 10),
      description:
        "Documents and data are retained for 7 years (2555 days) to comply with Singapore construction industry regulations.",
    },
    notes:
      "This export contains all your personal data stored in DocuRoute. For document files, please contact your IT administrator.",
  };
}

/**
 * Export user data as CSV
 */
export async function exportUserDataCSV(userId: string): Promise<string> {
  const data = await exportUserData(userId);

  // Flatten the data for CSV export
  const flatData = [
    {
      exportDate: data.exportDate,
      userId: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      companyId: data.user.companyId,
      companyName: data.user.company.name,
      isActive: data.user.isActive,
      twoFactorEnabled: data.user.twoFactorEnabled,
      createdAt: data.user.createdAt,
      updatedAt: data.user.updatedAt,
      totalDocuments: data.user.documents.length,
      totalProjects: data.user.projects.length,
      totalComments: data.user.comments.length,
      totalAuditLogs: data.user.auditLogs.length,
    },
  ];

  const parser = new Parser();
  return parser.parse(flatData);
}

/**
 * Request account deletion (soft delete with 30-day grace period)
 */
export async function requestAccountDeletion(
  userId: string
): Promise<{ deletionDate: Date; gracePeriodDays: number }> {
  const gracePeriodDays = 30;
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + gracePeriodDays);

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  // Create audit log for deletion request
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (user) {
    await prisma.auditLog.create({
      data: {
        action: "user.deletion_requested",
        entity: "User",
        entityId: userId,
        companyId: user.companyId,
        userId,
        details: {
          gracePeriodDays,
          scheduledDeletionDate: deletionDate.toISOString(),
        },
      },
    });
  }

  return {
    deletionDate,
    gracePeriodDays,
  };
}

/**
 * Cancel account deletion request (restore active status)
 */
export async function cancelAccountDeletion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (user) {
    await prisma.auditLog.create({
      data: {
        action: "user.deletion_cancelled",
        entity: "User",
        entityId: userId,
        companyId: user.companyId,
        userId,
      },
    });
  }
}

/**
 * Permanently delete user account and all associated data
 * WARNING: This action is irreversible
 */
export async function permanentlyDeleteUser(userId: string): Promise<void> {
  // This will cascade delete all related data due to Prisma schema relations
  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Anonymize user data (GDPR "right to be forgotten" alternative)
 * Preserves audit trail while removing personally identifiable information
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  const randomId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `${randomId}@anonymized.local`,
      name: "Anonymized User",
      passwordHash: "", // Clear password
      isActive: false,
      twoFactorEnabled: false,
    },
  });

  // Delete 2FA secret if exists
  await prisma.twoFactorSecret.deleteMany({
    where: { userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (user) {
    await prisma.auditLog.create({
      data: {
        action: "user.anonymized",
        entity: "User",
        entityId: userId,
        companyId: user.companyId,
        details: {
          note: "User data anonymized per PDPA/GDPR compliance",
        },
      },
    });
  }
}
