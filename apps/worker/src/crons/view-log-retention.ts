import { CronJob } from 'cron'
import { prismaAdmin } from '@docuroute/db'

/**
 * View Log Retention Cleanup Cron
 *
 * Runs daily at 2:00 AM UTC.
 * Deletes DocumentView entries older than company.viewLogRetentionDays.
 *
 * Required for ITAR/export-control compliance - keeps audit trail manageable
 * while respecting company-specific retention policies.
 *
 * Uses prismaAdmin to iterate across all companies.
 */

export const viewLogRetentionCleanupCron = new CronJob(
  '0 2 * * *', // Daily at 2:00 AM UTC
  async () => {
    console.log('[ViewLogRetentionCleanup] Starting cleanup job...')

    try {
      // Fetch all companies with their retention settings
      const companies = await prismaAdmin.company.findMany({
        select: {
          id: true,
          name: true,
          viewLogRetentionDays: true,
        },
      })

      console.log(`[ViewLogRetentionCleanup] Processing ${companies.length} companies`)

      let totalDeleted = 0

      for (const company of companies) {
        const retentionDays = company.viewLogRetentionDays || 90 // Default to 90 days
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

        console.log(
          `[ViewLogRetentionCleanup] Company ${company.name} (${company.id}): deleting views older than ${cutoffDate.toISOString()}`
        )

        try {
          // Delete old DocumentView entries for this company
          const result = await prismaAdmin.documentView.deleteMany({
            where: {
              companyId: company.id,
              viewedAt: {
                lt: cutoffDate,
              },
            },
          })

          totalDeleted += result.count
          console.log(
            `[ViewLogRetentionCleanup] Company ${company.name}: deleted ${result.count} view entries`
          )
        } catch (error) {
          console.error(
            `[ViewLogRetentionCleanup] Error cleaning up company ${company.id}:`,
            error
          )
          // Continue with next company even if one fails
        }
      }

      console.log(
        `[ViewLogRetentionCleanup] Cleanup complete. Total deleted: ${totalDeleted} entries`
      )
    } catch (error) {
      console.error('[ViewLogRetentionCleanup] Fatal error during cleanup:', error)
    }
  },
  null, // onComplete callback
  false, // start immediately (set to true to start automatically)
  'UTC' // timezone
)

/**
 * Start the cron job
 */
export function startViewLogRetentionCleanup() {
  viewLogRetentionCleanupCron.start()
  console.log('[ViewLogRetentionCleanup] Cron job started (runs daily at 2:00 AM UTC)')
}
