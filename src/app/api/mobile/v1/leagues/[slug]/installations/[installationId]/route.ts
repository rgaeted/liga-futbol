import { MobileApiError, mobileErrorResponse } from '@/lib/mobile/errors'
import { deactivateInstallation } from '@/lib/mobile/installations/deactivate'
import {
  assertBearerInstallationId,
  buildInstallationRateLimitKey,
  getRequestClientIp,
} from '@/lib/mobile/installations/request'
import { checkInstallationRateLimit } from '@/lib/mobile/installations/rate-limit'
import { withPublishedLeague } from '@/lib/mobile/route-handler'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; installationId: string }> },
) {
  const { slug, installationId } = await params

  try {
    assertBearerInstallationId(request, installationId)
    checkInstallationRateLimit(
      buildInstallationRateLimitKey(slug, getRequestClientIp(request), 'deactivate'),
    )
  } catch (error) {
    if (error instanceof MobileApiError && error.status === 429) {
      return Response.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }
    return mobileErrorResponse(error)
  }

  return withPublishedLeague(slug, async (league) => {
    await deactivateInstallation(league.season.id, installationId)
    return new Response(null, { status: 204 })
  })
}
