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
