import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { fetchWeatherForMatch } from '@/lib/match-weather'
import { Role } from '@prisma/client'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const match = await db.match.findUnique({
    where: { id },
    select: {
      id: true,
      scheduledAt: true,
      communeLat: true,
      communeLon: true,
      communeName: true,
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  if (match.communeLat === null || match.communeLon === null) {
    return NextResponse.json(
      { error: 'El partido debe tener región y comuna para consultar el clima' },
      { status: 400 }
    )
  }

  try {
    const weather = await fetchWeatherForMatch({
      lat: match.communeLat,
      lon: match.communeLon,
      scheduledAt: match.scheduledAt,
    })

    const updated = await db.match.update({
      where: { id },
      data: weather,
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
