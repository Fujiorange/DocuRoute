/**
 * Classification Society Status Polling Cron Job
 *
 * Fallback mechanism for when classification societies don't support webhooks.
 * Polls society APIs every 6 hours to check status of manually submitted packages.
 *
 * Schedule: Every 6 hours (0 */6 * * *)
 * Runtime: Node.js worker
 */

import { prismaAdmin } from '@docuroute/db'
import { getClassSocietyClient } from '@docuroute/core/src/classification-society'
import { logAuditEvent } from '@docuroute/core/src/audit'
import { AuditAction } from '@docuroute/types'

/**
 * Main cron job function - polls classification society APIs for status updates
 */
export async function runClassSocietyStatusJob(): Promise<void> {
  console.log('[CLASS_SOCIETY_STATUS] Starting status polling job')

  try {
    // 1. Find submissions that need status checks
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)

    const pendingSubmissions = await prismaAdmin.classSocietySubmission.findMany({
      where: {
        status: 'MANUALLY_SUBMITTED',
        classReferenceNumber: { not: null },
        OR: [
          { lastStatusCheckAt: null },
          { lastStatusCheckAt: { lt: sixHoursAgo } }
        ]
      },
      orderBy: { lastStatusCheckAt: 'asc' },
      take: 50 // Limit to 50 submissions per run to avoid API rate limits
    })

    console.log(`[CLASS_SOCIETY_STATUS] Found ${pendingSubmissions.length} submissions to check`)

    // 2. Check each submission's status
    let successCount = 0
    let errorCount = 0

    for (const submission of pendingSubmissions) {
      try {
        console.log(`[CLASS_SOCIETY_STATUS] Checking status for submission ${submission.id} (${submission.societyCode})`)

        // Get society-specific client
        const client = getClassSocietyClient(submission.societyCode)

        // Query society API for status
        const statusResponse = await client.getStatus(submission.classReferenceNumber!)

        // Map society status to DocuRoute status
        let docuRouteStatus = submission.status
        if (statusResponse.status === 'APPROVED' || statusResponse.status === 'ACCEPTED' || statusResponse.status === 'CERTIFIED') {
          docuRouteStatus = 'CONFIRMED'
        } else if (statusResponse.status === 'REJECTED' || statusResponse.status === 'DECLINED' || statusResponse.status === 'NOT_APPROVED') {
          docuRouteStatus = 'REJECTED'
        }

        // Update submission in database
        await prismaAdmin.classSocietySubmission.update({
          where: { id: submission.id },
          data: {
            status: docuRouteStatus,
            lastStatusCheckAt: new Date(),
            statusCheckCount: { increment: 1 },
            metadata: {
              ...submission.metadata as Record<string, any> | undefined,
              lastStatusResponse: statusResponse,
              lastStatusCheckDate: new Date().toISOString()
            },
            updatedAt: new Date()
          }
        })

        // Log audit event if status changed
        if (docuRouteStatus !== submission.status) {
          await logAuditEvent({
            companyId: submission.companyId,
            userId: null, // Automated job, no user
            action: AuditAction.CLASSIFICATION_SOCIETY_WEBHOOK_RECEIVED, // Reuse webhook action
            resourceType: 'ClassSocietySubmission',
            resourceId: submission.id,
            metadata: {
              societyCode: submission.societyCode,
              oldStatus: submission.status,
              newStatus: docuRouteStatus,
              referenceNumber: submission.classReferenceNumber,
              source: 'status_polling'
            },
            permissionsUsed: []
          })

          console.log(`[CLASS_SOCIETY_STATUS] Status changed: ${submission.status} -> ${docuRouteStatus}`)
        }

        successCount++
      } catch (error) {
        errorCount++
        console.error(`[CLASS_SOCIETY_STATUS] Status check failed for submission ${submission.id}:`, error)

        // Update lastStatusCheckAt even if check failed to avoid retry loops
        await prismaAdmin.classSocietySubmission.update({
          where: { id: submission.id },
          data: {
            lastStatusCheckAt: new Date(),
            statusCheckCount: { increment: 1 },
            metadata: {
              ...submission.metadata as Record<string, any> | undefined,
              lastStatusCheckError: error instanceof Error ? error.message : 'Unknown error',
              lastStatusCheckDate: new Date().toISOString()
            },
            updatedAt: new Date()
          }
        })

        // If society API is not available, that's expected - don't log as failure
        if (error instanceof Error && error.message.includes('not yet available')) {
          console.log(`[CLASS_SOCIETY_STATUS] Society API not yet available: ${submission.societyCode}`)
        } else {
          // Log unexpected errors to audit log
          await logAuditEvent({
            companyId: submission.companyId,
            userId: null,
            action: AuditAction.CLASSIFICATION_SOCIETY_WEBHOOK_FAILED,
            resourceType: 'ClassSocietySubmission',
            resourceId: submission.id,
            metadata: {
              societyCode: submission.societyCode,
              error: error instanceof Error ? error.message : 'Unknown error',
              source: 'status_polling'
            },
            permissionsUsed: []
          })
        }
      }
    }

    console.log(`[CLASS_SOCIETY_STATUS] Status polling complete: ${successCount} success, ${errorCount} errors`)
  } catch (error) {
    console.error('[CLASS_SOCIETY_STATUS] Cron job failed:', error)
    throw error
  }
}

// If running directly (not as part of worker)
if (require.main === module) {
  runClassSocietyStatusJob()
    .then(() => {
      console.log('[CLASS_SOCIETY_STATUS] Job completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[CLASS_SOCIETY_STATUS] Job failed:', error)
      process.exit(1)
    })
}
