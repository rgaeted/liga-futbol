import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import {
  mapFriendlyPlayerResponse,
  syncFriendlyPlayerCategories,
} from '@/lib/friendly-player-categories'
import { assertPersonFichaAvailable, loadPersonFichaOrgIds } from '@/lib/person'
import { MembershipRole } from '@/lib/membership-role'

const friendlyPlayerInclude = {
  person: { include: { user: { select: { id: true, email: true } } } },
  categories: {
    include: { friendlyCategory: { select: { id: true, name: true } } },
  },
} as const

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params

    const existing = await db.friendlyPlayer.findUnique({
      where: { id },
      include: {
        person: { include: { user: { select: { id: true, email: true } } } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }
    assertSameOrganization(existing.organizationId, organizationId)

    const parsed = updateFriendlyPlayerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError(parsed.error.flatten()) },
        { status: 400 }
      )
    }

    const { email, password, friendlyCategoryIds, ...profile } = parsed.data

    if (existing.person.user && (email || password)) {
      return NextResponse.json(
        { error: 'Este jugador ya tiene una cuenta vinculada' },
        { status: 400 }
      )
    }

    if (friendlyCategoryIds) {
      const categories = await db.friendlyCategory.findMany({
        where: { id: { in: friendlyCategoryIds }, organizationId },
        select: { id: true },
      })
      if (categories.length !== friendlyCategoryIds.length) {
        return NextResponse.json({ error: 'Una o más categorías no existen' }, { status: 400 })
      }
    }

    const player = await db.$transaction(async (tx) => {
      if (email && password && !existing.person.user) {
        const passwordHash = await bcrypt.hash(password, 10)
        const nextFirstName = profile.firstName ?? existing.firstName
        const nextLastName = profile.lastName ?? existing.lastName
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: `${nextFirstName} ${nextLastName}`.trim(),
          },
        })
        await tx.organizationMembership.create({
          data: {
            organizationId,
            userId: user.id,
            role: MembershipRole.PLAYER,
          },
        })
        await tx.person.update({
          where: { id: existing.personId },
          data: { userId: user.id },
        })
        const fichaIds = await loadPersonFichaOrgIds(tx, existing.personId)
        if (!fichaIds.existingPlayerOrgIds.includes(organizationId)) {
          assertPersonFichaAvailable({
            ...fichaIds,
            organizationId,
            kind: 'league',
          })
          await tx.player.create({
            data: { personId: existing.personId, organizationId },
          })
        }
      }

      const nextFirstName = profile.firstName ?? existing.firstName
      const nextLastName = profile.lastName ?? existing.lastName

      await tx.friendlyPlayer.update({
        where: { id },
        data: {
          ...profile,
          firstName: nextFirstName,
          lastName: nextLastName,
        },
      })

      await tx.person.update({
        where: { id: existing.personId },
        data: { firstName: nextFirstName, lastName: nextLastName },
      })

      if (friendlyCategoryIds) {
        await syncFriendlyPlayerCategories(tx, id, friendlyCategoryIds)
      }

      return tx.friendlyPlayer.findUniqueOrThrow({
        where: { id },
        include: friendlyPlayerInclude,
      })
    })

    return NextResponse.json(mapFriendlyPlayerResponse(player))
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('PUT /api/friendly-players/[id]', error)
    return NextResponse.json({ error: 'Error al actualizar jugador' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.friendlyPlayer.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const participationCount = await db.friendlyMatchPlayer.count({
    where: { friendlyPlayerId: id },
  })
  if (participationCount > 0) {
    return NextResponse.json(
      {
        error: `El jugador tiene ${participationCount} participación(es) en amistosos. No se puede eliminar.`,
      },
      { status: 400 }
    )
  }

  await db.friendlyPlayer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
