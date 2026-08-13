import { NextResponse } from 'next/server'
import { MobileApiError, mobileErrorResponse } from '@/lib/mobile/errors'
import { registerInstallation } from '@/lib/mobile/installations/register'
import {
  buildInstallationRateLimitKey,
  getRequestClientIp,
} from '@/lib/mobile/installations/request'
import { checkInstallationRateLimit } from '@/lib/mobile/installations/rate-limit'
import { withPublishedLeague } from '@/lib/mobile/route-handler'
import { registerInstallationSchema } from '@/lib/validations/mobile-installation'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    checkInstallationRateLimit(
      buildInstallationRateLimitKey(slug, getRequestClientIp(request), 'register'),
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
    const parsed = registerInstallationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = await registerInstallation({
      seasonId: league.season.id,
      installationId: parsed.data.installationId,
      expoPushToken: parsed.data.expoPushToken,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
    })

    return NextResponse.json(result, { status: 201 })
  })
}
