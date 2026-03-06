import { describe, it, expect } from "vitest";
import { guardResourceAccess } from "../../lib/tenant-guard";

describe("Tenant Guard", () => {
  const userCompanyId = "company123";

  it("should return resource when companyId matches", async () => {
    const resource = {
      id: "doc1",
      companyId: "company123",
      title: "Test Document",
    };

    const result = await guardResourceAccess(resource, userCompanyId, "Document");
    expect(result).toEqual(resource);
  });

  it("should throw 404 when resource is null", async () => {
    const resource = null;

    try {
      await guardResourceAccess(resource, userCompanyId, "Document");
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toBe("Document not found");
      expect(error.statusCode).toBe(404);
    }
  });

  it("should throw 404 (not 403) when companyId does not match to prevent enumeration", async () => {
    const resource = {
      id: "doc1",
      companyId: "differentCompany",
      title: "Secret Document",
    };

    try {
      await guardResourceAccess(resource, userCompanyId, "Document");
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toBe("Document not found");
      expect(error.statusCode).toBe(404); // Not 403, to prevent enumeration
    }
  });

  it("should use custom resource name in error message", async () => {
    const resource = null;

    try {
      await guardResourceAccess(resource, userCompanyId, "Project");
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toBe("Project not found");
    }
  });

  it("should work with different resource types", async () => {
    const folder = {
      id: "folder1",
      companyId: "company123",
      name: "Documents",
    };

    const result = await guardResourceAccess(folder, userCompanyId, "Folder");
    expect(result).toEqual(folder);
  });

  it("should prevent cross-tenant access attempt", async () => {
    const attackerCompanyId = "attacker-company";
    const victimResource = {
      id: "sensitive-doc",
      companyId: "victim-company",
      title: "Confidential",
    };

    try {
      await guardResourceAccess(victimResource, attackerCompanyId, "Document");
      expect.fail("Should have prevented access");
    } catch (error: any) {
      expect(error.statusCode).toBe(404);
      expect(error.message).not.toContain("Forbidden"); // Should not reveal existence
    }
  });
});
