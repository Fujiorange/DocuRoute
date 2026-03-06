// Vitest setup file
import { beforeAll } from "vitest";

beforeAll(() => {
  // Set up test environment variables
  // Note: NODE_ENV is read-only and automatically set by vitest
  // process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests-only";
  process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});
