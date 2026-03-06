# Security Testing Guide for DocuRoute

This guide will help you test all security features implemented in DocuRoute, even if you have **zero experience** with security testing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Understanding the Tests](#understanding-the-tests)
4. [Running the Tests](#running-the-tests)
5. [Expected Results](#expected-results)
6. [Failure Scenarios](#failure-scenarios)
7. [Fixing Common Issues](#fixing-common-issues)
8. [Advanced Testing](#advanced-testing)

---

## Prerequisites

Before you start testing, make sure you have:

✅ **Node.js 20 or higher** installed
```bash
node --version  # Should show v20.x.x or higher
```

✅ **npm** installed (comes with Node.js)
```bash
npm --version   # Should show 8.x.x or higher
```

✅ **Git** installed
```bash
git --version   # Should show git version 2.x.x or higher
```

✅ **DocuRoute repository** cloned
```bash
cd /path/to/DocuRoute
```

✅ **Dependencies installed**
```bash
npm install
```

---

## Quick Start

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Fujiorange/DocuRoute.git
cd DocuRoute

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Step 2: Run Security Tests

```bash
# Run the comprehensive security test suite
npm test tests/security-comprehensive.test.ts
```

### Step 3: Check Results

Look for this in the output:

✅ **PASSING** - All tests pass:
```
✓ Security Test 1: AES-256-GCM Encryption (5)
✓ Security Test 2: Zod Input Validation (6)
✓ Security Test 3: Rate Limiting with Redis Fallback (4)
✓ Security Test 4: JWT Authentication (4)
✓ Security Test 5: Password Hashing with bcrypt (5)
✓ Security Test 6: Multi-Tenant Data Isolation (4)

Test Files  1 passed (1)
     Tests  28 passed (28)
```

❌ **FAILING** - Some tests fail:
```
✗ should use 12-byte IV for GCM mode (CRITICAL)
  Expected: 12
  Received: 16

Test Files  1 failed (1)
     Tests  1 failed, 27 passed (28)
```

---

## Understanding the Tests

### What Each Test Suite Covers

#### 1️⃣ **AES-256-GCM Encryption Tests** (5 tests)

**What it tests:**
- File encryption uses secure 12-byte IV (not 16-byte)
- Authentication tags prevent data tampering
- Wrong encryption keys are rejected
- Large files (5MB) encrypt correctly

**Why it matters:**
- Protects sensitive documents from unauthorized access
- Detects if files are tampered with
- Ensures NIST-recommended encryption standards

**Example failure:**
```
❌ should use 12-byte IV for GCM mode (CRITICAL)
   Expected IV length: 12 bytes
   Received IV length: 16 bytes
```

---

#### 2️⃣ **Zod Input Validation Tests** (6 tests)

**What it tests:**
- Email addresses are validated
- Passwords meet minimum requirements
- SQL injection attempts are blocked
- XSS payloads are sanitized

**Why it matters:**
- Prevents attackers from injecting malicious code
- Ensures data quality and consistency
- Protects against common web vulnerabilities

**Example failure:**
```
❌ should reject invalid email format
   Input: "notanemail"
   Expected: Validation error
   Received: Accepted (VULNERABILITY!)
```

---

#### 3️⃣ **Rate Limiting Tests** (4 tests)

**What it tests:**
- API blocks requests after 100 requests per 15 minutes
- Different IPs have separate rate limits
- System falls back to in-memory when Redis unavailable
- Rate limits reset after time window

**Why it matters:**
- Prevents brute-force attacks
- Protects against denial-of-service (DoS)
- Ensures fair resource usage

**Example failure:**
```
❌ should block requests after limit exceeded
   Request #101 should be blocked
   Received: Allowed (NO RATE LIMITING!)
```

---

#### 4️⃣ **JWT Authentication Tests** (4 tests)

**What it tests:**
- JWT tokens are signed correctly
- Tampered tokens are rejected
- Expired tokens are rejected
- Wrong secrets are rejected

**Why it matters:**
- Ensures only authenticated users access the system
- Prevents session hijacking
- Detects token forgery

**Example failure:**
```
❌ should reject tampered JWT tokens
   Tampered token with role changed from ENGINEER to IT_ADMIN
   Expected: Error
   Received: Accepted (CRITICAL VULNERABILITY!)
```

---

#### 5️⃣ **Password Hashing Tests** (5 tests)

**What it tests:**
- Passwords are hashed with bcrypt
- Correct passwords verify successfully
- Wrong passwords are rejected
- Each hash is unique (salt is random)
- Fake hashes are rejected

**Why it matters:**
- Passwords are never stored in plaintext
- Even with database breach, passwords remain secure
- Industry-standard hashing (bcrypt with cost factor 10)

**Example failure:**
```
❌ should hash passwords with bcrypt
   Stored password: "MySecurePassword123" (PLAINTEXT!)
   Expected: Bcrypt hash starting with $2b$
```

---

#### 6️⃣ **Multi-Tenant Isolation Tests** (4 tests)

**What it tests:**
- Data is filtered by company ID
- Users cannot access other companies' data
- Each company has unique subdomain
- API responses don't leak cross-tenant data

**Why it matters:**
- Company A cannot see Company B's documents
- Prevents data breaches between tenants
- Critical for SaaS compliance

**Example failure:**
```
❌ should prevent cross-company data access
   User from Company A accessed document from Company B
   Expected: Access denied
   Received: Access granted (DATA LEAK!)
```

---

## Running the Tests

### Run All Security Tests

```bash
npm test tests/security-comprehensive.test.ts
```

### Run Specific Test Suite

```bash
# Test only encryption
npm test tests/security-comprehensive.test.ts -t "AES-256-GCM"

# Test only validation
npm test tests/security-comprehensive.test.ts -t "Zod Input Validation"

# Test only rate limiting
npm test tests/security-comprehensive.test.ts -t "Rate Limiting"

# Test only authentication
npm test tests/security-comprehensive.test.ts -t "JWT Authentication"

# Test only password hashing
npm test tests/security-comprehensive.test.ts -t "Password Hashing"

# Test only multi-tenancy
npm test tests/security-comprehensive.test.ts -t "Multi-Tenant"
```

### Run with Detailed Output

```bash
npm test tests/security-comprehensive.test.ts -- --reporter=verbose
```

### Run with Coverage

```bash
npm run test:coverage -- tests/security-comprehensive.test.ts
```

---

## Expected Results

### ✅ All Tests Passing (Secure Implementation)

```
 ✓ tests/security-comprehensive.test.ts (28)
   ✓ Security Test 1: AES-256-GCM Encryption (5)
     ✓ should use 12-byte IV for GCM mode (CRITICAL)
     ✓ should NOT work with 16-byte IV (demonstrates the bug)
     ✓ should detect tampered ciphertext with auth tag
     ✓ should fail decryption with wrong key
     ✓ should handle large file encryption
   ✓ Security Test 2: Zod Input Validation (6)
     ✓ should accept valid login input
     ✓ should reject invalid email format
     ✓ should reject empty password
     ✓ should treat SQL injection as invalid string
     ✓ should enforce minimum password length on registration
     ✓ should sanitize XSS payloads in input
   ✓ Security Test 3: Rate Limiting with Redis Fallback (4)
     ✓ should block requests after limit exceeded
     ✓ should isolate rate limits per IP address
     ✓ should fallback to in-memory when Redis unavailable
     ✓ should reset limit after time window expires
   ✓ Security Test 4: JWT Authentication (4)
     ✓ should sign and verify JWT tokens
     ✓ should reject tampered JWT tokens
     ✓ should reject expired JWT tokens
     ✓ should reject JWT signed with wrong secret
   ✓ Security Test 5: Password Hashing with bcrypt (5)
     ✓ should hash passwords with bcrypt
     ✓ should verify correct password
     ✓ should reject wrong password
     ✓ should generate unique hash for same password
     ✓ should reject fake hash formats
   ✓ Security Test 6: Multi-Tenant Data Isolation (4)
     ✓ should filter data by companyId
     ✓ should prevent cross-company data access
     ✓ should use unique subdomains per company
     ✓ should not leak other company data in API responses

 Test Files  1 passed (1)
      Tests  28 passed (28)
   Start at  10:30:45
   Duration  1.23s
```

**What this means:**
- ✅ All security features are implemented correctly
- ✅ System is protected against common vulnerabilities
- ✅ Safe to deploy to production

---

## Failure Scenarios

### ❌ Encryption IV Size Wrong

```
FAIL tests/security-comprehensive.test.ts > Security Test 1: AES-256-GCM Encryption > should use 12-byte IV for GCM mode (CRITICAL)

AssertionError: expected 16 to be 12

Expected: 12 (bytes)
Received: 16 (bytes)
```

**What this means:**
- Encryption is using 16-byte IV instead of 12-byte
- Not following NIST recommendations for GCM mode
- Reduces security margin

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

### ❌ No Input Validation

```
FAIL tests/security-comprehensive.test.ts > Security Test 2: Zod Input Validation > should reject invalid email format

AssertionError: expected false to be true

Input: "notanemail"
Expected: Validation error
Received: Accepted
```

**What this means:**
- API endpoints are not validating input
- Vulnerable to SQL injection, XSS, and data corruption
- Missing Zod schema validation

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

### ❌ No Rate Limiting

```
FAIL tests/security-comprehensive.test.ts > Security Test 3: Rate Limiting > should block requests after limit exceeded

AssertionError: expected false to be true

Request #101 should be blocked
Received: Allowed
```

**What this means:**
- API has no rate limiting
- Vulnerable to brute-force attacks
- Can be easily DoS'd

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

### ❌ JWT Not Verified

```
FAIL tests/security-comprehensive.test.ts > Security Test 4: JWT Authentication > should reject tampered JWT tokens

Expected: Error (invalid signature)
Received: Token accepted
```

**What this means:**
- JWT tokens are not being verified
- Anyone can forge authentication tokens
- **CRITICAL SECURITY VULNERABILITY**

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

### ❌ Passwords in Plaintext

```
FAIL tests/security-comprehensive.test.ts > Security Test 5: Password Hashing > should hash passwords with bcrypt

Expected: Hash starting with $2b$
Received: "MySecurePassword123" (plaintext)
```

**What this means:**
- Passwords are stored in plaintext
- Database breach exposes all passwords
- **CRITICAL SECURITY VULNERABILITY**

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

### ❌ Cross-Tenant Data Leak

```
FAIL tests/security-comprehensive.test.ts > Security Test 6: Multi-Tenant > should prevent cross-company data access

User from Company A accessed Company B's document
Expected: Access denied
Received: Access granted
```

**What this means:**
- Multi-tenant isolation is broken
- Companies can see each other's data
- **CRITICAL COMPLIANCE VIOLATION**

**How to fix:** [See Fixing Common Issues](#fixing-common-issues)

---

## Fixing Common Issues

### Fix 1: Correct GCM IV Size

**Problem:** Using 16-byte IV instead of 12-byte for GCM mode

**File:** `lib/storage.ts`

**Before (WRONG):**
```typescript
function encrypt(data: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16); // WRONG: 16 bytes
  const key = Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  // ...
}
```

**After (CORRECT):**
```typescript
function encrypt(data: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12); // CORRECT: 12 bytes for GCM
  const key = Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  // ...
}
```

**Also update tests:** `tests/documents/encryption.test.ts`
- Change all `crypto.randomBytes(16)` to `crypto.randomBytes(12)`
- Change IV length expectation from 32 to 24 characters (12 bytes = 24 hex chars)

---

### Fix 2: Add Zod Validation

**Problem:** API endpoints not validating input

**File:** `app/api/auth/login/route.ts`

**Before (MISSING):**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body; // NO VALIDATION!
  // ...
}
```

**After (CORRECT):**
```typescript
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(255),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password } = validation.data;
  // ...
}
```

**Repeat for:** `app/api/auth/register/route.ts` and all other POST/PATCH endpoints

---

### Fix 3: Implement Rate Limiting

**Problem:** No rate limiting on API endpoints

**File:** `lib/rate-limit.ts`

**Add this code:**
```typescript
import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const MAX_REQUESTS = 100;
const WINDOW_MS = 900000; // 15 minutes

export async function rateLimit(identifier: string): Promise<{
  success: boolean;
  remaining: number;
  resetTime: number;
}> {
  const now = Date.now();
  const record = store[identifier];

  if (!record || record.resetTime < now) {
    store[identifier] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return { success: true, remaining: MAX_REQUESTS - 1, resetTime: store[identifier].resetTime };
  }

  if (record.count < MAX_REQUESTS) {
    record.count++;
    return { success: true, remaining: MAX_REQUESTS - record.count, resetTime: record.resetTime };
  }

  return { success: false, remaining: 0, resetTime: record.resetTime };
}
```

**Then apply to endpoints:**
```typescript
// In your API route
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateLimitResult = await rateLimit(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // ... rest of your endpoint code
}
```

---

### Fix 4: Verify JWT Tokens

**Problem:** JWT tokens not verified properly

**File:** `lib/auth.ts`

**Ensure you have:**
```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export function signToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET); // NEVER skip verification!
}
```

**In middleware:**
```typescript
export async function requireAuth(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
```

---

### Fix 5: Hash Passwords with bcrypt

**Problem:** Passwords stored in plaintext

**File:** `app/api/auth/register/route.ts`

**Before (WRONG):**
```typescript
const user = await prisma.user.create({
  data: {
    email,
    passwordHash: password, // PLAINTEXT!
    // ...
  },
});
```

**After (CORRECT):**
```typescript
import bcrypt from "bcryptjs";

const passwordHash = await bcrypt.hash(password, 10); // or 12 for higher security

const user = await prisma.user.create({
  data: {
    email,
    passwordHash, // Hashed!
    // ...
  },
});
```

**For login verification:**
```typescript
const user = await prisma.user.findFirst({ where: { email } });

if (!user) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

const valid = await bcrypt.compare(password, user.passwordHash);

if (!valid) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

// Login successful
```

---

### Fix 6: Enforce Multi-Tenant Isolation

**Problem:** Users can access other companies' data

**File:** All API endpoints

**Add this filter to EVERY query:**

**Before (VULNERABLE):**
```typescript
const documents = await prisma.document.findMany({
  // Missing companyId filter!
});
```

**After (SECURE):**
```typescript
const user = await requireAuth(req); // Get authenticated user

const documents = await prisma.document.findMany({
  where: {
    companyId: user.companyId, // ALWAYS filter by company!
  },
});
```

**Create a helper function:**
```typescript
// lib/tenant.ts
export function enforceCompanyScope(companyId: string) {
  return { companyId };
}

// Usage in endpoints
const documents = await prisma.document.findMany({
  where: {
    ...enforceCompanyScope(user.companyId),
    // other filters...
  },
});
```

---

## Advanced Testing

### Test with Different Node Versions

```bash
# Using nvm (Node Version Manager)
nvm install 20
nvm use 20
npm test tests/security-comprehensive.test.ts

nvm install 22
nvm use 22
npm test tests/security-comprehensive.test.ts
```

### Test with Redis

```bash
# Start Redis in Docker
docker run -d -p 6379:6379 redis:alpine

# Set Redis URL
export REDIS_URL=redis://localhost:6379

# Run tests
npm test tests/security-comprehensive.test.ts
```

### Load Testing Rate Limiter

```bash
# Install Apache Bench (if not installed)
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test rate limiter (send 200 requests)
ab -n 200 -c 10 http://localhost:3000/api/auth/login

# Expected: First 100 succeed, next 100 get 429 (rate limited)
```

### Penetration Testing

Use OWASP ZAP or Burp Suite to test for:
- SQL injection
- XSS attacks
- CSRF vulnerabilities
- Session hijacking

### Security Audit

Run automated security scanners:

```bash
# Install npm audit
npm audit

# Install Snyk
npm install -g snyk
snyk test

# Install OWASP Dependency-Check
npm install -g @lavamoat/allow-scripts
npm run security-check
```

---

## Continuous Integration

Add this to your CI/CD pipeline (`.github/workflows/security-tests.yml`):

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run security tests
        run: npm test tests/security-comprehensive.test.ts

      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

---

## FAQ

### Q: How long do the tests take to run?

**A:** About 1-2 seconds for the comprehensive test suite.

### Q: Do I need a database to run these tests?

**A:** No! The security-comprehensive tests are unit tests and don't require a database. The integration tests (`tests/documents/`, `tests/auth/`, etc.) do require a database.

### Q: What if I don't have Redis installed?

**A:** That's fine! The rate limiter falls back to in-memory storage automatically. Tests will still pass.

### Q: Can I run these tests in production?

**A:** **NO!** These are for development/testing only. Don't run tests against production data.

### Q: How do I know if my implementation is secure?

**A:** If all 28 tests pass, you've correctly implemented the security features. For production, also run: npm audit, penetration testing, and third-party security audit.

---

## Summary

**Security Testing Checklist:**

- ✅ All 28 security tests pass
- ✅ Encryption uses 12-byte IV for GCM
- ✅ All API endpoints have Zod validation
- ✅ Rate limiting is active (100 req/15min)
- ✅ JWT tokens are signed and verified
- ✅ Passwords hashed with bcrypt (cost 10+)
- ✅ All queries filter by companyId
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ npm audit shows no high/critical issues

**Next Steps:**

1. Run `npm test tests/security-comprehensive.test.ts`
2. Fix any failing tests using this guide
3. Run `npm audit` to check dependencies
4. Set up CI/CD with security tests
5. Consider third-party security audit before production launch

---

**Questions or Issues?**

- GitHub Issues: https://github.com/Fujiorange/DocuRoute/issues
- Email: support@docuroute.com

**Made with ❤️ for Singapore construction and engineering companies**
