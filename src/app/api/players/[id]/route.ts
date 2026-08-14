import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'

const playerInclude = {
  person: { include: { user: { select: { name: true, email: true } } } },
  team: true,
} as const

function mapPlayer<T extends { person: { user: { name: string; email: string } | null } }>(player: T) {
  return { ...player, user: player.person.user }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.player.findUnique({
    where: { id },
    include: { team: { select: { organizationId: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const parsed = updatePlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.teamId) {
    const team = await db.team.findUnique({
      where: { id: parsed.data.teamId },
      select: { organizationId: true },
    })
    if (!team || team.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Equipo no válido para esta organización' }, { status: 400 })
    }
  }

  const player = await db.player.update({
    where: { id },
    data: parsed.data,
    include: playerInclude,
  })
  return NextResponse.json(mapPlayer(player))
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const player = await db.player.findUnique({
    where: { id },
    include: {
      person: { select: { id: true, userId: true } },
    },
  })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(player.organizationId, organizationId)

  const personId = player.person.id
  const userId = player.person.userId

  await db.$transaction(async (tx) => {
    await tx.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } })
    await tx.callUp.deleteMany({ where: { playerId: id } })
    await tx.playerEvaluation.deleteMany({ where: { playerId: id } })
    await tx.player.delete({ where: { id } })

    const [remainingPlayers, remainingFriendlies] = await Promise.all([
      tx.player.count({ where: { personId } }),
      tx.friendlyPlayer.count({ where: { personId } }),
    ])

    if (remainingPlayers === 0 && remainingFriendlies === 0) {
      await tx.person.delete({ where: { id: personId } })
      if (userId) {
        await tx.organizationMembership.deleteMany({
          where: { userId, organizationId },
        })
        await tx.user.delete({ where: { id: userId } })
      }
    } else if (userId) {
      await tx.organizationMembership.deleteMany({
        where: { userId, organizationId },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
