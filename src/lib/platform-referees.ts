import { db } from '@/lib/db'
import { MembershipRole, hasMembershipRole } from '@/lib/membership-role'

export class PlatformRefereeError extends Error {
  constructor(readonly code: PlatformRefereeErrorCode) {
    super(code)
    this.name = 'PlatformRefereeError'
  }
}

export type PlatformRefereeErrorCode = 'not_found' | 'not_referee' | 'has_assigned_matches'

export async function revokeRefereeMembership(
  userId: string,
  organizationId: string
): Promise<void> {
  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  })

  if (!membership) {
    throw new PlatformRefereeError('not_found')
  }
  if (!hasMembershipRole(membership.roles, MembershipRole.REFEREE)) {
    throw new PlatformRefereeError('not_referee')
  }

  const assignedMatch = await db.match.findFirst({
    where: {
      organizationId,
      refereeId: userId,
      status: { in: ['SCHEDULED', 'LIVE', 'HALFTIME'] },
    },
    select: { id: true },
  })
  if (assignedMatch) {
    throw new PlatformRefereeError('has_assigned_matches')
  }

  if (membership.roles.length === 1) {
    await db.organizationMembership.delete({ where: { id: membership.id } })
    return
  }

  await db.organizationMembership.update({
    where: { id: membership.id },
    data: {
      roles: membership.roles.filter((role) => role !== MembershipRole.REFEREE),
    },
  })
}
