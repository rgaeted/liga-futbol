import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createSeasonSchema } from '@/lib/validations/season'
import { MembershipRole } from '@/lib/membership-role'

export async function GET() {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
    MembershipRole.PLAYER,
    MembershipRole.REFEREE,
  ])
  const seasons = await db.season.findMany({
    where: { organizationId },
    orderBy: { startDate: 'desc' },
  })
  return NextResponse.json(seasons)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createSeasonSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const season = await db.season.create({
    data: {
      organizationId,
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      footballFormat: parsed.data.footballFormat,
    },
  })
  return NextResponse.json(season, { status: 201 })
}
