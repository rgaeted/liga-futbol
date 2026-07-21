import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
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

export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN])
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const players = await db.friendlyPlayer.findMany({
      where: categoryId
        ? { categories: { some: { friendlyCategoryId: categoryId } } }
        : undefined,
      include: friendlyPlayerInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return NextResponse.json(players)
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('GET /api/friendly-players', error)
    return NextResponse.json({ error: 'Error al listar jugadores' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole([Role.ADMIN])
    const parsed = createFriendlyPlayerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError(parsed.error.flatten()) },
        { status: 400 }
      )
    }

    const {
      firstName,
      lastName,
      email,
      password,
      dominantFoot,
      primaryPosition,
      secondaryPosition,
      friendlyCategoryIds,
    } = parsed.data

    const categories = await db.friendlyCategory.findMany({
      where: { id: { in: friendlyCategoryIds } },
      select: { id: true },
    })
    if (categories.length !== friendlyCategoryIds.length) {
      return NextResponse.json({ error: 'Una o más categorías no existen' }, { status: 400 })
    }

    const player = await db.$transaction(async (tx) => {
      let userId: string | undefined
      if (email && password) {
        userId = await createUserForFriendlyPlayer(tx, {
          firstName,
          lastName,
          email,
          password,
        })
      }

      const created = await tx.friendlyPlayer.create({
        data: {
          firstName,
          lastName,
          ...(dominantFoot ? { dominantFoot } : {}),
          ...(primaryPosition ? { primaryPosition } : {}),
          ...(secondaryPosition ? { secondaryPosition } : {}),
          ...(userId ? { userId } : {}),
        },
      })

      await syncFriendlyPlayerCategories(tx, created.id, friendlyCategoryIds)

      return tx.friendlyPlayer.findUniqueOrThrow({
        where: { id: created.id },
        include: friendlyPlayerInclude,
      })
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    console.error('POST /api/friendly-players', error)
    return NextResponse.json({ error: 'Error al crear jugador amistoso' }, { status: 500 })
  }
}
