import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea, syncActiveOrganizationCookie } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'
import { SyncTenantSession } from '@/components/tenant/SyncTenantSession'

function buildRefereeNav(slug: string) {
  return [{ href: orgPath(slug, '/referee'), label: 'Mis partidos', icon: 'PA' }]
}

export default async function RefereeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationSlug: string }>
}) {
  const { organizationSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const membership = await findTenantMembership(session.user.id, organizationSlug)
  if (!membership || !canAccessTenantArea(membership.role, 'referee')) {
    if (membership) redirect(getDashboardPath(organizationSlug, membership.role))
    redirect('/organizaciones')
  }

  await syncActiveOrganizationCookie(membership.organizationId)

  async function handleSignOut() {
    'use server'
    await signOutAndClearOrg('/login')
  }

  return (
    <DashboardShell
      nav={buildRefereeNav(organizationSlug)}
      navGroupLabel="Árbitro"
      organizationName={membership.organization.name}
      userName={session.user.name ?? 'Árbitro'}
      roleLabel="Árbitro"
      helpHref={orgPath(organizationSlug, '/ayuda')}
      signOutAction={handleSignOut}
    >
      <SyncOrgCookie organizationId={membership.organizationId} />
      <SyncTenantSession
        organizationId={membership.organizationId}
        organizationSlug={organizationSlug}
        role={membership.role}
      />
      {children}
    </DashboardShell>
  )
}
