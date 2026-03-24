import { prismaAdmin, getPrismaForCompany, PrismaClient } from '@docuroute/db'
import { Permission, NotificationType, SYSTEM_ROLE_PERMISSIONS } from '@docuroute/types'

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * createNotification
 *
 * Inserts a single notification for a user.
 *
 * TRANSACTION RULE: When called inside a transaction, pass tx and companyId explicitly.
 * The tx client does NOT inherit the companyId extension from getPrismaForCompany().
 *
 * @param params - Notification parameters
 * @param tx - Optional transaction client (for use inside transactions)
 * @returns The created notification
 */
export async function createNotification(
  params: {
    companyId: string
    userId: string
    type: NotificationType
    title: string
    message: string
    metadata?: object
  },
  tx?: PrismaTransactionClient
): Promise<void> {
  const client = tx || prismaAdmin

  try {
    await client.notification.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
        isRead: false,
      },
    })
  } catch (error: unknown) {
    // Never throw - notification failures should not block business operations
    // Log the error for monitoring purposes
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // In production, this should be sent to a logging service
    if (process.env.NODE_ENV !== 'test') {
      console.error('[NOTIFICATION_ERROR] Failed to create notification:', {
        userId: params.userId,
        type: params.type,
        error: errorMessage,
      })
    }
  }
}

/**
 * createNotificationsForPermission
 *
 * Finds all active users with a specific permission and creates notifications for them.
 *
 * IMPORTANT: Must handle BOTH system and custom roles:
 *   System roles: resolve permissions from SYSTEM_ROLE_PERMISSIONS (in packages/types)
 *   Custom roles: query permissions[] array using GIN index
 *
 * Steps:
 * 1. Get all roles for company (prisma.role.findMany)
 * 2. Filter roles that grant target permission:
 *    - System roles: check SYSTEM_ROLE_PERMISSIONS[role.systemRoleKey]
 *    - Custom roles: permissions.includes(target)
 * 3. Get active users with those roleIds
 * 4. Bulk insert notifications
 *
 * PERFORMANCE: Uses GIN index on Role.permissions for fast lookup.
 * Required SQL: CREATE INDEX idx_role_permissions ON "Role" USING GIN (permissions);
 *
 * @param companyId - The company ID
 * @param targetPermission - The permission to filter users by
 * @param notification - Notification details
 */
export async function createNotificationsForPermission(
  companyId: string,
  targetPermission: Permission,
  notification: {
    type: NotificationType
    title: string
    message: string
    metadata?: object
  }
): Promise<void> {
  try {
    // Uses prismaAdmin: need to query roles and users across company
    // Step 1: Get all roles for the company
    const roles = await prismaAdmin.role.findMany({
      where: { companyId },
      select: {
        id: true,
        isSystemRole: true,
        systemRoleKey: true,
        permissions: true,
      },
    })

    // Step 2: Filter roles that grant the target permission
    const roleIdsWithPermission: string[] = []

    for (const role of roles) {
      let hasPermission = false

      if (role.isSystemRole && role.systemRoleKey) {
        // System role: check SYSTEM_ROLE_PERMISSIONS
        const systemPermissions = SYSTEM_ROLE_PERMISSIONS[role.systemRoleKey] || []
        hasPermission = systemPermissions.includes(targetPermission)
      } else {
        // Custom role: check permissions array
        // This uses the GIN index on Role.permissions for fast lookup
        hasPermission = (role.permissions as string[]).includes(targetPermission)
      }

      if (hasPermission) {
        roleIdsWithPermission.push(role.id)
      }
    }

    // Step 3: Get active users with those roleIds
    if (roleIdsWithPermission.length === 0) {
      // No roles have this permission
      return
    }

    const users = await prismaAdmin.user.findMany({
      where: {
        companyId,
        roleId: { in: roleIdsWithPermission },
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    // Step 4: Bulk insert notifications
    if (users.length === 0) {
      // No active users with this permission
      return
    }

    const notificationData = users.map((user) => ({
      companyId,
      userId: user.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
      isRead: false,
    }))

    await prismaAdmin.notification.createMany({
      data: notificationData,
    })
  } catch (error: unknown) {
    // Never throw - notification failures should not block business operations
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (process.env.NODE_ENV !== 'test') {
      console.error('[NOTIFICATION_ERROR] Failed to create notifications for permission:', {
        companyId,
        targetPermission,
        userCount: users.length,
        error: errorMessage,
      })
    }
  }
}
