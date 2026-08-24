import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { MembershipRole, type MembershipRole as MembershipRoleType } from '@/lib/membership-role'
import { hasAnyMembershipRole, primaryMembershipRole } from '@/lib/membership-role'
import { ORG_COOKIE, orgCookieOptions } from '@/lib/org-cookie'

export const PLATFORM_ADMIN_TENANT_ROLES: MembershipRoleType[] = [MembershipRole.ORG_ADMIN]

export type ResolvedTenantMembership = {
  organizationId: string
  organization: { id: string; slug: string; name: string }
  roles: MembershipRoleType[]
  isPlatformOverride: boolean
}

export async function resolveTenantMembership(
  userId: string,
  organizationSlug: string,
  isPlatformAdmin: boolean,
): Promise<ResolvedTenantMembership | null> {
  const org = await db.organization.findFirst({
    where: { slug: organizationSlug, status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  })
  if (!org) return null

  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  })

  if (membership) {
    return {
      organizationId: org.id,
      organization: org,
      roles: membership.roles,
      isPlatformOverride: false,
    }
  }

  if (isPlatformAdmin) {
    return {
      organizationId: org.id,
      organization: org,
      roles: [...PLATFORM_ADMIN_TENANT_ROLES],
      isPlatformOverride: true,
    }
  }

  return null
}

export type AccessibleMembership = {
  organizationId: string
  slug: string
  name: string
  roles: MembershipRoleType[]
}

export async function listAccessibleMemberships(
  userId: string,
  isPlatformAdmin: boolean,
): Promise<AccessibleMembership[]> {
  const memberships = await db.organizationMembership.findMany({
    where: {
      userId,
      organization: { status: 'ACTIVE' },
    },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { organization: { name: 'asc' } },
  })

  if (!isPlatformAdmin) {
    return memberships.map((m) => ({
      organizationId: m.organizationId,
      slug: m.organization.slug,
      name: m.organization.name,
      roles: m.roles,
    }))
  }

  const allOrgs = await db.organization.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  })

  const byOrgId = new Map(memberships.map((m) => [m.organizationId, m]))

  return allOrgs.map((org) => {
    const existing = byOrgId.get(org.id)
    return {
      organizationId: org.id,
      slug: org.slug,
      name: org.name,
      roles: existing?.roles ?? [...PLATFORM_ADMIN_TENANT_ROLES],
    }
  })
}

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

export async function activeOrganizationIdForUser(
  userId: string,
  isPlatformAdmin = false,
): Promise<string | null> {
  const cookieStore = await cookies()
  const orgId = cookieStore.get(ORG_COOKIE)?.value
  if (!orgId) return null

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  })
  if (membership) return orgId

  if (isPlatformAdmin) {
    const org = await db.organization.findUnique({
      where: { id: orgId, status: 'ACTIVE' },
      select: { id: true },
    })
    return org ? orgId : null
  }

  return null
}

export async function syncActiveOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies()
  const current = cookieStore.get(ORG_COOKIE)?.value
  if (current !== organizationId) {
    cookieStore.set(orgCookieOptions(organizationId))
  }
}

export async function requireOrgRoleForSlug(
  organizationSlug: string,
  allowed: MembershipRole[]
) {
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const membership = await resolveTenantMembership(
    session.user.id,
    organizationSlug,
    session.user.isPlatformAdmin,
  )
  if (!membership || !hasAnyMembershipRole(membership.roles, allowed)) {
    throw new Error('Unauthorized')
  }

  await syncActiveOrganizationCookie(membership.organizationId)

  return {
    session,
    organizationId: membership.organizationId,
    roles: membership.roles,
    role: primaryMembershipRole(membership.roles),
  }
}

export function canAccessTenantArea(roles: MembershipRole[], area: string): boolean {
  const map: Record<string, MembershipRole[]> = {
    admin: ['ORG_ADMIN'],
    coach: ['COACH'],
    referee: ['REFEREE'],
    player: ['PLAYER', 'FRIENDLY_COACH'],
  }
  const allowed = map[area]
  if (!allowed) return false
  return hasAnyMembershipRole(roles, allowed)
}
