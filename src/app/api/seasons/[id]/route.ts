import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { updateSeasonSchema } from '@/lib/validations/season'
import { Role } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params
  const parsed = updateSeasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { startDate, endDate, ...rest } = parsed.data
  const season = await db.season.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })
  return NextResponse.json(season)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.ADMIN])
  const { id } = await params

  const matchCount = await db.match.count({ where: { seasonId: id } })
  if (matchCount > 0) {
    return NextResponse.json(
      { error: `La temporada tiene ${matchCount} partido(s). Eliminalos primero.` },
      { status: 409 }
    )
  }

  await db.season.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
