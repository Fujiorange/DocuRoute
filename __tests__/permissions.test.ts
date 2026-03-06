import { describe, it, expect } from "vitest";
import { hasPermission, Permission, Role, canAccessFolder } from "@/lib/permissions";

describe("RBAC Permissions", () => {
  it("IT Admin should have all permissions", () => {
    expect(hasPermission(Role.IT_ADMIN, Permission.COMPANY_UPDATE)).toBe(true);
    expect(hasPermission(Role.IT_ADMIN, Permission.DOCUMENT_DELETE)).toBe(true);
    expect(hasPermission(Role.IT_ADMIN, Permission.USER_INVITE)).toBe(true);
    expect(hasPermission(Role.IT_ADMIN, Permission.DOCUMENT_APPROVE)).toBe(true);
  });

  it("Engineer should not have delete permission", () => {
    expect(hasPermission(Role.ENGINEER, Permission.DOCUMENT_DELETE)).toBe(false);
    expect(hasPermission(Role.ENGINEER, Permission.DOCUMENT_CREATE)).toBe(true);
    expect(hasPermission(Role.ENGINEER, Permission.DOCUMENT_VIEW)).toBe(true);
  });

  it("Client should have read-only access", () => {
    expect(hasPermission(Role.CLIENT, Permission.DOCUMENT_VIEW)).toBe(true);
    expect(hasPermission(Role.CLIENT, Permission.DOCUMENT_CREATE)).toBe(false);
    expect(hasPermission(Role.CLIENT, Permission.PROJECT_CREATE)).toBe(false);
  });

  it("Project Admin should be able to approve documents", () => {
    expect(hasPermission(Role.PROJECT_ADMIN, Permission.DOCUMENT_APPROVE)).toBe(true);
    expect(hasPermission(Role.PROJECT_ADMIN, Permission.USER_INVITE)).toBe(true);
  });

  it("CLIENT cannot DOCUMENT_DELETE or DOCUMENT_APPROVE", () => {
    expect(hasPermission(Role.CLIENT, Permission.DOCUMENT_DELETE)).toBe(false);
    expect(hasPermission(Role.CLIENT, Permission.DOCUMENT_APPROVE)).toBe(false);
  });

  it("CLIENT cannot PROJECT_CREATE", () => {
    expect(hasPermission(Role.CLIENT, Permission.PROJECT_CREATE)).toBe(false);
  });

  it("ENGINEER cannot DOCUMENT_APPROVE", () => {
    expect(hasPermission(Role.ENGINEER, Permission.DOCUMENT_APPROVE)).toBe(false);
  });

  it("hasPermission returns false for unknown role string", () => {
    expect(hasPermission("unknown_role" as any, Permission.DOCUMENT_VIEW)).toBe(false);
  });

  it("hasPermission returns false for empty string role", () => {
    expect(hasPermission("" as any, Permission.DOCUMENT_VIEW)).toBe(false);
  });

  it("canAccessFolder allows non-client roles without folder list", () => {
    expect(canAccessFolder(Role.IT_ADMIN, "folder123", [])).toBe(true);
    expect(canAccessFolder(Role.PROJECT_ADMIN, "folder456", [])).toBe(true);
    expect(canAccessFolder(Role.ENGINEER, "folder789", [])).toBe(true);
  });

  it("canAccessFolder denies client if folderId not in allowed list", () => {
    const allowedFolders = ["folder1", "folder2"];
    expect(canAccessFolder(Role.CLIENT, "folder3", allowedFolders)).toBe(false);
  });

  it("canAccessFolder allows client if folderId is in allowed list", () => {
    const allowedFolders = ["folder1", "folder2"];
    expect(canAccessFolder(Role.CLIENT, "folder1", allowedFolders)).toBe(true);
    expect(canAccessFolder(Role.CLIENT, "folder2", allowedFolders)).toBe(true);
  });
});
