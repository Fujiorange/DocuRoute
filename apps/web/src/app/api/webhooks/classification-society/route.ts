/**
 * Classification Society Webhook Endpoint
 *
 * Receives status updates from classification societies (ABS, DNV, LR, BV)
 * when they approve or reject submitted packages.
 *
 * POST /api/webhooks/classification-society
 *
 * Headers:
 *   Authorization: Bearer {CLASS_SOCIETY_WEBHOOK_SECRET}
 *   X-Society: ABS | DNV | LR | BV
 *
 * Body: Society-specific webhook payload
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClassSocietyClient } from '@docuroute/core/src/classification-society'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { AuditAction } from '@docuroute/types'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate webhook request
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CLASS_SOCIETY_WEBHOOK_SECRET}`

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[WEBHOOK] Unauthorized classification society webhook attempt')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 2. Get society code from header
    const societyCode = req.headers.get('x-society')
    if (!societyCode) {
      console.error('[WEBHOOK] Missing X-Society header')
      return new NextResponse('Missing X-Society header', { status: 400 })
    }

    // 3. Parse webhook payload
    const payload = await req.json()
    console.log(`[WEBHOOK] Received ${societyCode} webhook:`, JSON.stringify(payload, null, 2))

    // 4. Get society-specific client
    let client
    try {
      client = getClassSocietyClient(societyCode)
    } catch (error) {
      console.error(`[WEBHOOK] Unknown society code: ${societyCode}`)
      return new NextResponse(`Unknown society: ${societyCode}`, { status: 400 })
    }

    // 5. Handle webhook with society-specific logic
    const result = await client.handleWebhook(payload)

    // 6. Log audit event (no userId for external webhooks)
    await logAuditEvent({
      companyId: 'SYSTEM', // Webhooks are cross-company, logged at system level
      userId: null,
      action: AuditAction.CLASSIFICATION_SOCIETY_WEBHOOK_RECEIVED,
      resourceType: 'ClassSocietySubmission',
      resourceId: result.submissionId,
      metadata: {
        societyCode,
        event: result.event,
        status: result.status,
        webhookPayload: payload
      },
      permissionsUsed: [] // External webhook, no permission check
    })

    console.log(`[WEBHOOK] Successfully processed ${societyCode} webhook for submission ${result.submissionId}`)

    // 7. Return success response
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[WEBHOOK] Webhook handling failed:', error)

    // Log failure to audit log for troubleshooting
    try {
      await logAuditEvent({
        companyId: 'SYSTEM',
        userId: null,
        action: AuditAction.CLASSIFICATION_SOCIETY_WEBHOOK_FAILED,
        resourceType: 'ClassSocietySubmission',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        permissionsUsed: []
      })
    } catch (auditError) {
      console.error('[WEBHOOK] Failed to log audit event:', auditError)
    }

    return new NextResponse('Webhook processing failed', { status: 500 })
  }
}

// Disable body size limit for webhook payloads
export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds timeout
