import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import { RefereeShareError, assertCanShareReferee } from '@/lib/referees'
import { shareRefereeSchema } from '@/lib/validations/referee'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { organizationId, session } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { userId } = await params
    const parsed = shareRefereeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const destOrg = await db.organization.findUnique({
      where: { slug: parsed.data.toOrganizationSlug },
      select: { id: true, status: true },
    })
    if (!destOrg || destOrg.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Organización destino no disponible' }, { status: 400 })
    }

    const originMembership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    assertCanShareReferee({
      fromOrganizationId: organizationId,
      toOrganizationId: destOrg.id,
      isRefereeInFrom: originMembership?.role === MembershipRole.REFEREE,
    })

    const destMembership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId: destOrg.id, userId },
      },
    })
    if (destMembership?.role === MembershipRole.REFEREE) {
      return NextResponse.json(
        { error: 'Este árbitro ya pita en la organización destino' },
        { status: 409 },
      )
    }
    if (destMembership) {
      return NextResponse.json(
        { error: 'Este correo ya tiene otro rol en la organización destino' },
        { status: 409 },
      )
    }

    const invite = await db.refereeShareInvite.create({
      data: {
        refereeUserId: userId,
        fromOrganizationId: organizationId,
        toOrganizationId: destOrg.id,
        invitedByUserId: session.user.id,
      },
    })

    return NextResponse.json({ id: invite.id }, { status: 201 })
  } catch (error) {
    if (error instanceof RefereeShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
