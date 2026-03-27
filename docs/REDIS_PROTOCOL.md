# Redis Protocol Usage in DocuRoute

## Overview

DocuRoute uses Redis for two distinct purposes, each with different latency requirements. This document explains when to use direct Redis protocol vs. REST API.

## Two Redis Connection Types

### 1. Direct Redis Protocol (TCP)
**Environment Variable**: `REDIS_URL`
**Format**: `redis://[user[:password]@]host[:port][/database]`
**Client**: `ioredis` (for BullMQ)
**Latency**: <5ms
**Use Cases**: Job queues, hot path operations

### 2. REST API (HTTP)
**Environment Variables**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
**Format**: `https://...upstash.io`
**Client**: `@upstash/redis`
**Latency**: 10-30ms
**Use Cases**: Rate limiting, permission caching, cold path operations

## Usage Matrix

| Module | Redis Type | Latency | Justification |
|--------|-----------|---------|---------------|
| BullMQ Workers | Direct Protocol | <5ms | Job processing is hot path, needs low latency for high throughput |
| Rate Limiting | REST API | 10-30ms | Rate limits checked on login/invite only, latency acceptable |
| Permission Cache | REST API | 10-30ms | Permissions cached in memory after first lookup, REST latency acceptable |
| Job Queue Status | Direct Protocol | <5ms | Real-time queue metrics need low latency |

## Code Examples

### Direct Redis Protocol (BullMQ)

```typescript
// apps/worker/src/workers/watermark.worker.ts
import { Worker, Queue } from 'bullmq'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// BullMQ requires direct protocol for low-latency job processing
const watermarkQueue = new Queue('watermark', {
  connection: { url: REDIS_URL },
})

const watermarkWorker = new Worker('watermark', jobHandler, {
  connection: { url: REDIS_URL },
  concurrency: 4,
})
```

**Why Direct Protocol?**
- BullMQ polls for jobs every few milliseconds
- 10-30ms REST API latency would significantly reduce throughput
- With 4 workers and 20 jobs/min, REST API would add 400-1200ms overhead per minute
- Direct protocol keeps overhead <100ms per minute

### REST API (Rate Limiting)

```typescript
// packages/core/src/rate-limit.ts
import { Redis } from '@upstash/redis'

// Rate limiting uses REST API because:
// 1. Only checked on login, invite, etc. (not hot path)
// 2. 10-30ms latency acceptable for these operations
// 3. Simplifies infrastructure (no extra connections)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function checkRateLimit(config: RateLimitConfig) {
  // REST API call - 10-30ms latency is acceptable here
  const count = await redis.zcard(`ratelimit:${config.key}`)
  // ...
}
```

**Why REST API?**
- Rate limiting happens on user actions (login, invite resend)
- These operations already take 200-500ms (network + auth + DB)
- 10-30ms additional latency is <5% overhead
- Users don't notice the difference

### REST API (Permission Cache)

```typescript
// packages/core/src/permission-cache.ts
import { Redis } from '@upstash/redis'

// Permission caching uses REST API because:
// 1. Permissions looked up once per request
// 2. Cached in memory after first lookup
// 3. 10-30ms acceptable for auth middleware
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCachedPermissions(
  companyId: string,
  roleId: string,
  version: number
) {
  const key = `permissions:${companyId}:${roleId}:v${version}`
  // REST API call - happens once per session
  const cached = await redis.get<string>(key)
  return cached ? JSON.parse(cached) : null
}
```

**Why REST API?**
- Permissions fetched once per request
- Subsequent permission checks use in-memory cache
- Auth middleware already adds 20-50ms overhead
- 10-30ms is acceptable in this context

## Environment Variable Configuration

### Development (.env)
```bash
# Direct Redis Protocol (BullMQ)
REDIS_URL=redis://localhost:6379

# REST API (Rate Limiting, Permissions)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Production (Render)
```yaml
# render.yaml
services:
  - type: worker
    name: docuroute-worker
    envVars:
      # Direct protocol for BullMQ
      - key: REDIS_URL
        sync: false  # Set via Render dashboard

      # REST API for rate limiting/permissions
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
```

## Validation and Error Handling

### Worker Validation (Required)

```typescript
// apps/worker/src/index.ts
const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  console.error('CRITICAL: REDIS_URL must be set for BullMQ worker')
  console.error('BullMQ requires direct Redis protocol connection')
  console.error('Expected format: redis://[user[:password]@]host[:port][/database]')
  process.exit(1)
}
```

**Why Validation?**
- Prevents worker from starting with REST API URL
- Fails fast instead of causing mysterious performance issues
- Clear error message for developers

### REST API Fallback

```typescript
// packages/core/src/rate-limit.ts
function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set'
      )
    }

    redis = new Redis({ url, token })
  }
  return redis
}
```

## Performance Impact

### Scenario: 50 watermark jobs/hour with REST API

**With Direct Protocol:**
- Job poll latency: 2ms × 50 = 100ms
- Job update latency: 2ms × 50 = 100ms
- **Total overhead: 200ms/hour**

**With REST API:**
- Job poll latency: 20ms × 50 = 1,000ms
- Job update latency: 20ms × 50 = 1,000ms
- **Total overhead: 2,000ms/hour (10x slower)**

### Scenario: 100 rate limit checks/hour with Direct Protocol

**With REST API:**
- Rate limit check: 20ms × 100 = 2,000ms
- **Total overhead: 2,000ms/hour**

**With Direct Protocol:**
- Rate limit check: 2ms × 100 = 200ms
- **Savings: 1,800ms/hour**
- **But**: Adds complexity (extra connection pool, health checks)
- **Verdict**: Not worth the complexity for rate limiting

## Migration Notes

### Before (All REST API)
```typescript
// ❌ Problem: BullMQ using REST API
const watermarkWorker = new Worker('watermark', jobHandler, {
  connection: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }
})
// Result: 10-30ms latency per job = reduced throughput
```

### After (Direct Protocol for BullMQ)
```typescript
// ✅ Solution: Direct Redis protocol
const watermarkWorker = new Worker('watermark', jobHandler, {
  connection: {
    url: process.env.REDIS_URL  // redis://...
  }
})
// Result: <5ms latency = 4-6x better throughput
```

## Troubleshooting

### Issue: "REDIS_URL must be set" error
**Cause**: Worker started without REDIS_URL environment variable
**Solution**: Add REDIS_URL to Render environment variables

### Issue: BullMQ jobs slow to process
**Cause**: BullMQ using REST API instead of direct protocol
**Solution**: Verify REDIS_URL is set and uses `redis://` scheme

### Issue: Rate limiting fails with "UPSTASH_REDIS_REST_URL not set"
**Cause**: Missing REST API credentials
**Solution**: Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

### Issue: Permissions not caching
**Cause**: Redis connection failure
**Solution**: Check REST API credentials and network connectivity

## Best Practices

1. **Always use direct protocol for BullMQ workers**
   - Job processing is hot path
   - Low latency critical for throughput

2. **Use REST API for rate limiting and caching**
   - Cold path operations
   - Latency acceptable
   - Simpler infrastructure

3. **Validate REDIS_URL on worker startup**
   - Fail fast if missing
   - Clear error messages

4. **Document Redis usage in code comments**
   - Explain why REST API or direct protocol
   - Help future developers understand trade-offs

5. **Monitor Redis latency**
   - Alert if latency exceeds expected range
   - Direct protocol: >10ms is problem
   - REST API: >50ms is problem

## Summary

| When to Use | Redis Type | Why |
|-------------|-----------|-----|
| **Hot Path** (BullMQ, real-time ops) | Direct Protocol | <5ms latency required |
| **Cold Path** (auth, rate limiting) | REST API | 10-30ms acceptable, simpler |
| **Caching** (permissions, sessions) | REST API | One-time lookup, then in-memory |
| **High Throughput** (job queues) | Direct Protocol | Latency compounds with volume |

**Key Takeaway**: Use direct Redis protocol for job processing (BullMQ), REST API for everything else. The 4-6x latency difference matters for hot paths but not for cold paths.
