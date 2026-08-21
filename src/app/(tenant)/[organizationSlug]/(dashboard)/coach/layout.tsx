import { auth, signOutAndClearOrg } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/membership-role'
import { orgPath } from '@/lib/tenant-paths'
import { findTenantMembership, canAccessTenantArea, syncActiveOrganizationCookie } from '@/lib/tenant-access'
import { DashboardShell } from '@/components/kelme/DashboardShell'
import { SyncOrgCookie } from '@/components/tenant/SyncOrgCookie'
import { SyncTenantSession } from '@/components/tenant/SyncTenantSession'

function buildCoachNav(slug: string) {
  return [
    { href: orgPath(slug, '/coach'), label: 'Partidos', icon: 'PA' },
    { href: orgPath(slug, '/coach/evaluations'), label: 'Evaluaciones', icon: 'EV' },
  ]
}

export default async function CoachLayout({
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
  if (!membership || !canAccessTenantArea(membership.role, 'coach')) {
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
      nav={buildCoachNav(organizationSlug)}
      navGroupLabel="Directo técnico"
      organizationName={membership.organization.name}
      userName={session.user.name ?? 'DT'}
      roleLabel="Director técnico"
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
