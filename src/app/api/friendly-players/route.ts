import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { formatApiError } from '@/lib/api-error'
import { mapPrismaError } from '@/lib/prisma-errors'
import { createFriendlyPlayerSchema } from '@/lib/validations/friendly-player'
import {
  createUserForFriendlyPlayer,
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

export async function GET(req: Request) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const players = await db.friendlyPlayer.findMany({
      where: {
        organizationId,
        ...(categoryId
          ? { categories: { some: { friendlyCategoryId: categoryId } } }
          : {}),
      },
      include: friendlyPlayerInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return NextResponse.json(players.map(mapFriendlyPlayerResponse))
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
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
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
      personId: existingPersonId,
    } = parsed.data

    const categories = await db.friendlyCategory.findMany({
      where: { id: { in: friendlyCategoryIds }, organizationId },
      select: { id: true },
    })
    if (categories.length !== friendlyCategoryIds.length) {
      return NextResponse.json({ error: 'Una o más categorías no existen' }, { status: 400 })
    }

    const player = await db.$transaction(async (tx) => {
      let personId = existingPersonId

      if (email && password) {
        const created = await createUserForFriendlyPlayer(tx, {
          organizationId,
          firstName,
          lastName,
          email,
          password,
        })
        personId = created.personId
      } else if (!personId) {
        const person = await tx.person.create({
          data: { firstName, lastName },
        })
        personId = person.id
      }

      const fichaIds = await loadPersonFichaOrgIds(tx, personId)
      assertPersonFichaAvailable({
        ...fichaIds,
        organizationId,
        kind: 'friendly',
      })

      const created = await tx.friendlyPlayer.create({
        data: {
          organizationId,
          personId,
          firstName,
          lastName,
          ...(dominantFoot ? { dominantFoot } : {}),
          ...(primaryPosition ? { primaryPosition } : {}),
          ...(secondaryPosition ? { secondaryPosition } : {}),
        },
      })

      await tx.person.update({
        where: { id: personId },
        data: { firstName, lastName },
      })

      await syncFriendlyPlayerCategories(tx, created.id, friendlyCategoryIds)

      return tx.friendlyPlayer.findUniqueOrThrow({
        where: { id: created.id },
        include: friendlyPlayerInclude,
      })
    })

    return NextResponse.json(mapFriendlyPlayerResponse(player), { status: 201 })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
    if (error instanceof Error && 'status' in error && error.status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('POST /api/friendly-players', error)
    return NextResponse.json({ error: 'Error al crear jugador amistoso' }, { status: 500 })
  }
}
