import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createTeamSchema } from '@/lib/validations/team'
import { deriveTeamColor } from '@/lib/team-color'
import { MembershipRole } from '@/lib/membership-role'

export async function GET() {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
    MembershipRole.PLAYER,
    MembershipRole.REFEREE,
  ])
  const teams = await db.team.findMany({
    where: { organizationId },
    include: {
      coach: { select: { id: true, name: true } },
      _count: { select: { players: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const body = await req.json()
  const parsed = createTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = {
    organizationId,
    name: parsed.data.name,
    logoUrl: parsed.data.logoUrl || null,
    color: parsed.data.color ?? deriveTeamColor(parsed.data.name),
    coachId: parsed.data.coachId,
  }

  const team = await db.team.create({ data })
  return NextResponse.json(team, { status: 201 })
}
