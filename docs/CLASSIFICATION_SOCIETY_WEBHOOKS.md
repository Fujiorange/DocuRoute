# Classification Society Webhook Integration

## Overview

DocuRoute is ready for when classification societies expose submission status APIs. This document outlines the webhook architecture and integration guide for classification societies (ABS, DNV, Lloyd's Register, Bureau Veritas).

## Current Status

**Phase 2 (Current):** Manual submission workflow
- Generate packages locally
- Upload to society portals manually
- Track via reference numbers

**Phase 3 (Ready):** Automated API integration
- Submit packages via society APIs
- Receive webhook status updates
- Automatic status synchronization

## Supported Classification Societies

| Society | Code | API Status | Portal | Notes |
|---------|------|------------|--------|-------|
| **American Bureau of Shipping** | ABS | Piloting | MyFreedom | API in development |
| **Det Norske Veritas** | DNV | Planned | Veristar | API planned |
| **Lloyd's Register** | LR | Planned | MOVE | API planned |
| **Bureau Veritas** | BV | Planned | Approval Explorer | API planned |

## Webhook Architecture

### Endpoint

```
POST https://your-domain.com/api/webhooks/classification-society
```

### Authentication

Webhooks must include authentication header:

```http
Authorization: Bearer {CLASS_SOCIETY_WEBHOOK_SECRET}
X-Society: ABS
```

### Webhook Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with webhook secret |
| `X-Society` | Yes | Society code: `ABS`, `DNV`, `LR`, or `BV` |
| `Content-Type` | Yes | `application/json` |

### Webhook Payload Format

#### ABS Example

```json
{
  "submissionId": "ABS-2026-00123",
  "status": "APPROVED",
  "approvedAt": "2026-03-27T10:00:00Z",
  "approvedBy": "John Smith",
  "documents": [
    {
      "code": "HULL-001",
      "status": "APPROVED",
      "comments": "Approved with conditions"
    },
    {
      "code": "STRUCT-002",
      "status": "APPROVED"
    }
  ],
  "notes": "All structural documents approved for construction"
}
```

#### DNV Example

```json
{
  "referenceId": "DNV-2026-VER-456",
  "approvalStatus": "ACCEPTED",
  "timestamp": "2026-03-27T10:00:00Z",
  "inspector": "Jane Doe",
  "documents": [
    {
      "documentId": "DNV-HULL-001",
      "status": "ACCEPTED"
    }
  ]
}
```

#### Lloyd's Register Example

```json
{
  "caseNumber": "LR-2026-789",
  "status": "CERTIFIED",
  "certifiedAt": "2026-03-27T10:00:00Z",
  "certifiedBy": "LR Surveyor Team",
  "remarks": "Certification complete"
}
```

#### Bureau Veritas Example

```json
{
  "dossierNumber": "BV-2026-012",
  "approvalState": "VALIDATED",
  "validatedAt": "2026-03-27T10:00:00Z",
  "validator": "BV Technical Team",
  "documents": [
    {
      "reference": "BV-DOC-001",
      "state": "APPROVED"
    }
  ]
}
```

### Webhook Response

DocuRoute returns a confirmation response:

```json
{
  "event": "status_update",
  "submissionId": "ABS-2026-00123",
  "status": "CONFIRMED"
}
```

### Status Mapping

Classification society statuses are mapped to DocuRoute statuses:

| Society Status | DocuRoute Status | Description |
|---------------|------------------|-------------|
| APPROVED, ACCEPTED, CERTIFIED, VALIDATED | `CONFIRMED` | Submission approved by society |
| REJECTED, DECLINED, NOT_APPROVED, REFUSED | `REJECTED` | Submission rejected by society |
| IN_REVIEW, PENDING | `MANUALLY_SUBMITTED` | Still under review |

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Classification Society Webhook Secret
CLASS_SOCIETY_WEBHOOK_SECRET=your-random-secret-here

# Society API Keys (Phase 3 - for API submission)
ABS_API_KEY=placeholder-for-future
DNV_API_KEY=placeholder-for-future
LR_API_KEY=placeholder-for-future
BV_API_KEY=placeholder-for-future
```

### Generate Webhook Secret

```bash
# Generate secure random secret
openssl rand -hex 32
```

### Provide Webhook URL to Society

When configuring your account with the classification society, provide:

**Webhook URL:**
```
https://your-domain.com/api/webhooks/classification-society
```

**Authentication:**
```
Authorization: Bearer {your-webhook-secret}
X-Society: ABS
```

## Fallback: Status Polling

If webhooks are not available, DocuRoute automatically polls society APIs every 6 hours.

### How It Works

1. **Background Cron Job** runs every 6 hours
2. Finds submissions with status `MANUALLY_SUBMITTED`
3. Calls society API to check status
4. Updates submission status automatically

### Cron Configuration

```typescript
// apps/worker/src/crons/class-society-status.ts
// Schedule: Every 6 hours (0 */6 * * *)
// Checks up to 50 submissions per run
```

### Monitoring Status Checks

```sql
-- Check recent status poll activity
SELECT
  id,
  societyCode,
  classReferenceNumber,
  status,
  lastStatusCheckAt,
  statusCheckCount
FROM "ClassSocietySubmission"
WHERE status = 'MANUALLY_SUBMITTED'
ORDER BY lastStatusCheckAt DESC;
```

## Testing Webhooks

### Test with curl

```bash
# Test ABS webhook
curl -X POST https://your-domain.com/api/webhooks/classification-society \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "X-Society: ABS" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "ABS-TEST-001",
    "status": "APPROVED",
    "approvedAt": "2026-03-27T10:00:00Z"
  }'
```

### Expected Response

```json
{
  "event": "status_update",
  "submissionId": "ABS-TEST-001",
  "status": "CONFIRMED"
}
```

### Test with Mock Server

```typescript
// Use tools like ngrok for local testing
// 1. Start ngrok: ngrok http 3000
// 2. Use ngrok URL in classification society portal
// 3. Send test webhooks
```

## Security

### Authentication

- **Bearer token** authentication prevents unauthorized webhooks
- Webhook secret must be at least 32 characters
- Rotate webhook secret regularly (every 90 days recommended)

### Validation

- Webhook endpoint validates `X-Society` header
- Rejects unknown society codes
- Logs all webhook attempts to audit log

### Rate Limiting

No rate limiting on webhook endpoint (external systems control rate).

### Idempotency

Webhook processing is idempotent - duplicate webhooks with same `submissionId` update the same record.

## Troubleshooting

### Webhook Not Received

1. **Check webhook secret:**
   ```bash
   echo $CLASS_SOCIETY_WEBHOOK_SECRET
   ```

2. **Verify endpoint is accessible:**
   ```bash
   curl -I https://your-domain.com/api/webhooks/classification-society
   # Should return 401 Unauthorized (expected without auth)
   ```

3. **Check application logs:**
   ```bash
   grep "WEBHOOK" /var/log/app.log
   ```

### Webhook Processing Failed

Check audit log for errors:

```sql
SELECT * FROM "AuditLog"
WHERE action = 'CLASSIFICATION_SOCIETY_WEBHOOK_FAILED'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Status Not Updating

1. **Check submission has reference number:**
   ```sql
   SELECT * FROM "ClassSocietySubmission"
   WHERE id = 'submission-id';
   ```

2. **Verify webhook payload contains reference:**
   ```sql
   SELECT "webhookPayload" FROM "ClassSocietySubmission"
   WHERE id = 'submission-id';
   ```

3. **Check society code matches:**
   - Header: `X-Society: ABS`
   - Submission: `societyCode = 'ABS'`

## Implementation Checklist

### For Classification Societies

- [ ] Implement webhook sender in your system
- [ ] Include `Authorization: Bearer {secret}` header
- [ ] Include `X-Society: {code}` header
- [ ] Send webhook on status changes (APPROVED, REJECTED)
- [ ] Handle 401 responses (authentication failed)
- [ ] Handle 500 responses (retry with exponential backoff)
- [ ] Test with DocuRoute webhook endpoint

### For DocuRoute Administrators

- [ ] Generate webhook secret: `openssl rand -hex 32`
- [ ] Set `CLASS_SOCIETY_WEBHOOK_SECRET` in environment
- [ ] Provide webhook URL to classification society
- [ ] Configure society account with webhook settings
- [ ] Test webhook with sample payload
- [ ] Monitor audit log for webhook events
- [ ] Set up alerts for webhook failures

## API Submission (Phase 3)

When classification societies expose submission APIs, DocuRoute will support:

### Automatic Package Submission

```typescript
// Example: Submit package via ABS API
const client = getClassSocietyClient('ABS')
const result = await client.submitPackage({
  companyId: 'company-123',
  projectId: 'project-456',
  packageTitle: 'Hull Structure Approval',
  submissionType: 'INITIAL_APPROVAL',
  documentIds: ['doc-1', 'doc-2', 'doc-3']
})

console.log(result.reference) // ABS-2026-00123
```

### Status Checking

```typescript
// Check submission status
const status = await client.getStatus('ABS-2026-00123')
console.log(status.status) // APPROVED, REJECTED, IN_REVIEW
```

### Notification Flow

1. User generates package in DocuRoute
2. DocuRoute submits to society API
3. Society processes submission
4. Society sends webhook when approved/rejected
5. DocuRoute updates status automatically
6. User receives notification in DocuRoute

## Related Documentation

- [Deployment Build Process](./DEPLOYMENT_BUILD.md)
- [RLS Transaction Safety](./RLS_TRANSACTION_SAFETY.md)
- Database Schema: `packages/db/prisma/schema.prisma` (ClassSocietySubmission model)
- Implementation: `packages/core/src/classification-society.ts`
- Webhook Endpoint: `apps/web/src/app/api/webhooks/classification-society/route.ts`
- Status Polling: `apps/worker/src/crons/class-society-status.ts`

## Support

For integration assistance:
- Email: support@docuroute.com
- Documentation: https://docs.docuroute.com
- GitHub Issues: https://github.com/docuroute/docuroute/issues
