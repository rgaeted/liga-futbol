import { RESERVED_ORGANIZATION_SLUGS } from '@/lib/organization-slug'

const DASHBOARD_AREAS = ['admin', 'player', 'coach', 'referee'] as const

export type TenantDashboardArea = (typeof DASHBOARD_AREAS)[number]

export function tenantDashboardArea(pathname: string): {
  slug: string
  area: TenantDashboardArea
} | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const [slug, area] = segments
  if (RESERVED_ORGANIZATION_SLUGS.has(slug)) return null
  if (!DASHBOARD_AREAS.includes(area as TenantDashboardArea)) return null

  return { slug, area: area as TenantDashboardArea }
}
