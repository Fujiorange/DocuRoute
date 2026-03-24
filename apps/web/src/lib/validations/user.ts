import { z } from 'zod'

/**
 * Validation schemas for user management.
 *
 * All user operations use roleId (FK to Role table), not role name strings.
 * Email validation follows RFC 5322 simplified pattern.
 */

/**
 * Schema for inviting a new user
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  roleId: z
    .string()
    .min(1, 'Role is required')
    .trim(),
  name: z
    .string()
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

/**
 * Schema for changing a user's role
 */
export const changeUserRoleSchema = z.object({
  roleId: z
    .string()
    .min(1, 'Role is required')
    .trim(),
})

export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>
