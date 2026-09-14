import { db } from '@/lib/db'
import { MembershipRole } from '@/lib/membership-role'

export async function findRefereeUserInOrganization(userId: string, organizationId: string) {
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      roles: { has: MembershipRole.REFEREE },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          refereeProfile: { select: { photoStoragePath: true } },
        },
      },
    },
  })

  return membership?.user ?? null
}
