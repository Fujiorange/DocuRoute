# Transmittal Configuration Module - Testing Guide

## Prerequisites

Before testing the transmittal configuration module:

1. **Database Migration Applied:**
   ```bash
   cd packages/db
   npx prisma migrate deploy
   # or
   npx prisma db push
   ```

2. **Environment Set Up:**
   - Authentication configured
   - User with MANAGE_CUSTOM_ROLES permission (Company Admin)
   - At least 2-3 documents with current revisions

3. **Access Settings Page:**
   Navigate to `/settings/transmittals` (admin only)

---

## Test Scenario 1: View Default Configuration

**Objective:** Verify default configuration loads correctly

**Steps:**

1. **Navigate to Settings:**
   - Go to `/settings/transmittals`
   - Should load without errors

2. **Verify Default Values:**
   - Number Prefix: "TR"
   - Number Padding: 3
   - Preview shows: "TR-2026-001" (current year)

3. **Verify Default Columns:**
   - ✅ Document Code (enabled, order 0)
   - ✅ Title (enabled, order 1)
   - ✅ Revision (enabled, order 2)
   - ☐ Status (disabled, order 3)
   - ☐ Discipline (disabled, order 4)

4. **Verify Default Header Fields:**
   - ☐ Project Name (disabled)
   - ☐ Attention To (disabled)
   - ✅ Subject (enabled)

5. **Verify Footer Text:**
   - Empty (no default text)
   - Character counter shows: 0 / 500

**Pass Criteria:**
- ✅ Page loads successfully
- ✅ All default values displayed correctly
- ✅ No console errors

---

## Test Scenario 2: Change Number Format

**Objective:** Verify custom number format configuration

**Steps:**

1. **Change Prefix:**
   - Change "TR" to "SHP"
   - Preview updates to: "SHP-2026-001"

2. **Change Padding:**
   - Change 3 to 4
   - Preview updates to: "SHP-2026-0001"

3. **Try Invalid Prefix:**
   - Enter lowercase: "shp"
   - Should auto-convert to uppercase: "SHP"
   - Try special characters: "SH-P"
   - Should reject (only A-Z, 0-9 allowed)

4. **Try Invalid Padding:**
   - Enter 0
   - Should reject (min 1)
   - Enter 7
   - Should reject (max 6)

5. **Click Save:**
   - Should show "Saving..." state
   - Should show success message
   - Configuration saved

6. **Refresh Page:**
   - Settings should persist
   - Shows "SHP" prefix and 4 padding

**Pass Criteria:**
- ✅ Prefix accepts uppercase alphanumeric only
- ✅ Padding enforces 1-6 range
- ✅ Preview updates in real-time
- ✅ Configuration persists after save

---

## Test Scenario 3: Create Transmittal with Custom Number

**Objective:** Verify new transmittals use custom number format

**Steps:**

1. **Configure Number Format (if not already):**
   - Set prefix to "BLD"
   - Set padding to 2
   - Save configuration

2. **Create First Transmittal:**
   ```bash
   curl -X POST http://localhost:3000/api/transmittals \
     -H "Content-Type: application/json" \
     -H "Cookie: {auth-cookie}" \
     -d '{
       "subject": "Test Transmittal",
       "documentIds": ["doc-id-1"],
       "recipients": [{"email": "test@example.com"}]
     }'
   ```

3. **Verify Response:**
   - `transmittal.number` should be: "BLD-2026-01" (not "TR-2026-001")

4. **Create Second Transmittal:**
   - Repeat API call
   - Number should be: "BLD-2026-02"

5. **Database Verification:**
   ```sql
   SELECT number FROM "Transmittal"
   WHERE companyId = '{your-company-id}'
   ORDER BY createdAt DESC LIMIT 2;
   ```

   **Expected:**
   - BLD-2026-02
   - BLD-2026-01

6. **Change Prefix to "SHP":**
   - Update config in settings page
   - Save

7. **Create Third Transmittal:**
   - Number should be: "SHP-2026-03" (uses new prefix, continues sequence)

**Pass Criteria:**
- ✅ First transmittal uses custom format
- ✅ Sequence continues correctly
- ✅ Changing prefix affects new transmittals
- ✅ Sequence persists across prefix changes

---

## Test Scenario 4: Configure Columns

**Objective:** Verify column enable/disable and reordering

**Steps:**

1. **Disable a Column:**
   - Uncheck "Status" checkbox
   - Column should gray out
   - Label input should disable

2. **Enable Status Column:**
   - Check "Status" checkbox
   - Column should become active
   - Label input should enable

3. **Reorder Columns:**
   - Move "Revision" up (should swap with "Title")
   - Order should change:
     - Document Code (order 0)
     - Revision (order 1) ← moved up
     - Title (order 2) ← moved down
     - Status (order 3)
     - Discipline (order 4)

4. **Try Edge Cases:**
   - Try to move "Document Code" up (should do nothing, already at top)
   - Try to move "Discipline" down (should do nothing, already at bottom)

5. **Change Labels:**
   - Change "Document Code" label to "Drawing Number"
   - Change "Revision" label to "Rev"
   - Labels should update in UI

6. **Save Configuration:**
   - Click Save
   - Success message should appear

7. **Verify in API Response:**
   ```bash
   curl http://localhost:3000/api/company/transmittal-config \
     -H "Cookie: {auth-cookie}"
   ```

   **Expected columns config:**
   ```json
   {
     "documentCode": {"enabled": true, "label": "Drawing Number", "order": 0},
     "revisionCode": {"enabled": true, "label": "Rev", "order": 1},
     "title": {"enabled": true, "label": "Title", "order": 2},
     ...
   }
   ```

**Pass Criteria:**
- ✅ Columns can be enabled/disabled
- ✅ Disabled columns have grayed-out styling
- ✅ Up/down arrows reorder correctly
- ✅ Edge cases handled (can't move past boundaries)
- ✅ Labels update and persist

---

## Test Scenario 5: Configure Header Fields

**Objective:** Verify header field configuration

**Steps:**

1. **Enable Project Name:**
   - Check "Project Name" checkbox
   - Field should become active

2. **Change Label:**
   - Change "Project Name" label to "Job Name"
   - Label should update

3. **Enable Attention To:**
   - Check "Attention To" checkbox
   - Change label to "ATTN"

4. **Disable Subject:**
   - Try to uncheck "Subject"
   - Should be allowed (validation in rendering, not settings)

5. **Save Configuration:**
   - Click Save
   - Success message appears

6. **Verify Configuration:**
   ```bash
   curl http://localhost:3000/api/company/transmittal-config \
     -H "Cookie: {auth-cookie}"
   ```

   **Expected headerFields:**
   ```json
   {
     "projectName": {"enabled": true, "label": "Job Name"},
     "attentionTo": {"enabled": true, "label": "ATTN"},
     "subject": {"enabled": false, "label": "Subject"}
   }
   ```

**Pass Criteria:**
- ✅ Header fields can be enabled/disabled
- ✅ Labels update correctly
- ✅ Configuration persists

---

## Test Scenario 6: Configure Footer Text

**Objective:** Verify footer text configuration

**Steps:**

1. **Add Footer Text:**
   - Enter: "This transmittal is confidential and intended for the recipient only."
   - Character counter should update: "69 / 500"

2. **Try Long Text:**
   - Enter 501+ characters
   - Input should stop at 500 characters

3. **Clear Footer Text:**
   - Delete all text
   - Character counter: "0 / 500"

4. **Save Configuration:**
   - With footer text set
   - Success message appears

5. **Verify in API:**
   ```bash
   curl http://localhost:3000/api/company/transmittal-config \
     -H "Cookie: {auth-cookie}"
   ```

   **Expected:**
   ```json
   {
     "footerText": "This transmittal is confidential..."
   }
   ```

6. **Clear and Save:**
   - Clear footer text
   - Save again
   - Should set to null

**Pass Criteria:**
- ✅ Footer text accepts up to 500 characters
- ✅ Character counter accurate
- ✅ Max length enforced
- ✅ Can be cleared (saved as null)

---

## Test Scenario 7: Dynamic Table Rendering

**Objective:** Verify transmittal views use dynamic columns

**Steps:**

1. **Configure Columns:**
   - Enable: Document Code, Title, Revision, Status
   - Disable: Discipline
   - Order: Document Code (0), Revision (1), Title (2), Status (3)
   - Labels: "Doc", "Rev", "Title", "Status"
   - Save

2. **Create Test Component:**
   ```tsx
   import { TransmittalDocumentTable } from '@/components/transmittals/transmittal-document-table'

   const testDocuments = [
     {
       documentCode: "DWG-001",
       title: "Piping Layout",
       revisionCode: "B",
       status: "APPROVED",
       discipline: "Piping"
     },
     {
       documentCode: "DWG-002",
       title: "Electrical Diagram",
       revisionCode: "A",
       status: "FOR REVIEW",
       discipline: "Electrical"
     }
   ]

   <TransmittalDocumentTable
     documents={testDocuments}
     config={companyConfig}
   />
   ```

3. **Verify Table Rendering:**
   - Should show 4 columns (not 5, Discipline disabled)
   - Column order: Doc, Rev, Title, Status
   - Column headers use custom labels
   - All 2 documents displayed

4. **Disable More Columns:**
   - Disable Status
   - Reload table
   - Should now show 3 columns only

5. **Change Column Order:**
   - Reorder: Title, Doc, Rev
   - Reload table
   - Columns should reorder accordingly

**Pass Criteria:**
- ✅ Table shows only enabled columns
- ✅ Column order matches configuration
- ✅ Custom labels displayed in headers
- ✅ Disabled columns not shown

---

## Test Scenario 8: Multi-Tenant Isolation

**Objective:** Verify configurations are isolated by company

**Steps:**

1. **Configure Company A:**
   - Prefix: "AAA"
   - Padding: 3
   - Enable: Document Code, Title, Revision
   - Save

2. **Create Transmittal in Company A:**
   - Number should be: "AAA-2026-001"

3. **Switch to Company B:**
   - Login as user in different company
   - Navigate to transmittal settings

4. **Verify Default Config:**
   - Should show default values (TR, 3 padding)
   - Should NOT show Company A's config

5. **Configure Company B:**
   - Prefix: "BBB"
   - Padding: 4
   - Save

6. **Create Transmittal in Company B:**
   - Number should be: "BBB-2026-0001"
   - Should NOT use Company A's prefix

7. **Database Verification:**
   ```sql
   SELECT companyId, numberPrefix FROM "CompanyTransmittalConfig";
   ```

   **Expected:**
   - Company A: "AAA"
   - Company B: "BBB"

**Pass Criteria:**
- ✅ Each company has independent configuration
- ✅ Configurations don't leak across companies
- ✅ Transmittal numbers use correct company config

---

## Test Scenario 9: Permission Enforcement

**Objective:** Verify only admins can update configuration

**Steps:**

1. **Login as Admin:**
   - User with MANAGE_CUSTOM_ROLES permission
   - Navigate to `/settings/transmittals`
   - Should load successfully

2. **Try to Update:**
   - Change prefix to "TEST"
   - Click Save
   - Should succeed

3. **Login as Non-Admin:**
   - User WITHOUT MANAGE_CUSTOM_ROLES permission
   - Try to access `/settings/transmittals`
   - May load page (GET endpoint allows all authenticated users)

4. **Try to Update as Non-Admin:**
   ```bash
   curl -X PUT http://localhost:3000/api/company/transmittal-config \
     -H "Content-Type: application/json" \
     -H "Cookie: {non-admin-cookie}" \
     -d '{"numberPrefix": "HACK"}'
   ```

   **Expected:** 403 Forbidden (permission denied)

5. **Try to Access as Unauthenticated:**
   ```bash
   curl -X PUT http://localhost:3000/api/company/transmittal-config \
     -H "Content-Type: application/json" \
     -d '{"numberPrefix": "HACK"}'
   ```

   **Expected:** 401 Unauthorized

**Pass Criteria:**
- ✅ Admins can view and update config
- ✅ Non-admins cannot update config (403)
- ✅ Unauthenticated users cannot access (401)

---

## Test Scenario 10: Validation Edge Cases

**Objective:** Verify all validation rules enforced

**Steps:**

1. **Invalid Prefix:**
   ```bash
   curl -X PUT http://localhost:3000/api/company/transmittal-config \
     -H "Content-Type: application/json" \
     -H "Cookie: {auth-cookie}" \
     -d '{"numberPrefix": "t"}'
   ```
   **Expected:** 400 Bad Request - "Must be between 2 and 10 characters"

2. **Invalid Prefix Characters:**
   ```bash
   curl -X PUT ... -d '{"numberPrefix": "TR-01"}'
   ```
   **Expected:** 400 Bad Request - "Must contain only uppercase letters and numbers"

3. **Invalid Padding:**
   ```bash
   curl -X PUT ... -d '{"numberPadding": 0}'
   ```
   **Expected:** 400 Bad Request - "Must be between 1 and 6"

4. **Invalid Column Key:**
   ```bash
   curl -X PUT ... -d '{"columns": {"invalidKey": {"enabled": true, "label": "Test", "order": 0}}}'
   ```
   **Expected:** 400 Bad Request - "Invalid column key: invalidKey"

5. **Invalid Column Structure:**
   ```bash
   curl -X PUT ... -d '{"columns": {"documentCode": {"enabled": "yes"}}}'
   ```
   **Expected:** 400 Bad Request - "enabled must be a boolean"

6. **Footer Text Too Long:**
   ```bash
   curl -X PUT ... -d '{"footerText": "'$(python3 -c 'print("x" * 501)')'"}'
   ```
   **Expected:** 400 Bad Request - "Must be 500 characters or less"

**Pass Criteria:**
- ✅ All validation rules enforced
- ✅ Clear error messages returned
- ✅ Invalid data rejected with 400 status

---

## Test Scenario 11: Configuration Persistence

**Objective:** Verify configuration survives restarts

**Steps:**

1. **Configure Settings:**
   - Prefix: "PERSIST"
   - Padding: 5
   - Enable all columns
   - Custom labels for each column
   - Footer text: "Test persistence"
   - Save

2. **Create Transmittal:**
   - Should use "PERSIST-2026-00001" format

3. **Restart Application:**
   ```bash
   # Stop and restart Next.js server
   ```

4. **Reload Settings Page:**
   - All configuration should be present
   - No defaults loaded

5. **Create Another Transmittal:**
   - Should use "PERSIST-2026-00002" format
   - Sequence continues from before restart

6. **Database Check:**
   ```sql
   SELECT * FROM "CompanyTransmittalConfig"
   WHERE companyId = '{company-id}';
   ```

   **Expected:** Single row with all saved configuration

**Pass Criteria:**
- ✅ Configuration persists across restarts
- ✅ Sequence counter continues
- ✅ No data loss

---

## Test Scenario 12: Concurrent Configuration Updates

**Objective:** Verify last-write-wins for concurrent updates

**Steps:**

1. **Open Settings in Two Tabs:**
   - Tab A: Change prefix to "AAA"
   - Tab B: Change prefix to "BBB"

2. **Save Tab A First:**
   - Click Save in Tab A
   - Success message appears

3. **Save Tab B Second:**
   - Click Save in Tab B
   - Success message appears

4. **Refresh Page:**
   - Should show "BBB" (last write wins)

5. **Database Check:**
   ```sql
   SELECT numberPrefix, updatedAt
   FROM "CompanyTransmittalConfig"
   WHERE companyId = '{company-id}';
   ```

   **Expected:**
   - numberPrefix: "BBB"
   - updatedAt: Recent timestamp (from Tab B save)

**Pass Criteria:**
- ✅ Last save wins (expected behavior)
- ✅ No errors on concurrent saves
- ✅ updatedAt timestamp reflects latest change

---

## Regression Testing Checklist

Before deploying to production:

- [ ] All 12 test scenarios pass
- [ ] Default configuration loads correctly
- [ ] Custom number format generates correctly
- [ ] Column enable/disable works
- [ ] Column reordering works
- [ ] Header field configuration works
- [ ] Footer text saves and loads
- [ ] Dynamic table renders with correct columns
- [ ] Multi-tenant isolation verified
- [ ] Permissions enforced
- [ ] All validation rules working
- [ ] Configuration persists across restarts
- [ ] No console errors in browser
- [ ] Mobile-responsive UI
- [ ] Settings page loads in <2 seconds

---

## Manual QA Checklist

### UI Testing
- [ ] Settings page loads without errors
- [ ] All form inputs work correctly
- [ ] Preview updates in real-time
- [ ] Save button shows loading state
- [ ] Success/error messages display
- [ ] Character counter accurate
- [ ] Disabled styling applied correctly
- [ ] Arrow buttons work (up/down)
- [ ] Form validates before submit

### Functional Testing
- [ ] GET endpoint returns default config
- [ ] PUT endpoint saves configuration
- [ ] Transmittal creation uses config
- [ ] Number format follows config
- [ ] Dynamic table uses config
- [ ] Permissions enforced correctly

### Security Testing
- [ ] Non-admins cannot update config
- [ ] Unauthenticated access blocked
- [ ] Input validation prevents injection
- [ ] RLS policies enforce isolation
- [ ] Audit logs created for changes

---

## Troubleshooting

### Issue: Settings Page Shows Loading Forever

**Check:**
1. API endpoint accessible: `curl http://localhost:3000/api/company/transmittal-config`
2. User authenticated with valid session
3. Database migration applied
4. Console for JavaScript errors

### Issue: Configuration Not Persisting

**Check:**
1. PUT request succeeds (200 status)
2. Database record exists: `SELECT * FROM "CompanyTransmittalConfig"`
3. `updatedAt` timestamp changes after save
4. Browser cache cleared

### Issue: Transmittals Still Use "TR" Prefix

**Check:**
1. Configuration saved successfully
2. Company ID matches in both config and transmittal
3. Transmittal creation happened AFTER config update
4. Transaction commits successfully

### Issue: Permission Denied When Saving

**Check:**
1. User has MANAGE_CUSTOM_ROLES permission
2. Session valid and not expired
3. User belongs to correct company
4. RLS policy allows access

---

## Conclusion

This testing guide covers:
- ✅ Default configuration loading
- ✅ Number format customization
- ✅ Column configuration (enable/disable/reorder)
- ✅ Header field configuration
- ✅ Footer text customization
- ✅ Dynamic table rendering
- ✅ Multi-tenant isolation
- ✅ Permission enforcement
- ✅ Input validation
- ✅ Configuration persistence
- ✅ Concurrent updates
- ✅ Edge cases and error handling

Follow these scenarios in order to ensure the transmittal configuration module works correctly before deploying to production.
