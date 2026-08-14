import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updateTeamSchema } from '@/lib/validations/team'
import { MembershipRole } from '@/lib/membership-role'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.team.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const parsed = updateTeamSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const team = await db.team.update({ where: { id }, data: parsed.data })
  return NextResponse.json(team)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.team.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const matchCount = await db.match.count({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
  })
  if (matchCount > 0) {
    return NextResponse.json(
      { error: `El equipo tiene ${matchCount} partido(s). Eliminalos primero.` },
      { status: 409 }
    )
  }

  await db.$transaction([
    db.player.updateMany({ where: { teamId: id }, data: { teamId: null } }),
    db.team.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
