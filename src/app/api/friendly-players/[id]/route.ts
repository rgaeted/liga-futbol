import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { mapPrismaError } from '@/lib/prisma-errors'
import { updateFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import {
  createUserForFriendlyPlayer,
  syncFriendlyPlayerCategories,
} from '@/lib/friendly-player-categories'
import { Role } from '@prisma/client'

const friendlyPlayerInclude = {
  user: { select: { id: true, email: true } },
  categories: {
    include: { friendlyCategory: { select: { id: true, name: true } } },
  },
} as const

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([Role.ADMIN])
    const { id } = await params

    const existing = await db.friendlyPlayer.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    const parsed = updateFriendlyPlayerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError(parsed.error.flatten()) },
        { status: 400 }
      )
    }

    const { email, password, friendlyCategoryIds, ...profile } = parsed.data

    if (existing.userId && (email || password)) {
      return NextResponse.json(
        { error: 'Este jugador ya tiene una cuenta vinculada' },
        { status: 400 }
      )
    }

    if (friendlyCategoryIds) {
      const categories = await db.friendlyCategory.findMany({
        where: { id: { in: friendlyCategoryIds } },
        select: { id: true },
      })
      if (categories.length !== friendlyCategoryIds.length) {
        return NextResponse.json({ error: 'Una o más categorías no existen' }, { status: 400 })
      }
    }

    const player = await db.$transaction(async (tx) => {
      let userId = existing.userId
      if (email && password && !userId) {
        userId = await createUserForFriendlyPlayer(tx, {
          firstName: profile.firstName ?? existing.firstName,
          lastName: profile.lastName ?? existing.lastName,
          email,
          password,
        })
      }

      await tx.friendlyPlayer.update({
        where: { id },
        data: {
          ...profile,
          ...(userId && !existing.userId ? { userId } : {}),
        },
      })

      if (friendlyCategoryIds) {
        await syncFriendlyPlayerCategories(tx, id, friendlyCategoryIds)
      }

      return tx.friendlyPlayer.findUniqueOrThrow({
        where: { id },
        include: friendlyPlayerInclude,
      })
    })

    return NextResponse.json(player)
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
  await requireRole([Role.ADMIN])
  const { id } = await params

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
