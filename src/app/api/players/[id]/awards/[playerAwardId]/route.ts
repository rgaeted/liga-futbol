import { NextResponse } from 'next/server'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playerAwardId: string }> },
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: playerId, playerAwardId } = await params

  const existing = await db.playerAward.findUnique({ where: { id: playerAwardId } })
  if (!existing || existing.playerId !== playerId) {
    return NextResponse.json({ error: 'Otorgamiento no encontrado' }, { status: 404 })
  }
  assertSameOrganization(existing.organizationId, organizationId)

  await db.playerAward.delete({ where: { id: playerAwardId } })
  return NextResponse.json({ ok: true })
}
