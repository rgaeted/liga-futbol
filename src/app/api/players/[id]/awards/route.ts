import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { db } from '@/lib/db'
import { grantPlayerAwardSchema } from '@/lib/validations/player-award'
import { MembershipRole } from '@/lib/membership-role'
import { serializePlayerAwardBadge } from '@/lib/player-awards'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: playerId } = await params

  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(player.organizationId, organizationId)

  const awards = await db.playerAward.findMany({
    where: { playerId, organizationId },
    include: {
      orgAward: true,
      season: { select: { id: true, name: true } },
    },
    orderBy: { awardedAt: 'desc' },
  })

  return NextResponse.json(awards.map(serializePlayerAwardBadge))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId, session } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: playerId } = await params
  const parsed = grantPlayerAwardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  assertSameOrganization(player.organizationId, organizationId)

  const orgAward = await db.orgAward.findUnique({ where: { id: parsed.data.orgAwardId } })
  if (!orgAward || orgAward.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }
  if (!orgAward.isActive) {
    return NextResponse.json({ error: 'El premio está desactivado' }, { status: 400 })
  }

  const seasonId = parsed.data.seasonId ?? null
  if (seasonId) {
    const season = await db.season.findUnique({ where: { id: seasonId } })
    if (!season || season.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 })
    }
  }

  try {
    const created = await db.playerAward.create({
      data: {
        organizationId,
        playerId,
        orgAwardId: parsed.data.orgAwardId,
        seasonId,
        note: parsed.data.note ?? null,
        awardedByUserId: session.user.id,
      },
      include: {
        orgAward: true,
        season: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(serializePlayerAwardBadge(created), { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este jugador ya tiene ese premio en esa temporada' },
        { status: 409 },
      )
    }
    throw err
  }
}
