import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { getPrismaForCompany } from '@docuroute/db'
import { unauthorized } from '@docuroute/core/src/errors'

/**
 * GET /api/company/onboarding
 *
 * Returns the CompanyOnboarding record for the authenticated user's company.
 * Creates one if it doesn't exist.
 *
 * Permission required: any authenticated user
 *
 * Response:
 * {
 *   onboarding: {
 *     id: string
 *     companyId: string
 *     completedSteps: string[]
 *     createdAt: string
 *     updatedAt: string
 *   }
 * }
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw unauthorized()
  }

  const prisma = getPrismaForCompany(session.user.companyId)

  // Get or create onboarding record
  let onboarding = await prisma.companyOnboarding.findUnique({
    where: {
      companyId: session.user.companyId,
    },
  })

  if (!onboarding) {
    // Create onboarding record if it doesn't exist
    onboarding = await prisma.companyOnboarding.create({
      data: {
        companyId: session.user.companyId,
        completedSteps: [],
      },
    })
  }

  return new Response(
    JSON.stringify({ onboarding }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
