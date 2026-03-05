import { describe, it, expect } from "vitest";
import { hasPermission, Permission, Role } from "@/lib/permissions";

describe("RBAC Permissions", () => {
  it("IT Admin should have all permissions", () => {
    expect(hasPermission(Role.IT_ADMIN, Permission.COMPANY_UPDATE)).toBe(true);
    expect(hasPermission(Role.IT_ADMIN, Permission.DOCUMENT_DELETE)).toBe(true);
    expect(hasPermission(Role.IT_ADMIN, Permission.USER_INVITE)).toBe(true);
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
});
