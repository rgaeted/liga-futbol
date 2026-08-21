import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { createPlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'
import { splitPersonName } from '@/lib/person-name'
import { setPlayerCategories } from '@/lib/player-categories'
import { assertPersonFichaAvailable, loadPersonFichaOrgIds } from '@/lib/person'

const playerInclude = {
  person: { include: { user: { select: { name: true, email: true } } } },
  team: { select: { id: true, name: true } },
  categories: { include: { friendlyCategory: { select: { id: true, name: true } } } },
} as const

function mapPlayer<
  T extends { person: { user: { name: string; email: string } | null } },
>(player: T) {
  return { ...player, user: player.person.user }
}

export async function GET(req: Request) {
  const { organizationId } = await requireOrgRole([
    MembershipRole.ORG_ADMIN,
    MembershipRole.COACH,
    MembershipRole.FRIENDLY_COACH,
  ])
  const url = new URL(req.url)
  const teamId = url.searchParams.get('teamId')
  const categoryId = url.searchParams.get('categoryId')
  const q = url.searchParams.get('q')?.trim()

  const players = await db.player.findMany({
    where: {
      organizationId,
      ...(teamId ? { teamId } : {}),
      ...(categoryId ? { categories: { some: { friendlyCategoryId: categoryId } } } : {}),
      ...(q
        ? {
            OR: [
              { person: { firstName: { contains: q, mode: 'insensitive' } } },
              { person: { lastName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: playerInclude,
    orderBy: [{ person: { firstName: 'asc' } }, { person: { lastName: 'asc' } }],
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

  const data = parsed.data
  const {
    email,
    name,
    password,
    firstName,
    lastName,
    teamId,
    jerseyNumber,
    position,
    dominantFoot,
    primaryPosition,
    secondaryPosition,
    categoryIds,
  } = data

  if (teamId) {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { organizationId: true },
    })
    if (!team || team.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Equipo no válido para esta organización' }, { status: 400 })
    }
  }

  if (categoryIds?.length) {
    const validCount = await db.friendlyCategory.count({
      where: { id: { in: categoryIds }, organizationId },
    })
    if (validCount !== categoryIds.length) {
      return NextResponse.json(
        { error: 'Categoría no válida para esta organización' },
        { status: 400 },
      )
    }
  }

  const hasAccount = Boolean(email && password && name)

  const player = await db.$transaction(async (tx) => {
    if (hasAccount) {
      const passwordHash = await bcrypt.hash(password!, 10)
      const user = await tx.user.create({
        data: { email: email!, name: name!, passwordHash },
      })
      await tx.organizationMembership.create({
        data: {
          organizationId,
          userId: user.id,
          role: MembershipRole.PLAYER,
        },
      })
      const personNames = splitPersonName(name!)
      const person = await tx.person.create({
        data: { userId: user.id, firstName: personNames.firstName, lastName: personNames.lastName },
      })
      const created = await tx.player.create({
        data: {
          personId: person.id,
          organizationId,
          teamId,
          jerseyNumber,
          position,
          dominantFoot: dominantFoot ?? undefined,
          primaryPosition: primaryPosition ?? undefined,
          secondaryPosition: secondaryPosition ?? undefined,
        },
        include: playerInclude,
      })
      if (categoryIds?.length) {
        await setPlayerCategories(created.id, categoryIds, tx)
      }
      return created
    }

    const person = await tx.person.create({
      data: {
        firstName: firstName!,
        lastName: lastName ?? '',
      },
    })
    const fichaIds = await loadPersonFichaOrgIds(tx, person.id)
    assertPersonFichaAvailable({ ...fichaIds, organizationId })
    const created = await tx.player.create({
      data: {
        personId: person.id,
        organizationId,
        teamId,
        jerseyNumber,
        position,
        dominantFoot: dominantFoot ?? undefined,
        primaryPosition: primaryPosition ?? undefined,
        secondaryPosition: secondaryPosition ?? undefined,
      },
      include: playerInclude,
    })
    if (categoryIds?.length) {
      await setPlayerCategories(created.id, categoryIds, tx)
    }
    return created
  })

  return NextResponse.json(mapPlayer(player), { status: 201 })
}
