import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { withApiHandler } from '@/lib/auth'
import { prismaAdmin } from '@docuroute/db'

/**
 * GET /api/company/features
 *
 * Returns the feature flags for the current user's company.
 * Used by the UI to conditionally show/hide features based on plan tier.
 *
 * No permission required - all authenticated users can see their company's features.
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Fetch company features
  const company = await prismaAdmin.company.findUnique({
    where: { id: session.user.companyId },
    select: { features: true, planTier: true },
  })

  if (!company) {
    return new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Company not found' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      features: company.features || {},
      planTier: company.planTier,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
})
