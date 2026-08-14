import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import type { MembershipRole } from '@/lib/membership-role'
import { ORG_COOKIE } from '@/lib/org-cookie'

export async function findTenantMembership(userId: string, organizationSlug: string) {
  return db.organizationMembership.findFirst({
    where: {
      userId,
      organization: { slug: organizationSlug, status: 'ACTIVE' },
    },
    include: {
      organization: { select: { id: true, slug: true } },
    },
  })
}

export async function activeOrganizationIdForUser(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const orgId = cookieStore.get(ORG_COOKIE)?.value
  if (!orgId) return null

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  })
  return membership ? orgId : null
}

export function canAccessTenantArea(role: MembershipRole, area: string): boolean {
  const map: Record<string, MembershipRole[]> = {
    admin: ['ORG_ADMIN'],
    coach: ['COACH'],
    referee: ['REFEREE'],
    player: ['PLAYER', 'FRIENDLY_COACH'],
  }
  return map[area]?.includes(role) ?? false
}
