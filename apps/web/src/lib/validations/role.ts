import { z } from 'zod'
import { Permission } from '@docuroute/types'

/**
 * Validation schemas for custom role management.
 *
 * Platform-only permissions (PLATFORM_ADMIN_ACCESS, EMERGENCY_TRANSFER) must
 * never be assignable to custom roles. These are enforced server-side.
 */

// Platform-only permissions that cannot be assigned to custom roles
const PLATFORM_ONLY_PERMISSIONS = [
  Permission.PLATFORM_ADMIN_ACCESS,
  Permission.EMERGENCY_TRANSFER,
]

// All valid Permission enum values
const VALID_PERMISSIONS = Object.values(Permission)

/**
 * Schema for creating a new custom role
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .trim()
    .optional(),
  permissions: z
    .array(z.nativeEnum(Permission))
    .min(1, 'At least one permission must be selected')
    .refine(
      (permissions) => {
        // Check that no platform-only permissions are included
        return !permissions.some((p) => PLATFORM_ONLY_PERMISSIONS.includes(p))
      },
      {
        message: 'Platform-only permissions (PLATFORM_ADMIN_ACCESS, EMERGENCY_TRANSFER) cannot be assigned to custom roles',
      }
    ),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>

/**
 * Schema for updating a custom role
 */
export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .trim()
    .optional()
    .nullable(),
  permissions: z
    .array(z.nativeEnum(Permission))
    .min(1, 'At least one permission must be selected')
    .refine(
      (permissions) => {
        // Check that no platform-only permissions are included
        return !permissions.some((p) => PLATFORM_ONLY_PERMISSIONS.includes(p))
      },
      {
        message: 'Platform-only permissions (PLATFORM_ADMIN_ACCESS, EMERGENCY_TRANSFER) cannot be assigned to custom roles',
      }
    )
    .optional(),
})

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

/**
 * Schema for updating only the permissions array
 */
export const updatePermissionsSchema = z.object({
  permissions: z
    .array(z.nativeEnum(Permission))
    .min(1, 'At least one permission must be selected')
    .refine(
      (permissions) => {
        // Check that no platform-only permissions are included
        return !permissions.some((p) => PLATFORM_ONLY_PERMISSIONS.includes(p))
      },
      {
        message: 'Platform-only permissions (PLATFORM_ADMIN_ACCESS, EMERGENCY_TRANSFER) cannot be assigned to custom roles',
      }
    ),
})

export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>
