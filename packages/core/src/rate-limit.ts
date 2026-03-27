/**
 * Rate limiting utilities using Upstash Redis REST API
 *
 * IMPORTANT: This module uses the REST API for rate limiting operations.
 * REST API is acceptable here because:
 * 1. Rate limiting can tolerate 10-30ms latency
 * 2. Not used in hot path (only on login, invite, etc.)
 * 3. Simplifies infrastructure (no extra Redis connections)
 *
 * NOTE: BullMQ workers MUST use direct Redis protocol (REDIS_URL) for job
 * processing to achieve <5ms latency. See apps/worker/src/index.ts for validation.
 *
 * Uses sliding window rate limiting for accurate rate control.
 */

import { Redis } from '@upstash/redis'
import { rateLimitExceeded } from './errors'

// Lazy initialization — only create client if rate limiting is used
let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for rate limiting'
      )
    }

    redis = new Redis({ url, token })
  }

  return redis
}

export interface RateLimitConfig {
  key: string // Unique identifier for this rate limit (e.g., 'invite-resend:email@example.com')
  limit: number // Maximum number of requests allowed
  windowSeconds: number // Time window in seconds
}

/**
 * checkRateLimit
 *
 * Checks if a rate limit has been exceeded using sliding window algorithm.
 *
 * @throws rateLimitExceeded if limit is exceeded
 * @returns remaining requests and reset time
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<{ remaining: number; resetAt: Date }> {
  const redis = getRedis()
  const now = Date.now()
  const windowStart = now - config.windowSeconds * 1000

  // Use sorted set with timestamps as scores
  const key = `ratelimit:${config.key}`

  // Remove old entries outside the window
  await redis.zremrangebyscore(key, 0, windowStart)

  // Count current requests in window
  const count = await redis.zcard(key)

  if (count >= config.limit) {
    // Get the oldest entry to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, { withScores: true })
    const resetAt = oldest.length > 0
      ? new Date((oldest[0].score as number) + config.windowSeconds * 1000)
      : new Date(now + config.windowSeconds * 1000)

    throw rateLimitExceeded(config.windowSeconds)
  }

  // Add current request
  const requestId = `${now}:${Math.random()}`
  await redis.zadd(key, { score: now, member: requestId })

  // Set expiry on the key (cleanup)
  await redis.expire(key, config.windowSeconds * 2)

  return {
    remaining: config.limit - count - 1,
    resetAt: new Date(now + config.windowSeconds * 1000),
  }
}

/**
 * getRateLimitStatus
 *
 * Gets the current rate limit status without incrementing the counter.
 */
export async function getRateLimitStatus(
  config: RateLimitConfig
): Promise<{ count: number; remaining: number; resetAt: Date }> {
  const redis = getRedis()
  const now = Date.now()
  const windowStart = now - config.windowSeconds * 1000

  const key = `ratelimit:${config.key}`

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart)

  // Count current requests
  const count = await redis.zcard(key)

  // Get oldest entry for reset time
  const oldest = await redis.zrange(key, 0, 0, { withScores: true })
  const resetAt = oldest.length > 0
    ? new Date((oldest[0].score as number) + config.windowSeconds * 1000)
    : new Date(now + config.windowSeconds * 1000)

  return {
    count,
    remaining: Math.max(0, config.limit - count),
    resetAt,
  }
}
