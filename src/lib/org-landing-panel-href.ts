import { auth } from '@/lib/auth'
import { resolvePrimaryDashboardPath } from '@/lib/membership-role'
import { resolveTenantMembership } from '@/lib/tenant-access'

export async function resolveOrgLandingPanelHref(
  organizationSlug: string,
): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const membership = await resolveTenantMembership(
    session.user.id,
    organizationSlug,
    session.user.isPlatformAdmin,
  )
  if (!membership) return null

  return resolvePrimaryDashboardPath(organizationSlug, membership.roles)
}
