import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { fetchWeatherForMatch } from '@/lib/match-weather'
import { buildMatchLocationFields } from '@/lib/match-location'
import { fetchMatchWeatherSchema } from '@/lib/validations/match'
import { MembershipRole } from '@/lib/membership-role'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const rawBody = await req.json().catch(() => ({}))
  const parsed = fetchMatchWeatherSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      scheduledAt: true,
      communeLat: true,
      communeLon: true,
      communeName: true,
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  assertSameOrganization(match.organizationId, organizationId)

  const { regionCode, communeCode, scheduledAt } = parsed.data
  let lat = match.communeLat
  let lon = match.communeLon
  let targetScheduledAt = match.scheduledAt
  const persistData: Record<string, unknown> = {}

  if (regionCode && communeCode) {
    const locationFields = buildMatchLocationFields({ regionCode, communeCode })
    if ('error' in locationFields) {
      return NextResponse.json({ error: locationFields.error }, { status: 400 })
    }
    lat = locationFields.communeLat
    lon = locationFields.communeLon
    Object.assign(persistData, locationFields)
  }

  if (scheduledAt) {
    targetScheduledAt = new Date(scheduledAt)
    persistData.scheduledAt = targetScheduledAt
  }

  if (lat === null || lon === null) {
    return NextResponse.json(
      {
        error:
          'Guarda región y comuna antes de consultar el clima, o envíalas al consultar.',
      },
      { status: 400 }
    )
  }

  try {
    const weather = await fetchWeatherForMatch({
      lat,
      lon,
      scheduledAt: targetScheduledAt,
    })

    const updated = await db.match.update({
      where: { id },
      data: {
        ...persistData,
        ...weather,
      },
      select: {
        weatherTempC: true,
        weatherHumidityPct: true,
        weatherWindKmh: true,
        weatherCode: true,
        weatherLabel: true,
        weatherFetchedAt: true,
        communeName: true,
        regionName: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No pudimos consultar el clima'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
