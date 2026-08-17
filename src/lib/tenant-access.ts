import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import type { MembershipRole } from '@/lib/membership-role'
import { ORG_COOKIE, orgCookieOptions } from '@/lib/org-cookie'

export async function findTenantMembership(userId: string, organizationSlug: string) {
  return db.organizationMembership.findFirst({
    where: {
      userId,
      organization: { slug: organizationSlug, status: 'ACTIVE' },
    },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  })
}

export async function requireOrganizationId(slug: string): Promise<string> {
  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })
  if (!org || org.status !== 'ACTIVE') {
    throw new Error('OrganizationNotFound')
  }
  return org.id
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

export async function syncActiveOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies()
  const current = cookieStore.get(ORG_COOKIE)?.value
  if (current !== organizationId) {
    cookieStore.set(orgCookieOptions(organizationId))
  }
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
