import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { resolvePrimaryDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { resolveTenantMembership, canAccessTenantArea } from '@/lib/tenant-access'
import { buildTenantNavGroups, loadTenantNavContext, tenantRoleLabel } from '@/lib/tenant-nav'
import { DashboardShell } from '@/components/kelme/DashboardShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'
import { SyncTenantSession } from '@/components/tenant/SyncTenantSession'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  const adminPath = orgPath(organizationSlug, '/admin')
  if (!session?.user?.id) redirect(`/login?callbackUrl=${adminPath}`)

  const membership = await resolveTenantMembership(
    session.user.id,
    organizationSlug,
    session.user.isPlatformAdmin,
  )
  if (!membership || !canAccessTenantArea(membership.roles, 'admin')) {
    if (membership) redirect(resolvePrimaryDashboardPath(organizationSlug, membership.roles))
    redirect(session.user.isPlatformAdmin ? '/plataforma' : '/organizaciones')
  }

  const navContext = await loadTenantNavContext(
    session.user.id,
    membership.organizationId,
    membership.roles,
  )
  const navGroups = buildTenantNavGroups(organizationSlug, navContext)

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <DashboardShell
      navGroups={navGroups}
      organizationName={membership.organization.name}
      organizationSlug={organizationSlug}
      userName={session.user.name ?? 'Admin'}
      roleLabel={tenantRoleLabel(navContext)}
      helpHref={orgPath(organizationSlug, '/ayuda')}
      showPlatformLink={session.user.isPlatformAdmin}
      signOutAction={handleSignOut}
    >
      <SyncOrgCookie organizationId={membership.organizationId} />
      <SyncTenantSession
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        roles={membership.roles}
      />
      {children}
    </DashboardShell>
  )
}
