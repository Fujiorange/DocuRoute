import http from 'http'
import { watermarkWorker, watermarkQueue } from './workers/watermark.worker'
import { pdfExtractionWorker, pdfExtractionQueue } from './workers/pdf-extraction.worker'
import { createSCIMWorker } from './workers/scim.worker'
import { terminatePool } from '@docuroute/core/src/watermark'
import { startViewLogRetentionCleanup } from './crons/view-log-retention'
import { startPDFBackfill } from './crons/pdf-backfill'

console.log('DocuRoute Worker started')

// Start cron jobs
startViewLogRetentionCleanup()
startPDFBackfill()

// Health endpoint on port 3001
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    const uptime = process.uptime()
    const memoryUsage = process.memoryUsage()

    // TODO: Get actual pool utilization from workerpool
    const poolUtilization = 0

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
        },
        queues: {
          watermark: 'active',
          pdfExtraction: 'active',
        },
        pool: {
          size: 2,
          utilization: poolUtilization,
        },
      })
    )
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Worker health endpoint listening on port ${PORT}`)
})

// Global crash handlers
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error)
  try {
    await terminatePool()
  } catch (err) {
    console.error('Failed to terminate pool:', err)
  }
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)
  try {
    await terminatePool()
  } catch (err) {
    console.error('Failed to terminate pool:', err)
  }
  process.exit(1)
})

// SIGTERM: graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')

  // Close workers
  await watermarkWorker.close()
  console.log('Watermark worker closed')

  await pdfExtractionWorker.close()
  console.log('PDF extraction worker closed')

  // Terminate workerpool
  await terminatePool()
  console.log('Workerpool terminated')

  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

console.log('Worker initialization complete')
