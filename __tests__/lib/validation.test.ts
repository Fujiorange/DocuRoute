import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  DocumentUploadSchema,
  FolderCreateSchema,
  CommentSchema,
  SearchSchema,
} from "../../lib/validation";

describe("Validation Schemas", () => {
  describe("RegisterSchema", () => {
    it("should reject password without uppercase", () => {
      const result = RegisterSchema.safeParse({
        companyName: "Test Company",
        email: "test@example.com",
        password: "lowercase123",
        name: "Test User",
      });

      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const result = RegisterSchema.safeParse({
        companyName: "Test Company",
        email: "test@example.com",
        password: "NoNumbers",
        name: "Test User",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const result = RegisterSchema.safeParse({
        companyName: "Test Company",
        email: "not-an-email",
        password: "ValidPass123",
        name: "Test User",
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid registration data", () => {
      const result = RegisterSchema.safeParse({
        companyName: "Test Company",
        email: "test@example.com",
        password: "ValidPass123",
        name: "Test User",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("FolderCreateSchema", () => {
    it("should reject name with path traversal characters", () => {
      const testCases = [
        "../../etc",
        "folder\\system",
        "file:test",
        "folder*wildcard",
        'folder"quote',
        "folder<tag>",
      ];

      testCases.forEach((name) => {
        const result = FolderCreateSchema.safeParse({
          name,
          description: "Test folder",
        });

        expect(result.success).toBe(false);
      });
    });

    it("should accept valid folder name", () => {
      const result = FolderCreateSchema.safeParse({
        name: "Valid Folder Name 123",
        description: "This is a valid folder",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("SearchSchema", () => {
    it("should coerce limit to number", () => {
      const result = SearchSchema.safeParse({
        q: "test query",
        limit: "50", // String that should be coerced
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.limit).toBe("number");
        expect(result.data.limit).toBe(50);
      }
    });

    it("should apply default values", () => {
      const result = SearchSchema.safeParse({
        q: "test query",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("should reject limit over 100", () => {
      const result = SearchSchema.safeParse({
        q: "test query",
        limit: 500,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("DocumentUploadSchema", () => {
    it("should reject title over 255 chars", () => {
      const longTitle = "a".repeat(256);
      const result = DocumentUploadSchema.safeParse({
        title: longTitle,
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid document data", () => {
      const result = DocumentUploadSchema.safeParse({
        title: "Test Document",
        description: "This is a test",
        phase: "construction",
        tags: ["test", "document"],
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid phase", () => {
      const result = DocumentUploadSchema.safeParse({
        title: "Test Document",
        phase: "invalid-phase",
      });

      expect(result.success).toBe(false);
    });

    it("should reject more than 10 tags", () => {
      const result = DocumentUploadSchema.safeParse({
        title: "Test Document",
        tags: Array(11).fill("tag"),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("CommentSchema", () => {
    it("should reject empty content", () => {
      const result = CommentSchema.safeParse({
        content: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject content over 2000 chars", () => {
      const result = CommentSchema.safeParse({
        content: "a".repeat(2001),
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid comment", () => {
      const result = CommentSchema.safeParse({
        content: "This is a valid comment",
        parentId: "clxxxx1234567890abcdef", // Valid CUID format
      });

      expect(result.success).toBe(true);
    });

    it("should accept comment without parentId", () => {
      const result = CommentSchema.safeParse({
        content: "This is a valid comment",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("LoginSchema", () => {
    it("should accept valid login credentials", () => {
      const result = LoginSchema.safeParse({
        email: "user@example.com",
        password: "anypassword",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = LoginSchema.safeParse({
        email: "not-an-email",
        password: "password",
      });

      expect(result.success).toBe(false);
    });
  });
});
