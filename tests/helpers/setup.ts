import { beforeAll, afterAll, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  // Note: NODE_ENV is read-only and automatically set by vitest
  // process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32bytes';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_REGION = 'ap-southeast-1';
});

afterEach(() => {
  // Cleanup after each test if needed
});

afterAll(() => {
  // Final cleanup
});
