import { NextResponse } from 'next/server'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateOrgAwardSchema } from '@/lib/validations/org-award'
import { MembershipRole } from '@/lib/membership-role'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const award = await db.orgAward.findUnique({
    where: { id },
    include: { _count: { select: { playerAwards: true } } },
  })
  if (!award) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }
  assertSameOrganization(award.organizationId, organizationId)
  return NextResponse.json(award)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params
  const parsed = updateOrgAwardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await db.orgAward.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  const award = await db.orgAward.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.shortLabel !== undefined ? { shortLabel: parsed.data.shortLabel } : {}),
      ...(parsed.data.emoji !== undefined ? { emoji: parsed.data.emoji } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.accentColor !== undefined ? { accentColor: parsed.data.accentColor } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  })
  return NextResponse.json(award)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id } = await params

  const existing = await db.orgAward.findUnique({
    where: { id },
    include: { _count: { select: { playerAwards: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  if (existing._count.playerAwards > 0) {
    return NextResponse.json(
      {
        error:
          'No se puede eliminar: el premio ya fue otorgado a jugadores. Desactívalo en su lugar.',
      },
      { status: 409 },
    )
  }

  await db.orgAward.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
