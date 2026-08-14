import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createPlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'
import { splitPersonName } from '@/lib/person-name'

const playerInclude = {
  person: { include: { user: { select: { name: true, email: true } } } },
  team: { select: { name: true } },
} as const

function mapPlayer<T extends { person: { user: { name: string; email: string } | null } }>(player: T) {
  return { ...player, user: player.person.user }
}

export async function GET() {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
  ])
  const players = await db.player.findMany({
    where: { organizationId },
    include: playerInclude,
    orderBy: { person: { firstName: 'asc' } },
  })
  return NextResponse.json(players.map(mapPlayer))
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
    const { firstName, lastName } = splitPersonName(name)
    const person = await tx.person.create({
      data: { userId: user.id, firstName, lastName },
    })
    return tx.player.create({
      data: { personId: person.id, organizationId, teamId, jerseyNumber, position },
      include: playerInclude,
    })
  })

  return NextResponse.json(mapPlayer(player), { status: 201 })
}
