import { NextResponse } from 'next/server'
import { RefereeShareInviteStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgRole } from '@/lib/auth'
import { MembershipRole, hasMembershipRole } from '@/lib/membership-role'
import { mapPrismaError } from '@/lib/prisma-errors'
import { RefereeShareError, assertCanAcceptRefereeShare } from '@/lib/referees'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organizationId } = await requireOrgRole([MembershipRole.ORG_ADMIN])
    const { id } = await params

    const invite = await db.refereeShareInvite.findUnique({
      where: { id },
      include: {
        refereeUser: {
          include: {
            memberships: { where: { organizationId: organizationId } },
          },
        },
      },
    })
    if (!invite || invite.toOrganizationId !== organizationId) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    const destMembership = invite.refereeUser.memberships[0] ?? null
    assertCanAcceptRefereeShare({
      destHasReferee: destMembership
        ? hasMembershipRole(destMembership.roles, MembershipRole.REFEREE)
        : false,
      pending: invite.status === RefereeShareInviteStatus.PENDING,
    })

    await db.$transaction(async (tx) => {
      if (!destMembership) {
        await tx.organizationMembership.create({
          data: {
            organizationId,
            userId: invite.refereeUserId,
            roles: [MembershipRole.REFEREE],
          },
        })
      } else {
        await tx.organizationMembership.update({
          where: { id: destMembership.id },
          data: { roles: [...destMembership.roles, MembershipRole.REFEREE] },
        })
      }
      await tx.refereeShareInvite.update({
        where: { id },
        data: { status: RefereeShareInviteStatus.ACCEPTED },
      })
      await tx.refereeProfile.upsert({
        where: { userId: invite.refereeUserId },
        create: { userId: invite.refereeUserId },
        update: {},
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RefereeShareError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const mapped = mapPrismaError(error)
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
