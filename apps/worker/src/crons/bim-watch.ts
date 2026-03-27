/**
 * BIM Watch Folder Cron Job
 *
 * Polls enabled BIM watch folders every 15 minutes and automatically imports
 * CSV files containing equipment data.
 *
 * Schedule: Every 15 minutes (*/15 * * * *)
 * Environment: BullMQ worker process
 */

import { prismaAdmin } from '@docuroute/db'
import { watchFolder, type ImportResult } from '@docuroute/core/src/bim-import'
import { sendBIMImportEmail, sendBIMImportErrorEmail } from '../lib/email'

export async function runBIMWatchFolderJob(): Promise<void> {
  console.log('[BIM_WATCH] Starting BIM watch folder polling')

  try {
    // Fetch all enabled watch folders
    const watchFolders = await prismaAdmin.bIMWatchFolder.findMany({
      where: { enabled: true },
      include: {
        project: {
          select: { id: true, name: true, companyId: true },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    console.log(`[BIM_WATCH] Found ${watchFolders.length} enabled watch folders`)

    // Process each watch folder
    for (const folder of watchFolders) {
      try {
        console.log(`[BIM_WATCH] Processing folder: ${folder.folderPath} for project ${folder.project.name}`)

        const result: ImportResult = await watchFolder(
          folder.folderPath,
          folder.projectId,
          folder.companyId
        )

        // Update last polled timestamp
        const updateData: any = {
          lastPolledAt: new Date(),
        }

        // If files were processed, update last imported timestamp
        if (result.imported > 0) {
          updateData.lastImportedAt = new Date()
        }

        await prismaAdmin.bIMWatchFolder.update({
          where: { id: folder.id },
          data: updateData,
        })

        // Send email notification if there were conflicts or successful imports
        if (result.conflicts.length > 0 || result.imported > 0) {
          await sendBIMImportEmail({
            companyName: folder.company.name,
            projectName: folder.project.name,
            projectId: folder.projectId,
            imported: result.imported,
            conflicts: result.conflicts,
            processedFiles: result.processedFiles,
          })
        }

        console.log(
          `[BIM_WATCH] Completed ${folder.folderPath}: ${result.imported} imported, ${result.conflicts.length} conflicts`
        )
      } catch (error: any) {
        console.error(`[BIM_WATCH] Error processing folder ${folder.folderPath}:`, error)

        // Send error notification email
        try {
          await sendBIMImportErrorEmail({
            companyName: folder.company.name,
            projectName: folder.project.name,
            projectId: folder.projectId,
            folderPath: folder.folderPath,
            error: error.message || 'Unknown error',
          })
        } catch (emailError) {
          console.error('[BIM_WATCH] Failed to send error notification email:', emailError)
        }

        // Update last polled timestamp even on error
        await prismaAdmin.bIMWatchFolder.update({
          where: { id: folder.id },
          data: { lastPolledAt: new Date() },
        })
      }
    }

    console.log('[BIM_WATCH] BIM watch folder polling completed')
  } catch (error: any) {
    console.error('[BIM_WATCH] Fatal error in BIM watch folder job:', error)
    throw error
  }
}

// Export for use in cron scheduler
export default runBIMWatchFolderJob
