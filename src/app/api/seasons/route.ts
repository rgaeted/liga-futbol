import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Role } from '@prisma/client'

const seasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export async function GET() {
  const seasons = await db.season.findMany({ orderBy: { startDate: 'desc' } })
  return NextResponse.json(seasons)
}

export async function POST(req: Request) {
  await requireRole([Role.ADMIN])
  const parsed = seasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const season = await db.season.create({
    data: {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  })
  return NextResponse.json(season, { status: 201 })
}
