import { NextResponse } from 'next/server'
import { MobileApiError, mobileErrorResponse } from '@/lib/mobile/errors'
import {
  assertBearerInstallationId,
  buildInstallationRateLimitKey,
  getRequestClientIp,
} from '@/lib/mobile/installations/request'
import { checkInstallationRateLimit } from '@/lib/mobile/installations/rate-limit'
import { replaceTeamSubscriptions } from '@/lib/mobile/installations/subscriptions'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { replaceSubscriptionsSchema } from '@/lib/validations/mobile-installation'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; installationId: string }> },
) {
  const { slug, installationId } = await params

  try {
    assertBearerInstallationId(request, installationId)
    checkInstallationRateLimit(
      buildInstallationRateLimitKey(slug, getRequestClientIp(request), 'subscriptions'),
    )
  } catch (error) {
    if (error instanceof MobileApiError && error.status === 429) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }
    return mobileErrorResponse(error)
  }

  return withPublishedLeague(slug, async (league) => {
    const parsed = replaceSubscriptionsSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = await replaceTeamSubscriptions({
      seasonId: league.season.id,
      installationId,
      teams: parsed.data.teams,
    })

    return result
  })
}
