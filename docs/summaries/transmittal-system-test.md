# Transmittal System - Testing Guide

## Prerequisites

Before testing the transmittal system, ensure:

1. **Database Migration Applied:**
   ```bash
   cd packages/db
   npx prisma migrate deploy
   # or
   npx prisma db push
   ```

2. **Environment Variables Set:**
   ```bash
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=noreply@docuroute.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your domain
   ```

3. **Test Data Available:**
   - At least one company with documents
   - At least 2-3 documents with CURRENT revisions
   - User with `CREATE_TRANSMITTAL` and `SEND_TRANSMITTAL` permissions

## Test Scenarios

### Scenario 1: Create Draft Transmittal

**Objective:** Verify transmittal creation with revision locking

**Steps:**

1. **Prepare Test Documents**
   - Create or use existing documents: DWG-001 Rev A, DWG-002 Rev B
   - Verify both have status = "CURRENT" in DocumentRevision table

2. **Create Transmittal via API**

   ```bash
   curl -X POST http://localhost:3000/api/transmittals \
     -H "Content-Type: application/json" \
     -H "Cookie: {auth-cookie}" \
     -d '{
       "subject": "Piping Drawings for Review",
       "message": "Please review the attached drawings and provide feedback.",
       "documentIds": ["doc-id-1", "doc-id-2"],
       "recipients": [
         {
           "email": "test@example.com",
           "name": "Test Recipient",
           "company": "Test Company"
         }
       ],
       "expiresAt": "2026-12-31T23:59:59Z"
     }'
   ```

3. **Verify Response:**
   - Status code: 200
   - Response contains `transmittal.id`
   - `transmittal.number` matches format `TR-2026-NNN`
   - `transmittal.status` = "DRAFT"
   - `documents` array has locked `revisionId` fields
   - `recipients` array has unique tokens (64 chars)

4. **Database Verification:**

   ```sql
   -- Check transmittal was created
   SELECT * FROM "Transmittal" WHERE number = 'TR-2026-001';

   -- Check documents are locked with specific revisionId
   SELECT
     td.id,
     td.documentId,
     td.revisionId,
     dr.revisionCode,
     dr.status
   FROM "TransmittalDocument" td
   JOIN "DocumentRevision" dr ON td.revisionId = dr.id
   WHERE td.transmittalId = '{transmittal-id}';

   -- Check recipients have unique tokens
   SELECT id, email, token, status
   FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}';
   ```

5. **Expected Database State:**
   - Transmittal record exists with status = "DRAFT"
   - TransmittalDocument records have `revisionId` (not null)
   - TransmittalRecipient records have status = "PENDING"
   - Tokens are 64 characters and unique

**Test Revision Locking:**

6. **Upload New Revision to Document**
   - Upload DWG-001 Rev B (supersedes Rev A)
   - Verify DWG-001 now has TWO revisions: Rev A (SUPERSEDED), Rev B (CURRENT)

7. **Check Transmittal Still Shows Old Revision:**

   ```sql
   SELECT
     td.revisionId,
     dr.revisionCode,
     dr.status
   FROM "TransmittalDocument" td
   JOIN "DocumentRevision" dr ON td.revisionId = dr.id
   WHERE td.transmittalId = '{transmittal-id}'
     AND td.documentId = '{dwg-001-id}';
   ```

   **Expected:** Still shows Rev A (even though status = SUPERSEDED)

**Pass Criteria:**
- ✅ Transmittal created with sequential number
- ✅ Documents locked with specific revisionId
- ✅ Tokens generated for all recipients
- ✅ Transmittal shows old revision even after new revision uploaded

---

### Scenario 2: Send Transmittal (Email Flow)

**Objective:** Verify sending transmittal sends emails and locks status

**Steps:**

1. **Send Transmittal via API**

   ```bash
   curl -X POST http://localhost:3000/api/transmittals/{transmittal-id}/send \
     -H "Cookie: {auth-cookie}"
   ```

2. **Verify Response:**
   - Status code: 200
   - `transmittal.status` = "SENT"
   - `transmittal.sentAt` is ISO timestamp

3. **Database Verification:**

   ```sql
   SELECT status, sentAt FROM "Transmittal" WHERE id = '{transmittal-id}';
   ```

   **Expected:** status = "SENT", sentAt = recent timestamp

4. **Email Verification:**
   - Check Resend dashboard or test email inbox
   - Verify email sent to each recipient
   - Email subject: "Document Transmittal TR-2026-001 from {Company}"
   - Email body contains:
     - Transmittal number
     - Subject and message
     - List of documents with revision codes
     - "View & Acknowledge Documents" button
     - Acknowledge URL format: `/acknowledge/{id}?token={token}`

5. **Audit Log Verification:**

   ```sql
   SELECT action, metadata FROM "AuditLog"
   WHERE resourceType = 'Transmittal'
     AND resourceId = '{transmittal-id}'
     AND action = 'TRANSMITTAL_SENT'
   ORDER BY createdAt DESC LIMIT 1;
   ```

   **Expected:** Log entry with recipient emails in metadata

6. **Try to Send Again (Should Fail):**

   ```bash
   curl -X POST http://localhost:3000/api/transmittals/{transmittal-id}/send \
     -H "Cookie: {auth-cookie}"
   ```

   **Expected:** 409 Conflict - "Transmittal has already been sent"

**Pass Criteria:**
- ✅ Status changes from DRAFT to SENT
- ✅ Emails sent to all recipients
- ✅ sentAt timestamp recorded
- ✅ Cannot send transmittal twice

---

### Scenario 3: Public Acknowledge Flow (No Login)

**Objective:** Verify recipients can view and acknowledge without login

**Steps:**

1. **Open Acknowledge URL (from email)**

   Navigate to: `http://localhost:3000/acknowledge/{transmittal-id}?token={recipient-token}`

2. **Verify Page Loads:**
   - No login prompt
   - Shows transmittal number and subject
   - Lists all documents with revision codes
   - Download buttons visible
   - Acknowledge/Return buttons visible

3. **Database Check (First View):**

   ```sql
   SELECT status, viewedAt FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}' AND token = '{token}';
   ```

   **Expected:** status = "VIEWED", viewedAt = recent timestamp

4. **Test Acknowledge Action:**
   - Select "Acknowledge" option
   - Add message: "Received, all looks good"
   - Click "Acknowledge Receipt" button

5. **Verify Success Screen:**
   - Shows green checkmark icon
   - Message: "Thank you for acknowledging this transmittal"

6. **Database Verification:**

   ```sql
   SELECT status, acknowledgedAt, message FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}' AND token = '{token}';
   ```

   **Expected:**
   - status = "ACKNOWLEDGED"
   - acknowledgedAt = recent timestamp
   - message = "Received, all looks good"

7. **Audit Vault Verification:**

   ```sql
   SELECT eventType, userEmail, metadata FROM "AuditVaultEntry"
   WHERE companyId = '{company-id}'
     AND eventType = 'TRANSMITTAL_ACKNOWLEDGED'
   ORDER BY createdAt DESC LIMIT 1;
   ```

   **Expected:** Immutable vault entry with recipient email

8. **Reload Page (Already Acknowledged):**
   - Navigate to same URL again
   - Should show "This transmittal has already been acknowledged"
   - No action buttons visible

**Pass Criteria:**
- ✅ Page loads without authentication
- ✅ First view updates status to VIEWED
- ✅ Acknowledge updates status to ACKNOWLEDGED
- ✅ Vault event logged
- ✅ Cannot acknowledge twice

---

### Scenario 4: Return Transmittal

**Objective:** Verify recipient can return transmittal with reason

**Steps:**

1. **Create and Send New Transmittal**
   - Follow Scenario 1 and 2 to create TR-2026-002

2. **Open Acknowledge URL**

   Navigate to: `http://localhost:3000/acknowledge/{transmittal-id}?token={recipient-token}`

3. **Test Return Action:**
   - Select "Return" option
   - Add message: "Missing drawing DWG-003"
   - Click "Return to Sender" button

4. **Verify Success Screen:**
   - Message: "The transmittal has been returned to the sender"

5. **Database Verification:**

   ```sql
   -- Check recipient status
   SELECT status, acknowledgedAt, message FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}' AND token = '{token}';

   -- Check transmittal status changed
   SELECT status FROM "Transmittal" WHERE id = '{transmittal-id}';
   ```

   **Expected:**
   - Recipient: status = "ACKNOWLEDGED", message = "Missing drawing DWG-003"
   - Transmittal: status = "RETURNED"

6. **Email Verification (Return Notification):**
   - Check original sender's email inbox
   - Subject: "Transmittal TR-2026-002 has been returned"
   - Body contains:
     - Recipient name/email
     - Return reason: "Missing drawing DWG-003"
     - "View Transmittal Details" button

7. **Audit Vault Verification:**

   ```sql
   SELECT eventType, metadata->>'returnReason' as reason
   FROM "AuditVaultEntry"
   WHERE eventType = 'TRANSMITTAL_RETURNED'
   ORDER BY createdAt DESC LIMIT 1;
   ```

   **Expected:** Vault entry with return reason in metadata

**Pass Criteria:**
- ✅ Return updates recipient to ACKNOWLEDGED
- ✅ Transmittal status changed to RETURNED
- ✅ Return email sent to sender
- ✅ Vault event logged with reason

---

### Scenario 5: Revision Locking Verification

**Objective:** Prove transmittals always show locked revision

**Steps:**

1. **Create Document with Initial Revision**
   - Upload DWG-005 Rev A
   - Verify DocumentRevision table shows Rev A with status = "CURRENT"

2. **Create Transmittal**
   - Create transmittal TR-2026-003 with DWG-005 Rev A
   - Record the `revisionId` from TransmittalDocument

3. **Upload Multiple New Revisions**
   - Upload DWG-005 Rev B → Rev A becomes SUPERSEDED
   - Upload DWG-005 Rev C → Rev B becomes SUPERSEDED
   - Upload DWG-005 Rev D → Rev C becomes SUPERSEDED

4. **Verify Document Has 4 Revisions:**

   ```sql
   SELECT id, revisionCode, status FROM "DocumentRevision"
   WHERE documentId = '{dwg-005-id}'
   ORDER BY createdAt ASC;
   ```

   **Expected:**
   - Rev A: status = "SUPERSEDED"
   - Rev B: status = "SUPERSEDED"
   - Rev C: status = "SUPERSEDED"
   - Rev D: status = "CURRENT"

5. **Check Transmittal Still Shows Rev A:**

   ```sql
   SELECT
     td.revisionId,
     dr.revisionCode,
     dr.status
   FROM "TransmittalDocument" td
   JOIN "DocumentRevision" dr ON td.revisionId = dr.id
   WHERE td.transmittalId = '{tr-2026-003-id}';
   ```

   **Expected:**
   - revisionCode = "A"
   - status = "SUPERSEDED"
   - **revisionId matches the original Rev A ID**

6. **Send Transmittal and View Publicly:**
   - Send transmittal via POST /api/transmittals/{id}/send
   - Open acknowledge URL
   - Verify documents list shows "Rev A" (not Rev D)

7. **API Verification:**

   ```bash
   curl http://localhost:3000/api/public/transmittals/{id}/acknowledge?token={token}
   ```

   **Expected Response:**
   ```json
   {
     "transmittal": {
       "documents": [
         {
           "revisionCode": "A",  // Not "D"!
           "filename": "DWG-005-RevA.pdf"
         }
       ]
     }
   }
   ```

**Pass Criteria:**
- ✅ Transmittal always shows Rev A even with Rev D current
- ✅ RevisionId in TransmittalDocument never changes
- ✅ Public API returns locked revision
- ✅ Recipients see original revision sent to them

---

### Scenario 6: Multiple Recipients

**Objective:** Verify each recipient gets unique token and independent tracking

**Steps:**

1. **Create Transmittal with 3 Recipients:**

   ```json
   {
     "subject": "Final Drawings",
     "documentIds": ["doc-1"],
     "recipients": [
       { "email": "recipient1@example.com", "name": "Alice" },
       { "email": "recipient2@example.com", "name": "Bob" },
       { "email": "recipient3@example.com", "name": "Charlie" }
     ]
   }
   ```

2. **Verify Database:**

   ```sql
   SELECT email, token, status FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}';
   ```

   **Expected:**
   - 3 rows
   - All different tokens
   - All status = "PENDING"

3. **Send Transmittal:**
   - Verify 3 emails sent (check Resend dashboard)
   - Each email has unique token in acknowledge URL

4. **Test Independent Tracking:**
   - Alice opens link → status changes to "VIEWED"
   - Bob acknowledges → status changes to "ACKNOWLEDGED"
   - Charlie doesn't open → status stays "PENDING"

5. **Verify States:**

   ```sql
   SELECT email, status, viewedAt, acknowledgedAt
   FROM "TransmittalRecipient"
   WHERE transmittalId = '{transmittal-id}'
   ORDER BY email;
   ```

   **Expected:**
   - Alice: VIEWED, viewedAt not null, acknowledgedAt null
   - Bob: ACKNOWLEDGED, both timestamps not null
   - Charlie: PENDING, both timestamps null

**Pass Criteria:**
- ✅ Each recipient gets unique token
- ✅ Recipients tracked independently
- ✅ One recipient's action doesn't affect others

---

### Scenario 7: Token Security

**Objective:** Verify invalid/missing tokens are rejected

**Steps:**

1. **Missing Token:**

   ```bash
   curl http://localhost:3000/acknowledge/{transmittal-id}
   # No ?token= parameter
   ```

   **Expected:** Error page or 401 Unauthorized

2. **Invalid Token:**

   ```bash
   curl http://localhost:3000/acknowledge/{transmittal-id}?token=invalidtoken123
   ```

   **Expected:** 401 Unauthorized - "Invalid transmittal ID or token"

3. **Wrong Transmittal ID:**

   ```bash
   curl http://localhost:3000/acknowledge/wrong-id?token={valid-token}
   ```

   **Expected:** 401 Unauthorized

4. **Expired Transmittal (if implemented):**
   - Create transmittal with `expiresAt` in the past
   - Try to access acknowledge URL
   - **Expected:** Error message about expiration

**Pass Criteria:**
- ✅ Missing token rejected
- ✅ Invalid token rejected
- ✅ Wrong transmittal ID rejected
- ✅ Token validation secure

---

### Scenario 8: Transmittal Numbering

**Objective:** Verify sequential numbering per year

**Steps:**

1. **Create Multiple Transmittals:**

   ```bash
   # Create 5 transmittals in 2026
   for i in {1..5}; do
     curl -X POST http://localhost:3000/api/transmittals \
       -H "Content-Type: application/json" \
       -d '{"subject":"Test '$i'", "documentIds":[...], "recipients":[...]}'
   done
   ```

2. **Verify Sequential Numbers:**

   ```sql
   SELECT number FROM "Transmittal"
   WHERE companyId = '{company-id}'
   ORDER BY createdAt ASC;
   ```

   **Expected:**
   - TR-2026-001
   - TR-2026-002
   - TR-2026-003
   - TR-2026-004
   - TR-2026-005

3. **Check Counter Table:**

   ```sql
   SELECT * FROM "TransmittalCounter"
   WHERE companyId = '{company-id}' AND year = 2026;
   ```

   **Expected:** sequence = 5

4. **Test Multi-Tenant Isolation:**
   - Switch to different company
   - Create transmittal
   - **Expected:** TR-2026-001 (separate counter)

**Pass Criteria:**
- ✅ Numbers sequential within company
- ✅ No gaps in sequence
- ✅ Each company has independent counter
- ✅ Format is TR-YYYY-NNN

---

## Edge Cases to Test

### Edge Case 1: Document with No Current Revision

**Steps:**
1. Create document without any revisions
2. Try to create transmittal with this document
3. **Expected:** 400 Bad Request - "Document does not have a current revision"

### Edge Case 2: Concurrent Transmittal Creation

**Steps:**
1. Create two transmittals simultaneously (parallel requests)
2. Verify both get unique numbers
3. **Expected:** TR-2026-001 and TR-2026-002 (no duplicates)

### Edge Case 3: Invalid Email Address

**Steps:**
1. Create transmittal with invalid email: "notanemail"
2. **Expected:** 400 Bad Request - "Invalid email address"

### Edge Case 4: Empty Document List

**Steps:**
1. Create transmittal with `documentIds: []`
2. **Expected:** 400 Bad Request - "At least one document is required"

### Edge Case 5: Document Doesn't Exist

**Steps:**
1. Create transmittal with non-existent document ID
2. **Expected:** 404 Not Found - "One or more documents not found"

---

## Performance Testing

### Load Test: Create 100 Transmittals

```bash
# Benchmark transmittal creation
for i in {1..100}; do
  time curl -X POST http://localhost:3000/api/transmittals \
    -H "Content-Type: application/json" \
    -d '{"subject":"Load Test '$i'", "documentIds":["{doc-id}"], "recipients":[{"email":"test@example.com"}]}'
done | grep real
```

**Expected:** ~300-500ms per request

### Load Test: Send 100 Emails

```bash
# Test email sending performance
for id in {transmittal-ids}; do
  time curl -X POST http://localhost:3000/api/transmittals/$id/send
done | grep real
```

**Expected:** ~500ms-1s per transmittal (depends on email service)

---

## Regression Testing Checklist

Before deploying to production:

- [ ] All 8 test scenarios pass
- [ ] All edge cases handled correctly
- [ ] Revision locking verified with multiple revision uploads
- [ ] Token security tested with invalid tokens
- [ ] Multi-recipient tracking works independently
- [ ] Email templates render correctly in email clients
- [ ] Public page works on mobile devices
- [ ] Audit logs created for all actions
- [ ] Vault events immutable (cannot delete)
- [ ] RLS policies prevent cross-company access
- [ ] Performance acceptable (<1s for all operations)

---

## Manual QA Checklist

### Email Testing
- [ ] Email renders correctly in Gmail
- [ ] Email renders correctly in Outlook
- [ ] Email renders correctly on mobile
- [ ] Acknowledge link clickable
- [ ] Unsubscribe link present (if applicable)

### UI Testing
- [ ] Acknowledge page responsive on mobile
- [ ] Download buttons work
- [ ] Acknowledge/Return buttons have clear states
- [ ] Success screen shows after submission
- [ ] Already acknowledged state shows correctly

### Security Testing
- [ ] Cannot access transmittal without token
- [ ] Cannot modify transmittal via public API
- [ ] Cannot see other recipients' information
- [ ] Cannot access documents not in transmittal
- [ ] RLS prevents cross-company leaks

---

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. `RESEND_API_KEY` environment variable set
2. Resend dashboard for error logs
3. Console logs for email sending errors
4. Sender email verified in Resend

### Issue: Transmittal Shows Wrong Revision

**Check:**
1. TransmittalDocument.revisionId matches expected revision ID
2. JOIN query in API correctly uses revisionId
3. Document hasn't been deleted (foreign key should prevent this)

### Issue: Public Page Returns 401

**Check:**
1. Token matches exactly (no extra characters)
2. Token exists in TransmittalRecipient table
3. Transmittal ID matches URL parameter
4. Token not expired (if expiration implemented)

---

## Conclusion

This testing guide covers:
- ✅ Basic CRUD operations
- ✅ Email sending workflow
- ✅ Public recipient flow
- ✅ Revision locking mechanism
- ✅ Token security
- ✅ Multi-recipient tracking
- ✅ Edge cases and error handling
- ✅ Performance and load testing

Follow these scenarios in order to ensure the transmittal system works correctly before deploying to production.
