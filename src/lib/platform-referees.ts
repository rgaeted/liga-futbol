import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'

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
  if (membership.role !== MembershipRole.REFEREE) {
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

  await db.organizationMembership.delete({ where: { id: membership.id } })
}
