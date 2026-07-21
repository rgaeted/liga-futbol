import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { createSeasonSchema } from '@/lib/validations/season'

export async function GET() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  return NextResponse.json(seasons)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = createSeasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const season = await db.season.create({
    data: {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      footballFormat: parsed.data.footballFormat,
    },
  })
  return NextResponse.json(season, { status: 201 })
}
