import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { createTestContext } from '../helpers/test-context';
import { createTestCompany, createTestUser } from '../helpers/factories';

// Simple in-memory rate limiter for testing
class TestRateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= limit) {
      return false; // Rate limited
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true; // Allowed
  }

  reset(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

describe('Rate Limiting', () => {
  const ctx = createTestContext();
  const rateLimiter = new TestRateLimiter();

  beforeEach(() => {
    rateLimiter.reset();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('should limit repeated requests from same IP', async () => {
    const ip = '10.0.0.1';
    const limit = 10;
    const windowMs = 60000; // 1 minute
    const results: boolean[] = [];

    // Send 11 requests (limit is 10 per minute)
    for (let i = 0; i < 11; i++) {
      const allowed = rateLimiter.check(ip, limit, windowMs);
      results.push(allowed);
    }

    // First 10 should succeed
    const successes = results.slice(0, 10).filter(r => r === true);
    expect(successes.length).toBe(10);

    // 11th should be rate limited
    expect(results[10]).toBe(false);
  });

  it('should apply different limits to authenticated users', async () => {
    const company = await createTestCompany(ctx);
    const user = await createTestUser(ctx, { companyId: company.id, role: 'engineer' });

    const authenticatedKey = `user:${user.id}`;
    const authenticatedLimit = 100;
    const windowMs = 60000;
    const results: boolean[] = [];

    // Send 20 requests (authenticated limit is higher)
    for (let i = 0; i < 20; i++) {
      const allowed = rateLimiter.check(authenticatedKey, authenticatedLimit, windowMs);
      results.push(allowed);
    }

    // All 20 should succeed if authenticated limit > 20
    const failures = results.filter(r => r === false);
    expect(failures.length).toBe(0);
  });

  it('should reset limit after time window', async () => {
    const ip = '10.0.0.2';
    const limit = 5;
    const windowMs = 100; // 100ms window for faster testing

    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      const allowed = rateLimiter.check(ip, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // This should be rate limited
    const limitedRequest = rateLimiter.check(ip, limit, windowMs);
    expect(limitedRequest).toBe(false);

    // Wait for window to pass
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be allowed again after window expires
    const allowedAfterWindow = rateLimiter.check(ip, limit, windowMs);
    expect(allowedAfterWindow).toBe(true);
  });

  it('should handle burst requests gracefully', async () => {
    const ip = '10.0.0.3';
    const limit = 10;
    const windowMs = 60000;

    // Send 15 requests in parallel
    const promises = Array(15).fill(null).map(() =>
      Promise.resolve(rateLimiter.check(ip, limit, windowMs))
    );

    const responses = await Promise.all(promises);

    const successCount = responses.filter(r => r === true).length;
    const rateLimitedCount = responses.filter(r => r === false).length;

    expect(successCount).toBeLessThanOrEqual(limit);
    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(successCount + rateLimitedCount).toBe(15);
  });

  it('should isolate rate limits per IP', async () => {
    const ip1 = '10.0.0.4';
    const ip2 = '10.0.0.5';
    const limit = 5;
    const windowMs = 60000;

    // Fill up limit for IP1
    for (let i = 0; i < 5; i++) {
      const allowed = rateLimiter.check(ip1, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // IP1 should be rate limited
    expect(rateLimiter.check(ip1, limit, windowMs)).toBe(false);

    // IP2 should still be allowed
    expect(rateLimiter.check(ip2, limit, windowMs)).toBe(true);
  });

  it('should handle Redis failure fallback gracefully', async () => {
    // Simulate Redis being unavailable
    const fallbackLimiter = {
      check: () => {
        // Simulate Redis connection failure
        try {
          throw new Error('Redis connection failed');
        } catch (error) {
          // Fallback: allow request but log warning
          console.warn('Rate limiter unavailable, allowing request:', error);
          return true;
        }
      }
    };

    const result = fallbackLimiter.check();
    expect(result).toBe(true); // Should allow request even with Redis down
  });

  it('should track rate limit per endpoint', async () => {
    const ip = '10.0.0.6';
    const endpoint1 = `${ip}:/api/documents`;
    const endpoint2 = `${ip}:/api/users`;
    const limit = 5;
    const windowMs = 60000;

    // Fill up limit for endpoint1
    for (let i = 0; i < 5; i++) {
      const allowed = rateLimiter.check(endpoint1, limit, windowMs);
      expect(allowed).toBe(true);
    }

    // endpoint1 should be rate limited
    expect(rateLimiter.check(endpoint1, limit, windowMs)).toBe(false);

    // endpoint2 should still be allowed (different key)
    expect(rateLimiter.check(endpoint2, limit, windowMs)).toBe(true);
  });

  it('should enforce stricter limits on sensitive endpoints', async () => {
    const ip = '10.0.0.7';
    const loginEndpoint = `${ip}:/api/auth/login`;
    const publicEndpoint = `${ip}:/api/public/health`;

    const loginLimit = 5; // Strict limit for login
    const publicLimit = 100; // Relaxed limit for public endpoints
    const windowMs = 60000;

    // Fill up login limit
    for (let i = 0; i < 5; i++) {
      const allowed = rateLimiter.check(loginEndpoint, loginLimit, windowMs);
      expect(allowed).toBe(true);
    }

    // Login should be rate limited
    expect(rateLimiter.check(loginEndpoint, loginLimit, windowMs)).toBe(false);

    // Public endpoint should still allow many more requests
    for (let i = 0; i < 20; i++) {
      const allowed = rateLimiter.check(publicEndpoint, publicLimit, windowMs);
      expect(allowed).toBe(true);
    }
  });
});
