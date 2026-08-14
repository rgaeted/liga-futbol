import { NextResponse } from 'next/server'
import { RefereeShareInviteStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params

    const invite = await db.refereeShareInvite.findUnique({ where: { id } })
    if (!invite || invite.fromOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }
    if (invite.status !== RefereeShareInviteStatus.PENDING) {
      return NextResponse.json({ error: 'La invitación ya no está pendiente' }, { status: 409 })
    }

    await db.refereeShareInvite.update({
      where: { id },
      data: { status: RefereeShareInviteStatus.CANCELLED },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
