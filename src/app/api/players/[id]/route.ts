import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validations/player'
import { MembershipRole } from '@/lib/membership-role'

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
  if (existing.team) {
    assertSameOrganization(existing.team.organizationId, organizationId)
  }

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
    include: { user: { select: { name: true, email: true } }, team: true },
  })
  return NextResponse.json(player)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const player = await db.player.findUnique({
    where: { id },
    include: { team: { select: { organizationId: true } } },
  })
  if (!player) {
    return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  }
  if (player.team) {
    assertSameOrganization(player.team.organizationId, organizationId)
  }

  await db.$transaction([
    db.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } }),
    db.callUp.deleteMany({ where: { playerId: id } }),
    db.playerEvaluation.deleteMany({ where: { playerId: id } }),
    db.organizationMembership.deleteMany({
      where: { userId: player.userId, organizationId },
    }),
    db.player.delete({ where: { id } }),
    db.user.delete({ where: { id: player.userId } }),
  ])
  return NextResponse.json({ ok: true })
}
