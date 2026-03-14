import { Worker, Queue } from 'bullmq'
import { getPrismaForCompany } from '@docuroute/db'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * SCIM Worker
 *
 * Handles SCIM user provisioning operations.
 * Each user has their own queue: scim-user-{userId}
 * Concurrency: 1 per queue (sequential processing for each user)
 */

export function createSCIMWorker(userId: string) {
  const queueName = `scim-user-${userId}`

  const queue = new Queue(queueName, {
    connection: { url: REDIS_URL },
  })

  const worker = new Worker(
    queueName,
    async (job) => {
      const { operation, companyId, userData } = job.data

      console.log(`SCIM ${operation} for user ${userId} in company ${companyId}`)

      const prisma = getPrismaForCompany(companyId)

      try {
        switch (operation) {
          case 'CREATE':
            // Create user
            await prisma.user.create({
              data: {
                ...userData,
                companyId,
              },
            })
            break

          case 'UPDATE':
            // Update user
            await prisma.user.update({
              where: { id: userId },
              data: userData,
            })
            break

          case 'DELETE':
            // Soft delete (mark as scimDeprovisioned)
            await prisma.user.update({
              where: { id: userId },
              data: { scimDeprovisioned: true, isActive: false },
            })
            break

          default:
            throw new Error(`Unknown SCIM operation: ${operation}`)
        }

        return { success: true }
      } catch (error) {
        console.error(`SCIM ${operation} failed for user ${userId}:`, error)
        throw error
      }
    },
    {
      connection: { url: REDIS_URL },
      concurrency: 1, // Sequential processing per user
      settings: {
        backoffStrategy: (attemptsMade) => {
          return Math.min(2000 * Math.pow(2, attemptsMade), 60000)
        },
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`SCIM job ${job.id} completed for user ${userId}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`SCIM job ${job?.id} failed for user ${userId}:`, err)
  })

  return { worker, queue }
}
