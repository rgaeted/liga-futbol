import { NextResponse } from 'next/server'
import { getBadgeDefinition } from '@/lib/badges/registry'
import { assertSameOrganization, requireOrgRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'
import { updateOrgBadgeSchema } from '@/lib/validations/org-badge'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const parsed = updateOrgBadgeSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await db.orgBadge.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Insignia no encontrada' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const badge = await db.orgBadge.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.family !== undefined ? { family: parsed.data.family } : {}),
      ...(parsed.data.rarity !== undefined ? { rarity: parsed.data.rarity } : {}),
      ...(parsed.data.iconKey !== undefined ? { iconKey: parsed.data.iconKey } : {}),
      ...(parsed.data.thresholds !== undefined ? { thresholds: parsed.data.thresholds } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
    include: { _count: { select: { playerBadges: true } } },
  })

  return NextResponse.json({
    ...badge,
    evaluable: getBadgeDefinition(badge.predicateId).evaluable,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.orgBadge.findUnique({
    where: { id },
    include: { _count: { select: { playerBadges: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Insignia no encontrada' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  if (existing._count.playerBadges > 0) {
    return NextResponse.json(
      {
        error: 'No se puede eliminar: ya hay jugadores que la ganaron. Desactívala.',
      },
      { status: 409 },
    )
  }

  await db.orgBadge.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
