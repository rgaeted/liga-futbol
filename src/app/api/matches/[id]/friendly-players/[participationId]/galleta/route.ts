import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole, assertSameOrganization } from '@/lib/auth'
import { updateFriendlyGalletaSchema } from '@/lib/validations/match'
import { MembershipRole } from '@/lib/membership-role'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participationId: string }> }
) {
  const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
  const { id: matchId, participationId } = await params

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { organizationId: true },
  })
  if (!match) {
    return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
  }
  assertSameOrganization(match.organizationId, organizationId)

  const parsed = updateFriendlyGalletaSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const participation = await db.friendlyMatchPlayer.findFirst({
    where: { id: participationId, matchId },
  })
  if (!participation) {
    return NextResponse.json({ error: 'Participación no encontrada' }, { status: 404 })
  }

  const updated = await db.friendlyMatchPlayer.update({
    where: { id: participationId },
    data: { isGalleta: parsed.data.isGalleta },
    include: { friendlyPlayer: true },
  })
  return NextResponse.json(updated)
}
