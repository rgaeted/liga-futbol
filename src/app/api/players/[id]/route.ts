import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'
import { setPlayerCategories } from '@/lib/player-categories'

const playerInclude = {
  person: { include: { user: { select: { name: true, email: true } } } },
  team: true,
  categories: { include: { friendlyCategory: { select: { id: true, name: true } } } },
} as const

function mapPlayer<T extends { person: { user: { name: string; email: string } | null } }>(player: T) {
  return { ...player, user: player.person.user }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.player.findUnique({
    where: { id },
    include: { team: { select: { organizationId: true } }, person: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const parsed = updatePlayerSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { categoryIds, firstName, lastName, ...playerFields } = parsed.data

  if (playerFields.teamId) {
    const team = await db.team.findUnique({
      where: { id: playerFields.teamId },
      select: { organizationId: true },
    })
    if (!team || team.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Equipo no válido para esta organización' }, { status: 400 })
    }
  }

  const player = await db.$transaction(async (tx) => {
    if (firstName !== undefined || lastName !== undefined) {
      await tx.person.update({
        where: { id: existing.personId },
        data: {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
        },
      })
    }
    const updated = await tx.player.update({
      where: { id },
      data: playerFields,
      include: playerInclude,
    })
    if (categoryIds !== undefined) {
      await setPlayerCategories(id, categoryIds, tx)
    }
    return updated
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
    await tx.matchEvent.updateMany({ where: { assistPlayerId: id }, data: { assistPlayerId: null } })
    await tx.friendlyMatchPlayer.deleteMany({ where: { playerId: id } })
    await tx.callUp.deleteMany({ where: { playerId: id } })
    await tx.playerEvaluation.deleteMany({ where: { playerId: id } })
    await tx.playerCategory.deleteMany({ where: { playerId: id } })
    await tx.player.delete({ where: { id } })

    const remainingPlayers = await tx.player.count({ where: { personId } })

    if (remainingPlayers === 0) {
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
