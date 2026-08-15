import { getDashboardPath, type MembershipRole } from '@/lib/membership-role'

export type PostLoginMembership = {
  slug: string
  role: MembershipRole
  status: 'ACTIVE' | 'PAUSED'
}

export function resolvePostLoginPath(input: {
  isPlatformAdmin: boolean
  memberships: PostLoginMembership[]
}): string {
  const active = input.memberships.filter((m) => m.status === 'ACTIVE')
  if (active.length === 1) return getDashboardPath(active[0].slug, active[0].role)
  if (active.length > 1) return '/organizaciones'
  if (input.isPlatformAdmin) return '/plataforma'
  return '/login?error=sin-acceso'
}

export function safePostLoginCallback(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/login') || raw.startsWith('/register')) return null
  return raw
}

export function resolvePostLoginDestination(input: {
  isPlatformAdmin: boolean
  memberships: PostLoginMembership[]
  callbackUrl?: string | null
}): string {
  const callback = safePostLoginCallback(input.callbackUrl)
  if (callback) return callback
  return resolvePostLoginPath(input)
}

export function organizationSlugFromPath(path: string): string | null {
  const [slug] = path.split('/').filter(Boolean)
  return slug ?? null
}
