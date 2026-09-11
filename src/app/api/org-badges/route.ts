import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { BADGE_REGISTRY, getBadgeDefinition } from '@/lib/badges/registry'
import { requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { createOrgBadgeSchema } from '@/lib/validations/org-badge'

export async function GET() {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const badges = await db.orgBadge.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { playerBadges: true } } },
  })

  return NextResponse.json(
    badges.map((badge) => ({
      ...badge,
      evaluable: getBadgeDefinition(badge.predicateId).evaluable,
    })),
  )
}

export async function POST(req: Request) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const parsed = createOrgBadgeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  let definition
  try {
    definition = getBadgeDefinition(parsed.data.predicateId)
  } catch {
    return NextResponse.json({ error: 'Insignia desconocida' }, { status: 400 })
  }

  try {
    const badge = await db.orgBadge.create({
      data: {
        organizationId,
        predicateId: definition.predicateId,
        name: definition.name,
        description: definition.description,
        family: definition.family,
        rarity: definition.rarity,
        iconKey: definition.iconKey,
        thresholds: definition.defaultThresholds,
        sortOrder: BADGE_REGISTRY.indexOf(definition),
      },
      include: { _count: { select: { playerBadges: true } } },
    })

    return NextResponse.json(
      {
        ...badge,
        evaluable: definition.evaluable,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Esta insignia ya está en el catálogo de la organización' },
        { status: 409 },
      )
    }
    throw error
  }
}
