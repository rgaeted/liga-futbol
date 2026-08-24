import { getDashboardPath, primaryMembershipRole, type MembershipRole } from '@/lib/membership-role'
import { parseOrganizationSlug, RESERVED_ORGANIZATION_SLUGS } from '@/lib/organization-slug'

export type PostLoginMembership = {
  slug: string
  roles: MembershipRole[]
  status: 'ACTIVE' | 'PAUSED'
}

export function resolvePostLoginPath(input: {
  isPlatformAdmin: boolean
  memberships: PostLoginMembership[]
  friendlyParticipationsBySlug?: Record<string, number>
}): string {
  if (input.isPlatformAdmin) return '/plataforma'

  const active = input.memberships.filter((m) => m.status === 'ACTIVE')
  if (active.length === 1) {
    return getDashboardPath(active[0].slug, primaryMembershipRole(active[0].roles))
  }
  if (active.length > 1) {
    const preferred = preferredMembershipByActivity(
      active,
      input.friendlyParticipationsBySlug ?? {},
    )
    if (preferred) {
      return getDashboardPath(preferred.slug, primaryMembershipRole(preferred.roles))
    }
    return '/organizaciones'
  }
  return '/login?error=sin-acceso'
}

function preferredMembershipByActivity(
  memberships: PostLoginMembership[],
  participationsBySlug: Record<string, number>,
): PostLoginMembership | null {
  const ranked = memberships
    .map((membership) => ({
      membership,
      count: participationsBySlug[membership.slug] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  const topCount = ranked[0]?.count ?? 0
  if (topCount <= 0) return null

  const leaders = ranked.filter((entry) => entry.count === topCount)
  if (leaders.length !== 1) return null

  return leaders[0].membership
}

export function safePostLoginCallback(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/login') || raw.startsWith('/register')) return null
  return raw
}

export function isOrgLandingPath(path: string): boolean {
  const match = /^\/([^/]+)$/.exec(path)
  if (!match) return false
  return parseOrganizationSlug(match[1]).ok
}

function resolveOrgLandingCallback(
  slug: string,
  input: {
    isPlatformAdmin: boolean
    memberships: PostLoginMembership[]
  },
): string | null {
  const membership = input.memberships.find((m) => m.slug === slug && m.status === 'ACTIVE')
  if (membership) {
    return getDashboardPath(slug, primaryMembershipRole(membership.roles))
  }
  if (input.isPlatformAdmin) {
    return `/${slug}/admin`
  }
  return null
}

export function resolvePostLoginDestination(input: {
  isPlatformAdmin: boolean
  memberships: PostLoginMembership[]
  callbackUrl?: string | null
  friendlyParticipationsBySlug?: Record<string, number>
}): string {
  const callback = safePostLoginCallback(input.callbackUrl)
  if (callback) {
    if (isOrgLandingPath(callback)) {
      const slug = organizationSlugFromPath(callback)
      if (slug) {
        const dashboard = resolveOrgLandingCallback(slug, input)
        if (dashboard) return dashboard
      }
    } else {
      return callback
    }
  }
  return resolvePostLoginPath(input)
}

export function organizationSlugFromPath(path: string): string | null {
  const [slug] = path.split('/').filter(Boolean)
  if (!slug || RESERVED_ORGANIZATION_SLUGS.has(slug)) return null
  return slug
}
