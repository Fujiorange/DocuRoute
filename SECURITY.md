# Security Policy

## Overview

DocuRoute takes security seriously. This document outlines our security practices, encryption strategy, data protection measures, and procedures for reporting security vulnerabilities.

## Encryption Strategy

### Document Encryption (AES-256-GCM)

All documents stored in DocuRoute are encrypted at rest using **AES-256-GCM (Galois/Counter Mode)** encryption:

- **Algorithm**: AES-256-GCM with authenticated encryption
- **Key Size**: 256-bit encryption keys
- **IV Generation**: Random 16-byte initialization vector (IV) per file
- **Authentication Tag**: 16-byte GCM authentication tag for data integrity
- **Key Management**: Encryption keys stored securely in environment variables
- **Storage**: Encrypted files stored in AWS S3 with additional server-side encryption (SSE-S3)

### Why AES-256-GCM?

- **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity, detecting any tampering with encrypted data
- **Performance**: Hardware-accelerated on modern CPUs
- **Security**: NIST-approved and widely adopted in government and industry
- **Integrity**: Built-in authentication prevents unauthorized modification

### Key Lifecycle

1. **Generation**: Secure random key generation using Node.js `crypto` module
2. **Storage**: Keys stored in secure environment variables, never committed to version control
3. **Rotation**: Keys should be rotated according to your organization's security policy
4. **Access**: Keys accessible only to authorized backend services, never exposed to clients

## Audit Logging

### Immutable Audit Trail

DocuRoute maintains an **immutable audit log** for all security-relevant operations:

- **What We Log**:
  - User authentication (login, logout, 2FA)
  - Document access, creation, modification, deletion
  - User management operations
  - Permission changes
  - Failed authentication attempts
  - API access and rate limit violations

- **Audit Log Properties**:
  - Timestamp (UTC)
  - User ID and company ID
  - Action type
  - Entity type and ID
  - IP address
  - Detailed JSON metadata

- **Immutability Promise**:
  - No UPDATE or DELETE operations exposed via API
  - Database-level constraints prevent modification
  - 7-year retention policy (configurable per jurisdiction)
  - Regular backups for compliance and forensics

## Multi-Tenant Isolation

DocuRoute is a **multi-tenant SaaS application** with strict data isolation:

- Every resource (documents, users, projects, folders) scoped to a `companyId`
- Database queries enforce company-level filtering at the application layer
- No cross-tenant data access possible through API
- Session tokens include company context for authorization
- Regular security audits to verify isolation

## Authentication & Authorization

### Authentication

- **JWT Tokens**: Signed with HS256, 7-day expiry
- **httpOnly Cookies**: Protect against XSS attacks
- **Secure Flag**: Enabled in production (HTTPS only)
- **Password Hashing**: bcrypt with 12 rounds
- **Two-Factor Authentication (2FA)**: TOTP-based using Speakeasy

### Authorization (RBAC)

Four role levels with granular permissions:

1. **IT_ADMIN** (God Mode): Full system access
2. **PROJECT_ADMIN**: Project and user management
3. **ENGINEER**: Document creation and editing
4. **CLIENT**: Read-only access to shared documents

## Rate Limiting

- **In-Memory Rate Limiter**: Express-rate-limit with Redis backing (optional)
- **Public Endpoints**: 100 requests per 15 minutes per IP
- **Authenticated Endpoints**: Higher limits based on subscription tier
- **Sensitive Endpoints**: Stricter limits (e.g., 5 login attempts per 15 minutes)
- **Graceful Fallback**: If Redis is unavailable, rate limiting degrades gracefully

## Security Headers

All responses include security headers:

- **X-Content-Type-Options**: `nosniff` (prevent MIME sniffing)
- **X-Frame-Options**: `DENY` (prevent clickjacking)
- **Strict-Transport-Security**: HSTS with 1-year max-age (production only)
- **Content-Security-Policy**: Minimal CSP allowing same-origin resources
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restrict camera, microphone, geolocation

## PDPA / GDPR Compliance

### Data Protection Officer (DPO)

For data protection inquiries:
- **Email**: dpo@docuroute.com (update with your actual DPO contact)
- **Response Time**: 48 hours for initial acknowledgment

### User Rights

Users have the right to:

1. **Access**: Export all personal data (JSON/CSV format)
2. **Rectification**: Update personal information via account settings
3. **Erasure** ("Right to be Forgotten"): Request account deletion
4. **Data Portability**: Download data in machine-readable format
5. **Object to Processing**: Contact DPO for special requests

### Data Retention

- **Active Data**: Retained while account is active
- **Deleted Accounts**: 30-day grace period before permanent deletion
- **Audit Logs**: 7-year retention for compliance
- **Backups**: 90-day backup retention, then permanent deletion

## Breach Notification Procedure

In the event of a data breach:

1. **Detection**: Immediate investigation upon discovery
2. **Containment**: Isolate affected systems, rotate credentials
3. **Assessment**: Determine scope, impact, and affected users
4. **Notification**:
   - Affected users: Within 72 hours
   - Regulators: As required by PDPA/GDPR (72 hours)
   - Public disclosure: If high-risk breach
5. **Remediation**: Implement fixes, conduct post-mortem
6. **Documentation**: Comprehensive incident report for compliance

### Contact for Security Incidents

- **Email**: security@docuroute.com (update with your actual security contact)
- **Emergency**: Include "SECURITY BREACH" in subject line for priority handling

## Reporting Security Vulnerabilities

We welcome responsible disclosure of security vulnerabilities.

### How to Report

1. **Email**: security@docuroute.com (update with your actual email)
2. **Subject**: "Security Vulnerability Report: [Brief Description]"
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Assessment**: Initial triage within 5 business days
- **Resolution Timeline**: Varies by severity (critical: 7 days, high: 30 days, medium: 90 days)
- **Disclosure**: Coordinated disclosure after fix is deployed

### Responsible Disclosure Guidelines

- **Do Not**: Exploit the vulnerability beyond proof-of-concept
- **Do Not**: Access, modify, or delete other users' data
- **Do Not**: Perform DoS attacks or spam
- **Do**: Provide sufficient detail for us to reproduce the issue
- **Do**: Allow reasonable time for us to fix the vulnerability before public disclosure

### Bug Bounty

We do not currently have a formal bug bounty program, but we recognize and appreciate security researchers who help us improve DocuRoute's security.

## Secure Development Practices

- **Code Review**: All code changes reviewed before merge
- **Dependency Scanning**: Regular updates and vulnerability scanning (npm audit)
- **Input Validation**: Zod schemas for all API inputs
- **Output Encoding**: Proper sanitization to prevent XSS
- **Parameterized Queries**: Prisma ORM prevents SQL injection
- **Least Privilege**: Minimal permissions for all services and users
- **Security Testing**: Automated security tests in CI/CD pipeline

## Third-Party Services

DocuRoute uses the following third-party services:

- **AWS S3**: Encrypted document storage (SOC 2, ISO 27001 certified)
- **PostgreSQL**: Primary database (self-hosted or managed)
- **Redis**: Session and rate limit storage (optional)
- **Resend**: Transactional email service
- **Sentry**: Error tracking (PII scrubbing enabled)

All third-party services are vetted for security and compliance.

## Compliance & Certifications

- **PDPA** (Personal Data Protection Act - Singapore): Compliant
- **GDPR** (General Data Protection Regulation - EU): Compliant (where applicable)
- **SOC 2**: Planned for 2026 (update based on your roadmap)
- **ISO 27001**: Under evaluation

## Security Roadmap

Upcoming security enhancements:

- [ ] Implement Upstash Redis for distributed rate limiting
- [ ] Add Content-Security-Policy reporting
- [ ] Implement automated secret scanning in CI/CD
- [ ] Add security.txt file for vulnerability disclosure
- [ ] Conduct third-party security audit
- [ ] Implement WAF (Web Application Firewall) rules

## Updates to This Policy

This security policy is reviewed and updated quarterly. Last updated: **March 6, 2026**.

---

**Version**: 1.0
**Last Updated**: March 6, 2026
**Next Review**: June 6, 2026
