import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createPlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'

export async function GET() {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
  ])
  const players = await db.player.findMany({
    where: { team: { organizationId } },
    include: {
      user: { select: { name: true, email: true } },
      team: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const body = await req.json()
  const parsed = createPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, password, teamId, jerseyNumber, position } = parsed.data

  if (teamId) {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    })
    if (!team || team.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Equipo no válido para esta organización' }, { status: 400 })
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const player = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash },
    })
    await tx.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        role: MembershipRole.PLAYER,
      },
    })
    return tx.player.create({
      data: { userId: user.id, teamId, jerseyNumber, position },
      include: { user: true, team: true },
    })
  })

  return NextResponse.json(player, { status: 201 })
}
