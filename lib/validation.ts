import { z } from "zod";

/**
 * Registration schema
 */
export const RegisterSchema = z.object({
  companyName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2).max(100),
});

/**
 * Login schema
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Document upload schema
 */
export const DocumentUploadSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  projectId: z.string().cuid().optional(),
  folderId: z.string().cuid().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  phase: z
    .enum(["design", "construction", "handover", "maintenance", "other"])
    .optional(),
});

/**
 * Folder create schema
 */
export const FolderCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[^\/\\:*?"<>|]+$/, "Folder name cannot contain special characters: / \\ : * ? \" < > |"),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
});

/**
 * Comment schema
 */
export const CommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().cuid().optional(),
});

/**
 * Search schema
 */
export const SearchSchema = z.object({
  q: z.string().min(1).max(200),
  projectId: z.string().cuid().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
  phase: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Project create schema
 */
export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

/**
 * Invitation create schema
 */
export const InvitationCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["it_admin", "project_admin", "engineer", "client"]),
});

/**
 * Document approval schema
 */
export const DocumentApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

/**
 * Password reset request schema
 */
export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

/**
 * Password reset schema
 */
export const PasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * User update schema
 */
export const UserUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["it_admin", "project_admin", "engineer", "client"]).optional(),
  isActive: z.boolean().optional(),
});
